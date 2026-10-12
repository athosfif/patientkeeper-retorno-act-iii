import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, getModelInput } from '../engine.mjs';
import { evaluateRecordedAMDRecord, findRecordedAMDRecord, recordedContextMatches, readRecordedAMDStatistics } from '../recorded-amd.mjs';
import { mountRecordedAMDPanel } from '../recorded-amd-client.mjs';

const fixtures = JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const context = () => getModelInput(createState(fixtures, '2026-10-12T15:00:00.000Z'), 'SIM-RET-06', 'Which administrative rule is current, and who is responsible?', fixtures);
function record(input = context()) {
  const source = input.sources.find(source => source.id === 'SIM06-REGRA-V2');
  return { context: clone(input), provenance: {
    runId: 'RUN-20261012T180000Z-test', model: 'Qwen/Qwen2.5-1.5B-Instruct',
    revision: '989aa7980e4cf806f80c7fef2b1adb7bc71aa306', deviceName: 'AMD Radeon Pro W7900D',
    torchHip: '7.15.26333', dtype: 'float32', cloudShutdownVerified: true,
    cloudShutdownAt: '2026-10-12T18:10:00Z',
  }, result: {
    runId: 'RUN-20261012T180000Z-test', caseId: input.caseId, gpuInferenceExecuted: true,
    semanticApproved: false, latencySeconds: 6.854, status: 'candidate',
    validation: { formatValid: true, candidate: {
      answer: 'The current administrative rule is V2.', citations: [{ sourceId: source.id, trecho: source.trecho }],
      abstention: false, reason: null, humanReviewRequired: true,
    } },
  } };
}

test('accepts a revalidated recorded candidate only for the entire matching positive projection', () => {
  const input = context(), output = evaluateRecordedAMDRecord(record(input), input);
  assert.equal(output.available, true);
  assert.equal(output.liveInference, false);
  assert.equal(output.gpuOff, true);
  assert.equal(output.semanticApproved, false);
  assert.equal(output.requiresSemanticHumanReview, true);
  assert.equal(output.candidate.citations[0].trecho, input.sources.find(source => source.id === 'SIM06-REGRA-V2').trecho);
});

test('does not reuse a record for a different question, source text, historical flag or omitted source', () => {
  const input = context();
  for (const change of [
    value => { value.question = 'A different question'; },
    value => { value.sources[1].trecho += ' changed'; },
    value => { value.sources[0].vigente = true; delete value.sources[0].substituida_por; },
    value => { value.sources.shift(); },
  ]) {
    const current = clone(input); change(current);
    assert.equal(recordedContextMatches(input, current), false);
    assert.equal(evaluateRecordedAMDRecord(record(input), current).code, 'CONTEXT_CHANGED');
  }
});

test('plain JSON property order is irrelevant but source order and source additions remain exact', () => {
  const input = context();
  const reorderedKeys = { sources: input.sources.map(({ trecho, id, ...rest }) => ({ ...rest, trecho, id })), question: input.question, caseId: input.caseId };
  assert.equal(recordedContextMatches(input, reorderedKeys), true);
  const reversedSources = clone(input); reversedSources.sources.reverse();
  assert.equal(recordedContextMatches(input, reversedSources), false);
  const added = clone(input); added.sources.push({ id: 'EXTRA-REC', trecho: 'Another current record.' });
  assert.equal(recordedContextMatches(input, added), false);
});

test('revalidates citation literals and closed output instead of trusting archived formatValid', () => {
  for (const change of [
    value => { value.result.validation.candidate.citations[0].trecho += ' altered'; },
    value => { value.result.validation.candidate.actions = ['send']; },
    value => { value.result.validation.candidate.humanReviewRequired = false; },
    value => { value.result.validation.candidate.citations[0] = { sourceId: value.context.sources[0].id, trecho: value.context.sources[0].trecho }; },
  ]) {
    const value = record(); change(value);
    assert.equal(evaluateRecordedAMDRecord(value, context()).code, 'INVALID_RECORDED_CANDIDATE');
  }
});

test('missing confirmed shutdown, model revision or AMD hardware prevents an off-state claim', () => {
  for (const change of [
    value => { value.provenance.cloudShutdownVerified = false; },
    value => { delete value.provenance.cloudShutdownAt; },
    value => { value.provenance.revision = 'main'; },
    value => { value.provenance.deviceName = 'CPU'; },
  ]) {
    const value = record(); change(value);
    assert.equal(evaluateRecordedAMDRecord(value, context()).code, 'UNVERIFIED_PROVENANCE');
  }
});

test('failed output and mismatched run IDs are rejected without returning raw text', () => {
  const failed = record(); failed.result.validation.formatValid = false;
  failed.result.validation.candidate = null; failed.result.status = 'invalid_candidate'; failed.result.raw = '!'.repeat(1024);
  const checked = evaluateRecordedAMDRecord(failed, context());
  assert.equal(checked.code, 'RECORDED_CANDIDATE_REJECTED');
  assert.equal(checked.candidate, null);
  assert.equal(checked.provenance.runId, failed.provenance.runId);
  assert.equal(checked.latencySeconds, failed.result.latencySeconds);
  assert.equal(checked.gpuOff, true);
  assert.equal(JSON.stringify(checked).includes('!'), false);
  const mismatch = record(); mismatch.result.runId = 'RUN-different';
  assert.equal(evaluateRecordedAMDRecord(mismatch, context()).code, 'UNVERIFIED_EXECUTION');
});

test('a current human handoff displays only its execution receipt, including for a valid abstention', () => {
  const value = record();
  const affirmative = evaluateRecordedAMDRecord(value, context(), { humanHandoff: true });
  assert.equal(affirmative.code, 'HUMAN_HANDOFF');
  assert.equal(affirmative.candidate, null);
  assert.equal(affirmative.provenance.runId, value.provenance.runId);
  value.result.validation.candidate = { answer: '', citations: [], abstention: true,
    reason: 'The responsible human team must review these records.', humanReviewRequired: true };
  const abstention = evaluateRecordedAMDRecord(value, context(), { humanHandoff: true });
  assert.equal(abstention.available, false);
  assert.equal(abstention.candidate, null);
  assert.equal(abstention.code, 'HUMAN_HANDOFF');
  assert.equal(abstention.provenance.deviceName, value.provenance.deviceName);
  assert.equal(JSON.stringify(abstention).includes('responsible human team'), false);
});

test('ambiguous or malformed archives cannot select an arbitrary answer', () => {
  const value = record();
  assert.equal(findRecordedAMDRecord({ schemaVersion: 1, records: [value] }, value.context.caseId).record, value);
  assert.equal(findRecordedAMDRecord({ schemaVersion: 1, records: [value, clone(value)] }, value.context.caseId).code, 'AMBIGUOUS_RECORD');
  assert.equal(findRecordedAMDRecord({ schemaVersion: 1, records: [] }, value.context.caseId).code, 'NO_RECORDED_RUN');
  assert.equal(findRecordedAMDRecord({ schemaVersion: 2, records: [value] }, value.context.caseId).code, 'INVALID_ARCHIVE');
});

test('pilot totals are recounted against accepted candidate formats without claiming semantic approval', () => {
  const accepted = record(), rejected = record();
  rejected.result.status = 'invalid_candidate'; rejected.result.validation = { formatValid: false, candidate: null };
  const archive = { schemaVersion: 1, records: [accepted], otherAttempts: [rejected],
    statistics: { totalAttempts: 2, formatValidAttempts: 1, baselineCases: 1, formatValidBaselineCases: 1, semanticApproved: false } };
  assert.deepEqual(readRecordedAMDStatistics(archive), archive.statistics);
  const inflated = clone(archive); inflated.statistics.formatValidAttempts = 2;
  assert.equal(readRecordedAMDStatistics(inflated), null);
  const unsafe = clone(archive); unsafe.statistics.semanticApproved = true;
  assert.equal(readRecordedAMDStatistics(unsafe), null);
  const altered = clone(archive); altered.records[0].result.validation.candidate.citations[0].trecho += ' changed';
  assert.equal(readRecordedAMDStatistics(altered), null);
});

// A small DOM boundary doubles only the interfaces used to mount the panel.
// These tests exercise asynchronous server guards, not HTML layout rendering.
function displayBoundary() {
  const panels = [];
  const container = { isConnected: true, querySelectorAll: () => panels.filter(panel => panel.isConnected),
    append(panel) { panels.push(panel); panel.isConnected = true; } };
  const document = { documentElement: { lang: 'en' }, createElement() {
    const status = {}, result = {};
    return { className: '', dataset: {}, innerHTML: '', isConnected: false, result, status,
      querySelector(selector) { return selector.includes('-status') ? status : result; },
      remove() { this.isConnected = false; } };
  } };
  return { container, document, panels };
}

test('the server human-handoff gate prevents replay even when the item itself has no handoff flag', async () => {
  const previous = globalThis.document;
  const display = displayBoundary(); globalThis.document = display.document;
  try {
    const value = record(), calls = [];
    const request = async (path, body) => {
      calls.push({ path, body });
      if (path === '/amd-runs.json') return { schemaVersion: 1, records: [value] };
      if (path === '/api/ai/context') return { revision: 0, input: value.context };
      return { revision: 0, mode: 'local_extracts', caseId: value.context.caseId,
        question: value.context.question, outcome: 'human_handoff' };
    };
    await mountRecordedAMDPanel(display.container, { item: { id: value.context.caseId }, revision: 0, request });
    const html = display.panels[0].result.innerHTML;
    assert.equal(html.includes(value.result.validation.candidate.answer), false);
    assert.equal(html.includes(value.result.validation.candidate.citations[0].trecho), false);
    assert.equal(html.includes(value.provenance.runId), true);
    assert.equal(html.includes('responsible human team'), true);
    assert.deepEqual(calls.map(call => call.path), ['/amd-runs.json', '/api/ai/context', '/api/evidence/query']);
    assert.deepEqual(calls[2].body, { caseId: value.context.caseId, question: value.context.question, expectedRevision: 0 });
  } finally { globalThis.document = previous; }
});

test('mismatched current API revisions do not display a candidate or make a GPU-off claim', async () => {
  const previous = globalThis.document;
  const display = displayBoundary(); globalThis.document = display.document;
  try {
    const value = record();
    const request = async path => path === '/amd-runs.json' ? { schemaVersion: 1, records: [value] }
      : path === '/api/ai/context' ? { revision: 1, input: value.context }
        : { revision: 0, mode: 'local_extracts', caseId: value.context.caseId, question: value.context.question, outcome: 'sources_found' };
    await mountRecordedAMDPanel(display.container, { item: { id: value.context.caseId }, revision: 0, request });
    assert.equal(display.panels[0].result.innerHTML.includes(value.result.validation.candidate.answer), false);
    assert.equal(display.panels[0].result.innerHTML.includes('sources differ'), true);
    assert.equal(display.panels[0].status.innerHTML, undefined);
  } finally { globalThis.document = previous; }
});

test('a detached panel cannot display the result of an in-flight source check', async () => {
  const previous = globalThis.document;
  const display = displayBoundary(); globalThis.document = display.document;
  try {
    const value = record(); let resolveContext;
    const contextResponse = new Promise(resolve => { resolveContext = resolve; });
    const request = async path => path === '/amd-runs.json' ? { schemaVersion: 1, records: [value] }
      : path === '/api/ai/context' ? contextResponse
        : { revision: 0, mode: 'local_extracts', caseId: value.context.caseId, question: value.context.question, outcome: 'sources_found' };
    const pending = mountRecordedAMDPanel(display.container, { item: { id: value.context.caseId }, revision: 0, request });
    await Promise.resolve(); await Promise.resolve();
    display.container.isConnected = false;
    resolveContext({ revision: 0, input: value.context });
    await pending;
    assert.equal(display.panels[0].result.innerHTML, undefined);
  } finally { globalThis.document = previous; }
});
