"""Bounded local ASR worker. Input/output are JSON; audio and models stay local."""
import json
import logging
import math
import os
from pathlib import Path
import socket
import sys

MAX_BYTES = 5 * 1024 * 1024
MAX_SECONDS = 120
# Match checkTranscript in care-journey.mjs. Reject whole oversized outputs.
MAX_TEXT = 12000
MAX_SEGMENTS = 80
MAX_SEGMENT_TEXT = 3000
WARNING = "Review transcript before using it. This is not a signed medical record."


class Rejected(Exception):
    def __init__(self, code):
        self.code = code


def reject(code):
    raise Rejected(code)


def disable_network():
    # No remote model lookup, telemetry, credential lookup or download is needed.
    os.environ.update({"HF_HUB_OFFLINE": "1", "HF_HUB_DISABLE_TELEMETRY": "1",
                       "TRANSFORMERS_OFFLINE": "1", "HF_DATASETS_OFFLINE": "1",
                       "TOKENIZERS_PARALLELISM": "false", "CUDA_VISIBLE_DEVICES": ""})
    original_socket = socket.socket

    class LocalOnlySocket(original_socket):
        def connect(self, address):
            if self.family in (socket.AF_INET, socket.AF_INET6):
                reject("VOICE_NETWORK_DISABLED")
            return super().connect(address)

        def connect_ex(self, address):
            if self.family in (socket.AF_INET, socket.AF_INET6):
                reject("VOICE_NETWORK_DISABLED")
            return super().connect_ex(address)

    socket.socket = LocalOnlySocket
    logging.disable(logging.CRITICAL)


def validate_request(value):
    keys = {"audioPath", "modelPath", "modelId", "modelRevision", "language", "maxDurationSeconds"}
    if type(value) is not dict or set(value) != keys:
        reject("VOICE_INVALID_INPUT")
    if value["language"] not in ("pt", "en") or value["maxDurationSeconds"] != MAX_SECONDS:
        reject("VOICE_INVALID_INPUT")
    if not all(isinstance(value[key], str) and 0 < len(value[key]) <= 4096
               for key in ("audioPath", "modelPath", "modelId", "modelRevision")):
        reject("VOICE_INVALID_INPUT")
    audio = Path(value["audioPath"])
    model = Path(value["modelPath"])
    if not audio.is_absolute() or audio.is_symlink() or not audio.is_file():
        reject("VOICE_INVALID_AUDIO")
    if audio.suffix not in (".wav", ".mp3") or not 0 < audio.stat().st_size <= MAX_BYTES:
        reject("VOICE_AUDIO_LIMIT")
    if not model.is_absolute() or not model.is_dir():
        reject("VOICE_MODEL_UNAVAILABLE")
    if not all((model / name).is_file() for name in ("model.bin", "config.json", "tokenizer.json")):
        reject("VOICE_MODEL_UNAVAILABLE")
    return audio, model


def decoded_duration(audio):
    import av
    duration = 0.0
    try:
        with av.open(str(audio), mode="r", format=audio.suffix[1:],
                     options={"protocol_whitelist": "file"}) as container:
            if len(container.streams.audio) != 1:
                reject("VOICE_INVALID_AUDIO")
            stream = container.streams.audio[0]
            for frame in container.decode(stream):
                rate = frame.sample_rate
                if not isinstance(rate, int) or not 8000 <= rate <= 96000:
                    reject("VOICE_INVALID_AUDIO")
                if len(frame.layout.channels) > 2:
                    reject("VOICE_INVALID_AUDIO")
                duration += frame.samples / rate
                if duration > MAX_SECONDS + 0.000001:
                    reject("VOICE_DURATION_LIMIT")
    except Rejected:
        raise
    except Exception:
        reject("VOICE_INVALID_AUDIO")
    if not math.isfinite(duration) or duration <= 0:
        reject("VOICE_INVALID_AUDIO")
    return duration


def execute(value):
    audio, model_path = validate_request(value)
    duration = decoded_duration(audio)  # Reject long files before loading weights.
    from faster_whisper import WhisperModel
    model = WhisperModel(str(model_path), device="cpu", compute_type="int8",
                         cpu_threads=2, num_workers=1, local_files_only=True)
    generated, info = model.transcribe(str(audio), language=value["language"],
                                       beam_size=1, best_of=1, vad_filter=False,
                                       condition_on_previous_text=False)
    segments = []
    timestamp_adjustments = []
    previous_end = 0.0
    for segment in generated:
        text = segment.text.strip()
        if not text:
            continue
        if len(segments) >= MAX_SEGMENTS or len(text) > MAX_SEGMENT_TEXT:
            reject("VOICE_OUTPUT_LIMIT")
        start, end = float(segment.start), float(segment.end)
        if (not math.isfinite(start) or not math.isfinite(end)
                or not 0 <= start <= duration or not start <= end <= duration + 1):
            reject("VOICE_INVALID_RESPONSE")
        # Whisper timestamps are approximate and can end in its padded audio.
        # Clip a bounded trailing overshoot for playback, preserving the original.
        if end > duration:
            timestamp_adjustments.append({"segmentIndex": len(segments) + 1,
                                          "reportedStart": start, "reportedEnd": end})
        normalized_start, normalized_end = round(start, 3), round(min(end, duration), 3)
        if normalized_start < previous_end or normalized_end <= normalized_start:
            reject("VOICE_INVALID_RESPONSE")
        segments.append({"start": normalized_start, "end": normalized_end, "text": text})
        previous_end = normalized_end
    text = " ".join(segment["text"] for segment in segments)
    if not text:
        reject("VOICE_NO_SPEECH")
    if len(text) > MAX_TEXT:
        reject("VOICE_OUTPUT_LIMIT")
    return {"status": "transcribed", "text": text, "segments": segments,
            "model": {"id": value["modelId"], "revision": value["modelRevision"],
                      "device": "cpu", "computeType": "int8"},
            "language": info.language, "durationSeconds": round(duration, 6),
            "timestampAdjustments": timestamp_adjustments, "warning": WARNING}


def main():
    disable_network()
    try:
        raw = sys.stdin.buffer.read(65537)
        if len(raw) > 65536:
            reject("VOICE_INVALID_INPUT")
        value = json.loads(raw.decode("utf-8"))
        result = execute(value)
    except Rejected as error:
        result = {"status": "error", "code": error.code}
    except (ImportError, ModuleNotFoundError):
        result = {"status": "error", "code": "VOICE_RUNTIME_UNAVAILABLE"}
    except Exception:
        result = {"status": "error", "code": "VOICE_TRANSCRIPTION_FAILED"}
    sys.stdout.write(json.dumps(result, ensure_ascii=False, allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
