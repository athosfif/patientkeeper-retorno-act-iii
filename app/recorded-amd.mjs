// A recorded run is evidence of an earlier execution, never a live model service.
// Recheck the candidate and the entire current positive projection before display.
import { buildModelRequest, validateModelCandidate } from './ai-contract.mjs';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).every(key => typeof key === 'string'
    && !['__proto__', 'constructor', 'prototype'].includes(key)
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const shortText = (value, limit = 160) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const utcTime = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value)
  && Number.isFinite(Date.parse(value));
const denied = (code, receipt) => ({ available: false, code, candidate: null,
  liveInference: false, requiresSemanticHumanReview: true,
  ...(receipt ? { provenance: receipt.provenance, latencySeconds: receipt.latencySeconds,
    gpuOff: true, semanticApproved: false } : {}) });

function checkedContext(context) {
  // Reuse the same closed input contract as the model path, without transport.
  const request = buildModelRequest(context, { model: 'recorded/context-validation' });
  return JSON.parse(request.messages[1].content);
}

/** Includes historical entries and flags; no translation, trimming or subset matching. */
export function recordedContextMatches(recorded, current) {
  try {
    return JSON.stringify(checkedContext(recorded)) === JSON.stringify(checkedContext(current));
  } catch { return false; }
}

/** The public archive is intentionally small and only contains synthetic cases. */
export function readRecordedAMDArchive(archive) {
  if (!plain(archive) || archive.schemaVersion !== 1 || !Array.isArray(archive.records)
    || archive.records.length > 16 || !archive.records.every(record => plain(record)
      && plain(record.context) && plain(record.result) && plain(record.provenance))) {
    return { valid: false, records: [], code: 'INVALID_ARCHIVE' };
  }
  return { valid: true, records: archive.records };
}

/** Recount the pilot archive; format acceptance is never semantic approval. */
export function readRecordedAMDStatistics(archive) {
  const checked = readRecordedAMDArchive(archive);
  if (!checked.valid || !plain(archive.statistics) || !Array.isArray(archive.otherAttempts)
    || archive.otherAttempts.length > 16 || archive.statistics.semanticApproved !== false) return null;
  const attempts = [...checked.records, ...archive.otherAttempts];
  if (!attempts.every(record => plain(record) && plain(record.context) && plain(record.result)
    && plain(record.provenance) && record.result.gpuInferenceExecuted === true
    && record.result.semanticApproved === false)) return null;
  if (new Set(checked.records.map(record => record.context.caseId)).size !== checked.records.length) return null;
  const formatAccepted = record => {
    try {
      return record.result.status === 'candidate' && plain(record.result.validation) && record.result.validation.formatValid === true
        && validateModelCandidate(checkedContext(record.context), record.result.validation.candidate).formatValid;
    } catch { return false; }
  };
  const counted = { totalAttempts: attempts.length,
    formatValidAttempts: attempts.filter(formatAccepted).length,
    baselineCases: checked.records.length,
    formatValidBaselineCases: checked.records.filter(formatAccepted).length,
    semanticApproved: false };
  if (!['totalAttempts', 'formatValidAttempts', 'baselineCases', 'formatValidBaselineCases']
    .every(key => Number.isSafeInteger(archive.statistics[key]) && archive.statistics[key] === counted[key])) return null;
  return counted;
}

/** One fixed question per displayed case; ambiguous archives cannot pick an answer. */
export function findRecordedAMDRecord(archive, caseId) {
  const checked = readRecordedAMDArchive(archive);
  if (!checked.valid) return { record: null, code: checked.code };
  const matches = checked.records.filter(record => record.context.caseId === caseId);
  if (matches.length !== 1) return { record: null, code: matches.length ? 'AMBIGUOUS_RECORD' : 'NO_RECORDED_RUN' };
  return { record: matches[0], code: null };
}

/** Sanitized display data; format validation does not approve factual meaning. */
export function evaluateRecordedAMDRecord(record, currentContext, { humanHandoff = false } = {}) {
  if (!plain(record) || !plain(record.context) || !plain(record.result) || !plain(record.provenance)) return denied('INVALID_RECORD');
  if (!recordedContextMatches(record.context, currentContext)) return denied('CONTEXT_CHANGED');
  const { result, provenance } = record;
  if (!shortText(provenance.runId) || !/^RUN-[A-Za-z0-9-]+$/.test(provenance.runId)
    || !shortText(provenance.model, 128) || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(provenance.model)
    || !/^[a-f0-9]{40}$/.test(provenance.revision || '')
    || !shortText(provenance.deviceName) || !/^AMD (?:Radeon|Instinct)\b/.test(provenance.deviceName)
    || !shortText(provenance.torchHip, 80)
    || !['float32', 'float16', 'bfloat16'].includes(provenance.dtype)
    || provenance.cloudShutdownVerified !== true || !utcTime(provenance.cloudShutdownAt)) return denied('UNVERIFIED_PROVENANCE');
  if (result.runId !== provenance.runId || result.caseId !== record.context.caseId
    || result.gpuInferenceExecuted !== true || result.semanticApproved !== false
    || !Number.isFinite(result.latencySeconds) || result.latencySeconds < 0 || result.latencySeconds > 720) return denied('UNVERIFIED_EXECUTION');
  const displayProvenance = {
    runId: provenance.runId, model: provenance.model, revision: provenance.revision,
    deviceName: provenance.deviceName, torchHip: provenance.torchHip, dtype: provenance.dtype,
    cloudShutdownAt: provenance.cloudShutdownAt,
  };
  for (const key of ['torch', 'transformers', 'python']) {
    if (shortText(provenance[key], 80)) displayProvenance[key] = provenance[key];
  }
  const receipt = { provenance: displayProvenance, latencySeconds: result.latencySeconds };
  // The authoritative current evidence query owns this gate. Even an archived
  // abstention cannot become a clinical or conflicting-record answer on replay.
  if (humanHandoff) return denied('HUMAN_HANDOFF', receipt);
  if (!plain(result.validation) || result.validation.formatValid !== true || !result.validation.candidate
    || result.status !== 'candidate') return denied('RECORDED_CANDIDATE_REJECTED', receipt);
  let validation;
  try { validation = validateModelCandidate(currentContext, result.validation.candidate); }
  catch { return denied('INVALID_RECORD', receipt); }
  if (!validation.formatValid) return denied('INVALID_RECORDED_CANDIDATE', receipt);
  return { available: true, code: null, question: checkedContext(currentContext).question,
    candidate: validation.candidate, provenance: displayProvenance,
    latencySeconds: result.latencySeconds, liveInference: false,
    gpuOff: true, requiresSemanticHumanReview: true, semanticApproved: false };
}
