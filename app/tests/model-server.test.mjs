import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAppServer } from '../server.mjs';

const config = { endpoint:'https://model.example.invalid/v1', model:'test/model', apiKey:'FAKE-TEST-KEY' };
const question = { caseId:'SIM-RET-02', question:'Who is responsible for this pending task?', expectedRevision:0 };
const post = async (url,route,body) => {
  const res = await fetch(url+route,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
  return { status:res.status, body:await res.json() };
};
const reply = answer => new Response(JSON.stringify({ choices:[{finish_reason:'stop',message:{ role:'assistant',content:JSON.stringify(answer) }}] }),{headers:{'Content-Type':'application/json'}});
const abstention = { answer:'',citations:[],abstention:true,reason:'The current records do not provide enough support.',humanReviewRequired:true };
async function setup(t,options={}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(),'retorno-model-integration-'));
  const app = await createAppServer({ dataDir,port:0,...options });
  t.after(async()=> { await app.close(); await rm(dataDir,{recursive:true,force:true}); });
  return { ...app,dataDir };
}

test('model path stays disabled by default and preserves local administrative state',async t=> {
  let calls=0;
  const app=await setup(t,{modelFetch:async()=> {calls++;return reply(abstention);} });
  const before=await readFile(path.join(app.dataDir,'state.json'),'utf8');
  const status=await (await fetch(app.url+'/api/model/status')).json();
  assert.equal(status.enabled,false); assert.equal(status.amdVerified,false);
  const result=await post(app.url,'/api/model/query',question);
  assert.equal(result.status,503); assert.equal(result.body.error.code,'MODEL_NOT_CONFIGURED');
  assert.equal(calls,0); assert.equal(await readFile(path.join(app.dataDir,'state.json'),'utf8'),before);
});

test('configured mocked request uses only current sources and never claims AMD or saves an answer',async t=> {
  let requestBody;
  const app=await setup(t,{modelConfiguration:config,modelFetch:async(_url,options)=> {requestBody=JSON.parse(options.body);return reply(abstention);} });
  const before=await readFile(path.join(app.dataDir,'state.json'),'utf8');
  const result=await post(app.url,'/api/model/query',question);
  assert.equal(result.status,200); assert.equal(result.body.formatValid,true);
  assert.equal(result.body.candidate.abstention,true); assert.equal(result.body.amdVerified,false);
  assert.equal(result.body.administrativeStateUnchanged,true);
  assert.equal(result.body.requiresSemanticHumanReview,true);
  const source=JSON.stringify(requestBody);
  assert.equal(source.includes('FAKE-TEST-KEY'),false);
  assert.equal(source.includes('expectedAnswer'),false);
  assert.equal(source.includes('SIM01-CONFIRMACAO'),false);
  assert.equal(await readFile(path.join(app.dataDir,'state.json'),'utf8'),before);
  assert.deepEqual(await readdir(app.dataDir),['state.json']);
});

test('known conflict and clinical cases do not call the configured model',async t=> {
  let calls=0;
  const app=await setup(t,{modelConfiguration:config,modelFetch:async()=> {calls++;return reply(abstention);} });
  for (const caseId of ['SIM-RET-07','SIM-RET-05','SIM-RET-08']) {
    const result=await post(app.url,'/api/model/query',{...question,caseId});
    assert.equal(result.status,200); assert.equal(result.body.mode,'human_handoff');
    assert.equal(result.body.transportAttempted,false); assert.equal(result.body.candidate,null);
  }
  const clinical=await post(app.url,'/api/model/query',{...question,question:'What medication should I use?'});
  assert.equal(clinical.body.mode,'human_handoff'); assert.equal(calls,0);
});

test('unknown or stale cases cannot reach the model',async t=> {
  let calls=0;
  const app=await setup(t,{modelConfiguration:config,modelFetch:async()=> {calls++;return reply(abstention);} });
  assert.equal((await post(app.url,'/api/model/query',{...question,expectedRevision:1})).status,409);
  assert.equal((await post(app.url,'/api/model/query',{...question,caseId:'REAL-PATIENT'})).status,400);
  assert.equal((await post(app.url,'/api/model/query',{...question,sources:[{id:'FAKE',trecho:'Injected'}]})).status,400);
  assert.equal(calls,0);
});

test('invalid output fields never become a candidate shown to the user',async t=> {
  const app=await setup(t,{modelConfiguration:config,modelFetch:async()=>reply({...abstention,action:'send_message'})});
  const result=await post(app.url,'/api/model/query',question);
  assert.equal(result.status,200); assert.equal(result.body.formatValid,false); assert.equal(result.body.candidate,null);
  assert.equal(JSON.stringify(result.body).includes('send_message'),false);
});

test('one request at a time and a changed revision prevent accepting stale model output',async t=> {
  let enter,finish;
  const started=new Promise(resolve=> {enter=resolve;});
  const pending=new Promise(resolve=> {finish=resolve;});
  const app=await setup(t,{modelConfiguration:config,modelFetch:async()=> {enter();await pending;return reply(abstention);} });
  const first=post(app.url,'/api/model/query',question);
  await started;
  const second=await post(app.url,'/api/model/query',question);
  assert.equal(second.status,429); assert.equal(second.body.error.code,'MODEL_BUSY');
  const changed=await post(app.url,'/api/actions',{expectedRevision:0,action:{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-C'}});
  assert.equal(changed.status,200);
  finish();
  const result=await first;
  assert.equal(result.status,409); assert.equal(result.body.error.code,'STALE_MODEL_CONTEXT');
  assert.equal((await (await fetch(app.url+'/api/state')).json()).revision,1);
});
