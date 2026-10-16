// Local-only HTTP boundary. It never creates workspace objects or persists state.
import { randomUUID } from 'node:crypto';
import { prepareEvolusPilot, assertPreparationCurrent } from './preparation.mjs';
import { createEvolusRuntimePilot } from './runtime-pilot.mjs';

export const EVOLUS_SCOPE = Object.freeze({ caseId: 'SIM-RET-02', question: 'Qual pendência continua aberta e quem é o responsável?' });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const exact = (value, keys) => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
  && Reflect.ownKeys(value).every(key => keys.includes(key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const copy = value => structuredClone(value);

/** Safe configuration only. The API key is intentionally not copied or returned. */
export function evolusConfigurationFromEnvironment(env = {}) {
  return {
    enabled: env.RETORNO_EVOLUS_ENABLED === '1',
    applicationId: env.RETORNO_EVOLUS_APPLICATION_ID,
    workflowId: env.RETORNO_EVOLUS_WORKFLOW_ID,
    sourceDigest: env.RETORNO_EVOLUS_SOURCE_DIGEST,
    inputDigest: env.RETORNO_EVOLUS_INPUT_DIGEST,
    ...(env.RETORNO_EVOLUS_OUTPUT_FRAMING !== undefined ? { outputFraming: env.RETORNO_EVOLUS_OUTPUT_FRAMING } : {}),
    ...(env.RETORNO_EVOLUS_MAX_EXECUTIONS !== undefined ? { maxExecutions: Number(env.RETORNO_EVOLUS_MAX_EXECUTIONS) } : {}),
    ...(env.RETORNO_EVOLUS_DEADLINE_MS !== undefined ? { deadlineMs: Number(env.RETORNO_EVOLUS_DEADLINE_MS) } : {}),
  };
}

export function createEvolusHttpApi(config = {}, { readCurrent, getApiKey, fetchImpl, observe,
  settle = async () => {}, runnerOptions = {} } = {}) {
  const maxExecutions = config.maxExecutions ?? 2;
  const deadlineMs = config.deadlineMs ?? 120000;
  const configured = config.enabled === true && typeof getApiKey === 'function'
    && UUID.test(config.applicationId ?? '') && UUID.test(config.workflowId ?? '')
    && HASH.test(config.sourceDigest ?? '') && HASH.test(config.inputDigest ?? '')
    && Number.isInteger(maxExecutions) && maxExecutions >= 1 && maxExecutions <= 2
    && Number.isInteger(deadlineMs) && deadlineMs >= 10 && deadlineMs <= 120000
    && (!Object.hasOwn(config, 'outputFraming') || ['strict_json', 'single_json_fence'].includes(config.outputFraming))
    && typeof readCurrent === 'function' && typeof settle === 'function';
  // This counter belongs to the server instance, not a recreated runner.
  let reservedExecutions = 0;
  let busy = false;
  const sessions = new Map();
  const limits = () => ({ maxExecutions: Number.isInteger(maxExecutions) && maxExecutions >= 1 && maxExecutions <= 2 ? maxExecutions : 2,
    reservedExecutions, remainingExecutions: configured ? maxExecutions - reservedExecutions : 0 });
  const base = () => ({ provider: 'evolus', scope: copy(EVOLUS_SCOPE), ...limits(), requiresSemanticHumanReview: true,
    applicationStateWritesByRunner: 0, patientContactPerformed: false, internalInferenceCallsBounded: false });
  function response(httpStatus, status, code, extra = {}) {
    return { httpStatus, body: { ...base(), status, sessionId: null, candidate: null, formatValid: false,
      errors: code ? [{ code }] : [], ...(httpStatus >= 400 ? { error: { code, message: 'A consulta Evolus não pôde continuar. Confira o estado e os limites locais.' } } : {}), ...extra } };
  }
  function current() {
    const snapshot = readCurrent();
    if (!exact(snapshot, ['state', 'fixtures'])) throw new Error('runtime unavailable');
    return snapshot;
  }
  function binding(snapshot) {
    const prepared = prepareEvolusPilot(snapshot.state, { ...EVOLUS_SCOPE, expectedRevision: snapshot.state.revision }, snapshot.fixtures);
    if (prepared.sourceDigest !== config.sourceDigest || prepared.inputDigest !== config.inputDigest) return null;
    return prepared;
  }
  function checkRevision(body, snapshot) {
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) return response(400, 'error', 'INVALID_REVISION');
    if (body.expectedRevision !== snapshot.state.revision) return response(409, 'stale', 'STALE_REVISION');
    return null;
  }
  function normalize(result, sessionId) {
    const allowed = ['status', 'caseId', 'revision', 'sourceDigest', 'inputDigest', 'formatValid', 'candidate', 'errors',
      'requiresSemanticHumanReview', 'providerExecutionCompleted', 'providerStatus', 'reportedConsumption', 'httpBudget',
      'globalDeadlineMs', 'remoteCancellationConfirmed', 'modelIdentityVerified', 'amdVerified', 'outputFraming'];
    const normalized = { ...base(), sessionId, ...Object.fromEntries(allowed.filter(key => Object.hasOwn(result, key)).map(key => [key, copy(result[key])])) };
    // Provider identifiers belong to the server, including when reflected by a model.
    const candidateText = JSON.stringify(normalized.candidate ?? '').toLowerCase();
    if ([config.applicationId, config.workflowId, result.executionId].some(id => typeof id === 'string' && candidateText.includes(id.toLowerCase()))) {
      normalized.status = 'error'; normalized.candidate = null; normalized.formatValid = false;
      normalized.errors = [{ code: 'EXTERNAL_ID_REFLECTION' }];
    }
    return normalized;
  }
  function invalidate(session, code) {
    session.terminal = true;
    session.unavailableReason = code;
    const stale = code === 'STALE_CONTEXT';
    session.result = response(stale ? 409 : 200, stale ? 'stale' : 'timeout', code, {
      sessionId: session.id, caseId: session.prepared.caseId, revision: session.prepared.revision,
      sourceDigest: session.prepared.sourceDigest, inputDigest: session.prepared.inputDigest,
      remoteCancellationConfirmed: false,
    }).body;
    return { httpStatus: stale ? 409 : 200, body: copy(session.result) };
  }
  // Status may retire a local pending session, but never polls/cancels/resubmits it.
  function pendingSession(snapshot) {
    for (const session of sessions.values()) {
      if (session.terminal) continue;
      try {
        assertPreparationCurrent(session.prepared, snapshot.state, snapshot.fixtures);
        if (!binding(snapshot)) throw new Error('binding changed');
      } catch { invalidate(session, 'STALE_CONTEXT'); continue; }
      if (performance.now() >= session.deadlineAt) { invalidate(session, 'GLOBAL_DEADLINE'); continue; }
      return session;
    }
    return null;
  }
  function finalResult(session, result) {
    if (session.unavailableReason) return { httpStatus: session.unavailableReason === 'STALE_CONTEXT' ? 409 : 200, body: copy(session.result) };
    try {
      const snapshot = current();
      assertPreparationCurrent(session.prepared, snapshot.state, snapshot.fixtures);
      if (!binding(snapshot)) throw new Error('binding changed');
    } catch {
      return invalidate(session, 'STALE_CONTEXT');
    }
    if (!session.terminal && performance.now() >= session.deadlineAt) return invalidate(session, 'GLOBAL_DEADLINE');
    session.result = normalize(result, session.id);
    session.terminal = result.status !== 'pending';
    return { httpStatus: result.status === 'stale' ? 409 : 200, body: session.result };
  }
  function status() {
    let bindingsCurrent = false;
    let recoverable = null;
    if (configured) {
      try {
        const snapshot = current();
        bindingsCurrent = Boolean(binding(snapshot));
        recoverable = pendingSession(snapshot);
      } catch {
        for (const session of sessions.values()) if (!session.terminal) invalidate(session, 'STALE_CONTEXT');
      }
    }
    const pending = recoverable !== null;
    const unavailable = pending ? null : [...sessions.values()].findLast(session => session.unavailableReason)?.unavailableReason ?? null;
    return { ...base(), configured, enabled: configured && bindingsCurrent, bindingsCurrent, busy, pending,
      pendingSession: recoverable ? { sessionId: recoverable.id, caseId: recoverable.prepared.caseId,
        revision: recoverable.prepared.revision, sourceDigest: recoverable.prepared.sourceDigest,
        inputDigest: recoverable.prepared.inputDigest, requiresSemanticHumanReview: true } : null,
      pendingSessionUnavailableReason: unavailable,
      canStart: configured && bindingsCurrent && !busy && !pending && reservedExecutions < maxExecutions,
      disabledReason: !configured ? 'EVOLUS_NOT_CONFIGURED' : !bindingsCurrent ? 'CONTEXT_BINDING_MISMATCH' : null };
  }
  async function query(body) {
    if (!exact(body, ['caseId', 'question', 'expectedRevision'])) return response(400, 'error', 'INVALID_BODY');
    if (!configured) return response(503, 'disabled', 'EVOLUS_NOT_CONFIGURED');
    if (body.caseId !== EVOLUS_SCOPE.caseId || body.question !== EVOLUS_SCOPE.question) return response(400, 'blocked', 'EVOLUS_SCOPE_REQUIRED');
    if (busy) return response(429, 'error', 'EVOLUS_BUSY');
    busy = true;
    try {
      await settle();
      const snapshot = current();
      const revisionError = checkRevision(body, snapshot);
      if (revisionError) return revisionError;
      const prepared = binding(snapshot);
      if (!prepared) return response(409, 'stale', 'CONTEXT_BINDING_MISMATCH');
      if (prepared.outcome !== 'awaiting_human_source_review') return response(200, 'blocked', 'PREFLIGHT_BLOCKED');
      const pending = pendingSession(snapshot);
      // A repeated click during an existing run never resubmits that workflow.
      if (pending) return { httpStatus: 200, body: copy(pending.result) };
      if (reservedExecutions >= maxExecutions) return response(429, 'error', 'EVOLUS_EXECUTION_LIMIT');
      const runner = createEvolusRuntimePilot({ enabled: true, applicationId: config.applicationId, workflowId: config.workflowId,
        ...(Object.hasOwn(config, 'outputFraming') ? { outputFraming: config.outputFraming } : {}) }, {
        ...runnerOptions, deadlineMs, maxRequests: runnerOptions.maxRequests ?? 8, readCurrent, getApiKey,
        ...(fetchImpl ? { fetchImpl } : {}), ...(observe ? { observe } : {}),
      });
      const session = { id: randomUUID(), runner, prepared, terminal: false, result: null,
        deadlineAt: performance.now() + deadlineMs, unavailableReason: null };
      sessions.set(session.id, session);
      reservedExecutions += 1; // No refund or implicit retry, even on timeout/error.
      const result = await runner.start(body, { syntheticConfirmed: true, executionApproved: true, workflowSafetyConfirmed: true });
      await settle();
      return finalResult(session, result);
    } catch { return response(500, 'error', 'EVOLUS_RUNTIME_UNAVAILABLE'); }
    finally { busy = false; }
  }
  async function poll(body) {
    if (!exact(body, ['sessionId', 'expectedRevision']) || typeof body.sessionId !== 'string' || !UUID.test(body.sessionId)) return response(400, 'error', 'INVALID_BODY');
    if (!configured) return response(503, 'disabled', 'EVOLUS_NOT_CONFIGURED');
    if (busy) return response(429, 'error', 'EVOLUS_BUSY');
    const session = sessions.get(body.sessionId);
    if (!session) return response(404, 'error', 'EVOLUS_SESSION_NOT_FOUND');
    busy = true;
    try {
      await settle();
      const revisionError = checkRevision(body, current());
      if (revisionError) return revisionError;
      if (session.terminal) return finalResult(session, session.result);
      const result = await session.runner.poll();
      await settle();
      return finalResult(session, result);
    } catch { return response(500, 'error', 'EVOLUS_RUNTIME_UNAVAILABLE'); }
    finally { busy = false; }
  }
  return Object.freeze({ status, query, poll });
}
