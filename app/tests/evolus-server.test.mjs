import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createAppServer } from '../server.mjs';
import { createState } from '../engine.mjs';
import { prepareEvolusPilot } from '../../integration/evolus-pilot/preparation.mjs';
import { EVOLUS_SCOPE, evolusConfigurationFromEnvironment } from '../../integration/evolus-pilot/http-api.mjs';

const fixtures = JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url), 'utf8'));
const prepared = prepareEvolusPilot(createState(fixtures, '2026-10-16T16:00:00.000Z'), { ...EVOLUS_SCOPE, expectedRevision: 0 }, fixtures);
const ids = { applicationId: '11111111-1111-4111-8111-111111111111', workflowId: '22222222-2222-4222-8222-222222222222' };
const key = 'FAKE-EVOLUS-SERVER-KEY-NEVER-OUTPUT';
const config = { enabled: true, ...ids, sourceDigest: prepared.sourceDigest, inputDigest: prepared.inputDigest };
const query = { ...EVOLUS_SCOPE, expectedRevision: 0 };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
async function post(app, route, body, headers = {}) {
  const response = await fetch(app.url + route, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}
async function setup(t, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'retorno-evolus-server-'));
  let count = 0;
  const calls = [], inputs = new Map();
  const fake = async (url, request) => {
    calls.push({ url, method: request.method });
    assert.equal(url.startsWith('https://api.evolus.ai/api/v1/workflows/'), true);
    assert.equal(request.headers['X-ApiKey'], key);
    if (request.method === 'POST') {
      const form = await new Request(url, { method: 'POST', headers: request.headers, body: request.body }).formData();
      assert.deepEqual([...form.keys()], ['input']);
      const input = form.get('input');
      const executionId = `33333333-3333-4333-8333-${String(++count).padStart(12, '0')}`;
      inputs.set(executionId, input);
      await options.afterExecute?.();
      return json({ executionId }, 202);
    }
    const executionId = url.split('/').at(-1), input = inputs.get(executionId);
    const context = JSON.parse(input);
    const source = context.modelInput.sources.find(item => item.id === 'SIM02-HANDOFF');
    const candidate = { answer: 'The pending task has no responsible person or next action recorded.',
      citations: [{ sourceId: source.id, trecho: source.trecho }], abstention: false, reason: null, humanReviewRequired: true };
    const value = { id: executionId, ...ids, input, status: 'Completed', output: JSON.stringify(candidate), consumption: { credits: 0, pendingEntries: 0 } };
    await options.onPoll?.(value);
    return json(value);
  };
  const app = await createAppServer({ dataDir, port: 0, evolusConfiguration: config,
    evolusGetApiKey: () => key, evolusFetch: fake, ...options.server });
  t.after(async () => { await app.close(); await rm(dataDir, { recursive: true, force: true }); });
  return { ...app, dataDir, calls, inputs };
}

test('configuration helper is disabled by default and never copies the supplied API key', () => {
  assert.equal(evolusConfigurationFromEnvironment().enabled, false);
  const value = evolusConfigurationFromEnvironment({ RETORNO_EVOLUS_ENABLED: '1', RETORNO_EVOLUS_API_KEY: key,
    RETORNO_EVOLUS_APPLICATION_ID: ids.applicationId, RETORNO_EVOLUS_WORKFLOW_ID: ids.workflowId,
    RETORNO_EVOLUS_SOURCE_DIGEST: prepared.sourceDigest, RETORNO_EVOLUS_INPUT_DIGEST: prepared.inputDigest });
  assert.equal(value.enabled, true); assert.equal(JSON.stringify(value).includes(key), false);
  assert.equal(Object.hasOwn(value, 'apiKey'), false);
  assert.equal(evolusConfigurationFromEnvironment({ RETORNO_EVOLUS_OUTPUT_FRAMING: 'single_json_fence' }).outputFraming, 'single_json_fence');
  assert.equal(Object.hasOwn(evolusConfigurationFromEnvironment(), 'outputFraming'), false);
});

test('single JSON-fence normalization is explicitly enabled server-side and exposes only hashes/flag as evidence', async t => {
  let raw, body;
  const app = await setup(t, { server: { evolusConfiguration: { ...config, outputFraming: 'single_json_fence' } }, onPoll: value => {
    body = value.output; raw = '```json\n' + body + '\n```'; value.output = raw;
  } });
  const result = await post(app, '/api/evolus/query', query);
  assert.equal(result.body.status, 'candidate'); assert.deepEqual(result.body.candidate, JSON.parse(body));
  assert.deepEqual(result.body.outputFraming, {
    rawSha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
    bodySha256: createHash('sha256').update(body, 'utf8').digest('hex'), framingRemoved: true,
  });
  assert.deepEqual(Object.keys(result.body.outputFraming).sort(), ['bodySha256', 'framingRemoved', 'rawSha256']);
  assert.equal(JSON.stringify(result.body.outputFraming).includes(JSON.parse(body).answer), false);
  assert.equal(app.calls.length, 2);
  const strict = await setup(t, { onPoll: value => { value.output = '```json\n' + value.output + '\n```'; } });
  const rejected = await post(strict, '/api/evolus/query', query);
  assert.equal(rejected.body.status, 'invalid_candidate'); assert.equal(rejected.body.candidate, null);
  assert.deepEqual(rejected.body.errors, [{ code: 'INVALID_JSON' }]); assert.equal(Object.hasOwn(rejected.body, 'outputFraming'), false);
});

test('default server status and calls stay disabled without touching transport or progress', async t => {
  let calls = 0;
  const app = await setup(t, { server: { evolusConfiguration: null, evolusFetch: () => { calls++; throw new Error(key); } } });
  const before = await readFile(path.join(app.dataDir, 'state.json'), 'utf8');
  const status = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(status.enabled, false); assert.equal(status.provider, 'evolus'); assert.deepEqual(status.scope, EVOLUS_SCOPE);
  const result = await post(app, '/api/evolus/query', query);
  assert.equal(result.status, 503); assert.equal(result.body.status, 'disabled'); assert.equal(calls, 0);
  assert.equal(await readFile(path.join(app.dataDir, 'state.json'), 'utf8'), before);
});

test('missing or mismatched external library bindings never reach Evolus', async t => {
  for (const variation of [{ sourceDigest: undefined }, { inputDigest: undefined }, { sourceDigest: '0'.repeat(64) }, { inputDigest: '0'.repeat(64) }]) {
    const app = await setup(t, { server: { evolusConfiguration: { ...config, ...variation } } });
    const status = await (await fetch(app.url + '/api/evolus/status')).json();
    assert.equal(status.enabled, false);
    const result = await post(app, '/api/evolus/query', query);
    assert.ok([409, 503].includes(result.status)); assert.equal(result.body.candidate, null); assert.equal(app.calls.length, 0);
  }
});

test('one authorized query binds real engine projection, strips external IDs and does not save progress/cards', async t => {
  const app = await setup(t);
  const before = await readFile(path.join(app.dataDir, 'state.json'), 'utf8');
  const status = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(status.enabled, true); assert.equal(status.canStart, true); assert.equal(status.remainingExecutions, 2);
  const result = await post(app, '/api/evolus/query', query);
  assert.equal(result.status, 200); assert.equal(result.body.status, 'candidate');
  assert.equal(result.body.candidate.humanReviewRequired, true); assert.equal(result.body.requiresSemanticHumanReview, true);
  assert.equal(result.body.caseId, query.caseId); assert.equal(result.body.revision, 0);
  assert.equal(result.body.sourceDigest, prepared.sourceDigest); assert.equal(result.body.inputDigest, prepared.inputDigest);
  assert.match(result.body.sessionId, /^[a-f0-9-]{36}$/); assert.equal(result.body.remainingExecutions, 1);
  assert.deepEqual(app.calls.map(call => call.method), ['POST', 'GET']);
  const input = JSON.parse([...app.inputs.values()][0]);
  assert.deepEqual(input.modelInput, prepared.modelInput);
  assert.equal(JSON.stringify(input).includes('answer_esperada'), false);
  for (const secret of [key, ids.applicationId, ids.workflowId, ...app.inputs.keys()]) assert.equal(JSON.stringify([status, result.body]).includes(secret), false);
  assert.equal(await readFile(path.join(app.dataDir, 'state.json'), 'utf8'), before);
  assert.deepEqual(await readdir(app.dataDir), ['state.json']);
});

test('only the fixed scope and local session envelope are accepted; stale input consumes no execution', async t => {
  const app = await setup(t);
  for (const body of [{ ...query, workflowId: ids.workflowId }, { ...query, sources: [] }, { ...query, caseId: 'SIM-RET-04' }, { ...query, question: 'Other question' }]) {
    assert.equal((await post(app, '/api/evolus/query', body)).status, 400);
  }
  assert.equal((await post(app, '/api/evolus/query', { ...query, expectedRevision: 999 })).status, 409);
  assert.equal((await post(app, '/api/evolus/poll', { sessionId: ids.workflowId, expectedRevision: 0, executionId: ids.workflowId })).status, 400);
  assert.equal((await post(app, '/api/evolus/poll', { sessionId: ids.workflowId, expectedRevision: 0 })).status, 404);
  assert.equal(app.calls.length, 0);
  assert.equal((await (await fetch(app.url + '/api/evolus/status')).json()).remainingExecutions, 2);
});

test('pending requires an explicit local-session poll and repeated query never resubmits', async t => {
  let polls = 0;
  const app = await setup(t, { onPoll: value => { if (polls++ === 0) { value.status = 'Pending'; value.output = key; } } });
  const first = await post(app, '/api/evolus/query', query);
  assert.equal(first.body.status, 'pending'); assert.equal(first.body.candidate, null); assert.equal(app.calls.length, 2);
  // A new browser mount can recover only this local handle, without submitting/polling.
  const recovered = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(recovered.pending, true); assert.equal(recovered.canStart, false);
  assert.deepEqual(recovered.pendingSession, { sessionId: first.body.sessionId, caseId: query.caseId, revision: 0,
    sourceDigest: prepared.sourceDigest, inputDigest: prepared.inputDigest, requiresSemanticHumanReview: true });
  assert.equal(recovered.pendingSessionUnavailableReason, null);
  for (const secret of [key, ids.applicationId, ids.workflowId, ...app.inputs.keys()]) assert.equal(JSON.stringify(recovered).includes(secret), false);
  await fetch(app.url + '/api/evolus/status');
  assert.equal(app.calls.length, 2);
  const duplicate = await post(app, '/api/evolus/query', query);
  assert.equal(duplicate.body.sessionId, first.body.sessionId); assert.equal(duplicate.body.remainingExecutions, 1); assert.equal(app.calls.length, 2);
  const result = await post(app, '/api/evolus/poll', { sessionId: recovered.pendingSession.sessionId, expectedRevision: recovered.pendingSession.revision });
  assert.equal(result.body.status, 'candidate'); assert.equal(result.body.sessionId, first.body.sessionId); assert.equal(app.calls.length, 3);
  const cached = await post(app, '/api/evolus/poll', { sessionId: first.body.sessionId, expectedRevision: 0 });
  assert.equal(cached.body.status, 'candidate'); assert.equal(app.calls.length, 3);
  assert.equal(JSON.stringify([first.body, duplicate.body, result.body]).includes(key), false);
  const finished = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(finished.pending, false); assert.equal(finished.pendingSession, null);
});

test('status retires an expired pending handle without polling, resubmitting or refunding its reservation', async t => {
  const app = await setup(t, { server: { evolusConfiguration: { ...config, deadlineMs: 200 } }, onPoll: value => { value.status = 'Pending'; } });
  const before = await readFile(path.join(app.dataDir, 'state.json'), 'utf8');
  const pending = await post(app, '/api/evolus/query', query);
  assert.equal(pending.body.status, 'pending');
  await new Promise(resolve => setTimeout(resolve, 225));
  const expired = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(expired.pending, false); assert.equal(expired.pendingSession, null);
  assert.equal(expired.pendingSessionUnavailableReason, 'GLOBAL_DEADLINE');
  assert.equal(expired.reservedExecutions, 1); assert.equal(expired.remainingExecutions, 1);
  assert.equal(app.calls.length, 2);
  const poll = await post(app, '/api/evolus/poll', { sessionId: pending.body.sessionId, expectedRevision: 0 });
  assert.equal(poll.body.status, 'timeout'); assert.equal(poll.body.candidate, null);
  assert.deepEqual(poll.body.errors, [{ code: 'GLOBAL_DEADLINE' }]);
  assert.equal(poll.body.remoteCancellationConfirmed, false); assert.equal(app.calls.length, 2);
  await fetch(app.url + '/api/evolus/status');
  assert.equal(app.calls.length, 2);
  assert.equal(await readFile(path.join(app.dataDir, 'state.json'), 'utf8'), before);
});

test('status never offers a recoverable handle after the actual source context changed', async t => {
  const app = await setup(t, { onPoll: value => { value.status = 'Running'; } });
  const pending = await post(app, '/api/evolus/query', query);
  assert.equal(pending.body.status, 'pending');
  const action = await post(app, '/api/actions', { expectedRevision: 0, action: { type: 'assign', caseId: 'SIM-RET-02', owner: 'MED-SIM-A' } });
  assert.equal(action.status, 200);
  const stale = await (await fetch(app.url + '/api/evolus/status')).json();
  assert.equal(stale.enabled, false); assert.equal(stale.pending, false); assert.equal(stale.pendingSession, null);
  assert.equal(stale.pendingSessionUnavailableReason, 'STALE_CONTEXT'); assert.equal(stale.canStart, false);
  assert.equal(stale.reservedExecutions, 1); assert.equal(app.calls.length, 2);
  const poll = await post(app, '/api/evolus/poll', { sessionId: pending.body.sessionId, expectedRevision: 1 });
  assert.equal(poll.status, 409); assert.equal(poll.body.status, 'stale'); assert.equal(poll.body.candidate, null);
  assert.equal(app.calls.length, 2);
});

test('the server instance permits at most two workflow submissions across recreated runners', async t => {
  const app = await setup(t);
  const first = await post(app, '/api/evolus/query', query), second = await post(app, '/api/evolus/query', query);
  assert.equal(first.body.status, 'candidate'); assert.equal(second.body.status, 'candidate');
  assert.notEqual(first.body.sessionId, second.body.sessionId); assert.equal(second.body.remainingExecutions, 0);
  const third = await post(app, '/api/evolus/query', query);
  assert.equal(third.status, 429); assert.equal(third.body.errors[0].code, 'EVOLUS_EXECUTION_LIMIT');
  assert.deepEqual(app.calls.map(call => call.method), ['POST', 'GET', 'POST', 'GET']);
});

test('timeout/failure spends its reservation, strips raw secrets and never implicitly retries POST', async t => {
  let calls = 0;
  const app = await setup(t, { server: { evolusConfiguration: { ...config, maxExecutions: 1, deadlineMs: 15 },
    evolusFetch: async () => { calls++; return new Promise(() => {}); } } });
  const result = await post(app, '/api/evolus/query', query);
  assert.equal(result.body.status, 'timeout'); assert.equal(result.body.candidate, null); assert.equal(result.body.remainingExecutions, 0);
  assert.equal((await post(app, '/api/evolus/query', query)).status, 429); assert.equal(calls, 1);
  const failure = await setup(t, { server: { evolusFetch: async () => { throw new Error(key); } } });
  const failed = await post(failure, '/api/evolus/query', query);
  assert.equal(failed.body.status, 'error'); assert.deepEqual(failed.body.errors, [{ code: 'NETWORK_ERROR' }]);
  assert.equal(failed.body.remainingExecutions, 1); assert.equal(JSON.stringify(failed.body).includes(key), false);
});

test('concurrent queries cannot spend a second execution while transport is active', async t => {
  let entered, finish;
  const started = new Promise(resolve => { entered = resolve; });
  const wait = new Promise(resolve => { finish = resolve; });
  const app = await setup(t, { afterExecute: async () => { entered(); await wait; } });
  const first = post(app, '/api/evolus/query', query);
  await started;
  const busy = await post(app, '/api/evolus/query', query);
  assert.equal(busy.status, 429); assert.equal(busy.body.errors[0].code, 'EVOLUS_BUSY'); assert.equal(app.calls.length, 1);
  finish(); assert.equal((await first).body.status, 'candidate');
});

test('a real local action during provider work suppresses the now-stale answer without writing any review', async t => {
  let entered, finish;
  const started = new Promise(resolve => { entered = resolve; }), wait = new Promise(resolve => { finish = resolve; });
  const app = await setup(t, { onPoll: async () => { entered(); await wait; } });
  const pending = post(app, '/api/evolus/query', query);
  await started;
  const action = await post(app, '/api/actions', { expectedRevision: 0, action: { type: 'assign', caseId: 'SIM-RET-02', owner: 'MED-SIM-A' } });
  assert.equal(action.status, 200); finish();
  const result = await pending;
  assert.equal(result.status, 409); assert.equal(result.body.status, 'stale'); assert.equal(result.body.candidate, null);
  assert.equal((await (await fetch(app.url + '/api/state')).json()).revision, 1);
  assert.deepEqual(await readdir(app.dataDir), ['state.json']);
  assert.equal((await (await fetch(app.url + '/api/evolus/status')).json()).enabled, false);
});

test('stale poll and provider bindings/quotes do not expose a candidate', async t => {
  for (const change of [value => { value.applicationId = ids.workflowId; }, value => {
    const candidate = JSON.parse(value.output); candidate.citations[0].trecho += ' invented'; value.output = JSON.stringify(candidate);
  }]) {
    const app = await setup(t, { onPoll: change });
    const result = await post(app, '/api/evolus/query', query);
    assert.equal(result.body.candidate, null); assert.equal(result.body.formatValid, false);
  }
  const app = await setup(t, { onPoll: value => { value.status = 'Running'; } });
  const pending = await post(app, '/api/evolus/query', query);
  const stale = await post(app, '/api/evolus/poll', { sessionId: pending.body.sessionId, expectedRevision: 1 });
  assert.equal(stale.status, 409); assert.equal(app.calls.length, 2);
});

test('a provider identifier reflected inside an otherwise valid candidate is not exposed to the browser', async t => {
  for (const field of ['applicationId', 'workflowId', 'id']) {
    const app = await setup(t, { onPoll: value => {
      const candidate = JSON.parse(value.output); candidate.answer = `Administrative answer ${value[field]}`;
      value.output = JSON.stringify(candidate);
    } });
    const result = await post(app, '/api/evolus/query', query);
    assert.equal(result.body.status, 'error'); assert.equal(result.body.candidate, null); assert.equal(result.body.formatValid, false);
    assert.deepEqual(result.body.errors, [{ code: 'EXTERNAL_ID_REFLECTION' }]);
    for (const id of [ids.applicationId, ids.workflowId, ...app.inputs.keys()]) assert.equal(JSON.stringify(result.body).includes(id), false);
  }
});

test('new routes retain method, origin and CSP protections', async t => {
  const app = await setup(t);
  const wrongMethod = await fetch(app.url + '/api/evolus/query');
  assert.equal(wrongMethod.status, 405); assert.equal(wrongMethod.headers.get('allow'), 'POST');
  const crossOrigin = await post(app, '/api/evolus/query', query, { origin: 'https://evil.example.invalid' });
  assert.equal(crossOrigin.status, 403); assert.equal(app.calls.length, 0);
  const status = await fetch(app.url + '/api/evolus/status');
  assert.match(status.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.equal(status.headers.get('cache-control'), 'no-store');
});
