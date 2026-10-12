import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, transition, viewState, validateState, getModelInput } from '../engine.mjs';

const fixtures = JSON.parse(await readFile(new URL('../../CASOS-SINTETICOS.json', import.meta.url), 'utf8'));
const NOW = '2026-10-05T15:00:00.000Z';
const later = '2026-10-05T15:01:00.000Z';
const first = 'SIM-RET-01';
const allFutureIds = ['SIM01-EVOL-REVISAO', 'SIM01-EVOL-CONFIRMACAO', 'SIM01-EVOL-AGENDA', 'SIM01-EVOL-FILA'];
const clone = (value) => JSON.parse(JSON.stringify(value));
const initial = () => createState(fixtures, NOW);
const act = (state, type, fields = {}, caseId = first, now = NOW) => transition(state, { type, caseId, ...fields }, fixtures, now);
const row = (state, caseId = first) => viewState(state, fixtures).cases.find((item) => item.id === caseId);
const sourceIds = (state) => getModelInput(state, first, 'Qual é a pendência?', fixtures).sources.map((source) => source.id);
const futureIds = (state) => sourceIds(state).filter((id) => allFutureIds.includes(id));
const reviewed = (text = null) => {
  let state = initial();
  if (text !== null) state = act(state, 'draft_save', { text });
  return act(state, 'draft_review', { reviewed: true });
};
const oriented = () => act(initial(), 'register_orientation', { confirmed: true });
const confirmed = () => act(oriented(), 'confirm_response', { confirmationReviewed: true, calendarReviewed: true });
const closed = () => act(confirmed(), 'close', { confirmationReviewed: true, calendarReviewed: true });

function reject(state, action, code, now = NOW) {
  const before = JSON.stringify(state);
  assert.throws(() => transition(state, action, fixtures, now), (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.code, code);
    assert.ok(error.message.length > 10);
    return true;
  });
  assert.equal(JSON.stringify(state), before, 'a rejeição deve preservar todo o estado de entrada');
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('o estado inicial preserva oito casos fictícios e métricas de processo', () => {
  const state = initial();
  assert.deepEqual(Object.keys(state), ['schemaVersion', 'revision', 'demo', 'cases']);
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.revision, 0);
  assert.equal(state.demo, true);
  assert.equal(state.cases.length, 8);
  assert.deepEqual(viewState(state, fixtures).metrics, { open: 8, unowned: 1, resolved: 0, medical: 3 });
  assert.ok(state.cases.every((item) => item.stage === 0 && item.draftText === null && item.draftReviewed === false && item.history.length === 0));
  assert.equal(validateState(state, fixtures), true);
});

test('o conjunto completo e a lista de casos fornecem o mesmo estado', () => {
  assert.deepEqual(createState(fixtures.casos, NOW), initial());
});

test('transições funcionam com entradas congeladas e não compartilham históricos', () => {
  const data = freeze(clone(fixtures));
  const state = freeze(createState(data, NOW));
  const action = freeze({ type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C' });
  const next = transition(state, action, data, NOW);
  assert.equal(next.revision, 1);
  assert.equal(state.cases[1].owner, null);
  assert.equal(next.cases[1].owner, 'SEC-SIM-C');
  assert.notEqual(next, state);
  next.cases[0].history.push({});
  assert.equal(state.cases[0].history.length, 0);
});

test('atribuir o handoff atualiza responsável, estado, ação, métrica e fonte vigente', () => {
  const state = act(initial(), 'assign', { owner: 'SEC-SIM-C' }, 'SIM-RET-02');
  const projected = row(state, 'SIM-RET-02');
  assert.equal(projected.owner, 'SEC-SIM-C');
  assert.equal(projected.status, 'remarcacao_pendente');
  assert.match(projected.nextAction, /preferência/);
  assert.equal(viewState(state, fixtures).metrics.unowned, 0);
  assert.equal(projected.activeSources.find((source) => source.id === 'SIM02-HANDOFF').vigente, false);
  assert.match(projected.draft.reason, /preferência de contato/);
  assert.doesNotMatch(projected.draft.reason, /falta atribui|faltam.*responsável|sem responsável|falta.*responsável/i);
  assert.equal(projected.draft.allowed, false);
  const updated = projected.activeSources.find((source) => source.id === 'SIM-RET-02-ATRIBUICAO');
  assert.equal(updated.vigente, true);
  assert.match(updated.trecho, /SEC-SIM-C/);
  assert.match(projected.history[0].text, /simulação/);
});

test('atribuição idêntica, responsável inexistente e objetos como responsável são rejeitados', () => {
  const state = initial();
  reject(state, { type: 'assign', caseId: first, owner: 'SEC-SIM-A' }, 'NO_CHANGE');
  reject(state, { type: 'assign', caseId: first, owner: 'PESSOA-REAL' }, 'INVALID_OWNER');
  reject(state, { type: 'assign', caseId: first, owner: {} }, 'INVALID_OWNER');
});

test('remover atribuição bloqueia contato e evolução até nova atribuição humana', () => {
  const state = act(reviewed(), 'assign', { owner: null });
  const projected = row(state);
  assert.equal(projected.status, 'sem_responsavel');
  assert.equal(projected.draft.allowed, false);
  assert.equal(projected.canRecordContact, false);
  assert.equal(projected.canRegisterOrientation, false);
  reject(state, { type: 'register_orientation', caseId: first, confirmed: true }, 'OWNER_REQUIRED');
  reject(state, { type: 'contact_record', caseId: first, confirmed: true }, 'CONTACT_BLOCKED');
  assert.equal(row(act(state, 'assign', { owner: 'SEC-SIM-B' })).owner, 'SEC-SIM-B');
});

test('rascunho vazio permanece vazio e não recupera o texto preparado', () => {
  const state = act(initial(), 'draft_save', { text: '' });
  assert.equal(row(state).draft.text, '');
  assert.equal(state.cases[0].draftText, '');
  reject(state, { type: 'draft_review', caseId: first, reviewed: true }, 'EMPTY_DRAFT');
  reject(state, { type: 'contact_record', caseId: first, confirmed: true }, 'DRAFT_REVIEW_REQUIRED');
  assert.equal(state.cases[0].contactCount, 0);
});

test('salvar e editar um rascunho não registra contato e invalida a revisão anterior', () => {
  let state = reviewed('Podemos conferir sua disponibilidade?');
  assert.equal(row(state).draft.reviewed, true);
  assert.equal(state.cases[0].contactCount, 0);
  state = act(state, 'draft_save', { text: 'Podemos conferir outra disponibilidade?' });
  assert.equal(row(state).draft.reviewed, false);
  assert.equal(row(state).canRecordContact, false);
  assert.equal(state.cases[0].contactCount, 0);
  assert.equal(state.cases[0].stage, 0);
  assert.deepEqual(futureIds(state), []);
});

test('o texto preparado exige revisão explícita; revisão pode voltar a pendente', () => {
  const state = initial();
  assert.equal(row(state).draft.text, fixtures.casos[0].rascunho.texto);
  assert.equal(row(state).canRecordContact, false);
  reject(state, { type: 'contact_record', caseId: first, confirmed: true }, 'DRAFT_REVIEW_REQUIRED');
  const approved = act(state, 'draft_review', { reviewed: true });
  assert.equal(row(approved).canRecordContact, true);
  const pending = act(approved, 'draft_review', { reviewed: false });
  assert.equal(row(pending).canRecordContact, false);
});

test('recusa, política ausente, questão médica e conflito bloqueiam rascunhos e contatos', () => {
  for (const caseId of fixtures.casos.slice(1).map((fixture) => fixture.id)) {
    const state = initial();
    assert.equal(row(state, caseId).draft.allowed, false, caseId);
    assert.equal(row(state, caseId).canRecordContact, false, caseId);
    reject(state, { type: 'draft_save', caseId, text: 'Rascunho' }, 'DRAFT_BLOCKED');
    reject(state, { type: 'draft_review', caseId, reviewed: true }, 'DRAFT_BLOCKED');
    reject(state, { type: 'contact_record', caseId, confirmed: true }, 'CONTACT_BLOCKED');
  }
  assert.match(row(initial(), 'SIM-RET-04').draft.reason, /preferência/i);
  assert.equal(row(initial(), 'SIM-RET-07').status, 'divergencia_aguardando_revisao');
});

test('alterar o responsável não contorna recusa nem dependência clínica', () => {
  for (const caseId of ['SIM-RET-04', 'SIM-RET-05', 'SIM-RET-08']) {
    const state = act(initial(), 'assign', { owner: 'COORD-SIM-A' }, caseId);
    reject(state, { type: 'draft_save', caseId, text: 'Contato por outro canal' }, 'DRAFT_BLOCKED');
    if (caseId !== 'SIM-RET-04') assert.ok(row(state, caseId).medicalHandoff);
  }
});

test('o contato humano simulado incrementa apenas seu registro e mantém a pendência aberta', () => {
  const state = act(reviewed(), 'contact_record', { confirmed: true });
  const projected = row(state);
  assert.equal(projected.contactCount, 1);
  assert.equal(projected.stage, 0);
  assert.equal(projected.status, 'aguardando_resposta');
  assert.equal(viewState(state, fixtures).metrics.open, 8);
  assert.equal(projected.canConfirm, false);
  assert.equal(projected.canClose, false);
  assert.deepEqual(futureIds(state), []);
  assert.match(projected.history.at(-1).text, /Contato humano simulado/);
  assert.ok(projected.activeSources.some((source) => source.id.includes('-CONTATO-')));
  assert.ok(projected.medicalHandoff, 'contato não substitui orientação médica');
});

test('registrar de novo o mesmo rascunho é rejeitado, inclusive após salvar e revisar novamente', () => {
  const state = act(reviewed(), 'contact_record', { confirmed: true });
  assert.equal(row(state).canRecordContact, false);
  reject(state, { type: 'contact_record', caseId: first, confirmed: true }, 'DUPLICATE_CONTACT');
  let saved = act(state, 'draft_save', { text: row(state).draft.text });
  saved = act(saved, 'draft_review', { reviewed: true });
  reject(saved, { type: 'contact_record', caseId: first, confirmed: true }, 'DUPLICATE_CONTACT');
  assert.equal(saved.cases[0].contactCount, 1);
});

test('editar e revisar depois do contato não autoriza um segundo contato sem política registrada', () => {
  let state = act(reviewed(), 'contact_record', { confirmed: true });
  state = act(state, 'draft_save', { text: 'Registro fictício editado e conferido pela equipe.' });
  state = act(state, 'draft_review', { reviewed: true });
  assert.equal(row(state).canRecordContact, false);
  reject(state, { type: 'contact_record', caseId: first, confirmed: true }, 'ADDITIONAL_CONTACT_BLOCKED');
  assert.equal(state.cases[0].contactCount, 1);
  assert.equal(state.cases[0].stage, 0);
  assert.deepEqual(futureIds(state), []);
});

test('SIM03 preserva um contato existente e ausência de resposta a partir de sua fonte', () => {
  const data = clone(fixtures);
  data.casos[2].tentativas_humanas_simuladas = 99;
  const state = createState(data, NOW);
  const projected = viewState(state, data).cases[2];
  assert.equal(projected.contactCount, 1);
  assert.equal(projected.status, 'aguardando_resposta');
  assert.equal(projected.history.length, 0);
  assert.equal(projected.canRecordContact, false);
  assert.ok(projected.activeSources.some((source) => source.id === 'SIM03-CONTATO'));
});

test('a evolução SIM01 ativa somente fontes da etapa humana e muda a próxima ação', () => {
  const state0 = initial();
  const state1 = oriented();
  const state2 = confirmed();
  const state3 = closed();
  assert.deepEqual(futureIds(state0), []);
  assert.deepEqual(futureIds(state1), ['SIM01-EVOL-REVISAO']);
  assert.deepEqual(futureIds(state2), ['SIM01-EVOL-REVISAO', 'SIM01-EVOL-CONFIRMACAO', 'SIM01-EVOL-AGENDA']);
  assert.deepEqual(futureIds(state3), allFutureIds);
  assert.equal(new Set([state0, state1, state2, state3].map((state) => row(state).nextAction)).size, 4);
  assert.equal(row(state1).medicalHandoff, null);
  assert.equal(row(state1).canConfirm, true);
  assert.equal(row(state2).canClose, true);
  assert.equal(row(state2).status, 'reposicao_confirmada');
  assert.equal(row(state2).draft.allowed, false);
  assert.equal(row(state3).status, 'resolvido_administrativamente');
  assert.deepEqual(viewState(state3, fixtures).metrics, { open: 7, unowned: 1, resolved: 1, medical: 2 });
  assert.equal(row(state3).contactCount, 0, 'confirmação registrada não inventa tentativa de contato');
});

test('a evolução impede atalhos e não existe nos outros sete casos', () => {
  reject(initial(), { type: 'confirm_response', caseId: first, confirmationReviewed: true, calendarReviewed: true }, 'INVALID_STAGE');
  reject(initial(), { type: 'close', caseId: first, confirmationReviewed: true, calendarReviewed: true }, 'INVALID_STAGE');
  reject(oriented(), { type: 'close', caseId: first, confirmationReviewed: true, calendarReviewed: true }, 'INVALID_STAGE');
  for (const caseId of fixtures.casos.slice(1).map((fixture) => fixture.id)) {
    reject(initial(), { type: 'register_orientation', caseId, confirmed: true }, 'INVALID_STAGE');
    reject(initial(), { type: 'confirm_response', caseId, confirmationReviewed: true, calendarReviewed: true }, 'INVALID_STAGE');
    reject(initial(), { type: 'close', caseId, confirmationReviewed: true, calendarReviewed: true }, 'INVALID_STAGE');
  }
});

test('contato, orientação, confirmação e encerramento exigem seus controles humanos', () => {
  reject(reviewed(), { type: 'contact_record', caseId: first, confirmed: false }, 'HUMAN_CONFIRMATION_REQUIRED');
  reject(initial(), { type: 'register_orientation', caseId: first, confirmed: false }, 'HUMAN_CONFIRMATION_REQUIRED');
  reject(oriented(), { type: 'confirm_response', caseId: first, confirmationReviewed: true, calendarReviewed: false }, 'EVIDENCE_REVIEW_REQUIRED');
  reject(oriented(), { type: 'confirm_response', caseId: first, confirmationReviewed: false, calendarReviewed: true }, 'EVIDENCE_REVIEW_REQUIRED');
  reject(confirmed(), { type: 'close', caseId: first, confirmationReviewed: true, calendarReviewed: false }, 'EVIDENCE_REVIEW_REQUIRED');
});

test('a resolução administrativa é imutável para todas as ações do contrato', () => {
  const state = closed();
  for (const action of [
    { type: 'assign', caseId: first, owner: 'SEC-SIM-B' },
    { type: 'draft_save', caseId: first, text: 'Alteração' },
    { type: 'draft_review', caseId: first, reviewed: true },
    { type: 'contact_record', caseId: first, confirmed: true },
    { type: 'register_orientation', caseId: first, confirmed: true },
    { type: 'confirm_response', caseId: first, confirmationReviewed: true, calendarReviewed: true },
    { type: 'close', caseId: first, confirmationReviewed: true, calendarReviewed: true },
  ]) reject(state, action, 'RESOLVED_IMMUTABLE');
});

test('as fontes superadas continuam identificáveis e a atribuição atual não fica contraditória', () => {
  const state = act(initial(), 'assign', { owner: 'SEC-SIM-B' }, 'SIM-RET-06');
  const projected = row(state, 'SIM-RET-06');
  const oldRule = projected.activeSources.find((source) => source.id === 'SIM06-REGRA-V1');
  assert.equal(oldRule.vigente, false);
  assert.equal(oldRule.substituida_por, 'SIM06-REGRA-V2');
  assert.equal(projected.activeSources.find((source) => source.id === 'SIM06-REGRA-V2').vigente, true);
  assert.equal(projected.activeSources.find((source) => source.id === 'SIM06-ATRIBUICAO').vigente, false);
  assert.match(projected.activeSources.find((source) => source.id === 'SIM-RET-06-ATRIBUICAO').trecho, /SEC-SIM-B/);
  const done = row(closed());
  assert.equal(done.activeSources.find((source) => source.id === 'SIM01-AGENDA').substituida_por, 'SIM01-EVOL-AGENDA');
  assert.equal(done.activeSources.find((source) => source.id === 'SIM01-TAREFA').substituida_por, 'SIM01-EVOL-FILA');
});

test('a entrada do modelo segue allowlist e exclui gabaritos, ações, templates e metadados internos', () => {
  const data = clone(fixtures);
  for (const fixture of data.casos) {
    fixture.titulo = 'SEGREDO-GABARITO';
    fixture.teste_evidencia.answer_esperada = 'SEGREDO-GABARITO';
    fixture.acoes_humanas_esperadas = ['SEGREDO-GABARITO'];
    fixture.rascunho.texto = 'SEGREDO-GABARITO';
    fixture.fontes.forEach((source) => { source.interno = 'SEGREDO-GABARITO'; });
  }
  const state = createState(data, NOW);
  for (const caseId of fixtures.casos.map((fixture) => fixture.id)) {
    const input = getModelInput(state, caseId, 'Pergunta fictícia', data);
    assert.deepEqual(Object.keys(input), ['caseId', 'question', 'sources']);
    assert.equal(JSON.stringify(input).includes('SEGREDO-GABARITO'), false);
    for (const source of input.sources) assert.ok(Object.keys(source).every((key) => ['id', 'trecho', 'versao', 'vigente', 'substituida_por'].includes(key)));
  }
  assert.deepEqual(futureIds(initial()), []);
});

test('a projeção e a entrada do modelo são cópias sem alterar fatos ou estado', () => {
  const state = act(reviewed(), 'contact_record', { confirmed: true });
  const beforeState = JSON.stringify(state);
  const beforeFixtures = JSON.stringify(fixtures);
  const view = viewState(state, fixtures);
  view.cases[0].activeSources[0].trecho = 'alterado';
  view.cases[0].history[0].text = 'alterado';
  view.cases[0].preference.status = 'alterado';
  const input = getModelInput(state, first, 'Pergunta', fixtures);
  input.sources[0].trecho = 'alterado';
  assert.equal(JSON.stringify(state), beforeState);
  assert.equal(JSON.stringify(fixtures), beforeFixtures);
});

test('importar atribuição, etapa, contato, rascunho ou revisão sem histórico é rejeitado', () => {
  for (const [key, value] of [['owner', 'SEC-SIM-C'], ['stage', 3], ['contactCount', 2], ['draftText', 'texto'], ['draftReviewed', true]]) {
    const state = initial();
    state.cases[0][key] = value;
    assert.throws(() => validateState(state, fixtures), (error) => error.code === 'INCONSISTENT_STATE', key);
  }
  const state = initial();
  state.cases[3].stage = 1;
  assert.throws(() => validateState(state, fixtures), (error) => error.code === 'INVALID_STAGE');
});

test('a validação exige shape exato, lista completa e primitivos válidos', () => {
  const mutations = [
    (state) => { state.extra = true; },
    (state) => { state.schemaVersion = 2; },
    (state) => { state.demo = false; },
    (state) => { state.revision = -1; },
    (state) => { state.revision = Infinity; },
    (state) => { state.cases.pop(); },
    (state) => { state.cases[0].id = state.cases[1].id; },
    (state) => { state.cases[0].extra = true; },
    (state) => { state.cases[0].draftReviewed = 'true'; },
    (state) => { state.cases[0].contactCount = 0.5; },
    (state) => { delete state.cases[3]; },
    (state) => { state.cases.extra = true; },
  ];
  for (const mutate of mutations) {
    const state = initial();
    mutate(state);
    assert.throws(() => validateState(state, fixtures), (error) => typeof error.code === 'string');
  }
});

test('campos de prototype, símbolos, acessores e protótipos alterados são rejeitados', () => {
  const state = initial();
  const polluted = JSON.parse('{"type":"assign","caseId":"SIM-RET-02","owner":"SEC-SIM-C","__proto__":{"polluted":true}}');
  reject(state, polluted, 'INVALID_SHAPE');
  const altered = { type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C' };
  Object.setPrototypeOf(altered, { polluted: true });
  reject(state, altered, 'INVALID_SHAPE');
  const symbol = { type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C', [Symbol('hidden')]: true };
  reject(state, symbol, 'INVALID_SHAPE');
  const accessor = { type: 'assign', caseId: 'SIM-RET-02', get owner() { throw new Error('não deve ser lido'); } };
  reject(state, accessor, 'INVALID_SHAPE');
  const accessorState = initial();
  Object.defineProperty(accessorState.cases, 0, { get() { throw new Error('não deve ser lido'); }, enumerable: true });
  assert.throws(() => validateState(accessorState, fixtures), (error) => error.code === 'INVALID_SHAPE');
  assert.equal({}.polluted, undefined);
});

test('ações desconhecidas, campos extras, casos inexistentes e tipos incorretos são rejeitados', () => {
  const state = initial();
  reject(state, { type: 'send', caseId: first }, 'UNKNOWN_ACTION');
  reject(state, { type: 'assign', caseId: 'REAL-01', owner: null }, 'UNKNOWN_CASE');
  reject(state, { type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C', send: true }, 'INVALID_SHAPE');
  reject(state, { type: 'draft_review', caseId: first, reviewed: 'true' }, 'INVALID_REVIEW');
  reject(state, { type: 'contact_record', caseId: first }, 'INVALID_SHAPE');
  reject(state, { type: 'draft_save', caseId: first, text: {} }, 'INVALID_DRAFT');
});

test('limites de texto e perguntas impedem estados excessivos ou vazios', () => {
  const state = initial();
  reject(state, { type: 'draft_save', caseId: first, text: 'x'.repeat(2001) }, 'INVALID_DRAFT');
  assert.equal(row(act(state, 'draft_save', { text: 'x'.repeat(2000) })).draft.text.length, 2000);
  const whitespace = act(state, 'draft_save', { text: ' \n ' });
  reject(whitespace, { type: 'draft_review', caseId: first, reviewed: true }, 'EMPTY_DRAFT');
  assert.throws(() => getModelInput(state, first, '', fixtures), (error) => error.code === 'INVALID_QUESTION');
  assert.throws(() => getModelInput(state, first, 'x'.repeat(2001), fixtures), (error) => error.code === 'INVALID_QUESTION');
  assert.throws(() => getModelInput(state, 'REAL-01', 'Pergunta', fixtures), (error) => error.code === 'UNKNOWN_CASE');
});

test('históricos duplicados, falseados, desconhecidos ou sem evidências são rejeitados', () => {
  const valid = reviewed('Rascunho fictício');
  for (const mutation of [
    (state) => { state.cases[0].history[1].id = state.cases[0].history[0].id; },
    (state) => { state.cases[0].history[0].id = 'EVT-000003'; },
    (state) => { state.cases[0].history[1].text = 'Uma pessoa confirmou qualquer coisa.'; },
    (state) => { state.cases[0].history[1].type = 'send'; },
    (state) => { state.cases[0].history[0].extra = true; },
    (state) => { state.cases[0].history[0].at = '2026-02-30T15:00:00.000Z'; },
    (state) => { state.cases[0].history[0].text = 'x'.repeat(2201); },
  ]) {
    const state = clone(valid);
    mutation(state);
    assert.throws(() => validateState(state, fixtures), (error) => typeof error.code === 'string');
  }
  const forged = initial();
  forged.cases[0].history = [{ id: 'EVT-000001', type: 'close', at: NOW, text: 'Encerrado' }];
  forged.cases[0].stage = 3;
  assert.throws(() => validateState(forged, fixtures), (error) => error.code === 'INVALID_STAGE');
});

test('datas devem ser ISO válidas e respeitar a ordem das ações humanas', () => {
  assert.throws(() => createState(fixtures, '2026-02-30T00:00:00.000Z'), (error) => error.code === 'INVALID_TIME');
  assert.equal(createState(fixtures, '2026-10-05T15:00:00Z').revision, 0);
  reject(initial(), { type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C' }, 'INVALID_TIME', 'ontem');
  const state = act(initial(), 'assign', { owner: 'SEC-SIM-C' }, 'SIM-RET-02', later);
  reject(state, { type: 'assign', caseId: first, owner: 'SEC-SIM-B' }, 'INVALID_TIME');
});

test('revision de reset ou import é escalar independente do número de eventos', () => {
  const state = oriented();
  state.revision = 30;
  assert.equal(validateState(state, fixtures), true);
  const next = act(state, 'confirm_response', { confirmationReviewed: true, calendarReviewed: true });
  assert.equal(next.revision, 31);
  assert.equal(next.cases[0].history.at(-1).id, 'EVT-000002');
});

test('o limite total de 200 registros vale entre casos e rejeita sem mutação', () => {
  let state = initial();
  for (let index = 0; index < 200; index += 1) {
    const caseId = index % 2 === 0 ? first : 'SIM-RET-02';
    const current = state.cases.find((item) => item.id === caseId).owner;
    state = act(state, 'assign', { owner: current === 'SEC-SIM-A' ? 'SEC-SIM-B' : 'SEC-SIM-A' }, caseId);
  }
  assert.equal(state.cases.flatMap((item) => item.history).length, 200);
  assert.equal(validateState(state, fixtures), true);
  reject(state, { type: 'assign', caseId: first, owner: 'SEC-SIM-C' }, 'HISTORY_LIMIT');
});

test('conjuntos com dados pessoais ou casos e fontes duplicados não entram na demo', () => {
  for (const mutation of [
    (data) => { data.casos[0].paciente.nome = 'Nome real'; },
    (data) => { data.casos[0].paciente.dados_reais = true; },
    (data) => { data.casos[1].id = first; },
    (data) => { data.casos[1].fontes[0].id = data.casos[0].fontes[0].id; },
  ]) {
    const data = clone(fixtures);
    mutation(data);
    assert.throws(() => createState(data, NOW), (error) => error.code === 'INVALID_FIXTURES');
  }
});
