// Isolated offline design preparation, not an Evolus SDK or API request body.
// Importing performs no I/O, transport, service startup or application-state write.
import { createHash } from 'node:crypto';
import { getModelInput, viewState } from '../../app/engine.mjs';
import { queryEvidence } from '../../app/evidence.mjs';
import { validateModelCandidate } from '../../app/ai-contract.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function historical(source) {
  return source.vigente === false || Object.hasOwn(source, 'substituida_por');
}

/** Uses the existing positive projection and preflight only. Never calls a provider. */
export function prepareEvolusPilot(state, request, fixtures) {
  const evidence = queryEvidence(state, request, fixtures);
  const input = getModelInput(state, request.caseId, request.question, fixtures);
  const medicalHandoff = Boolean(viewState(state, fixtures).cases.find(item => item.id === request.caseId)?.medicalHandoff);
  const outcome = evidence.outcome === 'human_handoff' || medicalHandoff
    ? 'human_handoff' : evidence.outcome === 'sources_found'
      ? 'awaiting_human_source_review' : 'source_support_missing';
  const inputDigest = digest({ revision: state.revision, ...input });
  return {
    schemaVersion: 1,
    status: 'prepared_offline_not_integrated',
    syntheticOnly: true,
    pilotEffect: 'None',
    transportAllowed: false,
    providerContacted: false,
    providerContractVerified: false,
    providerExecutionVerified: false,
    amdVerified: false,
    requiresSemanticHumanReview: true,
    caseId: input.caseId,
    revision: state.revision,
    question: input.question,
    sourceDigest: evidence.sourceDigest,
    inputDigest,
    outcome,
    localEvidenceOutcome: evidence.outcome,
    modelInput: input,
    workflowBlueprint: {
      kind: 'local_blueprint_not_vendor_object',
      purpose: 'Administrative follow-up source review; deliver a candidate or handoff to the doctor.',
      contextReference: { caseId: input.caseId, revision: state.revision, sourceDigest: evidence.sourceDigest, inputDigest },
      intendedSteps: ['verify_context', 'read_ready_source_library', 'prepare_closed_candidate_or_abstain', 'doctor_reviews_sources_and_meaning'],
      automaticStateChanges: [],
      externalContacts: [],
    },
    libraryBlueprint: {
      kind: 'local_blueprint_not_vendor_object',
      sourceDigest: evidence.sourceDigest,
      sources: structuredClone(input.sources),
      citationEligibleSourceIds: input.sources.filter(source => !historical(source)).map(source => source.id),
      historicalSourceIds: input.sources.filter(historical).map(source => source.id),
      indexingVerified: false,
      uploaded: false,
    },
  };
}

/** Reproject actual current sources; an old revision or changed context fails closed. */
export function assertPreparationCurrent(prepared, state, fixtures) {
  const current = prepareEvolusPilot(state, {
    caseId: prepared.caseId, question: prepared.question, expectedRevision: prepared.revision,
  }, fixtures);
  if (current.sourceDigest !== prepared.sourceDigest || current.inputDigest !== prepared.inputDigest) {
    const error = new Error('The prepared source or question context changed. Prepare and review it again.');
    error.code = 'STALE_PREPARED_INPUT';
    throw error;
  }
  return current;
}

/** A unit-check helper, not acceptance of a real provider result or a state mutation. */
export function validateOfflineCandidate(prepared, state, fixtures, candidate) {
  const current = assertPreparationCurrent(prepared, state, fixtures);
  if (current.outcome !== 'awaiting_human_source_review') {
    return { formatValid: false, requiresSemanticHumanReview: true, candidate: null,
      errors: [{ code: 'PILOT_PREFLIGHT_BLOCKED', message: 'The local source preflight requires handoff or more support.' }] };
  }
  return validateModelCandidate(current.modelInput, candidate);
}
