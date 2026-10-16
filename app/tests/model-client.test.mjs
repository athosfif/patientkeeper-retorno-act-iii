import test from 'node:test';
import assert from 'node:assert/strict';
import { mountModelPanel } from '../model-client.mjs';
import { setLanguage, ui } from '../i18n.mjs';

const scope = { caseId:'SIM-RET-02', question:'Qual pendência continua aberta e quem é o responsável?' };
const sessionId = 'c6dcd9dd-feb6-4c41-a5ac-5e229d06ce31';
const candidate = { answer:'The fictional pending task still requires the responsible team.', citations:[{ sourceId:'SIM02-HANDOFF', trecho:'Registro fictício atual para conferência humana.' }], abstention:false, reason:null, humanReviewRequired:true };
const envelope = (status, fields = {}) => ({ status, provider:'evolus', caseId:scope.caseId, revision:0, requiresSemanticHumanReview:true, formatValid:status === 'candidate', candidate:status === 'candidate' ? candidate : null, ...fields });
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes; reject=no; }); return { promise, resolve, reject }; };

// An in-memory DOM surface for the panel's controls and lifecycle only. No browser,
// backend, model, timers or third-party DOM package are used in these regressions.
class Element {
  constructor(tag = 'div', attributes = '') {
    this.tagName = tag; this.attributes = attributes; this.nodes = []; this.listeners = new Map();
    this.isConnected = true; this.disabled = /\bdisabled\b/.test(attributes); this.checked = false;
    this.value = ''; this.textContent = ''; this._html = '';
  }
  set innerHTML(value) {
    this._html = value;
    for (const node of this.nodes) node.isConnected = false;
    this.nodes = [...value.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)].map(match => new Element(match[1],match[2]));
  }
  get innerHTML() { return this._html; }
  append(node) { this.nodes.push(node); }
  querySelector(selector) {
    const matches = node => selector[0] === '[' ? new RegExp(`(?:^|\\s)${selector.slice(1,-1)}(?:[=\\s]|$)`).test(node.attributes)
      : selector[0] === '#' ? node.attributes.includes(`id="${selector.slice(1)}"`) : node.tagName === selector;
    for (const node of this.nodes) {
      if (matches(node)) return node;
      const child = node.querySelector(selector); if (child) return child;
    }
    return null;
  }
  addEventListener(type, work) { this.listeners.set(type,[...(this.listeners.get(type) || []),work]); }
  async fire(type) { for (const work of this.listeners.get(type) || []) await work({ target:this }); }
  focus() { this.focused = true; }
}

async function setup(t, { language = 'en', caseId = scope.caseId, question = ui(scope.question,language), revision = 0, evolus = { enabled:true, provider:'evolus', scope }, model = { enabled:false }, respond = () => envelope('candidate') } = {}) {
  const previousDocument = globalThis.document;
  globalThis.document = { documentElement:{ lang:language }, createElement:tag => new Element(tag) };
  setLanguage(language,null);
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; setLanguage('en',null); });
  const container = new Element(), field = new Element('textarea','id="evidence-question"');
  field.value = question; container.append(field);
  const calls = [], notices = [], stale = [], saved = [];
  const request = async (route,body) => {
    calls.push({ route, body });
    if (route === '/api/model/status') { if (model instanceof Error) throw model; return model; }
    if (route === '/api/evolus/status') { if (evolus instanceof Error) throw evolus; return evolus; }
    return respond(route,body);
  };
  const options = { item:{ id:caseId }, revision, request, notify:(...args) => notices.push(args), onStale:async () => { stale.push(true); }, onCardSaved:async value => saved.push(value) };
  await mountModelPanel(container,options);
  return { container, field, calls, notices, stale, saved, options,
    get ask() { return container.querySelector('[data-model-ask]'); },
    get result() { return container.querySelector('[data-model-result]'); },
    get host() { return container.nodes.find(node => node.tagName === 'section'); },
    async change(value) { field.value=value; await container.fire('retorno-question-changed'); },
  };
}

test('mounting only checks both optional configurations and does not start inference', async t => {
  const panel = await setup(t);
  assert.deepEqual(panel.calls.map(call => call.route),['/api/model/status','/api/evolus/status']);
  assert.match(panel.host.innerHTML,/Evolus \+ Gemma/);
  assert.equal(panel.ask.disabled,false);
  assert.equal(panel.result.innerHTML,'');
});

test('disabled or missing Evolus keeps the direct model path available', async t => {
  for (const evolus of [{ enabled:false },new Error('route not installed')]) {
    const panel = await setup(t,{ evolus, model:{ enabled:true }, respond:() => ({ formatValid:true, candidate }) });
    await panel.ask.fire('click');
    assert.equal(panel.calls.at(-1).route,'/api/model/query');
    assert.ok(panel.result.innerHTML.includes('<h4 tabindex="-1">Model answer · English</h4>'));
    assert.ok(panel.result.innerHTML.includes('<p class="callout" data-original lang="en">'));
    assert.ok(panel.result.querySelector('[data-model-save]'));
    assert.equal(panel.calls.some(call => call.route === '/api/evolus/query'),false);
  }
});

test('the default direct model still saves only reviewed source IDs through its existing card route', async t => {
  const card = { reviewId:'LOCAL-REVIEW' };
  const panel = await setup(t,{ evolus:{ enabled:false },model:{ enabled:true },respond:route => route === '/api/model/query' ? { formatValid:true,candidate,sourceDigest:'local-source-digest' } : card });
  await panel.ask.fire('click');
  const confirm = panel.result.querySelector('[data-model-reviewed]'), save = panel.result.querySelector('[data-model-save]');
  assert.equal(save.disabled,true);
  confirm.checked = true; await confirm.fire('change');
  assert.equal(save.disabled,false);
  await save.fire('click');
  assert.deepEqual(panel.calls.at(-1),{ route:'/api/evidence/card',body:{ caseId:scope.caseId,expectedRevision:0,sourceDigest:'local-source-digest',sourceIds:['SIM02-HANDOFF'],reviewerConfirmed:true } });
  assert.deepEqual(panel.saved,[card]);
});

test('Evolus is offered only for its exact configured case and canonical scope', async t => {
  for (const options of [{ caseId:'SIM-RET-01' },{ evolus:{ enabled:true,provider:'evolus',scope:{ ...scope,question:scope.question+' altered' } } },{ evolus:{ enabled:true,provider:'other',scope } }]) {
    const panel = await setup(t,{ ...options, model:{ enabled:true } });
    assert.equal(panel.ask,null);
    assert.equal(panel.calls.length,2);
  }
});

test('all three interface languages send the same fixed Portuguese request and render a read-only candidate', async t => {
  const labels = { en:'Candidate answer · original',pt:'Resposta candidata · original',es:'Respuesta candidata · original' };
  const answer = 'A pendência fictícia continua sem responsável registrado.';
  for (const language of ['en','pt','es']) {
    const panel = await setup(t,{ language,respond:() => envelope('candidate',{ candidate:{ ...candidate,answer } }) });
    assert.ok(panel.host.innerHTML.includes(scope.question));
    await panel.ask.fire('click');
    assert.deepEqual(panel.calls.at(-1),{ route:'/api/evolus/query', body:{ ...scope,expectedRevision:0 } });
    assert.ok(panel.result.innerHTML.includes(answer));
    assert.ok(panel.result.innerHTML.includes(`<h4 tabindex="-1">${labels[language]}</h4>`));
    assert.ok(panel.result.innerHTML.includes(`<p class="callout" data-original>${answer}</p>`));
    assert.equal(panel.result.innerHTML.includes('<p class="callout" data-original lang="en">'),false);
    assert.ok(panel.result.innerHTML.includes(candidate.citations[0].trecho));
    assert.equal(panel.result.querySelector('[data-model-save]'),null);
    assert.equal(panel.result.querySelector('[data-model-reviewed]'),null);
    assert.equal(panel.calls.some(call => /card|actions|contact|calendar/.test(call.route)),false);
    assert.deepEqual(panel.saved,[]);
  }
});

test('Evolus abstention preserves its original Portuguese reason without an English language claim', async t => {
  const labels = { en:'Candidate answer · original',pt:'Resposta candidata · original',es:'Respuesta candidata · original' };
  const reason = 'Os registros atuais não sustentam uma resposta.';
  for (const language of ['en','pt','es']) {
    const panel = await setup(t,{ language,respond:() => envelope('abstained',{ formatValid:true,
      candidate:{ answer:'',citations:[],abstention:true,reason,humanReviewRequired:true } }) });
    await panel.ask.fire('click');
    assert.ok(panel.result.innerHTML.includes(`<p data-original>${reason}</p>`));
    assert.ok(panel.result.innerHTML.includes(`<p class="caption">${labels[language]}</p>`));
    assert.equal(panel.result.innerHTML.includes('lang="en"'),false);
  }
});

test('free questions and changed question text never start an Evolus query', async t => {
  const panel = await setup(t,{ question:'Who is responsible? Extra instruction.' });
  assert.equal(panel.ask.disabled,true);
  await panel.ask.fire('click');
  assert.equal(panel.calls.length,2);
  await panel.change(ui(scope.question,'en'));
  assert.equal(panel.ask.disabled,false);
  panel.field.value = 'Changed without an input event';
  await panel.ask.fire('click');
  assert.equal(panel.calls.length,2);
});

test('pending requires an explicit poll of the same local session and never resubmits the query', async t => {
  let polls = 0;
  const panel = await setup(t,{ respond:route => route.endsWith('/query') || ++polls === 1 ? envelope('pending',{ sessionId }) : envelope('candidate') });
  await panel.ask.fire('click');
  assert.equal(panel.ask.disabled,true);
  assert.ok(panel.result.querySelector('[data-evolus-poll]'));
  await Promise.resolve();
  await panel.ask.fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/query').length,1);
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/poll').length,0);
  await panel.result.querySelector('[data-evolus-poll]').fire('click');
  assert.equal(panel.ask.disabled,true);
  await panel.result.querySelector('[data-evolus-poll]').fire('click');
  assert.ok(panel.result.innerHTML.includes(candidate.answer));
  assert.deepEqual(panel.calls.filter(call => call.route === '/api/evolus/poll').map(call => call.body),[{ sessionId,expectedRevision:0 },{ sessionId,expectedRevision:0 }]);
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/query').length,1);
});

test('remounting pending in another interface language recovers only an explicit check of its local session', async t => {
  const evolus = { enabled:true,provider:'evolus',scope,canStart:true };
  const panel = await setup(t,{ evolus,respond:route => route.endsWith('/query') ? envelope('pending',{ sessionId }) : envelope('candidate') });
  await panel.ask.fire('click');
  const oldPoll = panel.result.querySelector('[data-evolus-poll]');
  assert.ok(oldPoll);
  panel.container.isConnected = false;
  Object.assign(evolus,{ canStart:false,pending:true,pendingSession:{ sessionId,caseId:scope.caseId,revision:0,
    sourceDigest:'a'.repeat(64),inputDigest:'b'.repeat(64),requiresSemanticHumanReview:true } });
  const container = new Element(), field = new Element('textarea','id="evidence-question"');
  setLanguage('es',null); document.documentElement.lang='es';
  field.value=ui(scope.question,'es'); container.append(field);
  await mountModelPanel(container,panel.options);
  const ask = container.querySelector('[data-model-ask]'), result = container.querySelector('[data-model-result]');
  const poll = result.querySelector('[data-evolus-poll]');
  assert.equal(ask.disabled,true);
  assert.ok(poll); assert.equal(poll.disabled,false);
  assert.match(result.innerHTML,/Comprobar resultado/);
  assert.equal(result.innerHTML.includes(candidate.answer),false);
  await Promise.resolve();
  await oldPoll.fire('click'); await ask.fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/query').length,1);
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/poll').length,0);
  await poll.fire('click');
  assert.deepEqual(panel.calls.at(-1),{ route:'/api/evolus/poll',body:{ sessionId,expectedRevision:0 } });
  assert.ok(result.innerHTML.includes(candidate.answer));
  await poll.fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/poll').length,1);
});

test('recovered sessions are unusable for another question, case, revision or unreviewed metadata', async t => {
  const receipt = { sessionId,caseId:scope.caseId,revision:0,requiresSemanticHumanReview:true };
  for (const variation of [{ question:'A different question' },{ receipt:{ ...receipt,caseId:'SIM-RET-03' } },
    { receipt:{ ...receipt,revision:1 } },{ receipt:{ ...receipt,requiresSemanticHumanReview:false } },
    { receipt:{ ...receipt,sessionId:'external-execution-id' } }]) {
    const panel = await setup(t,{ ...(variation.question ? { question:variation.question } : {}),
      evolus:{ enabled:true,provider:'evolus',scope,canStart:false,pending:true,pendingSession:variation.receipt || receipt } });
    assert.equal(panel.ask.disabled,true);
    assert.equal(panel.result.querySelector('[data-evolus-poll]'),null);
    await panel.ask.fire('click');
    assert.equal(panel.calls.length,2);
  }
  const panel = await setup(t,{ evolus:{ enabled:true,provider:'evolus',scope,canStart:false,pending:true,pendingSession:receipt } });
  const poll = panel.result.querySelector('[data-evolus-poll]');
  assert.ok(poll);
  await panel.change('A different question');
  assert.equal(panel.result.innerHTML,'');
  await poll.fire('click');
  await panel.change(ui(scope.question,'en'));
  await poll.fire('click');
  assert.equal(panel.calls.length,2);
});

test('failed polling retains only an explicit check of the existing session', async t => {
  let polls = 0;
  const panel = await setup(t,{ respond:route => { if (route.endsWith('/query')) return envelope('pending',{ sessionId }); if (++polls === 1) throw new Error('private backend detail'); return envelope('candidate'); } });
  await panel.ask.fire('click');
  await panel.result.querySelector('[data-evolus-poll]').fire('click');
  assert.equal(panel.ask.disabled,true);
  assert.equal(panel.result.innerHTML.includes('private backend detail'),false);
  await panel.result.querySelector('[data-evolus-poll]').fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/query').length,1);
  assert.ok(panel.result.innerHTML.includes(candidate.answer));
});

test('changing the question discards pending and makes even the old check control inert', async t => {
  const panel = await setup(t,{ respond:() => envelope('pending',{ sessionId }) });
  await panel.ask.fire('click');
  const oldPoll = panel.result.querySelector('[data-evolus-poll]');
  await panel.change('A different question');
  assert.equal(panel.result.innerHTML,'');
  assert.equal(panel.ask.disabled,true);
  await oldPoll.fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/poll').length,0);
  await panel.change(ui(scope.question,'en'));
  await oldPoll.fire('click');
  assert.equal(panel.calls.filter(call => call.route === '/api/evolus/poll').length,0);
});

test('a late success or failure after a question change cannot render, notify or refresh state', async t => {
  for (const fails of [false,true]) {
    const remote = deferred(), panel = await setup(t,{ respond:() => remote.promise });
    const operation = panel.ask.fire('click');
    await panel.change('A different question');
    if (fails) remote.reject(Object.assign(new Error('stale detail'),{ status:409 })); else remote.resolve(envelope('candidate'));
    await operation;
    assert.equal(panel.result.innerHTML,'');
    assert.deepEqual(panel.notices,[]);
    assert.deepEqual(panel.stale,[]);
  }
});

test('a remount for a new case or revision invalidates in-flight responses and old controls', async t => {
  for (const change of [{ item:{ id:'SIM-RET-03' } },{ revision:1 }]) {
    const remote = deferred(), panel = await setup(t,{ respond:() => remote.promise });
    const oldResult = panel.result, oldAsk = panel.ask;
    const operation = oldAsk.fire('click');
    await mountModelPanel(panel.container,{ ...panel.options,...change });
    remote.resolve(envelope('candidate'));
    await operation;
    assert.equal(oldResult.innerHTML.includes(candidate.answer),false);
    await oldAsk.fire('click');
    assert.equal(panel.calls.filter(call => call.route === '/api/evolus/query').length,1);
    assert.deepEqual(panel.notices,[]);
  }
});

test('stale replies refresh once while exhausted status refuses a new execution', async t => {
  const stale = await setup(t,{ respond:() => envelope('stale') });
  await stale.ask.fire('click');
  assert.equal(stale.stale.length,1);
  assert.equal(stale.ask.disabled,true);
  const exhausted = await setup(t,{ evolus:{ enabled:true,provider:'evolus',scope,canStart:false,remainingExecutions:0 } });
  assert.equal(exhausted.ask.disabled,true);
  await exhausted.ask.fire('click');
  assert.equal(exhausted.calls.length,2);
  const last = await setup(t,{ respond:() => envelope('candidate',{ remainingExecutions:0 }) });
  await last.ask.fire('click');
  assert.ok(last.result.innerHTML.includes(candidate.answer));
  assert.equal(last.ask.disabled,true);
});

test('wrong context, missing human review and malformed pending never become a candidate or poll', async t => {
  for (const output of [envelope('candidate',{ provider:'other' }),envelope('candidate',{ revision:1 }),envelope('candidate',{ caseId:'SIM-RET-01' }),envelope('candidate',{ requiresSemanticHumanReview:false }),envelope('pending',{ sessionId:'remote-execution-id' })]) {
    const panel = await setup(t,{ respond:() => output });
    await panel.ask.fire('click');
    assert.equal(panel.result.innerHTML.includes(candidate.answer),false);
    assert.equal(panel.result.querySelector('[data-evolus-poll]'),null);
  }
});

test('untrusted candidate text and source excerpts are escaped while review remains required', async t => {
  const markup = '<img src=x onerror="bad()">';
  const panel = await setup(t,{ respond:() => envelope('candidate',{ candidate:{ ...candidate,answer:markup,citations:[{ sourceId:markup,trecho:markup }] } }) });
  await panel.ask.fire('click');
  assert.equal(panel.result.innerHTML.includes(markup),false);
  assert.ok(panel.result.innerHTML.includes('&lt;img'));
  assert.match(panel.result.innerHTML,/human review/);
  assert.equal(panel.result.querySelector('[data-model-save]'),null);
});
