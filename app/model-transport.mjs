// Prepared on 12 October 2026. Importing this module performs no network request.
// A configured endpoint is not proof of AMD hardware or semantic correctness.
import { buildModelRequest, validateModelCandidate } from './ai-contract.mjs';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_BYTES = 262144;
const CONFIG_KEYS = ['endpoint', 'model', 'apiKey'];
const OPTION_KEYS = ['fetchImpl', 'timeoutMs', 'maxBytes'];
const OUTPUT_LANGUAGE = 'Write the candidate answer and abstention reason in English. Preserve all cited source excerpts exactly in their original language.';
const ERRORS = Object.freeze({
  DISABLED: 'Model inference is disabled because no endpoint and model were configured.',
  INVALID_CONFIGURATION: 'Configure an explicit model and an HTTPS or loopback HTTP Chat Completions endpoint.',
  INVALID_OPTIONS: 'The transport options are not valid.',
  INVALID_INPUT: 'The model context did not pass the local input contract.',
  TRANSPORT_UNAVAILABLE: 'A Fetch implementation is not available in this runtime.',
  NETWORK_ERROR: 'The configured model endpoint could not complete the request.',
  TIMEOUT: 'The model request exceeded its bounded deadline.',
  HTTP_ERROR: 'The model endpoint returned an unsuccessful HTTP status.',
  REDIRECT_REJECTED: 'The model endpoint returned a redirect; no redirected request was sent.',
  RESPONSE_TOO_LARGE: 'The model response exceeded the configured byte limit.',
  INVALID_RESPONSE: 'The model endpoint returned an unsupported response envelope.',
  INVALID_JSON: 'The model endpoint did not return a complete JSON response.',
  INVALID_ENCODING: 'The model response did not contain valid UTF-8.',
  REFUSED: 'The model endpoint refused this request.',
  INCOMPLETE: 'The model endpoint did not finish one complete candidate.',
  ACTION_REJECTED: 'The model endpoint returned a tool or function call, which is not permitted.',
  INVALID_CANDIDATE: 'The model candidate did not pass the local output contract.',
});

function isDataRecord(value, allowed) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && allowed.includes(key) && descriptor?.enumerable
      && Object.hasOwn(descriptor, 'value');
  });
}

function failure(code) {
  const error = new Error(ERRORS[code] ?? ERRORS.NETWORK_ERROR);
  error.code = code;
  return error;
}

function normalizedConfiguration(config) {
  if (config == null) return { enabled: false };
  if (!isDataRecord(config, CONFIG_KEYS)) throw failure('INVALID_CONFIGURATION');
  if (Reflect.ownKeys(config).length === 0) return { enabled: false };
  if (!Object.hasOwn(config, 'endpoint') || !Object.hasOwn(config, 'model')
    || typeof config.endpoint !== 'string' || config.endpoint.length > 2048
    || !/^https?:\/\//.test(config.endpoint) || /[\s\\?#]/.test(config.endpoint)
    || typeof config.model !== 'string' || config.model.length > 128
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(config.model)) throw failure('INVALID_CONFIGURATION');
  let url;
  try { url = new URL(config.endpoint); } catch { throw failure('INVALID_CONFIGURATION'); }
  const address = config.endpoint.slice(config.endpoint.indexOf('://') + 3);
  const authority = address.split('/')[0];
  const rawPath = address.slice(authority.length);
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]'
    || /^127(?:\.[0-9]{1,3}){3}$/.test(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    || !url.hostname || authority.includes('@') || url.username || url.password
    || url.search || url.hash
    || !['/v1', '/v1/', '/v1/chat/completions'].includes(rawPath)
    || url.pathname !== rawPath) throw failure('INVALID_CONFIGURATION');
  if (url.pathname !== '/v1/chat/completions') url.pathname = '/v1/chat/completions';
  if (Object.hasOwn(config, 'apiKey') && (typeof config.apiKey !== 'string'
    || config.apiKey.length < 1 || config.apiKey.length > 512
    || !/^[\x21-\x7e]+$/.test(config.apiKey))) throw failure('INVALID_CONFIGURATION');
  return { enabled: true, endpoint: url.href, model: config.model, apiKey: Object.hasOwn(config, 'apiKey') ? config.apiKey : undefined };
}

/** Safe configuration summary; never returns the supplied API key. */
export function validateModelConfiguration(config) {
  try {
    const checked = normalizedConfiguration(config);
    if (!checked.enabled) return { valid: true, enabled: false, endpoint: null, model: null, errors: [] };
    return { valid: true, enabled: true, endpoint: checked.endpoint, model: checked.model, errors: [] };
  } catch {
    return { valid: false, enabled: false, endpoint: null, model: null, errors: [{ code: 'INVALID_CONFIGURATION', message: ERRORS.INVALID_CONFIGURATION }] };
  }
}

function checkedOptions(options) {
  if (!isDataRecord(options, OPTION_KEYS)) throw failure('INVALID_OPTIONS');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000
    || !Number.isInteger(maxBytes) || maxBytes < 256 || maxBytes > 1048576
    || (Object.hasOwn(options, 'fetchImpl') && typeof options.fetchImpl !== 'function')) throw failure('INVALID_OPTIONS');
  return { fetchImpl: options.fetchImpl ?? globalThis.fetch, timeoutMs, maxBytes };
}

function cancelBody(body) {
  try { Promise.resolve(body?.cancel?.()).catch(() => {}); } catch { /* No remote error text is exposed. */ }
}

async function readBoundedJson(response, maximum, setReader) {
  const contentType = response.headers?.get?.('content-type');
  if (typeof contentType !== 'string' || !/^application\/(?:[A-Za-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) throw failure('INVALID_RESPONSE');
  const length = response.headers?.get?.('content-length');
  if (length !== null && length !== undefined && /^\d+$/.test(length) && Number(length) > maximum) throw failure('RESPONSE_TOO_LARGE');
  if (!response.body || typeof response.body.getReader !== 'function') throw failure('INVALID_RESPONSE');
  const reader = response.body.getReader();
  setReader(reader);
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw failure('INVALID_RESPONSE');
      total += value.byteLength;
      if (total > maximum) throw failure('RESPONSE_TOO_LARGE');
      chunks.push(new Uint8Array(value));
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body;
    try { body = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw failure('INVALID_ENCODING'); }
    try { return JSON.parse(body); } catch { throw failure('INVALID_JSON'); }
  } finally {
    // Cancellation is deliberately not awaited: a faulty remote stream must not extend the deadline.
    cancelBody(reader);
    try { reader.releaseLock(); } catch { /* The deadline may have a pending read. */ }
    setReader(null);
  }
}

function candidateContent(envelope) {
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)
    || !Array.isArray(envelope.choices) || envelope.choices.length !== 1) throw failure('INVALID_RESPONSE');
  const choice = envelope.choices[0];
  const message = choice?.message;
  if (!message || typeof message !== 'object' || Array.isArray(message) || message.role !== 'assistant') throw failure('INVALID_RESPONSE');
  if (message.refusal !== undefined && message.refusal !== null && message.refusal !== '') throw failure('REFUSED');
  if ((message.tool_calls !== undefined && message.tool_calls !== null
    && (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0))
    || (message.function_call !== undefined && message.function_call !== null)) throw failure('ACTION_REJECTED');
  if (!isDataRecord(message, ['role', 'content', 'refusal', 'tool_calls', 'function_call', 'reasoning', 'reasoning_content'])) throw failure('INVALID_RESPONSE');
  if (choice.finish_reason !== 'stop') throw failure('INCOMPLETE');
  if (typeof message.content !== 'string' || !message.content.trim()) throw failure('INVALID_RESPONSE');
  return message.content;
}

/**
 * Executes one explicit request; no retries, discovery, model startup or state writes.
 * The caller must supply only the engine's current positive projection and recheck
 * its revision before showing the result. This module cannot authenticate that origin.
 */
export async function executeModelQuery(input, config, options = {}) {
  const started = performance.now();
  let attempted = false;
  let httpStatus = null;
  const result = (status, extra = {}) => ({
    status,
    transportAttempted: attempted,
    durationMs: Math.max(0, Math.round(performance.now() - started)),
    httpStatus,
    formatValid: false,
    requiresSemanticHumanReview: true,
    amdVerified: false,
    candidate: null,
    errors: [],
    ...extra,
  });
  let checked;
  let settings;
  let request;
  try {
    checked = normalizedConfiguration(config);
    if (!checked.enabled) return result('disabled', { errors: [{ code: 'DISABLED', message: ERRORS.DISABLED }] });
    settings = checkedOptions(options);
    if (typeof settings.fetchImpl !== 'function') return result('error', { errors: [{ code: 'TRANSPORT_UNAVAILABLE', message: ERRORS.TRANSPORT_UNAVAILABLE }] });
    try {
      request = buildModelRequest(input, { model: checked.model });
      request.messages[0].content += `\n${OUTPUT_LANGUAGE}`;
    } catch { throw failure('INVALID_INPUT'); }
  } catch (error) {
    const code = Object.hasOwn(ERRORS, error.code) ? error.code : 'INVALID_CONFIGURATION';
    return result('error', { errors: [{ code, message: ERRORS[code] }] });
  }
  // Freeze the validated request context in time; never validate against a later caller mutation.
  const context = JSON.parse(request.messages[1].content);
  const controller = new AbortController();
  let activeReader = null;
  let responseBody = null;
  let expired = false;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      controller.abort();
      cancelBody(activeReader ?? responseBody);
      reject(failure('TIMEOUT'));
    }, settings.timeoutMs);
  });
  const run = async () => {
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (checked.apiKey !== undefined) headers.authorization = `Bearer ${checked.apiKey}`;
    attempted = true;
    const response = await settings.fetchImpl(checked.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, stream: false }),
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (expired) { cancelBody(response?.body); throw failure('TIMEOUT'); }
    responseBody = response?.body;
    if (!Number.isInteger(response?.status) || response.status < 100 || response.status > 599) throw failure('INVALID_RESPONSE');
    httpStatus = response.status;
    if (response.redirected || (httpStatus >= 300 && httpStatus <= 399)) throw failure('REDIRECT_REJECTED');
    if (httpStatus < 200 || httpStatus > 299) throw failure('HTTP_ERROR');
    const envelope = await readBoundedJson(response, settings.maxBytes, (reader) => { activeReader = reader; });
    if (expired) throw failure('TIMEOUT');
    const validation = validateModelCandidate(context, candidateContent(envelope));
    if (!validation.formatValid) return result('invalid_candidate', {
      errors: validation.errors.map(({ code }) => ({ code, message: ERRORS.INVALID_CANDIDATE })),
    });
    return result(validation.candidate.abstention ? 'abstained' : 'candidate', {
      formatValid: true,
      candidate: validation.candidate,
    });
  };
  try {
    return await Promise.race([run(), deadline]);
  } catch (error) {
    const code = expired ? 'TIMEOUT' : Object.hasOwn(ERRORS, error.code) ? error.code : 'NETWORK_ERROR';
    return result(['REFUSED', 'INCOMPLETE'].includes(code) ? 'unavailable' : 'error', { errors: [{ code, message: ERRORS[code] }] });
  } finally {
    clearTimeout(timer);
    controller.abort();
    cancelBody(activeReader ?? responseBody);
  }
}
