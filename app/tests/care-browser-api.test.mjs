import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareBrowserApi, CARE_BROWSER_STORAGE_KEY } from '../care-browser-api.mjs';
import { createCareJourneyState, transitionCareJourney } from '../care-journey.mjs';

const NOW = '2026-10-14T22:00:00.000Z';
const DUE = '2026-10-16T15:00:00.000Z';
function memory() {
  const values = new Map(); let writes = 0;
  return { values, get writes() { return writes; }, getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes += 1; values.set(key, value); } };
}
function locks() {
  const queues = new Map(); let requests = 0;
  return { get requests() { return requests; }, request(name, options, work) {
    assert.equal(options.mode, 'exclusive'); requests += 1;
    const operation = (queues.get(name) ?? Promise.resolve()).then(work);
    queues.set(name, operation.catch(() => {})); return operation;
  } };
}
const action = (key, type, fields) => ({ idempotencyKey: key, type, ...fields });
const plan = key => action(key, 'plan', { phase: 'preoperative', owner: 'MED-SIM-A', nextAction: 'Confirm receipt of fictional team instructions.', dueAt: DUE });
const api = (storage = memory(), lockManager = locks(), fallback = () => { throw new Error('Unexpected fallback'); }) => createCareBrowserApi(fallback, { storage, lockManager, now: () => NOW });
const mutate = (request, state, a) => request('/api/care/actions', { expectedRevision: state.revision, action: a });

test('browser journey persists separately from the original return queue with clinical care pending', async () => {
  const storage = memory(); storage.values.set('patientkeeper-retorno-public-v1', 'original queue');
  const request = api(storage), initial = await request('/api/care/state');
  assert.equal(storage.writes, 0);
  assert.equal(initial.owner, 'MED-SIM-A'); assert.equal(initial.demo, true);
  const saved = await mutate(request, initial, plan('PLAN-A'));
  assert.equal(saved.revision, 1); assert.equal(storage.writes, 1);
  assert.deepEqual(saved.clinicalProtocol, { status: 'pending', version: null, source: null });
  assert.equal(storage.values.get('patientkeeper-retorno-public-v1'), 'original queue');
  const reloaded = await api(storage)('/api/care/state');
  assert.deepEqual(reloaded, saved);
  reloaded.nextAction = 'Caller mutation must not change storage';
  assert.deepEqual(await request('/api/care/state'), saved);
});

test('two adapters share the Web Lock and only one competing expectedRevision succeeds', async () => {
  const storage = memory(), sharedLocks = locks(), first = api(storage, sharedLocks), second = api(storage, sharedLocks);
  const initial = await first('/api/care/state');
  const outcomes = await Promise.allSettled([mutate(first, initial, plan('PLAN-A')), mutate(second, initial, plan('PLAN-B'))]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.code, 'CARE_STALE_CONTEXT');
  assert.equal(sharedLocks.requests, 2); assert.equal(storage.writes, 1);
  assert.equal((await first('/api/care/state')).revision, 1);
});

test('single-adapter queue serializes actions and remains usable after stale rejection', async () => {
  const request = api(), initial = await request('/api/care/state');
  const outcomes = await Promise.allSettled([mutate(request, initial, plan('PLAN-A')), mutate(request, initial, plan('PLAN-B'))]);
  assert.equal(outcomes[0].status, 'fulfilled'); assert.equal(outcomes[1].reason.code, 'CARE_STALE_CONTEXT');
  const current = await request('/api/care/state');
  const next = await mutate(request, current, action('PREF-A', 'preference', { value: 'refused' }));
  assert.equal(next.revision, 2); assert.equal(next.contactPreference, 'refused');
});

test('request captures the action before waiting so later caller edits cannot change what is saved', async () => {
  const storage = memory(); let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const lockManager = { request: async (_name, _options, work) => { await blocked; return work(); } };
  const request = api(storage, lockManager), original = plan('PLAN-ORIGINAL');
  const submitted = { expectedRevision: 0, action: original };
  const pending = request('/api/care/actions', submitted);
  submitted.expectedRevision = 100;
  original.nextAction = 'Caller changed the text after submitting.';
  original.owner = 'MED-SIM-B'; original.idempotencyKey = 'MUTATED-KEY';
  release();
  const saved = await pending;
  assert.equal(saved.nextAction, 'Confirm receipt of fictional team instructions.');
  assert.equal(saved.owner, 'MED-SIM-A'); assert.equal(saved.receipts[0].key, 'PLAN-ORIGINAL');
  assert.equal(saved.revision, 1);
  assert.deepEqual(JSON.parse(storage.values.get(CARE_BROWSER_STORAGE_KEY)), saved);
});

test('idempotent receipt replay does not duplicate history or write while novel stale action fails', async () => {
  const storage = memory(), request = api(storage), initial = await request('/api/care/state'), submitted = plan('PLAN-A');
  const saved = await mutate(request, initial, submitted);
  assert.deepEqual(await mutate(request, initial, submitted), saved);
  assert.equal(storage.writes, 1);
  await assert.rejects(mutate(request, initial, plan('NEW-ACTION')), { code: 'CARE_STALE_CONTEXT' });
  assert.deepEqual(await request('/api/care/state'), saved);
});

test('opt-out and changed source preserve the domain contact and review guards', async () => {
  const request = api(); let state = await request('/api/care/state');
  state = await mutate(request, state, plan('PLAN-A'));
  state = await mutate(request, state, action('PROTO-REVIEW', 'protocol_review', { confirmed: true }));
  state = await mutate(request, state, action('PREF-IN', 'preference', { value: 'opt_in' }));
  state = await mutate(request, state, action('MESSAGE', 'message_prepare', { text: 'Fictional administrative receipt check only.' }));
  state = await mutate(request, state, action('MESSAGE-REVIEW', 'message_review', { confirmed: true }));
  state = await mutate(request, state, action('PROTO-CHANGE', 'protocol_update', { version: 'ADMIN-DEMO-2', sourceId: 'TEAM-RECEIPT-02', sourceText: 'New fictional administrative receipt instruction.' }));
  assert.equal(state.message.reviewedRevision, null); assert.equal(state.protocol.reviewedRevision, null);
  await assert.rejects(mutate(request, state, action('CONTACT-A', 'contact_simulate', { confirmed: true })), { code: 'CARE_PROTOCOL_REVIEW_REQUIRED' });
  state = await mutate(request, state, action('PREF-OUT', 'preference', { value: 'refused' }));
  await assert.rejects(mutate(request, state, action('MESSAGE-B', 'message_prepare', { text: 'Must remain blocked.' })), { code: 'CARE_CONTACT_BLOCKED' });
  assert.equal((await request('/api/care/state')).contacts.length, 0);
});

test('corrupt, wrong-shape and oversized existing storage is preserved without initialization', async () => {
  for (const raw of ['not JSON', '{}', JSON.stringify({ ...createCareJourneyState(NOW), demo: false }), 'é'.repeat(70000)]) {
    const storage = memory(); storage.values.set(CARE_BROWSER_STORAGE_KEY, raw);
    const request = api(storage);
    await assert.rejects(request('/api/care/state'), { code: 'CARE_STORE_INVALID' });
    await assert.rejects(request('/api/care/actions', { expectedRevision: 0, action: plan('PLAN-A') }), { code: 'CARE_STORE_INVALID' });
    assert.equal(storage.values.get(CARE_BROWSER_STORAGE_KEY), raw); assert.equal(storage.writes, 0);
  }
});

test('storage read/write failures never expose incidental errors or return an unsaved state', async () => {
  await assert.rejects(api({ getItem() { throw new Error('/PRIVATE/PATH'); }, setItem() {} })('/api/care/state'), error => error.code === 'CARE_STORE_UNAVAILABLE' && !error.message.includes('/PRIVATE/'));
  const storage = memory(), initial = createCareJourneyState(NOW), raw = JSON.stringify(initial);
  storage.values.set(CARE_BROWSER_STORAGE_KEY, raw);
  storage.setItem = () => { throw new Error('quota details/private'); };
  const request = api(storage);
  await assert.rejects(mutate(request, initial, plan('PLAN-A')), { code: 'CARE_STORE_UNAVAILABLE' });
  assert.equal(storage.values.get(CARE_BROWSER_STORAGE_KEY), raw);
  assert.deepEqual(await request('/api/care/state'), initial);
});

test('compare-and-swap refuses an external write that did not participate in the Web Lock', async () => {
  const initial = createCareJourneyState(NOW), changed = transitionCareJourney(initial, plan('EXTERNAL-PLAN'), { expectedRevision: 0, now: NOW });
  const storage = memory(); storage.values.set(CARE_BROWSER_STORAGE_KEY, JSON.stringify(initial));
  let reads = 0;
  storage.getItem = key => { reads += 1; if (reads === 2) storage.values.set(key, JSON.stringify(changed)); return storage.values.get(key) ?? null; };
  await assert.rejects(mutate(api(storage), initial, plan('PLAN-A')), { code: 'CARE_STALE_CONTEXT' });
  assert.equal(storage.writes, 0);
  assert.deepEqual(JSON.parse(storage.values.get(CARE_BROWSER_STORAGE_KEY)), changed);
});

test('missing cross-tab locks refuse mutation and retain the existing episode', async () => {
  const storage = memory(), initial = createCareJourneyState(NOW); storage.values.set(CARE_BROWSER_STORAGE_KEY, JSON.stringify(initial));
  const request = api(storage, null);
  await assert.rejects(mutate(request, initial, plan('PLAN-A')), { code: 'CARE_LOCKS_UNAVAILABLE' });
  assert.equal(storage.writes, 0); assert.deepEqual(await request('/api/care/state'), initial);
});

test('closed envelopes, getters and toJSON cannot run during action validation', async () => {
  let invoked = 0; const storage = memory(), request = api(storage), initial = await request('/api/care/state');
  const getter = { expectedRevision: 0 }; Object.defineProperty(getter, 'action', { enumerable: true, get() { invoked += 1; return plan('PLAN-A'); } });
  const candidates = [getter, { expectedRevision: 0, action: { ...plan('PLAN-A'), toJSON() { invoked += 1; return plan('PLAN-B'); } } }, { expectedRevision: 0, action: plan('PLAN-A'), extra: true }];
  for (const body of candidates) await assert.rejects(request('/api/care/actions', body), { code: 'CARE_INVALID_SHAPE' });
  assert.equal(invoked, 0); assert.equal(storage.writes, 0); assert.equal(initial.revision, 0);
});

test('UTF-8 body bound and endpoint methods refuse before a storage write', async () => {
  const storage = memory(), request = api(storage);
  await assert.rejects(request('/api/care/actions', { expectedRevision: 0, action: plan('PLAN-A'), extra: 'x' }), { code: 'CARE_INVALID_SHAPE' });
  await assert.rejects(request('/api/care/actions', { expectedRevision: 0, action: { ...plan('PLAN-A'), nextAction: 'é'.repeat(70000) } }), { code: 'CARE_STORE_LIMIT' });
  await assert.rejects(request('/api/care/actions'), { code: 'CARE_METHOD_NOT_ALLOWED' });
  await assert.rejects(request('/api/care/state', {}), { code: 'CARE_METHOD_NOT_ALLOWED' });
  assert.equal(storage.writes, 0);
});

test('static voice honestly reports disabled and never forwards audio or fetches a backend', async () => {
  let forwarded = 0;
  const request = api(memory(), locks(), () => { forwarded += 1; throw new Error('Audio must never reach fallback'); });
  const status = await request('/api/voice/status');
  assert.equal(status.configured, false); assert.equal(status.enabled, false); assert.equal(status.syntheticOnly, true);
  assert.equal(status.availability, 'local_version_only'); assert.equal(status.model, null);
  await assert.rejects(request('/api/voice/transcribe', { bytes: 'fictional data' }), { code: 'VOICE_NOT_CONFIGURED' });
  assert.equal(forwarded, 0);
});

test('unrelated routes retain the original fallback signature and result', async () => {
  const calls = [], original = { queue: 'unchanged' }, body = { unchanged: true };
  const request = api(memory(), locks(), (route, value) => { calls.push([route, value]); return original; });
  assert.equal(await request('/api/state'), original);
  assert.equal(await request('/api/evidence/query', body), original);
  assert.deepEqual(calls, [['/api/state', undefined], ['/api/evidence/query', body]]);
});
