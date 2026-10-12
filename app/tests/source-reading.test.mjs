import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { sourceTranslations, translationForFictionalSource } from '../source-translations.mjs';
import { sourceReadingView } from '../source-reading.mjs';
import { createState, transition, viewState, getModelInput } from '../engine.mjs';
import { queryEvidence, createEvidenceCard } from '../evidence.mjs';
import { setLanguage } from '../i18n.mjs';
import { createAppServer } from '../server.mjs';

const fixtureBytes = await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url));
const fixtures = JSON.parse(fixtureBytes);
const originalSources = [];
const collect = value => {
  if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') {
    if (typeof value.id === 'string' && typeof value.trecho === 'string') originalSources.push(value);
    Object.values(value).forEach(collect);
  }
};
collect(fixtures);
const initial = () => createState(fixtures, '2026-10-12T15:00:00.000Z');
const act = (state, action) => transition(state, action, fixtures, '2026-10-12T15:02:00.000Z');
const projectedSource = (state, id) => viewState(state, fixtures).cases.flatMap(item => item.activeSources).find(source => source.id === id);

test('the reviewed catalog covers all 23 exact fictional originals, including future-stage records', () => {
  assert.equal(originalSources.length, 23);
  assert.equal(Object.keys(sourceTranslations).length, originalSources.length);
  assert.equal(Object.isFrozen(sourceTranslations), true);
  for (const source of originalSources) {
    const row = sourceTranslations[source.id];
    assert.equal(row.pt, source.trecho, source.id);
    assert.equal(Object.isFrozen(row), true);
    for (const lang of ['en', 'es']) {
      assert.equal(translationForFictionalSource(source, lang), row[lang]);
      assert.ok(row[lang].length > 10);
      assert.notEqual(row[lang], row.pt);
    }
  }
  assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), 'ed64497b692923fe42595ae47886aa4431dbd87e42d13b9c95702c6e397211cd');
});

test('English and Spanish show a labeled reading aid with the full PT citation accessible in details', () => {
  const source = originalSources.find(source => source.id === 'SIM04-PREFERENCIA');
  for (const language of ['en', 'es']) {
    const html = sourceReadingView(source, { language, originalTag:'blockquote' });
    assert.ok(html.includes(sourceTranslations[source.id][language]));
    assert.ok(html.includes(`class="reading-text" lang="${language}"`));
    assert.match(html, /<details class="source-original"><summary/);
    assert.match(html, /<blockquote class="source-original-text" data-original lang="pt-BR">/);
    assert.ok(html.includes(source.trecho));
    assert.ok(html.includes(language === 'en' ? 'Reading translation · English' : 'Traducción de lectura · Español'));
    assert.ok(html.includes(language === 'en' ? 'saved receipts use the Portuguese original' : 'recibos guardados usan el original en portugués'));
  }
});

test('Portuguese keeps the literal source as the primary reading, without a redundant translation', () => {
  for (const source of originalSources) {
    const html = sourceReadingView(source, { language:'pt' });
    assert.ok(html.includes(source.trecho));
    assert.equal(html.includes('reading-text'), false);
    assert.equal(html.includes('<details'), false);
    assert.ok(html.includes('Fonte original · Português'));
  }
});

test('same ID with changed text, changed ID and unknown records cannot inherit a translation', () => {
  const source = originalSources[0];
  for (const altered of [{...source,trecho:source.trecho+' '}, {...source,id:'UNKNOWN'}, {id:source.id,trecho:source.trecho.replace('Nao', 'Sim')}]) {
    assert.equal(translationForFictionalSource(altered,'en'),null);
    const html=sourceReadingView(altered,{language:'en'});
    assert.equal(html.includes('reading-text'),false);
    assert.ok(html.includes('No reviewed reading translation is available'));
    assert.equal(html.includes('<details'),false);
  }
  assert.equal(translationForFictionalSource(source,'fr'),null);
  assert.equal(translationForFictionalSource({get id(){throw new Error('Getter must not execute');},trecho:source.trecho},'en'),null);
});

test('unrecognized source text is escaped and a caller cannot inject an HTML tag', () => {
  const html=sourceReadingView({id:'UNKNOWN',trecho:'<script>alert("x")</script> & text'}, {language:'es',originalTag:'script'});
  assert.equal(html.includes('<script>'),false);
  assert.match(html,/&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; text/);
  assert.ok(html.includes('<p class="source-original-text" data-original lang="pt-BR">'));
});

test('engine-generated assignment and contact records translate only closed exact templates', () => {
  for (const owner of ['SEC-SIM-A','SEC-SIM-B','SEC-SIM-C','COORD-SIM-A','MED-SIM-A','MED-SIM-B',null]) {
    const starting=owner === null ? act(initial(),{type:'assign',caseId:'SIM-RET-02',owner:'SEC-SIM-A'}) : initial();
    const state=act(starting,{type:'assign',caseId:'SIM-RET-02',owner});
    const source=projectedSource(state,'SIM-RET-02-ATRIBUICAO');
    for (const lang of ['en','es']) assert.ok(translationForFictionalSource(source,lang));
    assert.equal(translationForFictionalSource({...source,trecho:source.trecho+' Extra text.'},'en'),null);
  }
  let state=act(initial(),{type:'draft_review',caseId:'SIM-RET-01',reviewed:true});
  state=act(state,{type:'contact_record',caseId:'SIM-RET-01',confirmed:true});
  const source=viewState(state,fixtures).cases[0].activeSources.find(source=>source.id.includes('-CONTATO-'));
  assert.ok(source);
  assert.ok(translationForFictionalSource(source,'en').includes('does not confirm'));
  assert.ok(translationForFictionalSource(source,'es').includes('no confirma'));
  assert.equal(translationForFictionalSource({...source,trecho:source.trecho.replace('CANAL-FICTICIO-A','REAL-CONTACT')},'en'),null);
});

test('language changes do not modify evidence digests, model inputs, saved literal cards or progress', () => {
  const state=initial(), before=JSON.stringify(state), caseId='SIM-RET-04';
  const query={caseId,question:'Qual preferência de contato foi registrada?',expectedRevision:0};
  const report=queryEvidence(state,query,fixtures);
  const card=createEvidenceCard(state,{caseId,expectedRevision:0,sourceDigest:report.sourceDigest,sourceIds:['SIM04-PREFERENCIA'],reviewerConfirmed:true},fixtures);
  const input=getModelInput(state,caseId,query.question,fixtures);
  const saved=JSON.stringify(card);
  for (const language of ['en','es','pt']) {
    setLanguage(language,null);
    for (const source of report.matches) sourceReadingView(source);
    for (const source of card.sources) sourceReadingView(source);
    assert.equal(queryEvidence(state,query,fixtures).sourceDigest,report.sourceDigest);
    assert.deepEqual(getModelInput(state,caseId,query.question,fixtures),input);
    assert.equal(JSON.stringify(card),saved);
    assert.equal(JSON.stringify(state),before);
  }
  assert.equal(card.sources[0].quote,sourceTranslations['SIM04-PREFERENCIA'].pt);
  setLanguage('en',null);
});

test('source display is used in Records, review, saved cards and source citations while model outputs remain literal', async () => {
  for (const name of ['client.mjs','evidence-client.mjs','recorded-amd-client.mjs','model-client.mjs']) {
    const module=await readFile(new URL(`../${name}`,import.meta.url),'utf8');
    assert.ok(module.includes("from './source-reading.mjs'"),name);
    assert.ok(module.includes('sourceReadingView(source'),name);
  }
  const recorded=await readFile(new URL('../recorded-amd-client.mjs',import.meta.url),'utf8');
  assert.ok(recorded.includes('<p class="callout" data-original>${esc(candidate.abstention ? candidate.reason : candidate.answer)}</p>'));
  assert.equal(recorded.includes('sourceReadingView(candidate'),false);
});

test('the local server serves only the two explicitly permitted new display modules', async t => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'retorno-reading-server-'));
  const app=await createAppServer({dataDir,port:0});
  t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
  for (const name of ['source-reading.mjs','source-translations.mjs']) {
    const response=await fetch(`${app.url}/${name}`);
    assert.equal(response.status,200,name);
    assert.match(response.headers.get('content-type'),/text\/javascript/);
    assert.match(await response.text(),/export/);
  }
  assert.equal((await fetch(`${app.url}/source-translations.json`)).status,404);
});
