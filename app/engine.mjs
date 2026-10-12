// Motor administrativo determinístico. Todos os registros deste protótipo são fictícios.
// O estado guarda ações humanas; os fatos são projetados das fontes da fase ativa.
const CASE_IDS = Array.from({ length: 8 }, (_, index) => `SIM-RET-${String(index + 1).padStart(2, '0')}`);
const OWNERS = new Set(['SEC-SIM-A', 'SEC-SIM-B', 'SEC-SIM-C', 'COORD-SIM-A', 'MED-SIM-A', 'MED-SIM-B']);
const MAX_EVENTS = 200;
const MAX_DRAFT = 2000;
const MAX_EVENT_TEXT = 2200;
const FIRST_CASE = 'SIM-RET-01';
const ACTION_KEYS = {
  assign: ['type', 'caseId', 'owner'],
  draft_save: ['type', 'caseId', 'text'],
  draft_review: ['type', 'caseId', 'reviewed'],
  contact_record: ['type', 'caseId', 'confirmed'],
  register_orientation: ['type', 'caseId', 'confirmed'],
  confirm_response: ['type', 'caseId', 'confirmationReviewed', 'calendarReviewed'],
  close: ['type', 'caseId', 'confirmationReviewed', 'calendarReviewed'],
};
const STATUS_LABELS = {
  remarcacao_pendente: 'Remarcação pendente',
  sem_responsavel: 'Sem responsável',
  aguardando_resposta: 'Aguardando resposta',
  contato_bloqueado_por_preferencia: 'Contato bloqueado por preferência',
  aguardando_revisao_medica: 'Revisão médica necessária',
  divergencia_aguardando_revisao: 'Registros divergentes · conferir',
  reposicao_confirmada: 'Reposição confirmada · conferir encerramento',
  resolvido_administrativamente: 'Resolvido administrativamente',
};
const TEXT = {
  unassign: 'Atribuição removida na simulação. A coordenação deve conferir a continuidade.',
  assign: 'Responsável atribuído na simulação: ',
  draft: 'Rascunho administrativo simulado salvo para revisão humana:\n',
  reviewTrue: 'Rascunho administrativo simulado marcado como revisado por uma pessoa.',
  reviewFalse: 'Rascunho administrativo simulado com revisão humana pendente.',
  contact: 'Contato humano simulado registrado a partir do rascunho revisado:\n',
  orientation: 'Uma pessoa registrou a orientação da equipe fictícia para a reposição. Nenhum intervalo clínico foi definido pelo sistema.',
  confirm: 'Uma pessoa conferiu a resposta fictícia de confirmação e a agenda simulada, registrando a reposição confirmada.',
  close: 'Uma pessoa conferiu a confirmação e a agenda consistentes e encerrou administrativamente a pendência fictícia.',
};

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function record(value, label, keys = null) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('INVALID_SHAPE', `${label} deve ser um objeto simples.`);
  }
  const own = Reflect.ownKeys(value);
  if (own.some((key) => typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key))) {
    fail('INVALID_SHAPE', `${label} contém um campo não permitido.`);
  }
  if (own.some((key) => !Object.getOwnPropertyDescriptor(value, key)?.enumerable || !('value' in Object.getOwnPropertyDescriptor(value, key)))) {
    fail('INVALID_SHAPE', `${label} contém uma propriedade não permitida.`);
  }
  if (keys && (own.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key)))) {
    fail('INVALID_SHAPE', `${label} contém campos ausentes ou adicionais.`);
  }
}

function array(value, label, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) {
    fail('INVALID_SHAPE', `${label} deve ser uma lista dentro do limite permitido.`);
  }
  const own = Reflect.ownKeys(value);
  if (own.length !== value.length + 1 || own.some((key) => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key)))) {
    fail('INVALID_SHAPE', `${label} contém propriedades não permitidas ou posições vazias.`);
  }
  if (own.some((key) => key !== 'length' && (!Object.getOwnPropertyDescriptor(value, key)?.enumerable || !('value' in Object.getOwnPropertyDescriptor(value, key))))) {
    fail('INVALID_SHAPE', `${label} contém uma propriedade não permitida.`);
  }
}

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    fail('INVALID_TIME', 'O registro precisa de uma data ISO válida em UTC.');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== value.slice(0, 19)) {
    fail('INVALID_TIME', 'O registro precisa de uma data ISO válida em UTC.');
  }
}

function sourceProjection(source) {
  const projected = { id: source.id, trecho: source.trecho };
  for (const key of ['versao', 'vigente', 'substituida_por']) {
    if (Object.hasOwn(source, key)) projected[key] = source[key];
  }
  return projected;
}

function sourceCheck(source) {
  record(source, 'Fonte fictícia');
  if (typeof source.id !== 'string' || !/^[A-Z0-9-]{1,80}$/.test(source.id) || typeof source.trecho !== 'string' || source.trecho.length > 4000) {
    fail('INVALID_FIXTURES', 'Uma fonte fictícia está incompleta ou fora do limite.');
  }
  if (Object.hasOwn(source, 'versao') && (typeof source.versao !== 'string' || source.versao.length > 80)) fail('INVALID_FIXTURES', 'A versão da fonte é inválida.');
  if (Object.hasOwn(source, 'vigente') && typeof source.vigente !== 'boolean') fail('INVALID_FIXTURES', 'A vigência da fonte é inválida.');
  if (Object.hasOwn(source, 'substituida_por') && (typeof source.substituida_por !== 'string' || !/^[A-Z0-9-]{1,80}$/.test(source.substituida_por))) fail('INVALID_FIXTURES', 'A substituição da fonte é inválida.');
}

function fixtureCases(fixtures) {
  if (!Array.isArray(fixtures)) record(fixtures, 'Conjunto fictício');
  const cases = Array.isArray(fixtures) ? fixtures : fixtures.casos;
  array(cases, 'Casos fictícios', CASE_IDS.length);
  if (cases.length !== CASE_IDS.length || new Set(cases.map((item) => item?.id)).size !== CASE_IDS.length) {
    fail('INVALID_FIXTURES', 'A demo requer os oito casos fictícios identificados.');
  }
  const sources = new Set();
  for (const fixture of cases) {
    record(fixture, 'Caso fictício');
    if (!CASE_IDS.includes(fixture.id) || typeof fixture.titulo !== 'string' || fixture.titulo.length > 300 || !Object.hasOwn(STATUS_LABELS, fixture.estado_administrativo)) {
      fail('INVALID_FIXTURES', 'O identificador ou estado do caso fictício é inválido.');
    }
    record(fixture.paciente, 'Paciente fictício');
    if (fixture.paciente.dados_reais !== false || fixture.paciente.nome !== null || fixture.paciente.telefone !== null || fixture.paciente.email !== null) {
      fail('INVALID_FIXTURES', 'A demo aceita somente pacientes fictícios sem dados pessoais.');
    }
    if (fixture.responsavel !== null && !OWNERS.has(fixture.responsavel)) fail('INVALID_FIXTURES', 'O responsável do caso deve ser fictício.');
    record(fixture.preferencia_contato, 'Preferência fictícia');
    const preference = fixture.preferencia_contato;
    if (preference.registro_ficticio !== true || !['permitido_na_simulacao', 'nao_registrado', 'prefere_nao_receber'].includes(preference.status) || ![null, 'CANAL-FICTICIO-A'].includes(preference.canal)) {
      fail('INVALID_FIXTURES', 'A preferência ou o canal fictício é inválido.');
    }
    array(fixture.fontes, 'Fontes iniciais', 30);
    for (const source of fixture.fontes) {
      sourceCheck(source);
      if (sources.has(source.id)) fail('INVALID_FIXTURES', 'Os identificadores das fontes precisam ser únicos.');
      sources.add(source.id);
    }
    record(fixture.rascunho, 'Política do rascunho');
    if (typeof fixture.rascunho.permitido_na_simulacao !== 'boolean' || (Object.hasOwn(fixture.rascunho, 'texto') && (typeof fixture.rascunho.texto !== 'string' || fixture.rascunho.texto.length > MAX_DRAFT))) fail('INVALID_FIXTURES', 'A política do rascunho fictício é inválida.');
    if (fixture.id === FIRST_CASE) {
      const future = fixture.evolucao_demonstrativa?.fontes_apos_ativacao;
      array(future, 'Fontes da evolução fictícia', 4);
      const ids = ['SIM01-EVOL-REVISAO', 'SIM01-EVOL-CONFIRMACAO', 'SIM01-EVOL-AGENDA', 'SIM01-EVOL-FILA'];
      if (future.length !== 4 || ids.some((id) => !future.some((source) => source.id === id))) fail('INVALID_FIXTURES', 'As fontes da evolução fictícia estão incompletas.');
      for (const source of future) {
        sourceCheck(source);
        if (sources.has(source.id)) fail('INVALID_FIXTURES', 'Os identificadores das fontes precisam ser únicos.');
        sources.add(source.id);
      }
    }
  }
  return CASE_IDS.map((id) => cases.find((fixture) => fixture.id === id));
}

function initialCase(fixture) {
  return {
    id: fixture.id,
    owner: fixture.responsavel,
    stage: 0,
    draftText: null,
    draftReviewed: false,
    contactCount: fixture.id === 'SIM-RET-03' && fixture.fontes.some((source) => source.id === 'SIM03-CONTATO') ? 1 : 0,
    history: [],
  };
}

function cloneCase(item) {
  return { ...item, history: item.history.map((event) => ({ ...event })) };
}

function effectiveDraft(item, fixture) {
  return item.draftText ?? fixture.rascunho.texto ?? '';
}

function draftPermission(item, fixture) {
  if (item.stage === 3) return { allowed: false, reason: 'Pendência resolvida administrativamente; o histórico permanece disponível.' };
  if (item.stage >= 2) return { allowed: false, reason: 'Reposição confirmada; falta apenas a conferência humana para o encerramento.' };
  if (fixture.preferencia_contato.status === 'prefere_nao_receber') return { allowed: false, reason: 'A preferência registrada bloqueia novos rascunhos e contatos.' };
  if (item.id === 'SIM-RET-02') return { allowed: false, reason: item.owner === null ? 'Faltam um responsável atribuído e a preferência de contato registrada.' : 'A preferência de contato precisa estar registrada antes de preparar um rascunho.' };
  if (fixture.id !== FIRST_CASE || fixture.rascunho.permitido_na_simulacao !== true) return { allowed: false, reason: fixture.rascunho.motivo ?? 'Este caso precisa de decisão humana antes de preparar contato.' };
  if (fixture.preferencia_contato.status !== 'permitido_na_simulacao' || !fixture.preferencia_contato.canal) return { allowed: false, reason: 'A preferência e o canal de contato precisam estar registrados.' };
  if (item.owner === null) return { allowed: false, reason: 'A coordenação precisa atribuir um responsável antes de preparar contato.' };
  return { allowed: true, reason: 'Apenas coleta administrativa de disponibilidade; revisão humana obrigatória e nenhum envio.' };
}

function alreadyContacted(item, fixture) {
  return item.history.some((event) => event.type === 'contact_record' && event.text === TEXT.contact + effectiveDraft(item, fixture));
}

function actionCheck(action) {
  record(action, 'Ação humana');
  if (typeof action.type !== 'string' || !Object.hasOwn(ACTION_KEYS, action.type)) fail('UNKNOWN_ACTION', 'Esta ação não pertence ao fluxo administrativo da demo.');
  record(action, 'Ação humana', ACTION_KEYS[action.type]);
  if (typeof action.caseId !== 'string' || !CASE_IDS.includes(action.caseId)) fail('UNKNOWN_CASE', 'O caso fictício informado não foi encontrado.');
}

function applyAction(item, action, fixture) {
  if (item.stage === 3) fail('RESOLVED_IMMUTABLE', 'A pendência resolvida preserva seu histórico e não aceita novas alterações.');
  switch (action.type) {
    case 'assign': {
      if (action.owner !== null && !OWNERS.has(action.owner)) fail('INVALID_OWNER', 'Escolha um responsável fictício disponível na demo.');
      if (item.owner === action.owner) fail('NO_CHANGE', 'Essa atribuição já está registrada.');
      item.owner = action.owner;
      return action.owner === null ? TEXT.unassign : `${TEXT.assign}${action.owner}.`;
    }
    case 'draft_save': {
      const policy = draftPermission(item, fixture);
      if (!policy.allowed) fail('DRAFT_BLOCKED', policy.reason);
      if (typeof action.text !== 'string' || action.text.length > MAX_DRAFT) fail('INVALID_DRAFT', 'O rascunho deve ser um texto de até 2.000 caracteres.');
      item.draftText = action.text;
      item.draftReviewed = false;
      return TEXT.draft + action.text;
    }
    case 'draft_review': {
      const policy = draftPermission(item, fixture);
      if (!policy.allowed) fail('DRAFT_BLOCKED', policy.reason);
      if (typeof action.reviewed !== 'boolean') fail('INVALID_REVIEW', 'Registre explicitamente se uma pessoa revisou o rascunho.');
      if (!effectiveDraft(item, fixture).trim()) fail('EMPTY_DRAFT', 'Um rascunho vazio não pode receber revisão de contato.');
      if (item.draftReviewed === action.reviewed) fail('NO_CHANGE', 'Essa condição de revisão já está registrada.');
      item.draftReviewed = action.reviewed;
      return action.reviewed ? TEXT.reviewTrue : TEXT.reviewFalse;
    }
    case 'contact_record': {
      if (action.confirmed !== true) fail('HUMAN_CONFIRMATION_REQUIRED', 'Confirme explicitamente o registro de contato humano simulado.');
      const policy = draftPermission(item, fixture);
      if (!policy.allowed) fail('CONTACT_BLOCKED', policy.reason);
      if (!effectiveDraft(item, fixture).trim() || item.draftReviewed !== true) fail('DRAFT_REVIEW_REQUIRED', 'O contato simulado exige um rascunho preenchido e revisado por uma pessoa.');
      if (alreadyContacted(item, fixture)) fail('DUPLICATE_CONTACT', 'O contato deste rascunho já foi registrado na simulação.');
      if (item.contactCount > 0) fail('ADDITIONAL_CONTACT_BLOCKED', 'Contato adicional exige uma política e uma decisão humana registradas; essa autorização não faz parte da demo.');
      item.contactCount += 1;
      return TEXT.contact + effectiveDraft(item, fixture);
    }
    case 'register_orientation': {
      if (item.id !== FIRST_CASE || item.stage !== 0) fail('INVALID_STAGE', 'A orientação fictícia só pode iniciar a evolução do caso SIM-RET-01.');
      if (item.owner === null) fail('OWNER_REQUIRED', 'Atribua um responsável antes de registrar a evolução humana.');
      if (action.confirmed !== true) fail('HUMAN_CONFIRMATION_REQUIRED', 'Confirme que uma pessoa registrou a orientação da equipe fictícia.');
      item.stage = 1;
      return TEXT.orientation;
    }
    case 'confirm_response': {
      if (item.id !== FIRST_CASE || item.stage !== 1) fail('INVALID_STAGE', 'Registre primeiro a orientação da equipe fictícia antes de confirmar a reposição.');
      if (item.owner === null) fail('OWNER_REQUIRED', 'Atribua um responsável antes de registrar a evolução humana.');
      if (action.confirmationReviewed !== true || action.calendarReviewed !== true) fail('EVIDENCE_REVIEW_REQUIRED', 'Uma pessoa precisa conferir a confirmação e a agenda simuladas.');
      item.stage = 2;
      return TEXT.confirm;
    }
    case 'close': {
      if (item.id !== FIRST_CASE || item.stage !== 2) fail('INVALID_STAGE', 'A pendência exige orientação e confirmação consistentes antes do encerramento.');
      if (item.owner === null) fail('OWNER_REQUIRED', 'Atribua um responsável antes de registrar a evolução humana.');
      if (action.confirmationReviewed !== true || action.calendarReviewed !== true) fail('EVIDENCE_REVIEW_REQUIRED', 'Confirme a revisão humana da confirmação e da agenda antes de encerrar.');
      item.stage = 3;
      return TEXT.close;
    }
    default:
      fail('UNKNOWN_ACTION', 'Esta ação não pertence ao fluxo administrativo da demo.');
  }
}

function actionFromEvent(event, caseId) {
  const action = { type: event.type, caseId };
  switch (event.type) {
    case 'assign':
      if (event.text === TEXT.unassign) action.owner = null;
      else if (event.text.startsWith(TEXT.assign) && event.text.endsWith('.')) action.owner = event.text.slice(TEXT.assign.length, -1);
      else fail('INVALID_HISTORY', 'O registro de atribuição não corresponde à ação humana.');
      break;
    case 'draft_save':
      if (!event.text.startsWith(TEXT.draft)) fail('INVALID_HISTORY', 'O registro de rascunho está incompleto.');
      action.text = event.text.slice(TEXT.draft.length);
      break;
    case 'draft_review':
      if (![TEXT.reviewTrue, TEXT.reviewFalse].includes(event.text)) fail('INVALID_HISTORY', 'O registro de revisão está incompleto.');
      action.reviewed = event.text === TEXT.reviewTrue;
      break;
    case 'contact_record':
    case 'register_orientation':
      action.confirmed = true;
      break;
    case 'confirm_response':
    case 'close':
      action.confirmationReviewed = true;
      action.calendarReviewed = true;
      break;
    default:
      fail('INVALID_HISTORY', 'O histórico contém uma ação desconhecida.');
  }
  return action;
}

function validateSnapshot(state, fixtures) {
  record(state, 'Estado da demo', ['schemaVersion', 'revision', 'demo', 'cases']);
  if (state.schemaVersion !== 1 || state.demo !== true || !Number.isSafeInteger(state.revision) || state.revision < 0) fail('INVALID_STATE', 'A versão, revisão ou identificação fictícia do estado é inválida.');
  array(state.cases, 'Estado dos casos', CASE_IDS.length);
  if (state.cases.length !== CASE_IDS.length) fail('INVALID_STATE', 'O estado deve preservar os oito casos fictícios.');
  const events = [];
  for (let index = 0; index < state.cases.length; index += 1) {
    const item = state.cases[index];
    record(item, 'Estado do caso', ['id', 'owner', 'stage', 'draftText', 'draftReviewed', 'contactCount', 'history']);
    if (item.id !== CASE_IDS[index]) fail('INVALID_STATE', 'Os casos devem manter seus identificadores e sua ordem de origem.');
    if (item.owner !== null && !OWNERS.has(item.owner)) fail('INVALID_OWNER', 'O estado contém um responsável fora da demo.');
    if (!Number.isInteger(item.stage) || item.stage < 0 || item.stage > (item.id === FIRST_CASE ? 3 : 0)) fail('INVALID_STAGE', 'O estado contém uma etapa administrativa inválida.');
    if ((item.draftText !== null && (typeof item.draftText !== 'string' || item.draftText.length > MAX_DRAFT)) || typeof item.draftReviewed !== 'boolean') fail('INVALID_DRAFT', 'O estado contém um rascunho ou revisão inválidos.');
    if (!Number.isSafeInteger(item.contactCount) || item.contactCount < 0 || item.contactCount > MAX_EVENTS + 1) fail('INVALID_STATE', 'A contagem de contatos simulados é inválida.');
    array(item.history, 'Histórico humano', MAX_EVENTS);
    let previousSequence = 0;
    for (const event of item.history) {
      record(event, 'Registro humano', ['id', 'type', 'at', 'text']);
      if (typeof event.id !== 'string' || !/^EVT-\d{6}$/.test(event.id) || typeof event.type !== 'string' || !Object.hasOwn(ACTION_KEYS, event.type) || typeof event.text !== 'string' || event.text.length > MAX_EVENT_TEXT) fail('INVALID_HISTORY', 'O histórico contém um registro inválido.');
      timestamp(event.at);
      const sequence = Number(event.id.slice(4));
      if (sequence <= previousSequence) fail('INVALID_HISTORY', 'A ordem do histórico humano está inconsistente.');
      previousSequence = sequence;
      events.push({ event, caseId: item.id, sequence });
    }
  }
  if (events.length > MAX_EVENTS) fail('HISTORY_LIMIT', 'A demo atingiu o limite de 200 registros humanos.');
  events.sort((left, right) => left.sequence - right.sequence);
  const replayed = fixtures.map(initialCase);
  let lastTime = -Infinity;
  events.forEach(({ event, caseId, sequence }, index) => {
    if (sequence !== index + 1) fail('INVALID_HISTORY', 'O histórico humano contém registros ausentes ou duplicados.');
    if (new Date(event.at).getTime() < lastTime) fail('INVALID_HISTORY', 'As datas do histórico humano estão fora de ordem.');
    lastTime = new Date(event.at).getTime();
    const item = replayed.find((candidate) => candidate.id === caseId);
    const fixture = fixtures.find((candidate) => candidate.id === caseId);
    const text = applyAction(item, actionFromEvent(event, caseId), fixture);
    if (text !== event.text) fail('INVALID_HISTORY', 'O registro humano não corresponde às evidências da ação.');
    item.history.push({ ...event });
  });
  for (let index = 0; index < state.cases.length; index += 1) {
    const actual = state.cases[index];
    const expected = replayed[index];
    if (['owner', 'stage', 'draftText', 'draftReviewed', 'contactCount'].some((key) => actual[key] !== expected[key])) fail('INCONSISTENT_STATE', 'O estado do caso não corresponde ao seu histórico humano.');
  }
}

export function createState(fixtures, now = new Date().toISOString()) {
  timestamp(now);
  const cases = fixtureCases(fixtures);
  return { schemaVersion: 1, revision: 0, demo: true, cases: cases.map(initialCase) };
}

export function validateState(state, fixtures) {
  validateSnapshot(state, fixtureCases(fixtures));
  return true;
}

export function transition(state, action, fixtures, now = new Date().toISOString()) {
  const cases = fixtureCases(fixtures);
  validateSnapshot(state, cases);
  actionCheck(action);
  timestamp(now);
  const events = state.cases.flatMap((item) => item.history);
  if (events.length >= MAX_EVENTS) fail('HISTORY_LIMIT', 'A demo atingiu o limite de 200 registros humanos.');
  if (state.revision >= Number.MAX_SAFE_INTEGER) fail('REVISION_LIMIT', 'A revisão do estado atingiu o limite da demo.');
  if (events.some((event) => new Date(event.at).getTime() > new Date(now).getTime())) fail('INVALID_TIME', 'A data da nova ação não pode preceder o histórico humano.');
  const next = { schemaVersion: 1, revision: state.revision + 1, demo: true, cases: state.cases.map(cloneCase) };
  const item = next.cases.find((candidate) => candidate.id === action.caseId);
  const fixture = cases.find((candidate) => candidate.id === action.caseId);
  const text = applyAction(item, action, fixture);
  item.history.push({ id: `EVT-${String(events.length + 1).padStart(6, '0')}`, type: action.type, at: now, text });
  validateSnapshot(next, cases);
  return next;
}

function activeSources(item, fixture) {
  const sources = fixture.fontes.map(sourceProjection);
  const assignment = item.history.findLast((event) => event.type === 'assign');
  if (assignment) {
    const replacement = `${item.id}-ATRIBUICAO`;
    for (const source of sources) {
      if (['SIM01-TAREFA', 'SIM02-HANDOFF', 'SIM06-ATRIBUICAO'].includes(source.id)) {
        source.vigente = false;
        source.substituida_por = replacement;
      }
    }
    sources.push({ id: replacement, trecho: item.owner === null ? 'Uma pessoa removeu a atribuição na simulação. A pendência atual está sem responsável e requer distribuição pela coordenação.' : `Uma pessoa registrou a atribuição atual na simulação: a pendência está sob responsabilidade de ${item.owner}.`, vigente: true });
  }
  for (const event of item.history.filter((candidate) => candidate.type === 'contact_record')) {
    sources.push({ id: `${item.id}-CONTATO-${event.id.slice(4)}`, trecho: `Uma pessoa registrou um contato administrativo inteiramente simulado pelo ${fixture.preferencia_contato.canal}. O registro de contato não confirma resposta, agenda ou encerramento.` });
  }
  if (item.id === FIRST_CASE && item.stage > 0) {
    const activatedIds = ['SIM01-EVOL-REVISAO'];
    if (item.stage >= 2) activatedIds.push('SIM01-EVOL-CONFIRMACAO', 'SIM01-EVOL-AGENDA');
    if (item.stage >= 3) activatedIds.push('SIM01-EVOL-FILA');
    sources.push(...fixture.evolucao_demonstrativa.fontes_apos_ativacao.filter((source) => activatedIds.includes(source.id)).map(sourceProjection));
    for (const source of sources) {
      if (item.stage >= 2 && source.id === 'SIM01-AGENDA') {
        source.vigente = false;
        source.substituida_por = 'SIM01-EVOL-AGENDA';
      }
      if (item.stage === 3 && ['SIM01-TAREFA', `${item.id}-ATRIBUICAO`].includes(source.id)) {
        source.vigente = false;
        source.substituida_por = 'SIM01-EVOL-FILA';
      }
    }
  }
  return sources;
}

function projectCase(item, fixture) {
  let status = fixture.estado_administrativo;
  let nextAction = fixture.proxima_acao.texto;
  if (fixture.id === 'SIM-RET-02' && item.owner !== null) {
    status = 'remarcacao_pendente';
    nextAction = 'O responsável atribuído deve conferir a preferência de contato e registrar a próxima ação com a coordenação.';
  }
  if (item.id === FIRST_CASE) {
    if (item.stage === 0 && item.contactCount > 0) {
      status = 'aguardando_resposta';
      nextAction = 'Conferir se há resposta ao contato simulado e registrar orientação da equipe fictícia; não presumir confirmação nem frequência de novo contato.';
    } else if (item.stage === 1) {
      status = 'remarcacao_pendente';
      nextAction = 'Conferir a escolha humana de uma opção fictícia autorizada; revisar a resposta de confirmação e a agenda antes de registrar a reposição.';
    } else if (item.stage === 2) {
      status = 'reposicao_confirmada';
      nextAction = 'Uma pessoa deve conferir a confirmação e a agenda consistentes antes de encerrar administrativamente a pendência.';
    } else if (item.stage === 3) {
      status = 'resolvido_administrativamente';
      nextAction = 'Resolução administrativa fictícia conferida; consultar as evidências e o histórico humano.';
    }
  }
  if (item.owner === null && item.stage !== 3) {
    status = 'sem_responsavel';
    nextAction = 'A coordenação deve atribuir um responsável e conferir o apoio necessário para a próxima ação.';
  }
  const preference = fixture.preferencia_contato;
  const labels = { permitido_na_simulacao: 'Contato administrativo permitido na simulação', nao_registrado: 'Preferência de contato não registrada', prefere_nao_receber: 'Prefere não receber novos contatos' };
  const policy = draftPermission(item, fixture);
  const handoff = item.id === FIRST_CASE && item.stage > 0 ? null : fixture.handoff?.motivo ?? null;
  return {
    id: item.id,
    title: fixture.titulo,
    status,
    statusLabel: STATUS_LABELS[status],
    owner: item.owner,
    stage: item.stage,
    preference: { status: preference.status, channel: preference.canal, label: labels[preference.status] },
    nextAction,
    activeSources: activeSources(item, fixture),
    draft: { ...policy, text: effectiveDraft(item, fixture), reviewed: item.draftReviewed },
    contactCount: item.contactCount,
    history: item.history.map((event) => ({ ...event })),
    canRecordContact: policy.allowed && item.contactCount === 0 && item.draftReviewed && Boolean(effectiveDraft(item, fixture).trim()) && !alreadyContacted(item, fixture),
    canRegisterOrientation: item.id === FIRST_CASE && item.stage === 0 && item.owner !== null,
    canConfirm: item.id === FIRST_CASE && item.stage === 1 && item.owner !== null,
    canClose: item.id === FIRST_CASE && item.stage === 2 && item.owner !== null,
    medicalHandoff: handoff,
  };
}

export function viewState(state, fixtures) {
  const cases = fixtureCases(fixtures);
  validateSnapshot(state, cases);
  const projected = state.cases.map((item, index) => projectCase(item, cases[index]));
  return {
    schemaVersion: state.schemaVersion,
    revision: state.revision,
    demo: true,
    cases: projected,
    metrics: {
      open: projected.filter((item) => item.stage !== 3).length,
      unowned: projected.filter((item) => item.stage !== 3 && item.owner === null).length,
      resolved: projected.filter((item) => item.stage === 3).length,
      medical: projected.filter((item) => item.stage !== 3 && item.medicalHandoff !== null).length,
    },
  };
}

export function getModelInput(state, caseId, question, fixtures) {
  const cases = fixtureCases(fixtures);
  validateSnapshot(state, cases);
  if (typeof caseId !== 'string' || !CASE_IDS.includes(caseId)) fail('UNKNOWN_CASE', 'O caso fictício informado não foi encontrado.');
  if (typeof question !== 'string' || !question.trim() || question.length > 2000) fail('INVALID_QUESTION', 'Informe uma pergunta de até 2.000 caracteres sobre o caso fictício.');
  const item = state.cases.find((candidate) => candidate.id === caseId);
  const fixture = cases.find((candidate) => candidate.id === caseId);
  return { caseId, question, sources: activeSources(item, fixture).map(sourceProjection) };
}
