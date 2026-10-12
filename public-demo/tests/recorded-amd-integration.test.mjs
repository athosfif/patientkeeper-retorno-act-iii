import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createBrowserApi } from '../browser-api.mjs';
import { findRecordedAMDRecord, evaluateRecordedAMDRecord, readRecordedAMDStatistics, recordedContextMatches } from '../recorded-amd.mjs';
import { getLanguage, ui } from '../i18n.mjs';

const archive=JSON.parse(await readFile(new URL('../amd-runs.json',import.meta.url),'utf8'));
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
