// Local, opt-in synthetic-audio ASR. Importing this module does not load a model.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, lstat, stat, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const VOICE_MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const VOICE_MAX_DURATION_SECONDS = 120;
export const VOICE_TIMEOUT_MS = 120000;
const MAX_OUTPUT_BYTES = 256 * 1024;
// Match checkTranscript in care-journey.mjs; no partial transcript is accepted.
const MAX_TRANSCRIPT_CHARACTERS = 12000;
const MAX_TRANSCRIPT_SEGMENTS = 80;
const MAX_SEGMENT_CHARACTERS = 3000;
const WORKER = fileURLToPath(new URL('./voice-transcription-worker.py', import.meta.url));
const WARNING = 'Review transcript before using it. This is not a signed medical record.';
const CODES = new Set(['VOICE_NOT_CONFIGURED', 'VOICE_INVALID_CONFIGURATION', 'VOICE_INVALID_INPUT',
  'VOICE_SYNTHETIC_ONLY', 'VOICE_AUDIO_LIMIT', 'VOICE_INVALID_AUDIO', 'VOICE_DURATION_LIMIT',
  'VOICE_BUSY', 'VOICE_CANCELLED', 'VOICE_TIMEOUT', 'VOICE_MODEL_UNAVAILABLE',
  'VOICE_RUNTIME_UNAVAILABLE', 'VOICE_TRANSCRIPTION_FAILED', 'VOICE_OUTPUT_LIMIT',
  'VOICE_INVALID_RESPONSE', 'VOICE_NO_SPEECH', 'VOICE_NETWORK_DISABLED', 'VOICE_CLEANUP_FAILED']);

export class VoiceTranscriptionError extends Error {
  constructor(code) { super(code); this.name = 'VoiceTranscriptionError'; this.code = CODES.has(code) ? code : 'VOICE_TRANSCRIPTION_FAILED'; }
}
const fail = code => { throw new VoiceTranscriptionError(code); };
const record = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).every(key => keys.includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));

function checkedConfiguration(value) {
  if (value == null) return null;
  if (!record(value, ['pythonExecutable', 'modelDirectory', 'modelId', 'modelRevision', 'tempRoot', 'timeoutMs'])
    || !['pythonExecutable', 'modelDirectory', 'tempRoot'].every(key => typeof value[key] === 'string' && path.isAbsolute(value[key]))
    || typeof value.modelId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(value.modelId)
    || typeof value.modelRevision !== 'string' || !/^[a-f0-9]{40}$/.test(value.modelRevision)
    || !Number.isInteger(value.timeoutMs ?? VOICE_TIMEOUT_MS) || (value.timeoutMs ?? VOICE_TIMEOUT_MS) < 10
    || (value.timeoutMs ?? VOICE_TIMEOUT_MS) > VOICE_TIMEOUT_MS) fail('VOICE_INVALID_CONFIGURATION');
  return Object.freeze({ ...value, timeoutMs: value.timeoutMs ?? VOICE_TIMEOUT_MS });
}
async function available(config) {
  try {
    if (!(await stat(config.pythonExecutable)).isFile() || !(await stat(config.modelDirectory)).isDirectory()) return false;
    return (await Promise.all(['model.bin', 'config.json', 'tokenizer.json'].map(name => stat(path.join(config.modelDirectory, name))))).every(item => item.isFile());
  } catch { return false; }
}
function audioInput(value) {
  if (!record(value, ['bytes', 'mimeType', 'fileName', 'syntheticConfirmed', 'language'])
    || !(value.bytes instanceof Uint8Array) || typeof value.mimeType !== 'string'
    || typeof value.fileName !== 'string' || value.fileName.length > 255
    || !['pt', 'en'].includes(value.language ?? 'pt')) fail('VOICE_INVALID_INPUT');
  if (value.syntheticConfirmed !== true) fail('VOICE_SYNTHETIC_ONLY');
  if (value.bytes.byteLength < 12 || value.bytes.byteLength > VOICE_MAX_AUDIO_BYTES) fail('VOICE_AUDIO_LIMIT');
  const bytes = Buffer.from(value.bytes); // Freeze the accepted audio, including caller mutation races.
  const extension = path.extname(value.fileName).toLowerCase();
  const wav = extension === '.wav' && ['audio/wav', 'audio/x-wav', 'audio/wave'].includes(value.mimeType)
    && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE';
  const mp3 = extension === '.mp3' && ['audio/mpeg', 'audio/mp3'].includes(value.mimeType)
    && (bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224));
  if (!wav && !mp3) fail('VOICE_INVALID_AUDIO');
  return { bytes, extension, language: value.language ?? 'pt' };
}
function safeResult(raw, config, language, audioHash) {
  if (!record(raw, ['status', 'code', 'text', 'segments', 'model', 'language', 'durationSeconds', 'timestampAdjustments', 'warning'])) fail('VOICE_INVALID_RESPONSE');
  if (raw.status === 'error') {
    if (Object.keys(raw).length !== 2 || !CODES.has(raw.code)) fail('VOICE_INVALID_RESPONSE');
    fail(raw.code);
  }
  if ((typeof raw.text === 'string' && raw.text.length > MAX_TRANSCRIPT_CHARACTERS)
    || (Array.isArray(raw.segments) && raw.segments.length > MAX_TRANSCRIPT_SEGMENTS)) fail('VOICE_OUTPUT_LIMIT');
  if (raw.status !== 'transcribed' || typeof raw.text !== 'string' || !raw.text.trim()
    || raw.warning !== WARNING || raw.language !== language || !Number.isFinite(raw.durationSeconds)
    || raw.durationSeconds <= 0 || raw.durationSeconds > VOICE_MAX_DURATION_SECONDS
    || !record(raw.model, ['id', 'revision', 'device', 'computeType']) || Object.keys(raw.model).length !== 4
    || raw.model.id !== config.modelId || raw.model.revision !== config.modelRevision
    || raw.model.device !== 'cpu' || raw.model.computeType !== 'int8'
    || !Array.isArray(raw.segments) || raw.segments.length < 1) fail('VOICE_INVALID_RESPONSE');
  let previousEnd = 0;
  const segments = raw.segments.map((segment, index) => {
    if (typeof segment?.text === 'string' && segment.text.length > MAX_SEGMENT_CHARACTERS) fail('VOICE_OUTPUT_LIMIT');
    if (!record(segment, ['start', 'end', 'text']) || Object.keys(segment).length !== 3
      || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < previousEnd
      || segment.start < 0 || segment.end <= segment.start || segment.end > raw.durationSeconds + 0.05
      || segment.end > VOICE_MAX_DURATION_SECONDS
      || typeof segment.text !== 'string' || !segment.text.trim()) fail('VOICE_INVALID_RESPONSE');
    previousEnd = segment.end;
    return { id: `segment-${String(index + 1).padStart(3, '0')}`, start: segment.start, end: segment.end, text: segment.text };
  });
  if (segments.map(segment => segment.text).join(' ') !== raw.text) fail('VOICE_INVALID_RESPONSE');
  const adjustments = raw.timestampAdjustments ?? [];
  if (!Array.isArray(adjustments) || adjustments.length > segments.length || adjustments.some(item =>
    !record(item, ['segmentIndex', 'reportedStart', 'reportedEnd']) || Object.keys(item).length !== 3
    || !Number.isInteger(item.segmentIndex) || item.segmentIndex < 1 || item.segmentIndex > segments.length
    || !Number.isFinite(item.reportedStart) || !Number.isFinite(item.reportedEnd)
    || item.reportedStart < 0 || item.reportedStart > raw.durationSeconds
    || item.reportedEnd <= raw.durationSeconds || item.reportedEnd > raw.durationSeconds + 1)) fail('VOICE_INVALID_RESPONSE');
  return { status: 'transcribed', text: raw.text, segments, language, durationSeconds: raw.durationSeconds,
    provenance: { engine: 'faster-whisper', mode: 'local_asr', modelId: config.modelId, modelRevision: config.modelRevision,
      device: 'cpu', computeType: 'int8', audioSha256: audioHash, syntheticConfirmed: true,
      timestampsApproximate: true, timestampAdjustments: adjustments.map(item => ({
        segmentId: segments[item.segmentIndex - 1].id, reportedStart: item.reportedStart, reportedEnd: item.reportedEnd })) },
    warning: WARNING, requiresHumanReview: true, medicalRecordSigned: false };
}

/** Server-owned paths are explicit and never returned to the browser. */
export function createVoiceTranscriber(configuration = null, { spawnImpl = spawn } = {}) {
  const config = checkedConfiguration(configuration);
  let active = null;
  const cancel = () => {
    if (!active) return false;
    active.reason ??= 'VOICE_CANCELLED';
    active.child?.kill('SIGKILL');
    return true;
  };
  const status = async () => ({ mode: 'local_asr', engine: 'faster-whisper', configured: config !== null,
    enabled: config !== null && await available(config), busy: active !== null,
    maxAudioBytes: VOICE_MAX_AUDIO_BYTES, maxDurationSeconds: VOICE_MAX_DURATION_SECONDS, timeoutMs: config?.timeoutMs ?? VOICE_TIMEOUT_MS,
    syntheticOnly: true, model: config ? { id: config.modelId, revision: config.modelRevision, device: 'cpu', computeType: 'int8' } : null });
  const transcribe = async (value, { signal, onProgress } = {}) => {
    if (!config) fail('VOICE_NOT_CONFIGURED');
    if (active) fail('VOICE_BUSY');
    if (signal?.aborted) fail('VOICE_CANCELLED');
    if (signal !== undefined && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) fail('VOICE_INVALID_INPUT');
    const input = audioInput(value);
    const operation = { child: null, reason: null };
    active = operation; // Reserve before the first await; one worker at a time.
    let directory;
    let result;
    let error;
    const current = () => { if (operation.reason || signal?.aborted) fail(operation.reason ?? 'VOICE_CANCELLED'); };
    const progress = state => { try { onProgress?.({ state }); } catch { /* UI callbacks cannot change the worker result. */ } };
    const abort = () => { operation.reason ??= 'VOICE_CANCELLED'; operation.child?.kill('SIGKILL'); };
    const timeout = setTimeout(() => { operation.reason ??= 'VOICE_TIMEOUT'; operation.child?.kill('SIGKILL'); }, config.timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      progress('validating'); current();
      if (!await available(config)) fail('VOICE_MODEL_UNAVAILABLE');
      current();
      await mkdir(config.tempRoot, { recursive: true, mode: 0o700 }); current();
      const rootStat = await lstat(config.tempRoot); current();
      if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('VOICE_INVALID_CONFIGURATION');
      directory = await mkdtemp(path.join(config.tempRoot, 'asr-')); current();
      const audioPath = path.join(directory, 'input' + input.extension);
      await writeFile(audioPath, input.bytes, { flag: 'wx', mode: 0o600 }); current();
      const request = { audioPath, modelPath: config.modelDirectory, modelId: config.modelId,
        modelRevision: config.modelRevision, language: input.language, maxDurationSeconds: VOICE_MAX_DURATION_SECONDS };
      const payload = await new Promise((resolve, reject) => {
        let settled = false;
        const chunks = [];
        let bytes = 0;
        const finish = (failure, output) => { if (settled) return; settled = true; failure ? reject(failure) : resolve(output); };
        try {
          current();
          operation.child = spawnImpl(config.pythonExecutable, [WORKER], { shell: false, cwd: directory,
            stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8',
              PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1',
              HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1', TRANSFORMERS_OFFLINE: '1',
              HF_DATASETS_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false', OMP_NUM_THREADS: '2', CUDA_VISIBLE_DEVICES: '' } });
          operation.child.stdout.on('data', chunk => {
            bytes += chunk.length;
            if (bytes > MAX_OUTPUT_BYTES) { operation.reason ??= 'VOICE_OUTPUT_LIMIT'; operation.child.kill('SIGKILL'); return; }
            chunks.push(Buffer.from(chunk));
          });
          operation.child.stderr.on('data', () => {}); // Never persist paths or dependency/remote error text.
          operation.child.once('error', () => finish(new VoiceTranscriptionError('VOICE_RUNTIME_UNAVAILABLE')));
          operation.child.once('close', code => {
            if (operation.reason) { finish(new VoiceTranscriptionError(operation.reason)); return; }
            if (code !== 0) { finish(new VoiceTranscriptionError('VOICE_TRANSCRIPTION_FAILED')); return; }
            try { finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { finish(new VoiceTranscriptionError('VOICE_INVALID_RESPONSE')); }
          });
          operation.child.stdin.on('error', () => {});
          operation.child.stdin.end(JSON.stringify(request));
          progress('transcribing');
        } catch (failure) { finish(failure instanceof VoiceTranscriptionError ? failure : new VoiceTranscriptionError('VOICE_RUNTIME_UNAVAILABLE')); }
      });
      current();
      result = safeResult(payload, config, input.language, createHash('sha256').update(input.bytes).digest('hex'));
    } catch (failure) {
      error = failure instanceof VoiceTranscriptionError ? failure : new VoiceTranscriptionError('VOICE_TRANSCRIPTION_FAILED');
    } finally {
      clearTimeout(timeout); signal?.removeEventListener('abort', abort);
      input.bytes.fill(0);
      if (directory) { try { await rm(directory, { recursive: true, force: true }); } catch { error = new VoiceTranscriptionError('VOICE_CLEANUP_FAILED'); } }
      if (active === operation) active = null;
    }
    if (error) throw error;
    if (operation.reason || signal?.aborted) fail(operation.reason ?? 'VOICE_CANCELLED');
    progress('complete');
    if (operation.reason || signal?.aborted) fail(operation.reason ?? 'VOICE_CANCELLED');
    return result;
  };
  return Object.freeze({ status, transcribe, cancel });
}
