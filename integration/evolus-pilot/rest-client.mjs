// Optional server-side adapter. Importing/constructing does not call Evolus.
// No discovery, object creation, uploads, automatic execution, retries or raw errors.
import { assertPreparationCurrent } from './preparation.mjs';
import { validateModelCandidate } from '../../app/ai-contract.mjs';
import { createHash } from 'node:crypto';

const BASE = 'https://api.evolus.ai/api/v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const STATUSES = new Set(['Pending', 'Running', 'Completed', 'Failed']);
const MESSAGES = Object.freeze({
  DISABLED: 'The isolated Evolus adapter is disabled.',
  INVALID_CONFIGURATION: 'The isolated Evolus adapter configuration is invalid.',
  INVALID_INPUT: 'The explicitly approved synthetic input is invalid.',
  PREFLIGHT_BLOCKED: 'Current sources require human handoff or more support.',
  STALE_CONTEXT: 'The current source or revision context changed.',
  BUDGET_EXHAUSTED: 'The local transport request limit has been reached.',
  ABORTED: 'The local operation was cancelled; remote cancellation is not established.',
  TIMEOUT: 'The local deadline expired; remote completion or cancellation is not established.',
  NETWORK_ERROR: 'The provider request could not be completed.',
  HTTP_ERROR: 'The provider returned an unsuccessful status.',
  REDIRECT_REJECTED: 'A redirected provider response was rejected.',
  RESPONSE_TOO_LARGE: 'The provider response exceeded the byte limit.',
  INVALID_RESPONSE: 'The provider returned an unsupported or mismatched response.',
  WORKFLOW_FAILED: 'The workflow reports failure; no candidate was accepted.',
});
export class EvolusPilotError extends Error {
  constructor(code, httpStatus = null) { super(MESSAGES[code]); this.name = 'EvolusPilotError'; this.code = code; this.httpStatus = httpStatus; }
}
const fail = (code, status = null) => { throw new EvolusPilotError(code, status); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function ownRecord(value, allowed) {
  return record(value) && Reflect.ownKeys(value).every(key => typeof key === 'string' && allowed.includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function id(value) { if (typeof value !== 'string' || !UUID.test(value)) fail('INVALID_INPUT'); return value.toLowerCase(); }
function sameId(a, b) { return typeof a === 'string' && UUID.test(a) && a.toLowerCase() === b; }
function cancel(body) { try { const result = body?.cancel?.(); if (result?.catch) result.catch(() => {}); } catch {} }
function parameters(value) {
  if (value === undefined) return null;
  if (!record(value) || Reflect.ownKeys(value).length > 20) fail('INVALID_INPUT');
  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(key)
      || /(key|token|secret|password|authorization|credential|session)/i.test(key)
      || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('INVALID_INPUT');
    const item = descriptor.value;
    if (typeof item === 'string' && item.length <= 500) result[key] = item;
    else if (Array.isArray(item) && Object.getPrototypeOf(item) === Array.prototype && item.length <= 50
      && Reflect.ownKeys(item).length === item.length + 1 && item.every(entry => typeof entry === 'string' && entry.length <= 500)) result[key] = [...item];
    else fail('INVALID_INPUT');
  }
  return result;
}
function currentContext(args) {
  if (args.syntheticConfirmed !== true) fail('INVALID_INPUT');
  let current;
  try { current = assertPreparationCurrent(args.prepared, args.state, args.fixtures); }
  catch { fail('STALE_CONTEXT'); }
  if (current.outcome !== 'awaiting_human_source_review') fail('PREFLIGHT_BLOCKED');
  return current;
}
function content(current) {
  return JSON.stringify({ caseId: current.caseId, revision: current.revision,
    sourceDigest: current.sourceDigest, inputDigest: current.inputDigest, modelInput: current.modelInput });
}
function candidateResult(current, answer, outputFraming) {
  if (typeof answer !== 'string') fail('INVALID_RESPONSE');
  // Validate the raw output first, retaining the existing size/schema boundary.
  // Only an INVALID_JSON result can qualify for the explicit framing adaptation.
  let checked = validateModelCandidate(current.modelInput, answer);
  let body = answer, framingRemoved = false;
  if (outputFraming === 'single_json_fence' && checked.errors.some(error => error.code === 'INVALID_JSON')) {
    const match = /^[ \t\r\n]*```json\r?\n([\s\S]*?)\r?\n```[ \t\r\n]*$/.exec(answer);
    if (match && !match[1].includes('```')) {
      body = match[1];
      framingRemoved = true;
      // No repair, translation, trimming or change to the closed candidate contract.
      checked = validateModelCandidate(current.modelInput, body);
    }
  }
  const framing = outputFraming === 'single_json_fence' ? { outputFraming: {
    rawSha256: createHash('sha256').update(answer, 'utf8').digest('hex'),
    bodySha256: createHash('sha256').update(body, 'utf8').digest('hex'), framingRemoved,
  } } : {};
  return { formatValid: checked.formatValid, candidate: checked.formatValid ? checked.candidate : null,
    errors: checked.errors, requiresSemanticHumanReview: true, requiresCurrentStateRecheck: true,
    administrativeStateUnchanged: true, noExternalContactByThisClient: true,
    amdVerified: false, modelIdentityVerified: false, ...framing };
}
function consumption(value) {
  if (!record(value)) return { credits: null, pendingEntries: null, final: false };
  const credits = value.credits === null ? null : Number.isFinite(value.credits) && value.credits >= 0 ? value.credits : null;
  const pendingEntries = Number.isSafeInteger(value.pendingEntries) && value.pendingEntries >= 0 ? value.pendingEntries : null;
  return { credits, pendingEntries, final: credits !== null && pendingEntries === 0 };
}

// Offline only: OpenAPI provides codes 0..3, but no Indexed-to-code mapping.
export function inspectLibraryReadiness(value, { memoryId, documentId, indexedStatusCode = null }) {
  memoryId = id(memoryId); documentId = id(documentId);
  if (indexedStatusCode !== null && ![0, 1, 2, 3].includes(indexedStatusCode)) fail('INVALID_INPUT');
  if (!record(value) || !sameId(value.id, documentId) || !sameId(value.memoryId, memoryId)
    || ![0, 1, 2, 3].includes(value.ingestionStatus)
    || !(value.ingestionError === null || typeof value.ingestionError === 'string')) fail('INVALID_RESPONSE');
  return { memoryId, documentId, ingestionStatus: value.ingestionStatus, ingestionErrorPresent: Boolean(value.ingestionError),
    ready: indexedStatusCode !== null && value.ingestionStatus === indexedStatusCode && !value.ingestionError,
    readinessMappingSource: indexedStatusCode === null ? 'not_verified' : 'caller_configuration',
    sourceContentDigestVerified: false, providerRetrievalVerified: false, amdVerified: false };
}

// getApiKey belongs to the server's memory boundary. HTTP limits do not cap provider subcalls/retries.
export function createEvolusRestClient(config = {}, options = {}) {
  if (!ownRecord(config, ['enabled', 'applicationId', 'outputFraming'])
    || !ownRecord(options, ['fetchImpl', 'getApiKey', 'timeoutMs', 'maxBytes', 'maxRequestBytes', 'maxRequests'])) fail('INVALID_CONFIGURATION');
  const enabled = config.enabled === true;
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') fail('INVALID_CONFIGURATION');
  const outputFraming = Object.hasOwn(config, 'outputFraming') ? config.outputFraming : 'strict_json';
  if (!['strict_json', 'single_json_fence'].includes(outputFraming)) fail('INVALID_CONFIGURATION');
  let applicationId;
  try { applicationId = id(config.applicationId); } catch { if (enabled) fail('INVALID_CONFIGURATION'); }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const getApiKey = options.getApiKey ?? (() => fail('INVALID_CONFIGURATION'));
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxBytes = options.maxBytes ?? 262144;
  const maxRequestBytes = options.maxRequestBytes ?? 32768;
  const maxRequests = options.maxRequests ?? 8;
  if (typeof fetchImpl !== 'function' || typeof getApiKey !== 'function'
    || !Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000
    || !Number.isInteger(maxBytes) || maxBytes < 256 || maxBytes > 1048576
    || !Number.isInteger(maxRequestBytes) || maxRequestBytes < 256 || maxRequestBytes > 131072
    || !Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 16) fail('INVALID_CONFIGURATION');
  let reservedRequests = 0;
  const snapshot = () => ({ enabled, reservedRequests, remainingRequests: maxRequests - reservedRequests,
    maxRequests, timeoutMs, maxBytes, maxRequestBytes, providerQuotaVerified: false, amdVerified: false });

  async function request(method, route, body, extraHeaders = {}, signal, expectedStatus = 200, allowEmpty = false) {
    if (!enabled) fail('DISABLED');
    if (signal?.aborted) fail('ABORTED');
    if (reservedRequests >= maxRequests) fail('BUDGET_EXHAUSTED');
    if (body && new TextEncoder().encode(typeof body === 'string' ? body : '').byteLength > maxRequestBytes) fail('INVALID_INPUT');
    const controller = new AbortController();
    let activeBody, timer, abortHandler;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); cancel(activeBody); reject(new EvolusPilotError('TIMEOUT')); }, timeoutMs);
      abortHandler = () => { controller.abort(); cancel(activeBody); reject(new EvolusPilotError('ABORTED')); };
      signal?.addEventListener('abort', abortHandler, { once: true });
    });
    const run = async () => {
      let key;
      try { key = getApiKey(); } catch { fail('INVALID_CONFIGURATION'); }
      if (typeof key !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(key)) fail('INVALID_CONFIGURATION');
      reservedRequests += 1; // Never refunded after HTTP errors or local timeouts.
      const response = await fetchImpl(`${BASE}${route}`, { method, body,
        headers: { accept: 'application/json', 'X-ApiKey': key, 'X-Application-Id': applicationId, ...extraHeaders },
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal });
      activeBody = response.body;
      if (response.redirected) fail('REDIRECT_REJECTED');
      if (response.status !== expectedStatus) fail('HTTP_ERROR', Number.isInteger(response.status) ? response.status : null);
      const length = response.headers?.get?.('content-length');
      if (length && /^\d+$/.test(length) && Number(length) > maxBytes) fail('RESPONSE_TOO_LARGE');
      if (!response.body) { if (allowEmpty) return { value: null, headers: response.headers }; fail('INVALID_RESPONSE'); }
      const reader = response.body.getReader(); activeBody = reader;
      const chunks = []; let total = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        if (!(part.value instanceof Uint8Array)) fail('INVALID_RESPONSE');
        total += part.value.byteLength;
        if (total > maxBytes) fail('RESPONSE_TOO_LARGE');
        chunks.push(part.value);
      }
      if (!total && allowEmpty) return { value: null, headers: response.headers };
      if (!/^application\/(?:[A-Za-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i.test(response.headers?.get?.('content-type') ?? '')) fail('INVALID_RESPONSE');
      const bytes = new Uint8Array(total); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      try { return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), headers: response.headers }; }
      catch { fail('INVALID_RESPONSE'); }
    };
    try { return await Promise.race([run(), deadline]); }
    catch (error) { if (error instanceof EvolusPilotError) throw error; fail('NETWORK_ERROR'); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abortHandler); cancel(activeBody); }
  }

  async function executeWorkflow(args) {
    const workflowId = id(args.workflowId);
    const current = currentContext(args);
    if (args.executionApproved !== true || args.workflowSafetyConfirmed !== true) fail('INVALID_INPUT');
    const form = new FormData(); form.set('input', content(current));
    const params = parameters(args.parameters);
    if (params !== null) form.set('parameters', JSON.stringify(params));
    // Encode locally to enforce the actual multipart byte limit; no fetch occurs here.
    const encoded = new Request('https://api.evolus.ai', { method: 'POST', body: form });
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    if (bytes.byteLength > maxRequestBytes) fail('INVALID_INPUT');
    const { value, headers } = await request('POST', `/workflows/${workflowId}/execute`, bytes,
      { 'content-type': encoded.headers.get('content-type') }, args.signal, 202, true);
    const fromHeader = headers?.get?.('X-Workflow-Execution-Id');
    const executionId = record(value) && value.executionId !== undefined ? id(value.executionId) : id(fromHeader);
    if (fromHeader !== null && fromHeader !== undefined && !sameId(fromHeader, executionId)) fail('INVALID_RESPONSE');
    return { status: 'queued', workflowId, executionId, inputDigest: current.inputDigest,
      providerExecutionCompleted: false, amdVerified: false, remoteCancellationSupported: false };
  }

  /** One explicit GET per call. Pending/Running is never resubmitted or auto-polled. */
  async function pollWorkflow(args) {
    const workflowId = id(args.workflowId), executionId = id(args.executionId);
    const current = currentContext(args);
    const { value } = await request('GET', `/workflows/${workflowId}/executions/${executionId}`, undefined, {}, args.signal);
    if (!record(value) || !sameId(value.id, executionId) || !sameId(value.workflowId, workflowId)
      || !sameId(value.applicationId, applicationId) || !STATUSES.has(value.status)
      || value.input !== content(current)) fail('INVALID_RESPONSE');
    const result = { status: value.status, workflowId, executionId, inputDigest: current.inputDigest,
      reportedConsumption: consumption(value.consumption), formatValid: false, candidate: null,
      providerExecutionCompleted: value.status === 'Completed', requiresSemanticHumanReview: true,
      administrativeStateUnchanged: true, amdVerified: false, remoteCancellationSupported: false };
    if (value.status === 'Failed') return { ...result, errors: [{ code: 'WORKFLOW_FAILED', message: MESSAGES.WORKFLOW_FAILED }] };
    if (value.status !== 'Completed') return result;
    currentContext(args); // Recheck a shared state object changed during transport.
    return { ...result, ...candidateResult(current, value.output, outputFraming) };
  }

  return Object.freeze({ snapshot, executeWorkflow, pollWorkflow });
}
