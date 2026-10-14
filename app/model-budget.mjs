// Per-process request limits only. They do not confirm a provider's free quota,
// pricing, token accounting or hardware. Importing this module performs no I/O.
const DEFAULTS = Object.freeze({
  maxRequests: 4,
  maxRequestBytes: 32768,
  maxOutputTokens: 1024,
});
const HARD_LIMITS = Object.freeze({
  maxRequests: 16,
  maxRequestBytes: 128 * 1024,
  // Match the existing administrative Chat Completions contract.
  maxOutputTokens: 1024,
});
const CONFIG_KEYS = Object.keys(DEFAULTS);
const RESERVATION_KEYS = ['requestBytes', 'maxOutputTokens'];
const MESSAGES = Object.freeze({
  INVALID_MODEL_BUDGET: 'The local model budget configuration is invalid.',
  INVALID_MODEL_BUDGET_REQUEST: 'The local model request reservation is invalid.',
  MODEL_BUDGET_INPUT_LIMIT: 'The request exceeds the local request byte limit.',
  MODEL_BUDGET_OUTPUT_LIMIT: 'The request exceeds the local output token limit.',
  MODEL_BUDGET_EXHAUSTED: 'The local model request budget is exhausted.',
});

export class ModelBudgetError extends Error {
  constructor(code) {
    super(MESSAGES[code]);
    this.name = 'ModelBudgetError';
    this.code = code;
  }
}

function fail(code) { throw new ModelBudgetError(code); }

function dataRecord(value, allowed, required = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && allowed.includes(key)
      && descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
  }) && required.every(key => Object.hasOwn(value, key));
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

/**
 * Creates a bounded local counter with no credential, endpoint or model input.
 * Each successful synchronous reservation counts before the caller sends its
 * request. Reservations cannot be refunded after failure, timeout or HTTP 429.
 * Restarting the process resets this counter; it is not a provider quota ledger.
 */
export function createModelBudget(config = {}) {
  if (!dataRecord(config, CONFIG_KEYS)) fail('INVALID_MODEL_BUDGET');
  const limits = {};
  for (const key of CONFIG_KEYS) {
    const value = Object.hasOwn(config, key) ? config[key] : DEFAULTS[key];
    if (!positiveInteger(value) || value > HARD_LIMITS[key]) fail('INVALID_MODEL_BUDGET');
    limits[key] = value;
  }
  Object.freeze(limits);
  let reservedRequests = 0;

  const snapshot = () => Object.freeze({
    ...limits,
    reservedRequests,
    remainingRequests: limits.maxRequests - reservedRequests,
    exhausted: reservedRequests >= limits.maxRequests,
  });

  const reserve = reservation => {
    if (!dataRecord(reservation, RESERVATION_KEYS, RESERVATION_KEYS)
      || !positiveInteger(reservation.requestBytes)
      || !positiveInteger(reservation.maxOutputTokens)) fail('INVALID_MODEL_BUDGET_REQUEST');
    if (reservedRequests >= limits.maxRequests) fail('MODEL_BUDGET_EXHAUSTED');
    if (reservation.requestBytes > limits.maxRequestBytes) fail('MODEL_BUDGET_INPUT_LIMIT');
    if (reservation.maxOutputTokens > limits.maxOutputTokens) fail('MODEL_BUDGET_OUTPUT_LIMIT');

    // No await, external callback or I/O occurs between validation and counting.
    reservedRequests += 1;
    return Object.freeze({
      requestNumber: reservedRequests,
      requestBytes: reservation.requestBytes,
      maxOutputTokens: reservation.maxOutputTokens,
    });
  };

  return Object.freeze({ reserve, snapshot });
}
