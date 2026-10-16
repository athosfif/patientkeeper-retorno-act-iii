// Isolated synthetic pilot. Importing/constructing performs no I/O or request.
// start sends once and polls once; every further poll must be called explicitly.
import { createHash } from 'node:crypto';
import { prepareEvolusPilot, assertPreparationCurrent } from './preparation.mjs';
import { createEvolusRestClient } from './rest-client.mjs';
import { validateModelCandidate } from '../../app/ai-contract.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SAFE_CODES = new Set(['DISABLED', 'INVALID_CONFIGURATION', 'INVALID_INPUT', 'PREFLIGHT_BLOCKED', 'STALE_CONTEXT',
  'BUDGET_EXHAUSTED', 'ABORTED', 'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR', 'REDIRECT_REJECTED', 'RESPONSE_TOO_LARGE',
  'INVALID_RESPONSE', 'WORKFLOW_FAILED', 'RUNTIME_UNAVAILABLE', 'GLOBAL_DEADLINE', 'PILOT_FAILED',
  'CANDIDATE_LIMIT', 'CHANGED_QUOTE', 'CONTEXT_LIMIT', 'DUPLICATE_CITATION', 'DUPLICATE_SOURCE', 'HISTORICAL_SOURCE',
  'HUMAN_REVIEW_REQUIRED', 'INCONSISTENT_ABSTENTION', 'INCONSISTENT_ANSWER', 'INCONSISTENT_SOURCE', 'INVALID_ABSTENTION',
  'INVALID_CURRENT_FLAG', 'INVALID_ID', 'INVALID_JSON', 'INVALID_LIST', 'INVALID_MODEL', 'INVALID_SHAPE', 'INVALID_TEXT',
  'MISSING_FIELD', 'UNKNOWN_CASE', 'UNKNOWN_FIELD', 'UNKNOWN_SOURCE']);
const safeCode = code => ['STALE_REVISION', 'STALE_PREPARED_INPUT'].includes(code) ? 'STALE_CONTEXT'
  : SAFE_CODES.has(code) ? code : 'PILOT_FAILED';
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fail = code => { const error = new Error('The isolated pilot could not continue.'); error.code = code; throw error; };
function optionsRecord(value, allowed) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
    && Reflect.ownKeys(value).every(key => typeof key === 'string' && allowed.includes(key)
      && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function containsSecret(value, secrets) {
  if (typeof value === 'string') return [...secrets].some(secret => value.includes(secret));
  if (value && typeof value === 'object') return Object.values(value).some(item => containsSecret(item, secrets));
  return false;
}

/**
 * readCurrent() synchronously returns { state, fixtures } from the actual runtime.
 * getApiKey() supplies a key only in memory. observe(receipt) is a synchronous,
 * optional sink for sanitized evidence; its return value is never trusted.
 * The HTTP budget includes polls, not provider retries, tool calls or inference.
 */
export function createEvolusRuntimePilot(config = {}, options = {}) {
  if (!optionsRecord(config, ['enabled', 'applicationId', 'workflowId', 'outputFraming'])
    || !optionsRecord(options, ['readCurrent', 'getApiKey', 'fetchImpl', 'observe', 'deadlineMs',
      'timeoutMs', 'maxBytes', 'maxRequestBytes', 'maxRequests'])) fail('INVALID_CONFIGURATION');
  const enabled = config.enabled === true;
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') fail('INVALID_CONFIGURATION');
  if ((enabled || config.workflowId !== undefined) && (typeof config.workflowId !== 'string' || !UUID.test(config.workflowId))) fail('INVALID_CONFIGURATION');
  const workflowId = config.workflowId?.toLowerCase() ?? null;
  const deadlineMs = options.deadlineMs ?? 30000;
  if (!Number.isInteger(deadlineMs) || deadlineMs < 10 || deadlineMs > 120000
    || (options.readCurrent !== undefined && typeof options.readCurrent !== 'function')
    || (options.observe !== undefined && typeof options.observe !== 'function')
    || (options.getApiKey !== undefined && typeof options.getApiKey !== 'function')) fail('INVALID_CONFIGURATION');
  const secrets = new Set();
  const client = createEvolusRestClient({ enabled, ...(config.applicationId !== undefined ? { applicationId: config.applicationId } : {}),
    ...(Object.hasOwn(config, 'outputFraming') ? { outputFraming: config.outputFraming } : {}) }, {
    ...Object.fromEntries(['fetchImpl', 'timeoutMs', 'maxBytes', 'maxRequestBytes'].filter(key => Object.hasOwn(options, key)).map(key => [key, options[key]])),
    maxRequests: options.maxRequests ?? 4,
    getApiKey: () => {
      const key = options.getApiKey?.();
      if (typeof key === 'string' && key.length) secrets.add(key);
      return key;
    },
  });
  let session = null;
  let busy = false;

  function current(prepared, stateDigest) {
    let value;
    try { value = options.readCurrent?.(); } catch { fail('RUNTIME_UNAVAILABLE'); }
    if (!optionsRecord(value, ['state', 'fixtures']) || !value.state || !value.fixtures) fail('RUNTIME_UNAVAILABLE');
    // Work with copies, never mutable runtime references across an await.
    let snapshot;
    try { snapshot = structuredClone(value); } catch { fail('RUNTIME_UNAVAILABLE'); }
    if (prepared) {
      try { assertPreparationCurrent(prepared, snapshot.state, snapshot.fixtures); }
      catch { fail('STALE_CONTEXT'); }
      if (digest(snapshot.state) !== stateDigest) fail('STALE_CONTEXT');
    }
    return snapshot;
  }
  function checkCurrent() { return current(session.prepared, session.stateDigest); }
  function checkDeadline() {
    if (performance.now() >= session.deadlineAt) fail('GLOBAL_DEADLINE');
  }
  function report(status, extra = {}, prepared = session?.prepared) {
    const result = {
      status, syntheticOnly: true, workflowId,
      caseId: prepared?.caseId ?? null, revision: prepared?.revision ?? null,
      sourceDigest: prepared?.sourceDigest ?? null, inputDigest: prepared?.inputDigest ?? null,
      executionId: session?.executionId ?? null, providerStatus: null,
      providerExecutionCompleted: false, formatValid: false, candidate: null,
      requiresSemanticHumanReview: true, applicationStateWritesByRunner: 0,
      patientContactPerformed: false, modelIdentityVerified: false, amdVerified: false,
      remoteCancellationConfirmed: false,
      internalInferenceCallsBounded: false, httpBudget: client.snapshot(),
      globalDeadlineMs: deadlineMs, errors: [], ...extra,
    };
    // A reflected credential is never a candidate or evidence field.
    if (containsSecret(result, secrets)) return {
      status: 'error', candidate: null, formatValid: false, requiresSemanticHumanReview: true,
      applicationStateWritesByRunner: 0, errors: [{ code: 'SECRET_REFLECTION' }],
    };
    return structuredClone(result);
  }
  function deliver(result) {
    if (options.observe) {
      try {
        const returned = options.observe(structuredClone(result));
        if (returned && typeof returned.then === 'function') {
          Promise.resolve(returned).catch(() => {});
          result.observationCallbackFailed = true;
        }
      } catch { result.observationCallbackFailed = true; }
    }
    // An observer cannot turn a now-stale result into an accepted candidate.
    if (result.candidate) {
      try { checkCurrent(); checkDeadline(); }
      catch (error) { return errorReport(error); }
    }
    return result;
  }
  function errorReport(error, { terminate = true, prepared = session?.prepared } = {}) {
    const code = safeCode(error?.code);
    if (session && terminate) session.terminal = true;
    const status = code === 'STALE_CONTEXT' ? 'stale'
      : ['TIMEOUT', 'GLOBAL_DEADLINE'].includes(code) ? 'timeout'
        : code === 'ABORTED' ? 'cancelled' : 'error';
    return report(status, { errors: [{ code }], ...(!terminate ? { executionId: null } : {}) }, prepared);
  }
  async function bounded(operation, signal) {
    checkDeadline();
    if (signal?.aborted) fail('ABORTED');
    const controller = new AbortController();
    let timer, abort;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { const error = new Error(); error.code = 'GLOBAL_DEADLINE'; reject(error); controller.abort(); },
        Math.max(1, session.deadlineAt - performance.now()));
      abort = () => { controller.abort(); const error = new Error(); error.code = 'ABORTED'; reject(error); };
      signal?.addEventListener('abort', abort, { once: true });
    });
    try {
      const result = await Promise.race([operation(controller.signal), deadline]);
      checkDeadline();
      return result;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
  }
  async function pollOnce(signal) {
    checkDeadline();
    const snapshot = checkCurrent();
    const result = await bounded(innerSignal => client.pollWorkflow({ workflowId, executionId: session.executionId,
      prepared: session.prepared, ...snapshot, syntheticConfirmed: true, signal: innerSignal }), signal);
    const latest = checkCurrent();
    if (result.status === 'Pending' || result.status === 'Running') return report('pending', { providerStatus: result.status,
      reportedConsumption: result.reportedConsumption });
    session.terminal = true;
    if (result.status === 'Failed') return report('failed', { providerStatus: 'Failed', errors: [{ code: 'WORKFLOW_FAILED' }],
      reportedConsumption: result.reportedConsumption });
    // Revalidate against the newly read runtime, not a pre-transport snapshot.
    const input = assertPreparationCurrent(session.prepared, latest.state, latest.fixtures).modelInput;
    const checked = result.formatValid ? validateModelCandidate(input, result.candidate) : result;
    const extra = { providerStatus: 'Completed', providerExecutionCompleted: true,
      reportedConsumption: result.reportedConsumption, formatValid: checked.formatValid,
      candidate: checked.formatValid ? checked.candidate : null,
      ...(result.outputFraming ? { outputFraming: result.outputFraming } : {}),
      errors: (checked.errors ?? []).map(({ code }) => ({ code: safeCode(code) })) };
    return report(checked.formatValid ? checked.candidate.abstention ? 'abstained' : 'candidate' : 'invalid_candidate', extra);
  }

  function dryRun(request) {
    try {
      const snapshot = current();
      const prepared = prepareEvolusPilot(snapshot.state, request, snapshot.fixtures);
      return deliver(report('dry_run', { executionId: null, preflightOutcome: prepared.outcome, providerContacted: false }, prepared));
    } catch (error) { return deliver(errorReport(error, { terminate: false, prepared: null })); }
  }
  async function start(request, approval = {}) {
    if (!enabled) return deliver(report('disabled'));
    if (busy) return deliver(report('error', { errors: [{ code: 'PILOT_BUSY' }] }));
    if (session) return deliver(report('error', { errors: [{ code: 'ALREADY_STARTED' }] }));
    busy = true;
    try {
      if (!optionsRecord(approval, ['syntheticConfirmed', 'executionApproved', 'workflowSafetyConfirmed', 'signal'])
        || approval.syntheticConfirmed !== true || approval.executionApproved !== true || approval.workflowSafetyConfirmed !== true) fail('INVALID_INPUT');
      const snapshot = current();
      const prepared = prepareEvolusPilot(snapshot.state, request, snapshot.fixtures);
      if (prepared.outcome !== 'awaiting_human_source_review') return deliver(report('blocked', { preflightOutcome: prepared.outcome }, prepared));
      session = { prepared, stateDigest: digest(snapshot.state), deadlineAt: performance.now() + deadlineMs, executionId: null, terminal: false };
      const before = checkCurrent();
      const queued = await bounded(signal => client.executeWorkflow({ workflowId, prepared, ...before,
        syntheticConfirmed: true, executionApproved: true, workflowSafetyConfirmed: true, signal }), approval.signal);
      session.executionId = queued.executionId;
      checkCurrent();
      return deliver(await pollOnce(approval.signal));
    } catch (error) { return deliver(errorReport(error)); }
    finally { busy = false; }
  }
  async function poll({ signal } = {}) {
    if (!enabled) return deliver(report('disabled'));
    if (busy) return deliver(report('error', { errors: [{ code: 'PILOT_BUSY' }] }));
    if (!session?.executionId || session.terminal) return deliver(report('error', { errors: [{ code: 'NO_PENDING_EXECUTION' }] }));
    busy = true;
    try { return deliver(await pollOnce(signal)); }
    catch (error) { return deliver(errorReport(error)); }
    finally { busy = false; }
  }
  return Object.freeze({ dryRun, start, poll, snapshot: () => report('snapshot', { busy, terminal: session?.terminal ?? false }) });
}
