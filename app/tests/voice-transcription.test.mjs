import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVoiceTranscriber, VOICE_MAX_AUDIO_BYTES } from '../voice-transcription.mjs';
import { createCareJourneyState, transitionCareJourney } from '../care-journey.mjs';

const REVISION = 'a'.repeat(40);
const WARNING = 'Review transcript before using it. This is not a signed medical record.';
function wav() {
  const bytes = Buffer.alloc(48);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(40, 4); bytes.write('WAVE', 8);
  return { bytes, fileName: 'fictional.wav', mimeType: 'audio/wav', syntheticConfirmed: true, language: 'en' };
}
async function setup(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'patientkeeper-asr-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const modelDirectory = path.join(root, 'model'); await mkdir(modelDirectory);
  for (const name of ['model.bin', 'config.json', 'tokenizer.json']) await writeFile(path.join(modelDirectory, name), '{}');
  const config = { pythonExecutable: process.execPath, modelDirectory, modelId: 'fixture/only-mock', modelRevision: REVISION,
    tempRoot: path.join(root, 'private-temp'), ...overrides };
  return { config, root };
}
function fakeWorker({ wait = false, mutate } = {}) {
  let calls = 0;
  let lastOptions;
  const code = `let raw='';process.stdin.on('data',x=>raw+=x);process.stdin.on('end',()=>{
    const input=JSON.parse(raw);const result={status:'transcribed',text:'Fictional example only.',
      segments:[{start:0,end:1,text:'Fictional example only.'}],
      model:{id:input.modelId,revision:input.modelRevision,device:'cpu',computeType:'int8'},
      language:input.language,durationSeconds:1,warning:${JSON.stringify(WARNING)}};
    ${mutate ?? ''}
    ${wait ? 'setTimeout(()=>process.stdout.write(JSON.stringify(result)),60000);' : 'process.stdout.write(JSON.stringify(result));'}
  });`;
  return { spawnImpl(executable, args, options) {
    calls++; lastOptions = { executable, args, options };
    return spawn(process.execPath, ['-e', code], options);
  }, get calls() { return calls; }, get lastOptions() { return lastOptions; } };
}
async function emptyTemp(config) {
  assert.deepEqual(await readdir(config.tempRoot), []);
}

test('unconfigured status is honest and refuses to transcribe', async () => {
  const service = createVoiceTranscriber();
  assert.equal((await service.status()).configured, false);
  assert.equal((await service.status()).enabled, false);
  await assert.rejects(service.transcribe(wav()), { code: 'VOICE_NOT_CONFIGURED' });
  assert.equal(service.cancel(), false);
});

test('validated local worker result exposes provenance and stable segments without server paths', async t => {
  const { config } = await setup(t);
  const worker = fakeWorker(); const service = createVoiceTranscriber(config, worker);
  const progress = [];
  const result = await service.transcribe(wav(), { onProgress: value => progress.push(value.state) });
  assert.equal(worker.calls, 1); assert.equal(result.provenance.mode, 'local_asr');
  assert.equal(result.provenance.modelRevision, REVISION);
  assert.equal(result.segments[0].id, 'segment-001');
  assert.equal(result.requiresHumanReview, true); assert.equal(result.medicalRecordSigned, false);
  assert.equal(JSON.stringify(result).includes(config.tempRoot), false);
  assert.equal(worker.lastOptions.options.shell, false);
  assert.equal(worker.lastOptions.options.env.HF_HUB_OFFLINE, '1');
  assert.equal(worker.lastOptions.options.env.HF_HUB_DISABLE_TELEMETRY, '1');
  assert.equal(Object.hasOwn(worker.lastOptions.options.env, 'HF_TOKEN'), false);
  assert.deepEqual(progress, ['validating', 'transcribing', 'complete']);
  assert.equal((await service.status()).busy, false); await emptyTemp(config);
});

test('synthetic-only, maximum size and content-type checks run before any worker', async t => {
  const { config } = await setup(t); const worker = fakeWorker(); const service = createVoiceTranscriber(config, worker);
  await assert.rejects(service.transcribe({ ...wav(), syntheticConfirmed: false }), { code: 'VOICE_SYNTHETIC_ONLY' });
  await assert.rejects(service.transcribe({ ...wav(), bytes: Buffer.alloc(VOICE_MAX_AUDIO_BYTES + 1) }), { code: 'VOICE_AUDIO_LIMIT' });
  await assert.rejects(service.transcribe({ ...wav(), mimeType: 'text/plain' }), { code: 'VOICE_INVALID_AUDIO' });
  await assert.rejects(service.transcribe({ ...wav(), fileName: 'fictional.html' }), { code: 'VOICE_INVALID_AUDIO' });
  assert.equal(worker.calls, 0); assert.equal((await service.status()).busy, false);
});

test('pre-aborted input and cancellation during validation never start late workers', async t => {
  const { config } = await setup(t); const worker = fakeWorker(); const service = createVoiceTranscriber(config, worker);
  const aborted = AbortSignal.abort();
  await assert.rejects(service.transcribe(wav(), { signal: aborted }), { code: 'VOICE_CANCELLED' });
  const pending = service.transcribe(wav());
  assert.equal(service.cancel(), true);
  await assert.rejects(pending, { code: 'VOICE_CANCELLED' });
  assert.equal(worker.calls, 0); assert.equal((await service.status()).busy, false);
});

test('one active worker owns its cancellation and a concurrent request cannot replace it', async t => {
  const { config } = await setup(t); const worker = fakeWorker({ wait: true }); const service = createVoiceTranscriber(config, worker);
  let started; const ready = new Promise(resolve => { started = resolve; });
  const pending = service.transcribe(wav(), { onProgress: value => { if (value.state === 'transcribing') started(); } });
  await ready;
  await assert.rejects(service.transcribe(wav()), { code: 'VOICE_BUSY' });
  assert.equal(service.cancel(), true);
  await assert.rejects(pending, { code: 'VOICE_CANCELLED' });
  assert.equal(worker.calls, 1); assert.equal(service.cancel(), false);
  assert.equal((await service.status()).busy, false); await emptyTemp(config);
});

test('AbortSignal cancels a running worker, removes audio and permits the next operation', async t => {
  const { config } = await setup(t); const worker = fakeWorker({ wait: true }); const service = createVoiceTranscriber(config, worker);
  const abort = new AbortController(); let started; const ready = new Promise(resolve => { started = resolve; });
  const pending = service.transcribe(wav(), { signal: abort.signal, onProgress: value => { if (value.state === 'transcribing') started(); } });
  await ready; abort.abort();
  await assert.rejects(pending, { code: 'VOICE_CANCELLED' });
  await emptyTemp(config); assert.equal((await service.status()).busy, false);
  const next = createVoiceTranscriber(config, fakeWorker());
  assert.equal((await next.transcribe(wav())).status, 'transcribed'); await emptyTemp(config);
});

test('bounded deadline kills a worker and cleans private temporary audio', async t => {
  const { config } = await setup(t, { timeoutMs: 100 });
  const worker = fakeWorker({ wait: true }); const service = createVoiceTranscriber(config, worker);
  await assert.rejects(service.transcribe(wav()), { code: 'VOICE_TIMEOUT' });
  assert.equal((await service.status()).busy, false); await emptyTemp(config);
});

test('duration rejection from decoder stays explicit and cannot become mock success', async t => {
  const { config } = await setup(t); const worker = fakeWorker({ mutate: "for(const key of Object.keys(result)) delete result[key];result.status='error';result.code='VOICE_DURATION_LIMIT';" });
  const service = createVoiceTranscriber(config, worker);
  await assert.rejects(service.transcribe(wav()), { code: 'VOICE_DURATION_LIMIT' }); await emptyTemp(config);
});

test('bounded timestamp clipping preserves the model-reported time as approximate provenance', async t => {
  const { config } = await setup(t);
  const worker = fakeWorker({ mutate: "result.durationSeconds=0.9;result.segments[0].end=0.9;result.timestampAdjustments=[{segmentIndex:1,reportedStart:0,reportedEnd:1.02}];" });
  const result = await createVoiceTranscriber(config, worker).transcribe(wav());
  assert.equal(result.segments[0].end, 0.9);
  assert.equal(result.provenance.timestampsApproximate, true);
  assert.deepEqual(result.provenance.timestampAdjustments, [{ segmentId: 'segment-001', reportedStart: 0, reportedEnd: 1.02 }]);
  await emptyTemp(config);
});

test('unbounded output and metadata with server paths are rejected and cleaned', async t => {
  const { config } = await setup(t);
  const extra = createVoiceTranscriber(config, fakeWorker({ mutate: "result.remotePath='/private/server/path';" }));
  await assert.rejects(extra.transcribe(wav()), { code: 'VOICE_INVALID_RESPONSE' }); await emptyTemp(config);
  const huge = createVoiceTranscriber(config, fakeWorker({ mutate: "result.text='x'.repeat(300000);" }));
  await assert.rejects(huge.transcribe(wav()), { code: 'VOICE_OUTPUT_LIMIT' }); await emptyTemp(config);
});

test('missing cache disables status without download or fallback', async t => {
  const { config } = await setup(t); await rm(path.join(config.modelDirectory, 'tokenizer.json'));
  const worker = fakeWorker(); const service = createVoiceTranscriber(config, worker);
  assert.equal((await service.status()).enabled, false);
  await assert.rejects(service.transcribe(wav()), { code: 'VOICE_MODEL_UNAVAILABLE' }); assert.equal(worker.calls, 0);
});

for (const [name, mutate, code] of [
  ['more than 12000 transcript characters', "result.text='x'.repeat(12001);", 'VOICE_OUTPUT_LIMIT'],
  ['more than 80 segments', "result.segments=Array.from({length:81},(_,i)=>({start:i/100,end:(i+1)/100,text:'Word.'}));result.text=result.segments.map(x=>x.text).join(' ');", 'VOICE_OUTPUT_LIMIT'],
  ['more than 3000 characters in one segment', "result.text='x'.repeat(3001);result.segments[0].text=result.text;", 'VOICE_OUTPUT_LIMIT'],
  ['overlapping segment timestamps', "result.segments=[{start:0,end:0.7,text:'Fictional'},{start:0.6,end:1,text:'example.'}];result.text='Fictional example.';", 'VOICE_INVALID_RESPONSE'],
  ['zero-length segment timestamps', "result.text='Word.';result.segments=[{start:0,end:0,text:'Word.'}];", 'VOICE_INVALID_RESPONSE'],
]) {
  test(`${name} rejects the whole output and removes the temporary audio`, async t => {
    const { config } = await setup(t); const service = createVoiceTranscriber(config, fakeWorker({ mutate }));
    await assert.rejects(service.transcribe(wav()), { code });
    assert.equal((await service.status()).busy, false); await emptyTemp(config);
  });
}

test('the exact 12000-character boundary persists through the care callback projection', async t => {
  const { config } = await setup(t);
  const worker = fakeWorker({ mutate: "result.segments=Array.from({length:4},(_,i)=>({start:i/4,end:(i+1)/4,text:'x'.repeat(i===3?3000:2999)}));result.text=result.segments.map(x=>x.text).join(' ');" });
  const result = await createVoiceTranscriber(config, worker).transcribe(wav());
  assert.equal(result.text.length, 12000);
  const now = '2026-10-14T22:30:00.000Z';
  const initial = createCareJourneyState(now);
  const action = { type: 'transcript_set', idempotencyKey: 'ASR-CONTRACT-BOUNDARY', text: result.text,
    segments: result.segments.map((segment, index) => ({ id: `SEG-${String(index + 1).padStart(3, '0')}`, text: segment.text, start: segment.start, end: segment.end })),
    provenance: { mode: result.provenance.mode, engine: result.provenance.engine, modelId: result.provenance.modelId, modelRevision: result.provenance.modelRevision }, confirmed: true };
  const saved = transitionCareJourney(initial, action, { expectedRevision: 0, now });
  assert.equal(saved.transcript.text, result.text);
  assert.equal(saved.transcript.segments.length, 4); assert.equal(saved.transcript.provenance.mode, 'local_asr');
  await emptyTemp(config);
});
