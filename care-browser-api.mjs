import { createCareJourneyState, validateCareJourneyState, transitionCareJourney } from './care-journey.mjs';

export const CARE_BROWSER_STORAGE_KEY = 'patientkeeper-care-journey-synthetic-v1';
const LOCK_NAME = `${CARE_BROWSER_STORAGE_KEY}-transaction`;
const MAX_BYTES = 128 * 1024;
const encoder = new TextEncoder();
class CareBrowserError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new CareBrowserError(status, code, message); };
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every(key => typeof key === 'string' && keys.includes(key)
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function safeJson(value, depth = 0) {
  if (depth > 25) fail(400, 'CARE_INVALID_SHAPE', 'The fictional request has an invalid shape.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || ![Object.prototype, Array.prototype].includes(Object.getPrototypeOf(value))) fail(400, 'CARE_INVALID_SHAPE', 'The fictional request has an invalid shape.');
  const own = Reflect.ownKeys(value);
  if (Array.isArray(value) && own.length !== value.length + 1) fail(400, 'CARE_INVALID_SHAPE', 'The fictional request has an invalid shape.');
  for (const key of own) {
    if (key === 'length' && Array.isArray(value)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype', 'toJSON'].includes(key)
      || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')
      || Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(key)) fail(400, 'CARE_INVALID_SHAPE', 'The fictional request has an invalid shape.');
    safeJson(descriptor.value, depth + 1);
  }
}
function preparedBody(body) {
  if (!exact(body, ['expectedRevision', 'action'])) fail(400, 'CARE_INVALID_SHAPE', 'The fictional request has an invalid shape.');
  safeJson(body);
  const raw = JSON.stringify(body);
  if (encoder.encode(raw).length > MAX_BYTES) fail(413, 'CARE_STORE_LIMIT', 'The fictional request exceeds the local storage limit.');
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail(400, 'CARE_INVALID_SHAPE', 'A nonnegative episode revision is required.');
  return JSON.parse(raw);
}
function publicError(error) {
  if (error instanceof CareBrowserError) return error;
  const code = typeof error?.code === 'string' && /^CARE_[A-Z_]{1,70}$/.test(error.code) ? error.code : 'CARE_STORE_UNAVAILABLE';
  const status = ['CARE_STALE_CONTEXT', 'CARE_IDEMPOTENCY_CONFLICT'].includes(code) ? 409 : code === 'CARE_STORE_UNAVAILABLE' ? 503 : 400;
  return new CareBrowserError(status, code, code === 'CARE_STALE_CONTEXT'
    ? 'The episode changed. Refresh before trying a new action.' : 'The fictional action was not saved. Previous data was preserved.');
}

/** Separate browser-local synthetic episode. Never calls fetch or configures a model/voice service. */
export function createCareBrowserApi(fallback, options = {}) {
  if (typeof fallback !== 'function') throw new TypeError('An existing request adapter is required.');
  const now = options.now ?? (() => new Date().toISOString());
  if (typeof now !== 'function') throw new TypeError('The clock must be a function.');
  const lockManager = Object.hasOwn(options, 'lockManager') ? options.lockManager : globalThis.navigator?.locks;
  let queue = Promise.resolve();
  const storage = () => {
    try {
      const target = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage;
      if (typeof target?.getItem !== 'function' || typeof target?.setItem !== 'function') throw new Error();
      return target;
    } catch { fail(503, 'CARE_STORE_UNAVAILABLE', 'Browser storage is unavailable. Previous data was preserved.'); }
  };
  function load() {
    let raw;
    try { raw = storage().getItem(CARE_BROWSER_STORAGE_KEY); }
    catch (error) { if (error instanceof CareBrowserError) throw error; fail(503, 'CARE_STORE_UNAVAILABLE', 'Browser storage is unavailable. Previous data was preserved.'); }
    if (raw === null) return { raw, state: createCareJourneyState(now()) };
    try {
      if (typeof raw !== 'string' || encoder.encode(raw).length > MAX_BYTES) throw new Error();
      const state = JSON.parse(raw); validateCareJourneyState(state);
      return { raw, state };
    } catch { fail(500, 'CARE_STORE_INVALID', 'The saved fictional episode is invalid. It was preserved; do not overwrite it.'); }
  }
  function commit(next, previousRaw) {
    validateCareJourneyState(next);
    const raw = JSON.stringify(next);
    if (encoder.encode(raw).length > MAX_BYTES) fail(413, 'CARE_STORE_LIMIT', 'The fictional episode reached its local storage limit. Previous data was preserved.');
    const target = storage();
    try {
      if (target.getItem(CARE_BROWSER_STORAGE_KEY) !== previousRaw) fail(409, 'CARE_STALE_CONTEXT', 'The episode changed. Refresh before trying a new action.');
      // One bounded setItem is atomic. The shared Web Lock protects all participating tabs.
      if (raw !== previousRaw) target.setItem(CARE_BROWSER_STORAGE_KEY, raw);
    } catch (error) { if (error instanceof CareBrowserError) throw error; fail(503, 'CARE_STORE_UNAVAILABLE', 'The fictional episode was not saved. Previous data was preserved.'); }
  }
  async function execute(route, body) {
    if (route === '/api/voice/status') {
      if (body !== undefined) fail(405, 'CARE_METHOD_NOT_ALLOWED', 'This route is read-only.');
      return { mode: 'local_asr', engine: 'faster-whisper', configured: false, enabled: false, busy: false,
        syntheticOnly: true, availability: 'local_version_only', model: null,
        maxAudioBytes: 5 * 1024 * 1024, maxDurationSeconds: 120, requiresHumanReview: true };
    }
    if (route === '/api/voice/transcribe') fail(503, 'VOICE_NOT_CONFIGURED', 'Audio transcription is available only in the explicitly configured local version. No audio was sent.');
    if (route === '/api/care/state') {
      if (body !== undefined) fail(405, 'CARE_METHOD_NOT_ALLOWED', 'This route is read-only.');
      return structuredClone(load().state);
    }
    if (body === undefined) fail(405, 'CARE_METHOD_NOT_ALLOWED', 'This route requires a fictional action.');
    const submitted = body;
    if (typeof lockManager?.request !== 'function') fail(501, 'CARE_LOCKS_UNAVAILABLE', 'This browser cannot safely coordinate saved episodes across tabs. Use a browser with Web Locks on HTTPS.');
    return lockManager.request(LOCK_NAME, { mode: 'exclusive' }, async () => {
      const { raw, state } = load();
      const next = transitionCareJourney(state, submitted.action, { expectedRevision: submitted.expectedRevision, now: now() });
      commit(next, raw); return structuredClone(next);
    });
  }
  return function request(route, body) {
    if (!['/api/care/state', '/api/care/actions', '/api/voice/status', '/api/voice/transcribe'].includes(route)) return fallback(route, body);
    let submitted = body;
    if (route === '/api/care/actions' && body !== undefined) {
      // Capture before queue/lock waits: caller edits cannot change the submitted action.
      // preparedBody validates data descriptors before any JSON serialization.
      try { submitted = preparedBody(body); }
      catch (error) { return Promise.reject(publicError(error)); }
    }
    const operation = queue.then(() => execute(route, submitted));
    queue = operation.catch(() => {});
    return operation.catch(error => { throw publicError(error); });
  };
}
