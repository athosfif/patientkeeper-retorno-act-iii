import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceReadingView } from '../source-reading.mjs';
import { sourceTranslations } from '../source-translations.mjs';
import { sourceTranslations as canonicalTranslations } from '../../app/source-translations.mjs';
import { createBrowserApi } from '../browser-api.mjs';

function setup() {
  const values=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const lockManager={request:(_name,task)=>task()};
  return createBrowserApi({storage,lockManager,now:()=> '2026-10-12T18:00:00.000Z'});
}

test('the static demo uses the same reviewed reading catalog and language labels as the local source',()=>{
  assert.deepEqual(sourceTranslations,canonicalTranslations);
  const source={id:'SIM04-PREFERENCIA',trecho:sourceTranslations['SIM04-PREFERENCIA'].pt};
  const english=sourceReadingView(source,{language:'en'}),spanish=sourceReadingView(source,{language:'es'}),portuguese=sourceReadingView(source,{language:'pt'});
  assert.ok(english.includes('Reading translation · English'));
  assert.ok(spanish.includes('Traducción de lectura · Español'));
  assert.ok(english.includes('<details class="source-original">'));
  assert.ok(spanish.includes('<details class="source-original">'));
  assert.equal(portuguese.includes('<details'),false);
  for (const html of [english,spanish,portuguese]) assert.ok(html.includes(source.trecho));
});

test('reading translations leave browser-local source quotes, digest, receipt and progress untouched',async()=>{
  const api=setup(),state=await api('/api/state');
  const query={caseId:'SIM-RET-04',question:'Qual preferência de contato foi registrada?',expectedRevision:state.revision};
  const before=await api('/api/export'),report=await api('/api/evidence/query',query);
  const card=await api('/api/evidence/card',{caseId:query.caseId,expectedRevision:state.revision,sourceDigest:report.sourceDigest,sourceIds:['SIM04-PREFERENCIA'],reviewerConfirmed:true});
  for (const language of ['en','es','pt']) {
    for (const source of report.matches) sourceReadingView(source,{language});
    for (const source of card.sources) sourceReadingView(source,{language});
  }
  assert.deepEqual(await api('/api/export'),before);
  assert.equal((await api('/api/evidence/query',query)).sourceDigest,report.sourceDigest);
  const saved=await api('/api/evidence/reviews',{caseId:query.caseId});
  assert.equal(saved.reviews[0].sources[0].quote,sourceTranslations['SIM04-PREFERENCIA'].pt);
  assert.equal(card.sources[0].quote,report.matches.find(source=>source.sourceId==='SIM04-PREFERENCIA').quote);
});
