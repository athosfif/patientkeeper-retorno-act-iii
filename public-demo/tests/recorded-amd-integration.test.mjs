import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createBrowserApi } from '../browser-api.mjs';
import { findRecordedAMDRecord, evaluateRecordedAMDRecord, readRecordedAMDStatistics, recordedContextMatches } from '../recorded-amd.mjs';
import { getLanguage, ui } from '../i18n.mjs';
import { mountRecordedGemmaPanel } from '../recorded-gemma-client.mjs';

const archive=JSON.parse(await readFile(new URL('../amd-runs.json',import.meta.url),'utf8'));
const gemmaArchive=JSON.parse(await readFile(new URL('../gemma-runs.json',import.meta.url),'utf8'));
function setup() {
  const values=new Map();let queue=Promise.resolve();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const lockManager={request(_name,task){const result=queue.then(task);queue=result.catch(()=>{});return result;}};
  return createBrowserApi({archive,storage,lockManager,now:()=> '2026-10-12T18:00:00.000Z'});
}
async function evaluate(api,caseId) {
  const current=await api('/api/state'),item=current.cases.find(item=>item.id === caseId);
  const found=findRecordedAMDRecord(await api('/amd-runs.json'),caseId);
  if (!found.record) return {code:found.code,available:false};
  const body={caseId,question:found.record.context.question,expectedRevision:current.revision};
  const [response,report]=await Promise.all([api('/api/ai/context',body),api('/api/evidence/query',body)]);
  assert.equal(response.revision,current.revision);assert.equal(report.revision,current.revision);
  return evaluateRecordedAMDRecord(found.record,response.input,{humanHandoff:report.outcome === 'human_handoff' || !!item.medicalHandoff || item.status === 'divergencia_aguardando_revisao'});
}

test('published archive retains the seven original baseline runs and the two different additional attempts',()=>{
  assert.deepEqual(archive.records.map(record=>record.context.caseId),['SIM-RET-01','SIM-RET-02','SIM-RET-03','SIM-RET-04','SIM-RET-05','SIM-RET-06','SIM-RET-07']);
  assert.deepEqual(archive.statistics,{totalAttempts:9,formatValidAttempts:3,baselineCases:7,formatValidBaselineCases:2,semanticApproved:false});
  assert.equal(archive.records[0].result.runId,'RUN-20261012T172749Z-a19ac764');
  assert.equal(archive.records[1].result.status,'invalid_candidate');
  assert.equal(archive.otherAttempts.length,2);
  assert.equal(archive.otherAttempts.find(record=>record.result.runId === 'RUN-20261012T173800Z-994777c7').result.status,'invalid_candidate');
  const assigned=archive.otherAttempts.find(record=>record.result.runId === 'RUN-20261012T172516Z-4ffbe9bb');
  assert.equal(assigned.context.caseId,'SIM-RET-02');assert.equal(assigned.result.validation.formatValid,true);
  assert.equal(recordedContextMatches(assigned.context,archive.records[1].context),false);
  const statistics=readRecordedAMDStatistics(archive);assert.equal(statistics.totalAttempts,9);assert.equal(statistics.formatValidAttempts,3);assert.equal(statistics.formatValidBaselineCases,2);
});

test('public contexts, results and failed raw outputs are byte-derived from the final local evidence',async()=>{
  const root=new URL('../../evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/',import.meta.url);
  for (const record of [...archive.records,...archive.otherAttempts]) {
    const prefix=new URL(record.provenance.runId+'/',root);
    const [input,result,raw]=await Promise.all([readFile(new URL('product-inputs.json',prefix)),readFile(new URL(record.provenance.resultFile,prefix)),readFile(new URL(record.provenance.rawOutputFile,prefix))]);
    assert.deepEqual(record.context,JSON.parse(input)[record.result.index-1]);assert.deepEqual(record.result,JSON.parse(result));assert.equal(record.rawOutput,raw.toString('utf8'));
    assert.equal(record.provenance.productInputsSha256,createHash('sha256').update(input).digest('hex'));
    assert.equal(record.provenance.resultSha256,createHash('sha256').update(result).digest('hex'));
    assert.equal(record.provenance.rawOutputSha256,createHash('sha256').update(raw).digest('hex'));
  }
  assert.equal(archive.cloudSession.status,'OFF');assert.equal(archive.cloudSession.verifiedAt,'2026-10-12T17:39:42Z');
  assert.equal(archive.records.every(record=>record.result.semanticApproved === false),true);
});

test('recorded preference candidate stays in its actual Portuguese output and never starts live inference',async()=>{
  const api=setup(),before=await api('/api/export'),checked=await evaluate(api,'SIM-RET-04');
  assert.equal(checked.available,true);assert.equal(checked.liveInference,false);assert.equal(checked.gpuOff,true);assert.equal(checked.semanticApproved,false);
  assert.equal(checked.candidate.answer,'prefiro nao receber mensagens');assert.equal(checked.question,'What contact preference is recorded?');
  assert.deepEqual(await api('/api/export'),before);assert.deepEqual((await api('/api/evidence/export')).reviews,[]);
  assert.equal((await api('/api/model/status')).enabled,false);
});

test('all failed baseline runs remain rejected and both medical and conflicting records remain with the human team',async()=>{
  const api=setup();
  for (const caseId of ['SIM-RET-02','SIM-RET-03','SIM-RET-06']) {
    const checked=await evaluate(api,caseId);assert.equal(checked.available,false);assert.equal(checked.code,'RECORDED_CANDIDATE_REJECTED');assert.equal(checked.gpuOff,true);
  }
  for (const caseId of ['SIM-RET-01','SIM-RET-05','SIM-RET-07']) {
    const checked=await evaluate(api,caseId);assert.equal(checked.available,false);assert.equal(checked.code,'HUMAN_HANDOFF');assert.equal(checked.candidate,null);
  }
  assert.equal((await evaluate(api,'SIM-RET-08')).code,'NO_RECORDED_RUN');
});

test('changed sources disable the earlier candidate, and expectedRevision rejects stale context reads',async()=>{
  const api=setup();await api('/api/state');
  await api('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-04',owner:'SEC-SIM-C'}});
  assert.equal((await evaluate(api,'SIM-RET-04')).code,'CONTEXT_CHANGED');
  await assert.rejects(api('/api/ai/context',{caseId:'SIM-RET-04',question:archive.records[3].context.question,expectedRevision:0}),error=>error.status === 409 && error.code === 'STALE_REVISION');
});

test('invalid archive statistics cannot manufacture an improvement claim',()=>{
  const altered=structuredClone(archive);altered.statistics.formatValidBaselineCases=7;assert.equal(readRecordedAMDStatistics(altered),null);
  altered.statistics=archive.statistics;altered.otherAttempts=[];assert.equal(readRecordedAMDStatistics(altered),null);
});

test('static integration mounts recorded evidence separately and replaces the pending-AMD footer claim',async()=>{
  const [module,index,client]=await Promise.all([readFile(new URL('../evidence-client.mjs',import.meta.url),'utf8'),readFile(new URL('../index.html',import.meta.url),'utf8'),readFile(new URL('../client.mjs',import.meta.url),'utf8')]);
  assert.equal(module.includes('mountRecordedAMDPanel(container, { item, revision, request, notify, onStale })'),true);
  assert.equal(index.includes('integração IA/AMD pendente'),false);assert.equal(index.includes('execução AMD gravada'),true);
  assert.equal(client.includes('IA/AMD ainda não conectados'),false);assert.equal(getLanguage(),'en');
  assert.equal(ui('Progresso salvo neste navegador · Versão 4 · Consulta literal disponível · Execução AMD gravada · Sem inferência ao vivo.'),'Progress saved in this browser · Version 4 · Literal source lookup available · Recorded AMD execution · No live inference.');
});

function gemmaDisplay() {
  const panels=[],container={isConnected:true,querySelectorAll:()=>panels.filter(panel=>panel.isConnected),append(panel){panels.push(panel);panel.isConnected=true;}};
  return {panels,container,document:{createElement(){return {dataset:{},className:'',innerHTML:'',isConnected:false,remove(){this.isConnected=false;}};}}};
}
async function staticGemmaRead(run,{raw=JSON.stringify(gemmaArchive),ok=true}={}) {
  const previousFetch=globalThis.fetch,previousDocument=globalThis.document,display=gemmaDisplay(),fetches=[];
  globalThis.document=display.document;
  globalThis.fetch=async(url,options)=>{fetches.push({url:String(url),options});return {ok,text:async()=>raw};};
  try {return await run({api:setup(),display,fetches});}
  finally {globalThis.fetch=previousFetch;globalThis.document=previousDocument;}
}
test('the static adapter loads Gemma beside its own module and mounts the real Case 04 source check without model calls or case changes',async()=>{
  await staticGemmaRead(async({api,display,fetches})=>{
    const before=await api('/api/export'),state=await api('/api/state'),calls=[];
    const request=(path,body)=>{calls.push(path);return api(path,body);};
    const controller=mountRecordedGemmaPanel(display.container,{item:state.cases.find(item=>item.id==='SIM-RET-04'),revision:state.revision,request});
    await controller.ready;
    assert.deepEqual(calls,['/gemma-runs.json','/api/ai/context','/api/evidence/query']);
    assert.equal(fetches.length,1);assert.equal(fetches[0].url,new URL('../gemma-runs.json',import.meta.url).href);
    assert.equal(fetches[0].options.credentials,'omit');assert.equal(fetches[0].options.redirect,'error');assert.equal(fetches[0].options.cache,'no-store');
    assert.ok(fetches[0].options.signal instanceof AbortSignal);
    const html=display.panels[0].innerHTML;
    assert.ok(html.includes(gemmaArchive.records[4].candidate.answer));assert.ok(html.includes('Recorded candidate · Original English'));
    assert.equal(html.includes('The recorded source check is unavailable.'),false);
    for(const language of ['pt','es','en'])controller.setLanguage(language);
    assert.equal(fetches.length,1);assert.equal(calls.length,3);
    assert.deepEqual(await api('/api/export'),before);assert.deepEqual((await api('/api/evidence/export')).reviews,[]);
    assert.equal((await api('/api/model/status')).enabled,false);
  });
});
test('the static Gemma replay keeps Case 01 human handoff and rejects changed or stale Case 04 context',async()=>{
  await staticGemmaRead(async({api,display})=>{
    let state=await api('/api/state');
    const handoff=mountRecordedGemmaPanel(display.container,{item:state.cases.find(item=>item.id==='SIM-RET-01'),revision:state.revision,request:api});await handoff.ready;
    assert.ok(display.panels.at(-1).innerHTML.includes('This case requires the responsible human team.'));
    assert.equal(display.panels.at(-1).innerHTML.includes(gemmaArchive.records[0].candidate.answer),false);
    await api('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-04',owner:'SEC-SIM-C'}});
    state=await api('/api/state');
    const changed=mountRecordedGemmaPanel(display.container,{item:state.cases.find(item=>item.id==='SIM-RET-04'),revision:state.revision,request:api});await changed.ready;
    assert.ok(display.panels.at(-1).innerHTML.includes('The question, sources or displayed revision changed.'));
    assert.equal(display.panels.at(-1).innerHTML.includes(gemmaArchive.records[4].candidate.answer),false);
    let stale=0;const stalePanel=mountRecordedGemmaPanel(display.container,{item:state.cases.find(item=>item.id==='SIM-RET-04'),revision:0,request:api,onStale:()=>{stale+=1;}});await stalePanel.ready;
    assert.equal(stale,1);assert.ok(display.panels.at(-1).innerHTML.includes('The question, sources or displayed revision changed.'));
  });
});
test('static Gemma archive failures are closed and never invoke a model or mutation route',async()=>{
  for(const options of [{ok:false},{raw:'{'},{raw:' '.repeat(256*1024+1)},
    {raw:JSON.stringify({...gemmaArchive,statistics:{...gemmaArchive.statistics,affirmativeCandidates:5}})}]) {
    await staticGemmaRead(async({api,display,fetches})=>{
      const state=await api('/api/state'),calls=[];
      const controller=mountRecordedGemmaPanel(display.container,{item:state.cases.find(item=>item.id==='SIM-RET-04'),revision:state.revision,
        request:(path,body)=>{calls.push(path);return api(path,body);}});await controller.ready;
      assert.deepEqual(calls,['/gemma-runs.json']);assert.equal(fetches.length,1);
      assert.ok(display.panels[0].innerHTML.includes('The recorded source check is unavailable.'));
      assert.equal(display.panels[0].innerHTML.includes(gemmaArchive.records[4].candidate.answer),false);
    },options);
  }
});
