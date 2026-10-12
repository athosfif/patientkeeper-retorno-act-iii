import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, catalog, getLanguage, getLocale, setLanguage, ui, stamp, normalizeSuggestedQuestion, suggestedQuestions, searchText, errorText, localizeTree } from '../i18n.mjs';

test('English is the fallback, with the three requested languages only', () => {
  assert.deepEqual(Object.keys(LANGUAGES),['en','pt','es']);
  setLanguage('unsupported',null);
  assert.equal(getLanguage(),'en');
  assert.equal(getLocale(),'en');
  assert.equal(ui('Conferir com fontes'),'Check the sources');
  assert.equal(getLocale('pt'),'pt-BR');
});

test('the complete UI catalog supplies nonempty Portuguese, English and Spanish', () => {
  const keys = new Set();
  for (const row of catalog) {
    assert.equal(row.length,3);
    assert.ok(row.every(value => typeof value === 'string' && value.trim()));
    assert.ok(!keys.has(row[0]),`Duplicate Portuguese key: ${row[0]}`);
    keys.add(row[0]);
    assert.equal(ui(row[0],'en'),row[1]);
    assert.equal(ui(row[0],'es'),row[2]);
  }
});

test('only exact suggested questions map to their canonical Portuguese equivalent', () => {
  for (const question of suggestedQuestions) for (const language of Object.keys(LANGUAGES)) {
    assert.equal(normalizeSuggestedQuestion(ui(question,language)),question);
  }
  const freeQuestions=['What medicine should I use?','¿Puedo esperar tres días?','Send a message now','Which issue is still open, and who is responsible? plus more'];
  for (const question of freeQuestions) assert.equal(normalizeSuggestedQuestion(question),question);
});

test('storage failures and a blocked localStorage getter do not block language selection', () => {
  assert.doesNotThrow(() => setLanguage('es',{setItem(){throw new Error('blocked');}}));
  assert.equal(getLanguage(),'es');
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked getter');}});
    assert.doesNotThrow(() => setLanguage('pt'));
    assert.equal(getLanguage(),'pt');
  } finally {
    if (descriptor) Object.defineProperty(globalThis,'localStorage',descriptor); else delete globalThis.localStorage;
    setLanguage('en',null);
  }
});

test('preference persistence writes only a validated language identifier', () => {
  const writes=[];
  setLanguage('pt',{setItem:(key,value) => writes.push([key,value])});
  setLanguage('invalid',{setItem:(key,value) => writes.push([key,value])});
  assert.deepEqual(writes,[['patientkeeper-retorno-language','pt'],['patientkeeper-retorno-language','en']]);
});

test('dates use the selected locale and the event’s Sao Paulo timezone', () => {
  const instant='2026-10-12T03:15:00.000Z';
  for (const language of Object.keys(LANGUAGES)) {
    const expected=new Intl.DateTimeFormat(getLocale(language),{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(instant));
    assert.equal(stamp(instant,language),expected);
  }
});

test('search normalization keeps accents and language changes from hiding a matching title', () => {
  assert.equal(searchText('  REVISIÓN MÉDICA  '),'revision medica');
  const searchable=searchText(['pt','en','es'].map(language => ui('Janela clínica não informada',language)).join(' '));
  assert.ok(searchable.includes(searchText('Clinical timing')));
  assert.ok(searchable.includes(searchText('Plazo clínico')));
  assert.ok(searchable.includes(searchText('Janela clínica')));
});

test('known errors translate and unrecognized backend details use a localized safe fallback', () => {
  setLanguage('es',null);
  assert.equal(errorText('Essa atribuição já está registrada.'),'Esta asignación ya está registrada.');
  assert.equal(errorText('Unexpected private backend detail'),'No se pudo registrar este cambio.');
  setLanguage('en',null);
  assert.equal(errorText(null),'Could not record this change.');
});

test('dynamic counts, state versions and case context are readable in English and Spanish', () => {
  assert.equal(ui('1 caso neste filtro','en'),'1 case in this filter');
  assert.equal(ui('2 casos neste filtro','es'),'2 casos en este filtro');
  assert.equal(ui('1 contato fictício registrado','en'),'1 fictional contact recorded');
  assert.equal(ui('2 contatos fictícios registrados','es'),'2 contactos ficticios registrados');
  assert.equal(ui('Versão do progresso 10 · 1 trecho','en'),'Progress version 10 · 1 excerpt(s)');
  assert.equal(ui('Responsável: SEC-SIM-A · Agenda fictícia','en'),'Assignee: SEC-SIM-A · Fictional schedule');
});

test('tree translation preserves literal sources and user text even if they equal a UI label', () => {
  const previousDocument=globalThis.document, previousFilter=globalThis.NodeFilter;
  const element=excluded => ({closest:()=>excluded ? {} : null});
  const uiNode={nodeValue:'Conferir com fontes',parentElement:element(false)};
  const literalNode={nodeValue:'Conferir com fontes',parentElement:element(true)};
  const draftNode={nodeValue:'Conferir com fontes',parentElement:element(true)};
  const root={querySelectorAll:()=>[],hasAttribute:()=>false,closest:()=>null};
  try {
    globalThis.NodeFilter={SHOW_TEXT:4};
    globalThis.document={documentElement:{lang:'en'},title:'',createTreeWalker(){let index=0;const nodes=[uiNode,literalNode,draftNode];return {nextNode:()=>nodes[index++] || null};}};
    for (const language of ['en','es','pt']) {
      setLanguage(language,null);localizeTree(root);
      assert.equal(uiNode.nodeValue,ui('Conferir com fontes',language));
      assert.equal(literalNode.nodeValue,'Conferir com fontes');
      assert.equal(draftNode.nodeValue,'Conferir com fontes');
      assert.equal(document.documentElement.lang,getLocale(language));
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;else globalThis.document=previousDocument;
    if (previousFilter === undefined) delete globalThis.NodeFilter;else globalThis.NodeFilter=previousFilter;
    setLanguage('en',null);
  }
});
