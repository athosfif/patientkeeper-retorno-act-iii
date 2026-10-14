import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAppServer } from '../server.mjs';

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'retorno-care-test-'));
  const app = await createAppServer({ dataDir, port: 0, ...options });
  t.after(async () => { await app.close(); await rm(dataDir, { recursive: true, force: true }); });
  const post = (route, body) => fetch(app.url + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { app, dataDir, post };
}

test('the new journey is isolated from the saved return queue and concurrent stale writes cannot overwrite it', async t => {
  const { app, dataDir, post } = await fixture(t);
  const original = await readFile(path.join(dataDir, 'state.json'));
  const care = await (await fetch(app.url + '/api/care/state')).json();
  assert.equal(care.episodeId, 'SIM-CARE-01');
  assert.equal(care.clinicalProtocol.status, 'pending');
  const make = id => ({ expectedRevision: care.revision, action: { type: 'plan', idempotencyKey: id, phase: 'preoperative', owner: 'MED-SIM-A', nextAction: 'Confirm receipt of team instructions in the fictional example.', dueAt: '2026-10-16T15:00:00.000Z' } });
  const results = await Promise.all([post('/api/care/actions', make('PLAN-TEST-A')), post('/api/care/actions', make('PLAN-TEST-B'))]);
  assert.equal(results.filter(response => response.ok).length, 1);
  const saved = await (await fetch(app.url + '/api/care/state')).json();
  assert.equal(saved.revision, care.revision + 1);
  assert.equal(saved.owner, 'MED-SIM-A');
  assert.deepEqual(await readFile(path.join(dataDir, 'state.json')), original);
  assert.equal(JSON.parse(await readFile(path.join(dataDir, 'care-demo-state.json'), 'utf8')).revision, saved.revision);
});

test('real audio confirmation, invalid encodings and unconfigured ASR never start a worker', async t => {
  const { app, post } = await fixture(t);
  const status = await (await fetch(app.url + '/api/voice/status')).json();
  assert.equal(status.enabled, false);
  assert.equal(status.syntheticOnly, true);
  const input = { fileName: 'fictional.wav', mimeType: 'audio/wav', language: 'en', base64: Buffer.from('RIFFxxxxWAVExxxx').toString('base64'), syntheticConfirmed: false };
  const blocked = await post('/api/voice/transcribe', input);
  assert.equal(blocked.status, 400);
  assert.equal((await blocked.json()).error.code, 'VOICE_SYNTHETIC_ONLY');
  const invalid = await post('/api/voice/transcribe', { ...input, syntheticConfirmed: true, base64: '../invalid' });
  assert.equal((await invalid.json()).error.code, 'VOICE_INVALID_INPUT');
  const disabled = await post('/api/voice/transcribe', { ...input, syntheticConfirmed: true });
  assert.equal(disabled.status, 503);
  assert.equal((await disabled.json()).error.code, 'VOICE_NOT_CONFIGURED');
  for (const route of ['/voice-transcription-worker.py', '/care-store.mjs', '/api/voice/cancel', '/data/care-demo-state.json']) {
    assert.equal((await fetch(app.url + route)).status, 404);
  }
});

test('cancelling an audio request cancels only its worker, with no journey or queue mutations', async t => {
  let called = 0, cancelled = false;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const transcriber = {
    status: async () => ({ enabled: true, syntheticOnly: true }), cancel: () => false,
    transcribe: (_, { signal }) => { called += 1; started(); return new Promise((_, reject) => signal.addEventListener('abort', () => { cancelled = true; reject(Object.assign(new Error('cancelled'), { code: 'VOICE_CANCELLED' })); }, { once: true })); },
  };
  const { app, dataDir } = await fixture(t, { voiceTranscriber: transcriber });
  const before = await readFile(path.join(dataDir, 'state.json'));
  const controller = new AbortController();
  const response = fetch(app.url + '/api/voice/transcribe', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileName: 'fictional.wav', mimeType: 'audio/wav', language: 'en', base64: Buffer.from('RIFFxxxxWAVExxxx').toString('base64'), syntheticConfirmed: true }) });
  await ready; controller.abort(); await assert.rejects(response);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(called, 1); assert.equal(cancelled, true);
  assert.deepEqual(await readFile(path.join(dataDir, 'state.json')), before);
});
