import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateModelCandidate } from '../../app/ai-contract.mjs';
import { createState } from '../../app/engine.mjs';
import { prepareEvolusPilot } from '../../integration/evolus-pilot/preparation.mjs';

const root=new URL('../../',import.meta.url);
const load=async name=>readFile(new URL(name,root),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');

test('dated Evolus proof retains the actual synthetic input and exact candidate under the unchanged validator',async()=>{
  const proof=JSON.parse(await load('docs/evolus-app-pilot-20261016.json'));
  const fixtures=JSON.parse(await load('CASOS-SINTETICOS.json'));
  const state=createState(fixtures,'2026-10-16T18:57:21.465Z');
  const prepared=prepareEvolusPilot(state,{caseId:proof.scope.caseId,question:proof.scope.question,expectedRevision:0},fixtures);
  assert.deepEqual(proof.context.modelInput,prepared.modelInput);
  assert.equal(proof.context.sourceDigest,prepared.sourceDigest);assert.equal(proof.context.inputDigest,prepared.inputDigest);
  const result=validateModelCandidate(proof.context.modelInput,proof.candidate);
  assert.equal(result.formatValid,true);assert.equal(result.requiresSemanticHumanReview,true);
  assert.deepEqual(result.candidate,proof.candidate);
  assert.deepEqual(proof.candidate.citations.map(item=>item.sourceId),['SIM02-CANCELAMENTO','SIM02-HANDOFF']);
  const tampered=structuredClone(proof.candidate);tampered.citations[0].trecho+=' ';
  assert.equal(validateModelCandidate(proof.context.modelInput,tampered).errors[0].code,'CHANGED_QUOTE');
  const action=structuredClone(proof.candidate);action.action='close';
  assert.equal(validateModelCandidate(proof.context.modelInput,action).formatValid,false);
});

test('recorded proof preserves limited provenance, unchanged state, rejected first run and closed allowance',async()=>{
  const raw=await load('docs/evolus-app-pilot-20261016.json'),proof=JSON.parse(raw),run=proof.observedExecution;
  assert.equal(proof.liveInference,false);assert.equal(proof.syntheticOnly,true);
  assert.equal(proof.validation.semanticApproved,false);assert.equal(proof.validation.clinicalValidation,false);
  assert.equal(run.providerDurationMs,8149);assert.equal(run.localTransportRequests,3);
  assert.deepEqual(run.languageChangedWhilePending,{from:'en',to:'pt'});assert.equal(run.explicitResultPoll,true);
  assert.equal(run.stateSha256Before,run.stateSha256After);assert.equal(run.applicationStateUnchanged,true);
  assert.equal(run.applicationStateWritesByRunner,0);assert.equal(run.patientContactPerformed,false);
  assert.equal(run.outputFraming.framingRemoved,false);assert.equal(run.outputFraming.rawSha256,run.outputFraming.bodySha256);
  assert.equal(proof.modelProvenance.modelIdentityVerifiedByExecutionResponse,false);
  assert.equal(proof.modelProvenance.amdVerifiedByExecutionResponse,false);
  assert.equal(proof.pilotBoundary.firstPortalRawOutputAcceptedByApp,false);
  assert.equal(proof.pilotBoundary.remainingAuthorizedExecutions,0);assert.equal(proof.pilotBoundary.internalInferenceCallsBounded,false);
  assert.equal(proof.closure.workflowActive,false);assert.equal(proof.closure.serverStopped,true);
  assert.equal(/(?:api[_-]?key|authorization|bearer|applicationId|workflowId|executionId|sessionId|\/Users\/|127\.0\.0\.1|localhost)/i.test(raw),false);
  for (const value of Object.values(proof.origin.sourceArtifactSha256)) assert.match(value,/^[a-f0-9]{64}$/);
});

test('static proof downloads are exact source copies and the public page discloses archived execution',async()=>{
  for (const extension of ['json','md']) {
    const source=await load(`docs/evolus-app-pilot-20261016.${extension}`);
    assert.equal(hash(await load(`public-demo/evolus-app-pilot-20261016.${extension}`)),hash(source));
  }
  const html=await load('public-demo/index.html');
  assert.match(html,/data-source-reading lang="en"><summary>Recorded Evolus pilot · 16 October 2026/);
  assert.match(html,/href="\.\/evolus-app-pilot-20261016\.json" download/);
  assert.match(html,/href="\.\/evolus-app-pilot-20261016\.md" download/);
  assert.match(html,/does not run a model or answer new questions in this browser/);
  assert.match(await load('public-demo/browser-api.mjs'),/EVOLUS_NOT_CONFIGURED/);
});
