import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createState,getModelInput} from '../engine.mjs';
import {queryEvidence} from '../evidence.mjs';
import {readRecordedGemmaArchive,readRecordedGemmaStatistics,findRecordedGemmaRecord,recordedGemmaContextMatches,evaluateRecordedGemmaRecord,evaluateRecordedGemmaCurrentRead} from '../recorded-gemma.mjs';
import {mountRecordedGemmaPanel} from '../recorded-gemma-client.mjs';

const archive=JSON.parse(await readFile(new URL('../../docs/recorded-gemma-runs.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json',import.meta.url),'utf8'));
const initial=()=>createState(fixtures,'2026-10-14T21:00:00.000Z');
const clone=value=>structuredClone(value);
const record=index=>clone(archive.records[index]);
function current(value,state=initial()) {
  const body={caseId:value.context.caseId,question:value.context.question,expectedRevision:state.revision};
  return {response:{enabled:false,revision:state.revision,input:getModelInput(state,body.caseId,body.question,fixtures)},
    report:queryEvidence(state,body,fixtures),options:{caseId:body.caseId,revision:state.revision}};
}

test('the pinned public archive preserves five actual attempts and recounts timeout separately',async()=>{
  assert.equal((await readRecordedGemmaArchive(archive)).valid,true);
  const stats=await readRecordedGemmaStatistics(archive);
  assert.equal(stats.totalAttempts,5);assert.equal(stats.affirmativeCandidates,3);assert.equal(stats.abstentions,1);
  assert.equal(stats.timeoutsWithoutAnswer,1);assert.equal(stats.formatValidOutputs,4);
  assert.equal(stats.retainedProviderTokens,2956);assert.equal(stats.attemptsWithoutPerAttemptUsage,1);
  assert.equal(stats.usage.totalTokensDisplayed,'3.796');assert.equal(stats.usage.costDisplayed,'0.0001 pts');
  assert.equal(stats.usage.remainingDisplayed,'0.9999 pts');assert.equal(stats.usage.timeoutPerAttemptUsageRecovered,false);
  assert.equal(stats.newGemmaRequestsForCareModule,0);assert.equal(stats.clinicalValidated,false);
});
test('positive queue candidates revalidate against the entire current source projection',async()=>{
  for(const index of [0,4]) {
    const value=record(index),read=current(value);
    const output=await evaluateRecordedGemmaCurrentRead(value,read.response,read.report,read.options);
    assert.equal(output.available,true);assert.deepEqual(output.candidate,value.candidate);
    assert.equal(output.liveInference,false);assert.equal(output.semanticApproved,false);
    assert.equal(output.receipt.physicalHardwareVerified,false);assert.equal(output.receipt.physicalWeightsInspected,false);
  }
});
test('official requested/used mapping stays literal and first envelope identity is not invented',async()=>{
  const value=record(0),checked=await evaluateRecordedGemmaRecord(value,value.context);
  assert.equal(checked.receipt.requestedModel,'Gemma-4-31B-IT');
  assert.equal(checked.receipt.usedModel,'self-dploy/Gemma-4-31B-IT');assert.equal(checked.receipt.responseModel,null);
  assert.equal(checked.receipt.mappingBasis,'official_usage_after_original_response');assert.equal(checked.receipt.modelRevision,null);
  const forged=record(4);forged.identity.responseModel='Gemma-4-31B-IT';
  assert.equal((await evaluateRecordedGemmaRecord(forged,forged.context)).available,false);
  const badProof=clone(archive);badProof.service.identityProofSha256='a'.repeat(64);
  assert.equal((await readRecordedGemmaArchive(badProof)).valid,false);
});
test('fixed selection does not accidentally choose an adversarial or missing-source variant',()=>{
  assert.equal(findRecordedGemmaRecord(archive,'SIM-RET-01').record.id,'01-same-qwen-sim01');
  assert.equal(findRecordedGemmaRecord(archive,'SIM-RET-04').record.id,'05-same-qwen-sim04-app-positive');
  assert.equal(findRecordedGemmaRecord(archive,'SIM-RET-07').code,'NO_RECORDED_RUN');
  const ambiguous=clone(archive);ambiguous.selections.push(ambiguous.selections[0]);
  assert.equal(findRecordedGemmaRecord(ambiguous,'SIM-RET-01').code,'AMBIGUOUS_RECORD');
});
test('question, all excerpts, ordering, missing sources and historical flags must match exactly',async()=>{
  const value=record(0);
  for(const change of [input=>{input.question+=' changed';},input=>{input.sources[0].trecho+=' changed';},
    input=>{input.sources.shift();},input=>{input.sources.reverse();},input=>{input.sources[0].vigente=false;},
    input=>{input.sources.push({id:'EXTRA-REC',trecho:'Another fictional record.'});}]) {
    const changed=clone(value.context);change(changed);
    assert.equal(recordedGemmaContextMatches(value.context,changed),false);
    const output=await evaluateRecordedGemmaRecord(value,changed);assert.equal(output.code,'CONTEXT_CHANGED');assert.equal(output.candidate,null);
  }
  const reordered={sources:value.context.sources.map(({trecho,id,...rest})=>({...rest,trecho,id})),question:value.context.question,caseId:value.context.caseId};
  assert.equal(recordedGemmaContextMatches(value.context,reordered),true);
});
test('changed citations and even structurally valid replacement answers cannot replace the original output',async()=>{
  for(const change of [value=>{value.candidate.citations[0].trecho+=' altered';},
    value=>{value.candidate.citations[0].sourceId='SIM04-PENDENCIA';},value=>{value.candidate.answer='A different answer.';},
    value=>{value.candidate.humanReviewRequired=false;},value=>{value.candidate.actions=['send'];}]) {
    const value=record(4);change(value);
    const output=await evaluateRecordedGemmaRecord(value,value.context);assert.equal(output.available,false);assert.equal(output.candidate,null);
  }
});
test('archive counters, usage, provider claims and unknown metadata are protected by the fixed proof',async()=>{
  for(const change of [value=>{value.statistics.affirmativeCandidates=4;},value=>{value.usage.costDisplayed='0 USD';},
    value=>{value.service.physicalHardwareVerified=true;},value=>{value.rawEnvelope={authorization:'must never display'};}]) {
    const changed=clone(archive);change(changed);
    assert.equal((await readRecordedGemmaArchive(changed)).valid,false);assert.equal(await readRecordedGemmaStatistics(changed),null);
  }
});
test('a timeout is not an abstention or an answer, even with matching current sources',async()=>{
  const value=record(2),read=current(value),output=await evaluateRecordedGemmaCurrentRead(value,read.response,read.report,read.options);
  assert.equal(output.available,false);assert.equal(output.code,'RECORDED_TIMEOUT');assert.equal(output.candidate,null);
  assert.equal(output.receipt.providerUsage,null);assert.equal(output.receipt.usedModel,null);assert.equal(output.receipt.durationMs,15004);
  assert.equal(JSON.stringify(output).includes('SEC-SIM-C'),false);
});
test('the missing-source abstention is preserved only for its own exact archived input',async()=>{
  const value=record(1),output=await evaluateRecordedGemmaRecord(value,value.context);
  assert.equal(output.available,true);assert.equal(output.candidate.abstention,true);assert.equal(output.candidate.answer,'');
  assert.equal((await evaluateRecordedGemmaRecord(value,current(value).response.input)).code,'CONTEXT_CHANGED');
});
test('clinical or conflict handoff hides candidate and citation excerpts but keeps a verified receipt',async()=>{
  const value=record(4),read=current(value);
  for(const extra of [{report:{...read.report,outcome:'human_handoff'}},{options:{...read.options,humanHandoff:true}}]) {
    const output=await evaluateRecordedGemmaCurrentRead(value,read.response,extra.report??read.report,extra.options??read.options);
    assert.equal(output.code,'HUMAN_HANDOFF');assert.equal(output.candidate,null);assert.equal(output.receipt.recordId,value.id);
    assert.equal(JSON.stringify(output).includes(value.candidate.answer),false);
  }
});
test('both revision receipts, exact question, source digest and evidence mode are required',async()=>{
  const value=record(4);
  for(const change of [read=>{read.response.revision=1;},read=>{read.report.revision=1;},read=>{read.report.sourceDigest='0'.repeat(64);},
    read=>{read.report.question='A new question';},read=>{delete read.report.sourceDigest;},read=>{read.report.mode='model_candidate';}]) {
    const read=current(value);change(read);
    const output=await evaluateRecordedGemmaCurrentRead(value,read.response,read.report,read.options);
    assert.equal(output.available,false);assert.equal(output.candidate,null);
  }
});
test('getters, toJSON and sparse arrays never execute while checking archive data',async()=>{
  let executed=0;const getter=clone(archive);Object.defineProperty(getter,'records',{enumerable:true,get(){executed+=1;return archive.records;}});
  const toJSON=clone(archive);toJSON.toJSON=()=>{executed+=1;return archive;};
  const sparse=clone(archive);delete sparse.records[0];
  for(const value of [getter,toJSON,sparse])assert.equal((await readRecordedGemmaArchive(value)).valid,false);
  assert.equal(executed,0);
});
test('accepted record and current input are captured before asynchronous proof hashing',async()=>{
  const value=record(4),input=clone(value.context),pending=evaluateRecordedGemmaRecord(value,input);
  value.candidate.answer='Caller changed after submission';input.sources[0].trecho='Caller replaced a source';
  const checked=await pending;assert.equal(checked.available,true);assert.equal(checked.candidate.answer,archive.records[4].candidate.answer);
});

function displayBoundary() {
  const panels=[],container={isConnected:true,querySelectorAll:()=>panels.filter(panel=>panel.isConnected),append(panel){panels.push(panel);panel.isConnected=true;}};
  const document={createElement(){return {dataset:{},className:'',innerHTML:'',isConnected:false,remove(){this.isConnected=false;}};}};
  return {panels,container,document};
}
test('panel uses only archive/context/evidence reads; language repaint makes no call and retains literal output',async()=>{
  const previous=globalThis.document,display=displayBoundary();globalThis.document=display.document;
  try {
    const value=record(4),read=current(value),calls=[];
    const request=async(path,body)=>{calls.push({path,body});if(path==='/gemma-runs.json')return archive;if(path==='/api/ai/context')return read.response;if(path==='/api/evidence/query')return read.report;throw new Error('Unexpected mutation or model call.');};
    const controller=mountRecordedGemmaPanel(display.container,{item:{id:'SIM-RET-04'},revision:0,request});await controller.ready;
    assert.deepEqual(calls.map(call=>call.path),['/gemma-runs.json','/api/ai/context','/api/evidence/query']);
    assert.deepEqual(calls[1].body,{caseId:'SIM-RET-04',question:value.context.question,expectedRevision:0});
    assert.ok(display.panels[0].innerHTML.includes(value.candidate.answer));assert.ok(display.panels[0].innerHTML.includes('SIM-CARE'));
    for(const language of ['pt','es','en']){controller.setLanguage(language);assert.ok(display.panels[0].innerHTML.includes(value.candidate.answer));}
    assert.equal(calls.length,3);assert.equal(display.panels[0].innerHTML.includes('data-model-ask'),false);
  }finally{globalThis.document=previous;}
});
test('an invalid archive never triggers a context read or displays answer-like failure content',async()=>{
  const previous=globalThis.document,display=displayBoundary();globalThis.document=display.document;
  try {
    const bad=clone(archive);bad.records[4].candidate.answer='FAILED RAW ANSWER';const calls=[];
    const controller=mountRecordedGemmaPanel(display.container,{item:{id:'SIM-RET-04'},revision:0,request:async path=>{calls.push(path);return bad;}});
    await controller.ready;assert.deepEqual(calls,['/gemma-runs.json']);assert.equal(display.panels[0].innerHTML.includes('FAILED RAW ANSWER'),false);
  }finally{globalThis.document=previous;}
});
test('a detached panel cannot paint a late context check',async()=>{
  const previous=globalThis.document,display=displayBoundary();globalThis.document=display.document;
  try {
    const value=record(4),read=current(value);let release,started;
    const waiting=new Promise(resolve=>{release=resolve;}),contextStarted=new Promise(resolve=>{started=resolve;});
    const controller=mountRecordedGemmaPanel(display.container,{item:{id:'SIM-RET-04'},revision:0,
      request:async path=>path==='/gemma-runs.json'?archive:path==='/api/ai/context'?(started(),waiting):read.report});
    await contextStarted;controller.destroy();release(read.response);await controller.ready;
    assert.equal(display.panels[0].isConnected,false);assert.equal(display.panels[0].innerHTML.includes(value.candidate.answer),false);
  }finally{globalThis.document=previous;}
});
