import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelBudget, ModelBudgetError } from '../model-budget.mjs';

const reservation = (changes = {}) => ({ requestBytes: 512, maxOutputTokens: 1024, ...changes });
const rejects = (operation, code) => assert.throws(operation,
  error => error instanceof ModelBudgetError && error.code === code);

test('defaults bound four attempts without assuming provider pricing, quota or hardware', () => {
  const budget = createModelBudget();
  assert.deepEqual(budget.snapshot(), {
    maxRequests: 4, maxRequestBytes: 32768, maxOutputTokens: 1024,
    reservedRequests: 0, remainingRequests: 4, exhausted: false,
  });
  for (const key of ['free', 'providerQuota', 'amdVerified', 'model', 'endpoint', 'apiKey']) {
    assert.equal(Object.hasOwn(budget.snapshot(), key), false);
  }
});

test('reserves before a simulated failure and offers no refund, retry or reset method', async () => {
  const budget = createModelBudget({ maxRequests: 3 });
  let attempted = 0;
  for (const failure of ['timeout', 'HTTP 429', 'network']) {
    budget.reserve(reservation());
    attempted += 1;
    await assert.rejects(Promise.reject(new Error(failure)));
    assert.equal(budget.snapshot().reservedRequests, attempted);
  }
  assert.equal(budget.snapshot().remainingRequests, 0);
  assert.equal(budget.snapshot().exhausted, true);
  for (const name of ['refund', 'retry', 'reset']) assert.equal(Object.hasOwn(budget, name), false);
  rejects(() => budget.reserve(reservation()), 'MODEL_BUDGET_EXHAUSTED');
  assert.equal(budget.snapshot().reservedRequests, 3);
});

test('synchronous reservation bounds competing asynchronous callers', async () => {
  const budget = createModelBudget({ maxRequests: 4 });
  let simulatedFetches = 0;
  const operations = await Promise.allSettled(Array.from({ length: 20 }, async () => {
    const receipt = budget.reserve(reservation());
    simulatedFetches += 1;
    await Promise.resolve();
    return receipt.requestNumber;
  }));
  assert.equal(simulatedFetches, 4);
  assert.deepEqual(operations.filter(result => result.status === 'fulfilled').map(result => result.value), [1, 2, 3, 4]);
  assert.equal(operations.filter(result => result.status === 'rejected').length, 16);
  for (const result of operations.filter(result => result.status === 'rejected')) {
    assert.equal(result.reason.code, 'MODEL_BUDGET_EXHAUSTED');
  }
  assert.deepEqual(budget.snapshot(), {
    maxRequests: 4, maxRequestBytes: 32768, maxOutputTokens: 1024,
    reservedRequests: 4, remainingRequests: 0, exhausted: true,
  });
});

test('rejects oversized request/output before an attempt is reserved', () => {
  const budget = createModelBudget({ maxRequestBytes: 512, maxOutputTokens: 256 });
  const before = budget.snapshot();
  for (const [input, code] of [
    [reservation({ requestBytes: 513, maxOutputTokens: 256 }), 'MODEL_BUDGET_INPUT_LIMIT'],
    [reservation({ requestBytes: 512, maxOutputTokens: 257 }), 'MODEL_BUDGET_OUTPUT_LIMIT'],
  ]) {
    rejects(() => budget.reserve(input), code);
    assert.deepEqual(budget.snapshot(), before);
  }
  assert.deepEqual(budget.reserve({ requestBytes: 512, maxOutputTokens: 256 }), {
    requestNumber: 1, requestBytes: 512, maxOutputTokens: 256,
  });
});

test('hard ceilings and positive safe integers protect configuration', () => {
  const ceilings = { maxRequests: 16, maxRequestBytes: 128 * 1024, maxOutputTokens: 1024 };
  assert.equal(createModelBudget(ceilings).snapshot().maxRequests, 16);
  for (const [key, maximum] of Object.entries(ceilings)) {
    for (const value of [0, -1, 1.5, NaN, Infinity, '1', null, undefined, maximum + 1, Number.MAX_SAFE_INTEGER + 1]) {
      rejects(() => createModelBudget({ [key]: value }), 'INVALID_MODEL_BUDGET');
    }
  }
  for (const value of [null, [], false, 4, 'budget', new Date(), Object.create(null)]) {
    rejects(() => createModelBudget(value), 'INVALID_MODEL_BUDGET');
  }
});

test('rejects unknown config properties, symbols, hidden values and accessors without invoking getters', () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'maxRequests', { enumerable: true, get() { getterCalls += 1; return 4; } });
  const hidden = {};
  Object.defineProperty(hidden, 'maxRequests', { enumerable: false, value: 4 });
  for (const value of [
    accessor, hidden, { apiKey: 'FAKE-SECRET' }, { reset: true },
    { [Symbol('not-a-setting')]: 4 }, JSON.parse('{"__proto__":4}'),
    { constructor: 4 }, { prototype: 4 },
  ]) rejects(() => createModelBudget(value), 'INVALID_MODEL_BUDGET');
  assert.equal(getterCalls, 0);
});

test('malformed reservation cannot consume attempts or leak supplied values', () => {
  const budget = createModelBudget();
  const before = budget.snapshot();
  let getterCalls = 0;
  const accessor = reservation();
  Object.defineProperty(accessor, 'requestBytes', { enumerable: true, get() { getterCalls += 1; return 512; } });
  const hidden = { maxOutputTokens: 1024 };
  Object.defineProperty(hidden, 'requestBytes', { enumerable: false, value: 512 });
  const malformed = [
    undefined, null, [], false, 2, {}, { requestBytes: 512 },
    { maxOutputTokens: 1024 }, accessor, hidden,
    { ...reservation(), [Symbol('extra')]: true },
    { ...reservation(), apiKey: 'FAKE-SECRET-NEVER-ECHO' },
  ];
  for (const key of ['requestBytes', 'maxOutputTokens']) {
    for (const value of [0, -1, 1.5, NaN, Infinity, '512', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      malformed.push(reservation({ [key]: value }));
    }
  }
  for (const input of malformed) {
    let error;
    try { budget.reserve(input); } catch (caught) { error = caught; }
    assert.ok(error instanceof ModelBudgetError);
    assert.equal(error.code, 'INVALID_MODEL_BUDGET_REQUEST');
    assert.equal(error.message.includes('FAKE-SECRET-NEVER-ECHO'), false);
    assert.deepEqual(budget.snapshot(), before);
  }
  assert.equal(getterCalls, 0);
});

test('configuration, snapshots, reservations and public methods cannot reset internal counters', () => {
  const config = { maxRequests: 1, maxRequestBytes: 512, maxOutputTokens: 256 };
  const budget = createModelBudget(config);
  config.maxRequests = 16;
  const snapshot = budget.snapshot();
  assert.ok(Object.isFrozen(snapshot));
  assert.throws(() => { snapshot.remainingRequests = 99; }, TypeError);
  const input = { requestBytes: 512, maxOutputTokens: 256 };
  const receipt = budget.reserve(input);
  input.requestBytes = 1;
  assert.deepEqual(receipt, { requestNumber: 1, requestBytes: 512, maxOutputTokens: 256 });
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(budget));
  assert.throws(() => { budget.reserve = () => {}; }, TypeError);
  rejects(() => budget.reserve({ requestBytes: 1, maxOutputTokens: 1 }), 'MODEL_BUDGET_EXHAUSTED');
  assert.equal(budget.snapshot().maxRequests, 1);
  assert.equal(budget.snapshot().reservedRequests, 1);
});

test('each process-local factory has its own budget and provides no persistent provider quota assertion', () => {
  const first = createModelBudget({ maxRequests: 1 });
  const second = createModelBudget({ maxRequests: 1 });
  first.reserve(reservation());
  assert.equal(first.snapshot().exhausted, true);
  assert.equal(second.snapshot().exhausted, false);
  assert.equal(second.snapshot().reservedRequests, 0);
});
