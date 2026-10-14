import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareJourneyState, validateCareJourneyState, transitionCareJourney, viewCareJourney, exportCareJourneySummary, CARE_OWNERS } from '../care-journey.mjs';

const NOW='2026-10-14T22:00:00.000Z';
const DUE='2026-10-15T15:00:00.000Z';
let sequence=0;
const action=(type,fields={})=>({type,idempotencyKey:`TEST-${++sequence}`,...fields});
const apply=(state,type,fields={})=>transitionCareJourney(state,action(type,fields),{expectedRevision:state.revision,now:NOW});
const initial=()=>createCareJourneyState(NOW);
const plan=()=>apply(initial(),'plan',{phase:'preoperative',owner:'MED-SIM-A',nextAction:'Conferir recebimento das orientações da equipe.',dueAt:DUE});
const sourceReviewed=()=>apply(plan(),'protocol_review',{confirmed:true});
const contactReady=()=>{
  let state=apply(sourceReviewed(),'preference',{value:'opt_in'});
  state=apply(state,'message_prepare',{text:'Você recebeu as orientações da equipe? Encaminhe dúvidas ao médico.'});
  return apply(state,'message_review',{confirmed:true});
};
const rejected=(state,type,fields,code)=>{
  const before=JSON.stringify(state);
  assert.throws(()=>apply(state,type,fields),error=>error.code===code);
  assert.equal(JSON.stringify(state),before,'rejected actions cannot mutate the authoritative episode');
};
const manual=state=>apply(state,'transcript_set',{
  text:'Recebi as orientações. Quero confirmar o canal de contato.',
  segments:[{id:'SEG-001',text:'Recebi as orientações.',start:null,end:null},{id:'SEG-002',text:'Quero confirmar o canal de contato.',start:null,end:null}],
  provenance:{mode:'manual_text',engine:null,modelId:null,modelRevision:null},confirmed:true,
});

test('the physician workspace starts synthetic with clinical care pending and no secretary dependency',()=>{
  const state=initial(),view=viewCareJourney(state,{language:'pt',now:NOW});
  assert.equal(validateCareJourneyState(state),true);
  assert.equal(state.owner,'MED-SIM-A');
  assert.deepEqual(CARE_OWNERS,['MED-SIM-A','MED-SIM-B']);
  assert.equal(view.surgeryLabel,'Cirurgia de joanete e bunionete');
  assert.deepEqual(state.clinicalProtocol,{status:'pending',version:null,source:null});
  assert.equal(view.canPrepareMessage,false);
  for(const flag of ['externalContact','liveModelGeneration','signedMedicalRecord','clinicalCareAvailable']) assert.equal(view[flag],false);
  rejected(initial(),'plan',{phase:'preoperative',owner:'SEC-SIM-A',nextAction:'Conferir.',dueAt:DUE},'CARE_INVALID_PLAN');
});

test('administrative deadline is entered by a human and cannot manufacture a clinical protocol',()=>{
  rejected(initial(),'protocol_review',{confirmed:true},'CARE_PLAN_REQUIRED');
  const state=plan();
  assert.equal(state.dueAt,DUE);
  assert.equal(viewCareJourney(state,{now:'2026-10-16T12:00:00.000Z'}).administrativeOverdue,true);
  assert.deepEqual(state.clinicalProtocol,initial().clinicalProtocol);
  rejected(initial(),'plan',{phase:'postoperative',owner:'MED-SIM-A',nextAction:'Conferir recebimento.',dueAt:'2026-10-14T21:59:00.000Z'},'CARE_INVALID_DUE');
  const forged=structuredClone(state);forged.clinicalProtocol.status='approved';
  assert.throws(()=>validateCareJourneyState(forged),error=>error.code==='CARE_CLINICAL_PROTOCOL_PENDING');
});

test('prepared text is not contact and contact requires consent plus current source and message review',()=>{
  rejected(plan(),'message_prepare',{text:'Recebeu?'},'CARE_CONTACT_BLOCKED');
  let state=apply(plan(),'preference',{value:'opt_in'});
  rejected(state,'message_prepare',{text:'Recebeu?'},'CARE_PROTOCOL_REVIEW_REQUIRED');
  state=apply(state,'protocol_review',{confirmed:true});
  state=apply(state,'message_prepare',{text:'Recebeu as orientações da equipe?'});
  assert.equal(state.contacts.length,0);
  rejected(state,'contact_simulate',{confirmed:true},'CARE_MESSAGE_REVIEW_REQUIRED');
  state=apply(state,'message_review',{confirmed:true});
  assert.equal(viewCareJourney(state,{now:NOW}).canSimulateContact,true);
  state=apply(state,'contact_simulate',{confirmed:true});
  assert.equal(state.contacts.length,1);
  assert.equal(state.contacts[0].status,'simulation');
  assert.equal(exportCareJourneySummary(state).externalContact,false);
  rejected(state,'contact_simulate',{confirmed:true},'CARE_DUPLICATE_CONTACT');
});

test('refusal immediately blocks prepared or reviewed contact without deleting the historical record',()=>{
  let state=apply(contactReady(),'contact_simulate',{confirmed:true});
  state=apply(state,'preference',{value:'refused'});
  assert.equal(state.message.reviewedRevision,null);
  assert.equal(state.contacts.length,1);
  assert.equal(viewCareJourney(state,{now:NOW}).canSimulateContact,false);
  rejected(state,'message_prepare',{text:'A second message'},'CARE_CONTACT_BLOCKED');
  rejected(state,'message_review',{confirmed:true},'CARE_CONTACT_BLOCKED');
  rejected(state,'contact_simulate',{confirmed:true},'CARE_CONTACT_BLOCKED');
});

test('changing message text or source invalidates prior approvals and prepared notes cannot retain stale review',()=>{
  let state=contactReady();
  state=apply(state,'message_prepare',{text:'Texto novo para revisão humana.'});
  assert.equal(state.message.reviewedRevision,null);
  state=apply(state,'message_review',{confirmed:true});
  state=manual(state);state=apply(state,'note_prepare',{segmentIds:['SEG-001']});state=apply(state,'note_review',{confirmed:true});
  state=apply(state,'protocol_update',{version:'ADMIN-DEMO-2',sourceId:'TEAM-RECEIPT-02',sourceText:'Fonte administrativa fictícia atualizada para conferir recebimento.'});
  assert.equal(state.protocol.reviewedRevision,null);
  assert.equal(state.message.reviewedRevision,null);
  assert.equal(state.note.reviewedRevision,null);
  rejected(state,'message_review',{confirmed:true},'CARE_PROTOCOL_REVIEW_REQUIRED');
});

test('idempotent response retries never duplicate conversation facts; conflicting keys and stale edits fail closed',()=>{
  const state=plan();
  const response={type:'response_record',idempotencyKey:'RESPONSE-ONCE',text:'Recebi as orientações.',contactId:null,confirmed:true};
  const next=transitionCareJourney(state,response,{expectedRevision:state.revision,now:NOW});
  const retry=transitionCareJourney(next,response,{expectedRevision:state.revision,now:NOW});
  assert.deepEqual(retry,next);assert.equal(retry.responses.length,1);
  assert.throws(()=>transitionCareJourney(next,{...response,text:'Different fact'},{expectedRevision:next.revision,now:NOW}),error=>error.code==='CARE_IDEMPOTENCY_CONFLICT');
  assert.throws(()=>transitionCareJourney(next,action('preference',{value:'opt_in'}),{expectedRevision:state.revision,now:NOW}),error=>error.code==='CARE_STALE_CONTEXT');
});

test('further simulated contact awaits a response linked to the last contact rather than inferring receipt',()=>{
  let state=apply(contactReady(),'contact_simulate',{confirmed:true});
  state=apply(state,'message_prepare',{text:'Texto administrativo diferente.'});state=apply(state,'message_review',{confirmed:true});
  rejected(state,'contact_simulate',{confirmed:true},'CARE_REPLY_PENDING');
  state=apply(state,'response_record',{text:'Resposta fictícia sem relação comprovada.',contactId:null,confirmed:true});
  rejected(state,'contact_simulate',{confirmed:true},'CARE_REPLY_PENDING');
  state=apply(state,'response_record',{text:'Recebi as orientações.',contactId:state.contacts[0].id,confirmed:true});
  state=apply(state,'contact_simulate',{confirmed:true});assert.equal(state.contacts.length,2);
});

test('the note is exact selected transcript evidence; transcript replacement invalidates note and model claims remain false',()=>{
  let state=manual(plan());
  state=apply(state,'note_prepare',{segmentIds:['SEG-002']});
  assert.equal(state.note.text,'[SEG-002] Quero confirmar o canal de contato.');
  assert.equal(state.note.text.includes('Recebi as orientações.'),false);
  state=apply(state,'note_review',{confirmed:true});
  const summary=exportCareJourneySummary(state,{language:'es'});
  assert.equal(summary.note.citations[0].text,'Quero confirmar o canal de contato.');
  assert.equal(summary.note.transcriptProvenance.mode,'manual_text');
  assert.equal(summary.signedMedicalRecord,false);assert.equal(summary.liveModelGeneration,false);
  state=manual(state);assert.equal(state.note.text,'');assert.equal(state.note.reviewedRevision,null);
  rejected(state,'note_prepare',{segmentIds:['UNKNOWN']},'CARE_UNKNOWN_SEGMENT');
});

test('ASR provenance and timings are validated without inferring transcription from an uploaded file',()=>{
  const asr={text:'Fictional receipt confirmed.',segments:[{id:'SEG-001',text:'Fictional receipt confirmed.',start:0,end:3.2}],provenance:{mode:'local_asr',engine:'faster-whisper',modelId:'Synthetic/mock-model',modelRevision:'test-revision'},confirmed:true};
  const state=apply(plan(),'transcript_set',asr);
  assert.equal(viewCareJourney(state,{now:NOW}).transcriptLabel,'Local audio transcription');
  rejected(plan(),'transcript_set',{...asr,segments:[{...asr.segments[0],end:121}]},'CARE_INVALID_TRANSCRIPT');
  rejected(plan(),'transcript_set',{...asr,text:'Different words'},'CARE_INVALID_TRANSCRIPT');
  rejected(plan(),'transcript_set',{...asr,confirmed:false},'CARE_HUMAN_CONFIRMATION_REQUIRED');
});

test('closure requires a human-confirmed response or refusal and reviewed note, then preserves immutable evidence',()=>{
  rejected(plan(),'close',{text:'Resolved in simulation.',confirmed:true},'CARE_RESPONSE_REQUIRED');
  let state=apply(plan(),'response_record',{text:'Received instructions.',contactId:null,confirmed:true});
  state=manual(state);state=apply(state,'note_prepare',{segmentIds:['SEG-001']});
  rejected(state,'close',{text:'Resolved in simulation.',confirmed:true},'CARE_NOTE_REVIEW_REQUIRED');
  state=apply(state,'note_review',{confirmed:true});
  rejected(state,'close',{text:'Resolved in simulation.',confirmed:false},'CARE_HUMAN_CONFIRMATION_REQUIRED');
  state=apply(state,'close',{text:'Receipt checked by the fictional doctor; questions routed to the team.',confirmed:true});
  assert.equal(state.status,'resolved');assert.equal(state.resolution.humanSimulation,true);
  rejected(state,'preference',{value:'opt_in'},'CARE_RESOLVED_IMMUTABLE');
  let refused=apply(plan(),'preference',{value:'refused'});
  refused=apply(refused,'close',{text:'Human review recorded refusal; no further contact.',confirmed:true});
  assert.equal(refused.status,'resolved');assert.equal(refused.contacts.length,0);
});

test('untrusted getters, toJSON functions and extra action fields never run before validation',()=>{
  let calls=0;
  const malicious={toJSON(){calls+=1;return 'Unexpected text';}};
  rejected(plan(),'message_prepare',{text:malicious},'CARE_INVALID_SHAPE');
  const provenance={mode:'local_asr',engine:'faster-whisper',modelId:'mock',modelRevision:'v1'};
  Object.defineProperty(provenance,'engine',{enumerable:true,get(){calls+=1;return 'mock';}});
  rejected(plan(),'transcript_set',{text:'Words.',segments:[{id:'SEG-001',text:'Words.',start:0,end:1}],provenance,confirmed:true},'CARE_INVALID_SHAPE');
  rejected(plan(),'response_record',{text:'Fake.',contactId:null,confirmed:true,send:true},'CARE_INVALID_SHAPE');
  assert.equal(calls,0);
});
