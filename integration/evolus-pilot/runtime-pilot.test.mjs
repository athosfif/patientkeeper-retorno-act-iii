import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createState, transition } from '../../app/engine.mjs';
import { createEvolusRuntimePilot } from './runtime-pilot.mjs';

const fixtures = JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url), 'utf8'));
const ids = {
  applicationId: '11111111-1111-4111-8111-111111111111',
  workflowId: '22222222-2222-4222-8222-222222222222',
  executionId: '33333333-3333-4333-8333-333333333333',
};
const key = 'FAKE-RUNTIME-PILOT-KEY-DO-NOT-OUTPUT';
const request = { caseId: 'SIM-RET-02', question: 'Qual pendência continua aberta e quem é o responsável?', expectedRevision: 0 };
const approval = { syntheticConfirmed: true, executionApproved: true, workflowSafetyConfirmed: true };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function setup(extra = {}) {
  let state = createState(fixtures, '2026-10-16T16:00:00.000Z');
  let input;
  const calls = [], observations = [];
  const fixtureCopy = structuredClone(fixtures);
  const before = JSON.stringify({ state, fixtures: fixtureCopy });
  const mutate = () => { state = transition(state, { type: 'assign', caseId: 'SIM-RET-02', owner: 'MED-SIM-A' }, fixtureCopy, '2026-10-16T16:01:00.000Z'); };
  const candidate = () => {
    const source = JSON.parse(input).modelInput.sources.find(item => item.id === 'SIM02-HANDOFF');
    return { answer: 'The pending task has no responsible person or next action recorded.', citations: [{ sourceId: source.id, trecho: source.trecho }],
      abstention: false, reason: null, humanReviewRequired: true };
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    assert.equal(options.headers['X-ApiKey'], key);
    assert.equal(options.headers['X-Application-Id'], ids.applicationId);
    if (options.method === 'POST') {
      const form = await new Request(url, { method: 'POST', headers: options.headers, body: options.body }).formData();
      assert.deepEqual([...form.keys()], ['input']);
      input = form.get('input');
      const context = JSON.parse(input);
      assert.deepEqual(Object.keys(context), ['caseId', 'revision', 'sourceDigest', 'inputDigest', 'modelInput']);
      assert.deepEqual(context.modelInput.sources.map(item => item.id), ['SIM02-CANCELAMENTO', 'SIM02-HANDOFF']);
      for (const forbidden of [key, 'answer_esperada', 'proxima_acao', 'acoes_humanas_esperadas']) assert.equal(input.includes(forbidden), false);
      await extra.afterExecute?.({ mutate, fixtureCopy });
      return json({ executionId: ids.executionId }, 202);
    }
    const value = { id: ids.executionId, applicationId: ids.applicationId, workflowId: ids.workflowId,
      input, status: 'Completed', output: JSON.stringify(candidate()), consumption: { credits: 0, pendingEntries: 0 } };
    await extra.onPoll?.({ value, mutate, fixtureCopy, options });
    return json(value);
  };
  const pilot = createEvolusRuntimePilot({ enabled: true, applicationId: ids.applicationId, workflowId: ids.workflowId, ...extra.config }, {
    readCurrent: () => ({ state, fixtures: fixtureCopy }), getApiKey: () => key, fetchImpl,
    observe: receipt => observations.push(receipt), ...extra.options,
  });
  return { pilot, calls, observations, mutate, fixtureCopy, before,
    current: () => JSON.stringify({ state, fixtures: fixtureCopy }) };
}

test('import/construction and disabled start are inert; dry run projects without credentials or transport', async () => {
  let calls = 0, reads = 0, keys = 0;
  const state = createState(fixtures, '2026-10-16T16:00:00.000Z');
  const pilot = createEvolusRuntimePilot({}, {
    readCurrent: () => { reads++; return { state, fixtures }; },
    getApiKey: () => { keys++; return key; }, fetchImpl: () => { calls++; throw new Error(key); },
  });
  assert.equal(reads, 0);
  assert.equal((await pilot.start(request, approval)).status, 'disabled');
  const dry = pilot.dryRun(request);
  assert.equal(dry.status, 'dry_run'); assert.equal(dry.preflightOutcome, 'awaiting_human_source_review');
  assert.equal(dry.providerContacted, false); assert.match(dry.inputDigest, /^[a-f0-9]{64}$/);
  assert.equal(reads, 1); assert.equal(keys, 0); assert.equal(calls, 0);
});

test('the default transport still rejects a Markdown-fenced candidate and invalid framing modes fail closed', async () => {
  const s = setup({ onPoll: ({ value }) => { value.output = '```json\n' + value.output + '\n```'; } });
  const result = await s.pilot.start(request, approval);
  assert.equal(result.status, 'invalid_candidate'); assert.equal(result.candidate, null);
  assert.deepEqual(result.errors, [{ code: 'INVALID_JSON' }]); assert.equal(Object.hasOwn(result, 'outputFraming'), false);
  for (const mode of ['auto', 'repair', null, true, undefined]) assert.throws(() => setup({ config: { outputFraming: mode } }), { code: 'INVALID_CONFIGURATION' });
});

test('explicit single-fence adaptation preserves the exact candidate and audits original UTF-8 bytes', async t => {
  const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
  for (const variant of ['plain_json', 'lf', 'crlf', 'outer_json_whitespace']) {
    await t.test(variant, async () => {
      let raw, body, original;
      const s = setup({ config: { outputFraming: 'single_json_fence' }, onPoll: ({ value }) => {
        original = JSON.parse(value.output);
        // Preserve Portuguese text exactly instead of silently translating the answer.
        original.answer = 'A pendência fictícia continua sem responsável registrado.';
        body = JSON.stringify(original);
        raw = variant === 'plain_json' ? body : variant === 'crlf' ? '```json\r\n' + body + '\r\n```'
          : variant === 'outer_json_whitespace' ? ' \t\r\n```json\n' + body + '\n```\r\n\t ' : '```json\n' + body + '\n```';
        value.output = raw;
      } });
      const result = await s.pilot.start(request, approval);
      assert.equal(result.status, 'candidate'); assert.deepEqual(result.candidate, original);
      assert.deepEqual(result.outputFraming, { rawSha256: sha(raw), bodySha256: sha(body), framingRemoved: variant !== 'plain_json' });
      assert.equal(s.current(), s.before); assert.equal(s.calls.length, 2);
      assert.deepEqual(s.observations[0].outputFraming, result.outputFraming);
      assert.equal(JSON.stringify(result.outputFraming).includes(original.answer), false);
    });
  }
});

test('framing adaptation never extracts from prose, multiple/nested fences or repairs invalid candidate content', async t => {
  const variants = {
    leading_prose: body => 'Here is the answer:\n```json\n' + body + '\n```',
    trailing_prose: body => '```json\n' + body + '\n```\nDone.',
    multiple_fences: body => '```json\n' + body + '\n```\n```json\n' + body + '\n```',
    nested_fence: body => '```json\n```json\n' + body + '\n```\n```',
    unlabeled: body => '```\n' + body + '\n```',
    uppercase_tag: body => '```JSON\n' + body + '\n```',
    four_backticks: body => '````json\n' + body + '\n````',
    closing_without_newline: body => '```json\n' + body + '```',
    unclosed: body => '```json\n' + body,
    double_json: body => '```json\n' + body + '\n' + body + '\n```',
    invalid_json: body => '```json\n' + body.slice(0, -1) + ',}\n```',
    array: body => '```json\n[' + body + ']\n```',
    json_string: body => '```json\n' + JSON.stringify(body) + '\n```',
    extra_action: body => '```json\n' + JSON.stringify({ ...JSON.parse(body), action: 'send_message' }) + '\n```',
    changed_quote: body => {
      const candidate = JSON.parse(body); candidate.citations[0].trecho += ' invented';
      return '```json\n' + JSON.stringify(candidate) + '\n```';
    },
    missing_review: body => '```json\n' + JSON.stringify({ ...JSON.parse(body), humanReviewRequired: false }) + '\n```',
    oversized_raw: body => ' '.repeat(140001) + '```json\n' + body + '\n```',
  };
  for (const [name, wrap] of Object.entries(variants)) {
    await t.test(name, async () => {
      const s = setup({ config: { outputFraming: 'single_json_fence' }, onPoll: ({ value }) => { value.output = wrap(value.output); } });
      const result = await s.pilot.start(request, approval);
      assert.equal(result.status, 'invalid_candidate'); assert.equal(result.formatValid, false); assert.equal(result.candidate, null);
      assert.equal(result.requiresSemanticHumanReview, true); assert.equal(s.current(), s.before); assert.equal(s.calls.length, 2);
      if (name === 'oversized_raw') { assert.deepEqual(result.errors, [{ code: 'CANDIDATE_LIMIT' }]); assert.equal(result.outputFraming.framingRemoved, false); }
      if (name === 'extra_action') assert.deepEqual(result.errors, [{ code: 'UNKNOWN_FIELD' }]);
      if (name === 'changed_quote') assert.deepEqual(result.errors, [{ code: 'CHANGED_QUOTE' }]);
      if (name === 'missing_review') assert.deepEqual(result.errors, [{ code: 'HUMAN_REVIEW_REQUIRED' }]);
    });
  }
});

test('one execute plus one poll produces bound, sanitized evidence and leaves runtime immutable', async () => {
  const s = setup();
  const result = await s.pilot.start(request, approval);
  assert.equal(result.status, 'candidate'); assert.equal(result.candidate.humanReviewRequired, true);
  assert.equal(result.executionId, ids.executionId); assert.equal(result.providerExecutionCompleted, true);
  assert.equal(result.httpBudget.reservedRequests, 2); assert.equal(result.internalInferenceCallsBounded, false);
  assert.equal(result.applicationStateWritesByRunner, 0); assert.equal(result.modelIdentityVerified, false);
  assert.equal(result.reportedConsumption.final, true); assert.equal(s.current(), s.before);
  assert.deepEqual(s.calls.map(call => call.method), ['POST', 'GET']);
  assert.equal(JSON.stringify([result, s.observations, s.pilot.snapshot()]).includes(key), false);
  assert.equal((await s.pilot.start(request, approval)).errors[0].code, 'ALREADY_STARTED');
  assert.equal((await s.pilot.poll()).errors[0].code, 'NO_PENDING_EXECUTION');
  assert.equal(s.calls.length, 2);
});

test('stale before start, clinical handoff and missing explicit approval send nothing', async () => {
  const s = setup(); s.mutate();
  assert.equal((await s.pilot.start(request, approval)).status, 'stale');
  assert.equal(s.calls.length, 0);
  const clinical = setup();
  assert.equal((await clinical.pilot.start({ ...request, caseId: 'SIM-RET-05' }, approval)).status, 'blocked');
  assert.equal((await clinical.pilot.start(request)).status, 'error');
  assert.equal(clinical.calls.length, 0);
});

test('a replacement runtime snapshot after execute blocks polling; after poll blocks candidate', async () => {
  const afterExecute = setup({ afterExecute: ({ mutate }) => mutate() });
  const first = await afterExecute.pilot.start(request, approval);
  assert.equal(first.status, 'stale'); assert.equal(first.candidate, null); assert.equal(afterExecute.calls.length, 1);
  const afterPoll = setup({ onPoll: ({ mutate }) => mutate() });
  const second = await afterPoll.pilot.start(request, approval);
  assert.equal(second.status, 'stale'); assert.equal(second.candidate, null); assert.equal(afterPoll.calls.length, 2);
});

test('changed source after transport is stale even when revision is unchanged', async () => {
  const s = setup({ onPoll: ({ fixtureCopy }) => { fixtureCopy.casos.find(item => item.id === 'SIM-RET-02').fontes[1].trecho += ' Changed.'; } });
  const result = await s.pilot.start(request, approval);
  assert.equal(result.status, 'stale'); assert.equal(result.candidate, null);
});

test('execution/application/workflow/input bindings reject a completed result from another context', async t => {
  for (const field of ['id', 'applicationId', 'workflowId', 'input']) {
    await t.test(field, async () => {
      const s = setup({ onPoll: ({ value }) => { value[field] = field === 'input' ? value.input + ' ' : '99999999-9999-4999-8999-999999999999'; } });
      const result = await s.pilot.start(request, approval);
      assert.equal(result.status, 'error'); assert.equal(result.candidate, null); assert.equal(result.errors[0].code, 'INVALID_RESPONSE');
    });
  }
});

test('pending is returned without an answer; an explicit later poll uses the same execution, never resubmits', async () => {
  let polls = 0;
  const s = setup({ onPoll: ({ value }) => { if (polls++ === 0) { value.status = 'Running'; value.output = JSON.stringify({ action: key }); } } });
  const pending = await s.pilot.start(request, approval);
  assert.equal(pending.status, 'pending'); assert.equal(pending.candidate, null); assert.equal(pending.providerExecutionCompleted, false);
  assert.equal(JSON.stringify(pending).includes(key), false);
  const complete = await s.pilot.poll();
  assert.equal(complete.status, 'candidate'); assert.equal(complete.executionId, pending.executionId);
  assert.deepEqual(s.calls.map(call => call.method), ['POST', 'GET', 'GET']);
});

test('invalid and failed provider outputs cannot become candidates or expose raw error details', async t => {
  for (const variant of ['action', 'changed_quote', 'failed', 'secret']) {
    await t.test(variant, async () => {
      const s = setup({ onPoll: ({ value }) => {
        const candidate = JSON.parse(value.output);
        if (variant === 'action') candidate.action = 'send_message';
        if (variant === 'changed_quote') candidate.citations[0].trecho += ' invented';
        if (variant === 'secret') candidate.answer = key;
        if (variant === 'failed') { value.status = 'Failed'; value.error = key; }
        value.output = JSON.stringify(candidate);
      } });
      const result = await s.pilot.start(request, approval);
      assert.equal(result.candidate, null); assert.equal(result.formatValid, false);
      assert.equal(result.status, variant === 'failed' ? 'failed' : variant === 'secret' ? 'error' : 'invalid_candidate');
      assert.equal(JSON.stringify([result, s.observations]).includes(key), false);
    });
  }
});

test('one shared HTTP budget counts explicit polls and never retries or reenqueues', async () => {
  const s = setup({ options: { maxRequests: 2 }, onPoll: ({ value }) => { value.status = 'Pending'; } });
  assert.equal((await s.pilot.start(request, approval)).status, 'pending');
  const exhausted = await s.pilot.poll();
  assert.equal(exhausted.status, 'error'); assert.equal(exhausted.errors[0].code, 'BUDGET_EXHAUSTED');
  assert.equal(exhausted.httpBudget.reservedRequests, 2); assert.equal(s.calls.length, 2);
});

test('dry run failure does not terminate or bind itself to a pending remote execution', async () => {
  let polls = 0;
  const s = setup({ onPoll: ({ value }) => { if (polls++ === 0) value.status = 'Pending'; } });
  assert.equal((await s.pilot.start(request, approval)).status, 'pending');
  const invalid = s.pilot.dryRun({ ...request, expectedRevision: 999 });
  assert.equal(invalid.status, 'stale'); assert.equal(invalid.executionId, null);
  assert.equal(s.pilot.snapshot().terminal, false);
  assert.equal((await s.pilot.poll()).status, 'candidate');
  assert.deepEqual(s.calls.map(call => call.method), ['POST', 'GET', 'GET']);
});

test('raw HTTP and network failures containing a fake secret expose only controlled codes', async t => {
  for (const kind of ['http', 'network']) {
    await t.test(kind, async () => {
      let calls = 0;
      const s = setup({ options: { fetchImpl: async () => {
        calls++;
        if (kind === 'http') return new Response(key, { status: 500 });
        const error = new Error(key); error.code = key; throw error;
      } } });
      const result = await s.pilot.start(request, approval);
      assert.equal(result.status, 'error'); assert.equal(result.candidate, null);
      assert.deepEqual(result.errors, [{ code: kind === 'http' ? 'HTTP_ERROR' : 'NETWORK_ERROR' }]);
      assert.equal(result.httpBudget.reservedRequests, 1); assert.equal(calls, 1);
      assert.equal(JSON.stringify([result, s.observations]).includes(key), false);
      assert.equal(s.current(), s.before);
    });
  }
});

test('the per-request timeout is distinct from the global deadline and does not refund or retry', async () => {
  let calls = 0;
  const s = setup({ options: { deadlineMs: 1000, timeoutMs: 10, fetchImpl: async () => {
    calls++; return new Promise(() => {});
  } } });
  const result = await s.pilot.start(request, approval);
  assert.equal(result.status, 'timeout'); assert.deepEqual(result.errors, [{ code: 'TIMEOUT' }]);
  assert.equal(result.httpBudget.reservedRequests, 1); assert.equal(calls, 1);
});

test('global deadline aborts an unresolved request, preserves budget and never polls or retries', async () => {
  let calls = 0, signal;
  const s = setup({ options: { deadlineMs: 15, timeoutMs: 1000, fetchImpl: async (_url, options) => {
    calls++; signal = options.signal; return new Promise(() => {});
  } } });
  const result = await s.pilot.start(request, approval);
  assert.equal(result.status, 'timeout'); assert.equal(result.candidate, null);
  assert.equal(result.errors[0].code, 'GLOBAL_DEADLINE'); assert.equal(result.httpBudget.reservedRequests, 1);
  assert.equal(signal.aborted, true); assert.equal(calls, 1); assert.equal(s.current(), s.before);
});

test('the global deadline also spans the interval before a later explicit poll', async () => {
  const s = setup({ options: { deadlineMs: 30 }, onPoll: ({ value }) => { value.status = 'Pending'; } });
  assert.equal((await s.pilot.start(request, approval)).status, 'pending');
  await new Promise(resolve => setTimeout(resolve, 40));
  const result = await s.pilot.poll();
  assert.equal(result.status, 'timeout'); assert.equal(result.errors[0].code, 'GLOBAL_DEADLINE');
  assert.equal(s.calls.length, 2);
});

test('observation receives a copy; observer exceptions and state changes never leak or approve stale output', async () => {
  const copy = setup({ options: { observe: receipt => { receipt.candidate.answer = key; throw new Error(key); } } });
  const result = await copy.pilot.start(request, approval);
  assert.equal(result.status, 'candidate'); assert.equal(result.observationCallbackFailed, true);
  assert.equal(JSON.stringify(result).includes(key), false); assert.equal(copy.current(), copy.before);
  let s;
  s = setup({ options: { observe: receipt => { if (receipt.status === 'candidate') s.mutate(); } } });
  const stale = await s.pilot.start(request, approval);
  assert.equal(stale.status, 'stale'); assert.equal(stale.candidate, null);
});
