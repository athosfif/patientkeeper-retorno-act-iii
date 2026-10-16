import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createBrowserApi, STORAGE_KEY } from '../browser-api.mjs';
import { fixtures } from '../fixtures.mjs';
import { createState, getModelInput } from '../engine.mjs';
import { queryEvidence as nodeQuery } from '../../app/evidence.mjs';
import { ui, setLanguage, normalizeSuggestedQuestion } from '../i18n.mjs';

class MemoryStorage {
  #values=new Map();
  writes=0;blocked=false;
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key,value) { if (this.blocked) throw new Error('Storage quota');this.writes++;this.#values.set(key,String(value)); }
}
function locks() {
  let queue=Promise.resolve();
  return {request(_name,task) {const next=queue.then(task);queue=next.catch(()=>{});return next;}};
}
function setup({storage=new MemoryStorage(),lockManager=locks(),...options}={}) {
  const api=createBrowserApi({storage,lockManager,now:()=> '2026-10-12T16:00:00.000Z',...options});
  return {api,storage,lockManager};
}
async function perform(api,action) {
  const state=await api('/api/state');
  return api('/api/actions',{expectedRevision:state.revision,action});
}
async function query(api,caseId='SIM-RET-01',question='Qual pendência está aberta?') {
  const state=await api('/api/state');
  return api('/api/evidence/query',{caseId,question,expectedRevision:state.revision});
}
async function card(api,extra={}) {
  const lookup=await query(api);
  return api('/api/evidence/card',{caseId:'SIM-RET-01',expectedRevision:lookup.revision,sourceDigest:lookup.sourceDigest,sourceIds:['SIM01-TAREFA'],reviewerConfirmed:true,...extra});
}
const rejectsCode=(operation,code,status)=>assert.rejects(operation,error=>error.code === code && (!status || error.status === status));

test('static Evolus status is disabled and query/poll cannot reach network or storage',async()=>{
  const storage=new MemoryStorage();
  const {api}=setup({storage,lockManager:null});
  const originalFetch=globalThis.fetch;
  let networkCalls=0;
  globalThis.fetch=async()=>{networkCalls++;throw new Error('Static Evolus must not fetch');};
  try {
    const status=await api('/api/evolus/status');
    assert.equal(status.provider,'evolus');assert.equal(status.enabled,false);assert.equal(status.configured,false);
    assert.equal(status.canStart,false);assert.equal(status.pending,false);assert.equal(status.pendingSession,null);
    assert.equal(status.remainingExecutions,0);
    status.enabled=true;
    assert.equal((await api('/api/evolus/status')).enabled,false);
    await rejectsCode(api('/api/evolus/query',{caseId:'SIM-RET-02',question:'test',expectedRevision:0}),'EVOLUS_NOT_CONFIGURED',503);
    await rejectsCode(api('/api/evolus/poll',{sessionId:'test',expectedRevision:0}),'EVOLUS_NOT_CONFIGURED',503);
    assert.equal(networkCalls,0);assert.equal(storage.writes,0);assert.equal(storage.getItem(STORAGE_KEY),null);
  } finally { globalThis.fetch=originalFetch; }
});

test('public demo starts at revision zero, has eight fictional cases, and persists only its own envelope',async()=>{
  const {api,storage}=setup();
  const state=await api('/api/state');
  assert.equal(state.revision,0);assert.equal(state.cases.length,8);assert.deepEqual(state.metrics,{open:8,unowned:1,resolved:0,medical:3});
  const stored=JSON.parse(storage.getItem(STORAGE_KEY));
  assert.deepEqual(Object.keys(stored).sort(),['demo','reviews','schemaVersion','state']);assert.equal(stored.state.revision,0);assert.deepEqual(stored.reviews.reviews,[]);
  assert.equal((await api('/api/health')).storage,'browser_local');
  assert.equal(state.cases[0].draft.reviewed,false);
  // Returned objects cannot mutate the adapter's committed state.
  state.cases[0].owner='REAL-PERSON';assert.equal((await api('/api/state')).cases[0].owner,'SEC-SIM-A');
});

test('assignment persists across adapter instances, rejects stale revisions and incompatible owners',async()=>{
  const {api,storage,lockManager}=setup();
  const next=await perform(api,{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-B'});
  assert.equal(next.revision,1);assert.equal(next.cases[1].owner,'SEC-SIM-B');assert.equal(next.cases[1].status,'remarcacao_pendente');
  const second=setup({storage,lockManager}).api;
  assert.equal((await second('/api/state')).cases[1].owner,'SEC-SIM-B');
  await rejectsCode(second('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-C'}}),'STALE_REVISION',409);
  await rejectsCode(perform(api,{type:'assign',caseId:'SIM-RET-02',owner:'REAL-PERSON'}),'INVALID_OWNER',400);
  assert.equal((await api('/api/state')).revision,1);
});

test('simultaneous actions from two tabs cannot silently overwrite each other',async()=>{
  const {api,storage,lockManager}=setup();await api('/api/state');
  const other=setup({storage,lockManager}).api;
  const result=await Promise.allSettled([
    api('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-B'}}),
    other('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-C'}}),
  ]);
  assert.equal(result.filter(item=>item.status === 'fulfilled').length,1);
  assert.equal(result.find(item=>item.status === 'rejected').reason.code,'STALE_REVISION');
  assert.equal((await api('/api/state')).revision,1);
});

test('draft edit resets review, contact needs explicit review, and the simulation cannot send another contact',async()=>{
  const {api}=setup();
  await rejectsCode(perform(api,{type:'contact_record',caseId:'SIM-RET-01',confirmed:true}),'DRAFT_REVIEW_REQUIRED');
  await perform(api,{type:'draft_save',caseId:'SIM-RET-01',text:'Disponibilidade fictícia para revisão humana.'});
  await perform(api,{type:'draft_review',caseId:'SIM-RET-01',reviewed:true});
  let state=await perform(api,{type:'draft_save',caseId:'SIM-RET-01',text:'Rascunho modificado inteiramente fictício.'});assert.equal(state.cases[0].draft.reviewed,false);
  await perform(api,{type:'draft_review',caseId:'SIM-RET-01',reviewed:true});
  state=await perform(api,{type:'contact_record',caseId:'SIM-RET-01',confirmed:true});
  assert.equal(state.cases[0].contactCount,1);assert.equal(state.cases[0].status,'aguardando_resposta');assert.equal(state.metrics.resolved,0);
  await rejectsCode(perform(api,{type:'contact_record',caseId:'SIM-RET-01',confirmed:true}),'DUPLICATE_CONTACT');
  await rejectsCode(perform(api,{type:'draft_save',caseId:'SIM-RET-04',text:'Inadequado'}),'DRAFT_BLOCKED');
});

test('human closure requires orientation, consistent confirmation and calendar, and becomes immutable',async()=>{
  const {api}=setup();
  await rejectsCode(perform(api,{type:'close',caseId:'SIM-RET-01',confirmationReviewed:true,calendarReviewed:true}),'INVALID_STAGE');
  let state=await perform(api,{type:'register_orientation',caseId:'SIM-RET-01',confirmed:true});
  assert.equal(state.cases[0].stage,1);assert.equal(state.metrics.resolved,0);assert.equal(state.cases[0].activeSources.some(source=>source.id === 'SIM01-EVOL-AGENDA'),false);
  await rejectsCode(perform(api,{type:'confirm_response',caseId:'SIM-RET-01',confirmationReviewed:true,calendarReviewed:false}),'EVIDENCE_REVIEW_REQUIRED');
  state=await perform(api,{type:'confirm_response',caseId:'SIM-RET-01',confirmationReviewed:true,calendarReviewed:true});
  assert.equal(state.cases[0].stage,2);assert.equal(state.metrics.resolved,0);
  state=await perform(api,{type:'close',caseId:'SIM-RET-01',confirmationReviewed:true,calendarReviewed:true});
  assert.equal(state.cases[0].stage,3);assert.equal(state.metrics.resolved,1);assert.equal(state.cases[0].activeSources.find(source=>source.id === 'SIM01-AGENDA').vigente,false);
  await rejectsCode(perform(api,{type:'assign',caseId:'SIM-RET-01',owner:'SEC-SIM-B'}),'RESOLVED_IMMUTABLE');
});

test('WebCrypto source digest and literal lookup are identical to the Node evidence core',async()=>{
  const {api}=setup();const state=createState(fixtures,'2026-10-12T16:00:00.000Z');
  for (const caseId of fixtures.casos.map(item=>item.id)) {
    const body={caseId,question:'Qual pendência está aberta?',expectedRevision:0};
    assert.deepEqual(await api('/api/evidence/query',body),nodeQuery(state,body,fixtures));
  }
  const before=await api('/api/export');await query(api);assert.deepEqual(await api('/api/export'),before);
});

test('review receipt is literal, deduplicated and separate from administrative state',async()=>{
  const {api,storage,lockManager}=setup();await api('/api/state');const before=await api('/api/export');
  const saved=await card(api);assert.equal(saved.noExternalContact,true);assert.equal(saved.administrativeStateUnchanged,true);
  assert.equal(saved.sources[0].quote,fixtures.casos[0].fontes.find(source=>source.id === 'SIM01-TAREFA').trecho);
  assert.deepEqual(await api('/api/export'),before);assert.deepEqual(await card(api),saved);
  const restored=setup({storage,lockManager}).api;
  const reviews=await restored('/api/evidence/reviews',{caseId:'SIM-RET-01'});assert.equal(reviews.reviews.length,1);assert.deepEqual(reviews.latest,saved);
  assert.deepEqual((await api('/api/evidence/export')).reviews,[saved]);
  assert.equal(JSON.stringify(JSON.parse(storage.getItem(STORAGE_KEY)).reviews).includes('question'),false);
});

test('conflict displays all current sources and cannot create a misleading review card',async()=>{
  const {api}=setup();const result=await query(api,'SIM-RET-07','Agenda');
  assert.equal(result.outcome,'human_handoff');assert.equal(result.cardAllowed,false);
  assert.deepEqual(result.matches.map(source=>source.sourceId),fixtures.casos[6].fontes.map(source=>source.id).toSorted());
  await rejectsCode(api('/api/evidence/card',{caseId:'SIM-RET-07',expectedRevision:0,sourceDigest:result.sourceDigest,sourceIds:[result.matches[0].sourceId],reviewerConfirmed:true}),'EVIDENCE_CONFLICT',409);
  assert.equal((await api('/api/evidence/reviews',{caseId:'SIM-RET-07'})).reviews.length,0);
});

test('historical, future, stale and unchecked sources cannot become current review evidence',async()=>{
  const {api}=setup();
  await rejectsCode(card(api,{sourceIds:['SIM01-EVOL-AGENDA']}),'SOURCE_NOT_AVAILABLE');
  await rejectsCode(card(api,{sourceIds:['SIM01-TAREFA','SIM01-TAREFA']}),'INVALID_SOURCE_SELECTION');
  await rejectsCode(card(api,{reviewerConfirmed:false}),'REVIEW_CONFIRMATION_REQUIRED');
  const old=await query(api,'SIM-RET-06');
  await rejectsCode(api('/api/evidence/card',{caseId:'SIM-RET-06',expectedRevision:0,sourceDigest:old.sourceDigest,sourceIds:['SIM06-REGRA-V1'],reviewerConfirmed:true}),'HISTORICAL_SOURCE');
  const lookup=await query(api);await perform(api,{type:'register_orientation',caseId:'SIM-RET-01',confirmed:true});
  await rejectsCode(api('/api/evidence/card',{caseId:'SIM-RET-01',expectedRevision:1,sourceDigest:lookup.sourceDigest,sourceIds:['SIM01-TAREFA'],reviewerConfirmed:true}),'STALE_EVIDENCE',409);
  assert.equal((await api('/api/evidence/reviews',{caseId:'SIM-RET-01'})).reviews.length,0);
});

test('reset requires confirmation, keeps historical review receipts and invalidates their source digest',async()=>{
  const {api}=setup();const receipt=await card(api);
  await perform(api,{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-B'});
  await rejectsCode(api('/api/reset',{expectedRevision:1,confirmed:false}),'HUMAN_CONFIRMATION_REQUIRED');
  const fresh=await api('/api/reset',{expectedRevision:1,confirmed:true});assert.equal(fresh.revision,2);assert.equal(fresh.cases[1].owner,null);
  const reviews=await api('/api/evidence/reviews',{caseId:'SIM-RET-01'});assert.deepEqual(reviews.latest,receipt);assert.notEqual(reviews.currentSourceDigest,receipt.sourceDigest);
});

test('export and strict import preserve only validated fictional action history',async()=>{
  const {api}=setup();await perform(api,{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-B'});
  const exported=await api('/api/export');await api('/api/reset',{expectedRevision:1,confirmed:true});
  const imported=await api('/api/import',{expectedRevision:2,state:exported});assert.equal(imported.revision,3);assert.equal(imported.cases[1].owner,'SEC-SIM-B');
  const invalid=structuredClone(exported);invalid.cases[0].patient={name:'Not a fictional field'};
  await rejectsCode(api('/api/import',{expectedRevision:3,state:invalid}),'INVALID_SHAPE');
  assert.equal((await api('/api/state')).revision,3);
});

test('blocked or corrupt storage is preserved and cannot claim a successful save',async()=>{
  const {api,storage}=setup();await api('/api/state');const raw=storage.getItem(STORAGE_KEY);storage.blocked=true;
  await rejectsCode(api('/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-B'}}),'STORAGE_WRITE_FAILED',503);
  assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal((await api('/api/state')).revision,0);
  storage.blocked=false;storage.setItem(STORAGE_KEY,'{"unexpected":"preserve me"}');
  await rejectsCode(api('/api/state'),'DEMO_STORE_CORRUPT',500);assert.equal(storage.getItem(STORAGE_KEY),'{"unexpected":"preserve me"}');
});

test('review limits prevent silently dropping receipts or exceeding browser storage bounds',async()=>{
  const {api,storage}=setup();
  for (let index=0;index<120;index++) {
    const lookup=await query(api);
    await api('/api/evidence/card',{caseId:'SIM-RET-01',expectedRevision:lookup.revision,sourceDigest:lookup.sourceDigest,sourceIds:['SIM01-PREFERENCIA'],reviewerConfirmed:true});
    await perform(api,{type:'assign',caseId:'SIM-RET-02',owner:index%2 ? 'SEC-SIM-C':'SEC-SIM-B'});
  }
  const before=storage.getItem(STORAGE_KEY),lookup=await query(api);
  await rejectsCode(api('/api/evidence/card',{caseId:'SIM-RET-01',expectedRevision:lookup.revision,sourceDigest:lookup.sourceDigest,sourceIds:['SIM01-PREFERENCIA'],reviewerConfirmed:true}),'REVIEW_LIMIT',413);
  assert.equal(storage.getItem(STORAGE_KEY),before);assert.equal((await api('/api/evidence/export')).reviews.length,120);
});

test('unsafe objects, oversized requests, missing locks and unknown APIs fail without changing state',async()=>{
  const {api}=setup();await api('/api/state');let accessed=false;
  const body={expectedRevision:0};Object.defineProperty(body,'action',{enumerable:true,get(){accessed=true;return {};}});
  await rejectsCode(api('/api/actions',body),'INVALID_BODY');assert.equal(accessed,false);
  await rejectsCode(api('/api/import',{expectedRevision:0,state:{text:'a'.repeat(129*1024)}}),'BODY_TOO_LARGE',413);
  await rejectsCode(api('/api/unlisted'),'NOT_FOUND',404);
  const noLocks=setup({lockManager:{}}).api;await rejectsCode(noLocks('/api/state'),'LOCKS_UNAVAILABLE',501);
  assert.equal((await api('/api/state')).revision,0);
});

test('AI context excludes expectations and future facts; remote model is disabled with no fetch interception',async()=>{
  const {api}=setup();const originalFetch=globalThis.fetch;
  const context=await api('/api/ai/context',{caseId:'SIM-RET-01',question:'Pergunta administrativa',expectedRevision:0});
  assert.equal(context.enabled,false);assert.deepEqual(context.input,getModelInput(createState(fixtures),'SIM-RET-01','Pergunta administrativa',fixtures));
  assert.equal(JSON.stringify(context).includes('rascunho'),true); // Only a literal source discussing drafts, never a draft field.
  assert.equal(Object.hasOwn(context.input,'rascunho'),false);assert.equal(context.input.sources.some(source=>source.id.includes('EVOL')),false);
  assert.deepEqual(await api('/api/model/status'),{configured:false,enabled:false,inferenceVerified:false,amdVerified:false,requiresSemanticHumanReview:true});
  await rejectsCode(api('/api/model/query',{}),'MODEL_NOT_CONFIGURED',503);assert.equal(globalThis.fetch,originalFetch);
});

test('EN default, PT/ES selectors and original source policy remain available in static modules',()=>{
  setLanguage('en');assert.equal(ui('Demonstração isolada no navegador'),'Isolated browser demo');
  assert.equal(normalizeSuggestedQuestion('Which issue is still open, and who is responsible?'),'Qual pendência continua aberta e quem é o responsável?');
  setLanguage('es');assert.equal(ui('Fonte original · Português'),'Fuente original · Portugués');
  assert.equal(ui('As alterações ficam somente neste navegador. Limpar os dados do site apaga o progresso.'),'Los cambios quedan solo en este navegador. Borrar los datos del sitio elimina el progreso.');setLanguage('en');
});

test('suggested questions retrieve literal administrative excerpts in all three interface languages',async()=>{
  const {api}=setup();
  for (const language of ['en','pt','es']) {
    setLanguage(language);
    for (const [caseId,question,sourceId] of [
      ['SIM-RET-01','Qual pendência continua aberta e quem é o responsável?','SIM01-TAREFA'],
      ['SIM-RET-04','Qual preferência de contato foi registrada?','SIM04-PREFERENCIA'],
    ]) {
      const visibleQuestion=ui(question),canonical=normalizeSuggestedQuestion(visibleQuestion);
      const result=await query(api,caseId,canonical);assert.equal(result.outcome,'sources_found');
      const match=result.matches.find(source=>source.sourceId === sourceId);assert.ok(match);
      assert.equal(match.quote,fixtures.casos.find(item=>item.id === caseId).fontes.find(source=>source.id === sourceId).trecho);
    }
    const conflict=await query(api,'SIM-RET-07',normalizeSuggestedQuestion(ui('Há confirmação consistente na agenda e na fila?')));
    assert.equal(conflict.outcome,'human_handoff');assert.equal(conflict.cardAllowed,false);assert.equal(conflict.matches.length,2);
  }
  setLanguage('en');
  assert.equal((await query(api,'SIM-RET-04','Send messages')).outcome,'human_handoff');
});

test('public allowlist contains no Node persistence, oracle fields, local progress or remote transport',async()=>{
  const root=new URL('../',import.meta.url);const files=await readdir(root);
  assert.equal(files.includes('data'),false);assert.equal(files.includes('server.mjs'),false);assert.equal(files.includes('model-transport.mjs'),false);
  const forbidden=/(?:teste_evidencia|estado_final_esperado|acoes_humanas_esperadas|criterios_futuros_de_encerramento)/;
  assert.equal(forbidden.test(await readFile(new URL('../fixtures.mjs',import.meta.url),'utf8')),false);
  assert.equal(/node:|createHash|\bBuffer\b/.test(await readFile(new URL('../evidence.mjs',import.meta.url),'utf8')),false);
  const client=await readFile(new URL('../client.mjs',import.meta.url),'utf8');
  assert.equal(/\bfetch\s*\(/.test(client),false);
  assert.equal(/file\.arrayBuffer\s*\(|\bbtoa\s*\(/.test(client),false);
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.equal(index.includes('href="/api/export"'),false);assert.equal(index.includes('src="./client.mjs"'),true);
  assert.equal(index.includes('href="/"'),false);assert.equal(index.includes('href="./"'),true);
  const adapter=await readFile(new URL('../browser-api.mjs',import.meta.url),'utf8');assert.equal(adapter.includes("fetch(new URL('./amd-runs.json',import.meta.url)"),true);
  assert.equal(new URL('./amd-runs.json','https://athosfif.github.io/patientkeeper-retorno-act-iii/browser-api.mjs').pathname,'/patientkeeper-retorno-act-iii/amd-runs.json');
});
