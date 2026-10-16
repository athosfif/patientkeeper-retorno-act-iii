import { sourceReadingView } from './source-reading.mjs';
import { normalizeSuggestedQuestion } from './i18n.mjs';
// Optional model path. Mounting checks configuration; it never starts inference.
// Candidate text is never saved as a clinical decision or administrative action.
const sessions = new WeakMap();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const copy = {
  en: {
    title:'AI reading · review required', description:'Ask about the current fictitious records. A model response remains a candidate to verify against its sources.',
    ask:'Ask the connected model', working:'Preparing a candidate…', english:'Model answer · English', source:'Original source · Portuguese',
    review:'I checked the meaning of the candidate against every cited record. The card will contain only the original excerpts.',
    save:'Save cited-source card', saved:'Source card saved. The case and calendar remain unchanged.',
    handoff:'This case requires the responsible team. No model request was made.',
    failure:'No usable candidate was received. Use the original records and human review.',
    abstention:'The model abstained. Check what is missing with the responsible team.',
    format:'Citation format checked. Meaning and suitability still require human review.',
    noAction:'A candidate does not send messages, confirm appointments or close a case. AMD execution requires its own evidence.',
  },
  pt: {
    title:'Leitura por IA · revisão necessária', description:'Pergunte sobre os registros fictícios atuais. A resposta do modelo continua sendo uma candidata a conferir com as fontes.',
    ask:'Consultar o modelo conectado', working:'Preparando uma candidata…', english:'Resposta do modelo · Inglês', source:'Fonte original · Português',
    review:'Conferi o significado da candidata com todos os registros citados. O cartão conterá somente os trechos originais.',
    save:'Salvar cartão com fontes citadas', saved:'Cartão com fontes salvo. Caso e agenda permanecem no mesmo estado.',
    handoff:'Este caso depende da equipe responsável. Nenhum pedido ao modelo foi feito.',
    failure:'Não recebemos uma candidata utilizável. Use os registros originais e a revisão humana.',
    abstention:'O modelo se absteve. Confira o que falta com a equipe responsável.',
    format:'Formato das citações conferido. Significado e pertinência ainda exigem revisão humana.',
    noAction:'Uma candidata não envia mensagens, confirma horários ou encerra o caso. Execução AMD exige evidência própria.',
  },
  es: {
    title:'Lectura con IA · revisión necesaria', description:'Pregunte sobre los registros ficticios actuales. La respuesta del modelo sigue siendo una candidata que debe verificarse con sus fuentes.',
    ask:'Consultar el modelo conectado', working:'Preparando una candidata…', english:'Respuesta del modelo · Inglés', source:'Fuente original · Portugués',
    review:'Comprobé el significado de la candidata con todos los registros citados. La tarjeta contendrá solo los fragmentos originales.',
    save:'Guardar tarjeta con fuentes citadas', saved:'Tarjeta con fuentes guardada. El caso y la agenda siguen sin cambios.',
    handoff:'Este caso requiere al equipo responsable. No se realizó ninguna solicitud al modelo.',
    failure:'No se recibió una candidata utilizable. Consulte los registros originales y solicite revisión humana.',
    abstention:'El modelo se abstuvo. Revise con el equipo responsable qué información falta.',
    format:'Formato de citas comprobado. El significado y la pertinencia aún requieren revisión humana.',
    noAction:'Una candidata no envía mensajes, confirma citas ni cierra el caso. La ejecución AMD requiere evidencia propia.',
  },
};

const evolusScope = Object.freeze({ caseId:'SIM-RET-02', question:'Qual pendência continua aberta e quem é o responsável?' });
const evolusCopy = {
  en: {
    title:'Evolus + Gemma · Experimental local pilot',
    description:'Ask the fixed question about case 02 using only the current fictitious records. Review every cited source before interpreting the candidate.',
    scope:'Pilot question · Portuguese original', ask:'Ask through Evolus',
    answer:'Candidate answer · original',
    scopeRequired:'Select the suggested question “Which issue is still open, and who is responsible?” to use this pilot.',
    pending:'The request is pending. Check its result explicitly; this does not start another execution.',
    poll:'Check result', checking:'Checking the existing request…',
    stale:'The records changed. Open the current version before making a new request.',
    unavailable:'This local pilot is unavailable or has reached its execution limit.',
    timeout:'The request ended without a usable result. Use the current records and human review.',
    sources:'Cited records from the current stage · Meaning still requires human review.',
    noAction:'This experimental candidate is read only. It cannot save a card or change progress, appointments or contact records.',
  },
  pt: {
    title:'Evolus + Gemma · Piloto local experimental',
    description:'Consulte a pergunta fixa do caso 02 somente com os registros fictícios atuais. Confira cada fonte citada antes de interpretar a candidata.',
    scope:'Pergunta do piloto · Original em português', ask:'Consultar pelo Evolus',
    answer:'Resposta candidata · original',
    scopeRequired:'Selecione a pergunta sugerida “Qual pendência continua aberta e quem é o responsável?” para usar este piloto.',
    pending:'A consulta está pendente. Verifique o resultado por uma ação explícita; isso não inicia outra execução.',
    poll:'Verificar resultado', checking:'Verificando a consulta existente…',
    stale:'Os registros mudaram. Abra a versão atual antes de fazer uma nova consulta.',
    unavailable:'Este piloto local está indisponível ou atingiu o limite de execuções.',
    timeout:'A consulta terminou sem um resultado utilizável. Use os registros atuais e a revisão humana.',
    sources:'Registros citados da etapa atual · O significado ainda exige revisão humana.',
    noAction:'Esta candidata experimental é somente leitura. Ela não salva cartão nem altera progresso, agenda ou registros de contato.',
  },
  es: {
    title:'Evolus + Gemma · Piloto local experimental',
    description:'Consulte la pregunta fija del caso 02 solo con los registros ficticios actuales. Revise cada fuente citada antes de interpretar la candidata.',
    scope:'Pregunta del piloto · Original en portugués', ask:'Consultar mediante Evolus',
    answer:'Respuesta candidata · original',
    scopeRequired:'Seleccione la pregunta sugerida “¿Qué asunto sigue pendiente y quién es responsable?” para usar este piloto.',
    pending:'La consulta está pendiente. Compruebe el resultado mediante una acción explícita; esto no inicia otra ejecución.',
    poll:'Comprobar resultado', checking:'Comprobando la consulta existente…',
    stale:'Los registros cambiaron. Abra la versión actual antes de hacer otra consulta.',
    unavailable:'Este piloto local no está disponible o alcanzó el límite de ejecuciones.',
    timeout:'La consulta terminó sin un resultado utilizable. Use los registros actuales y la revisión humana.',
    sources:'Registros citados de la etapa actual · El significado aún requiere revisión humana.',
    noAction:'Esta candidata experimental es de solo lectura. No guarda tarjetas ni cambia el progreso, las citas o los registros de contacto.',
  },
};

function mountEvolusPanel(container, { item, revision, request, notify, onStale, alive, language, canStart, pendingSession }) {
  const strings = copy[language], pilot = evolusCopy[language], caseId = item.id;
  const host = document.createElement('section');
  host.className = 'section model-reading';
  host.innerHTML = `<h3>${pilot.title}</h3><p>${pilot.description}</p><p class="caption">${pilot.scope}</p><p data-original lang="pt-BR">${esc(evolusScope.question)}</p><p class="caption" data-evolus-scope></p><button type="button" class="primary" data-model-ask>${pilot.ask}</button><div data-model-result aria-live="polite"></div><p class="caption">${pilot.noAction}</p>`;
  container.append(host);
  const ask = host.querySelector('[data-model-ask]'), result = host.querySelector('[data-model-result]');
  const scopeHint = host.querySelector('[data-evolus-scope]');
  let working = false, pending = null, questionVersion = 0, unavailable = canStart === false;
  if (unavailable) result.innerHTML = `<h4 tabindex="-1">${pilot.unavailable}</h4>`;
  const question = () => container.querySelector('#evidence-question')?.value.trim() || '';
  const inScope = () => caseId === evolusScope.caseId && item.id === caseId && normalizeSuggestedQuestion(question()) === evolusScope.question;
  const current = context => alive() && inScope() && context.version === questionVersion && context.question === question();
  const focusResult = () => result.querySelector('h4')?.focus({ preventScroll:true });
  const updateControls = () => {
    if (!alive()) return;
    ask.disabled = working || !!pending || unavailable || !inScope();
    scopeHint.textContent = inScope() ? '' : pilot.scopeRequired;
    const poll = result.querySelector('[data-evolus-poll]');
    if (poll) poll.disabled = working || !pending;
  };
  container.addEventListener('retorno-question-changed', () => {
    if (!alive()) return;
    questionVersion += 1;
    pending = null;
    result.innerHTML = '';
    updateControls();
  });

  function showPending(sessionId, context) {
    const receipt = { sessionId, context };
    pending = receipt;
    result.innerHTML = `<h4 tabindex="-1">${pilot.pending}</h4><button type="button" data-evolus-poll>${pilot.poll}</button>`;
    result.querySelector('[data-evolus-poll]').addEventListener('click', () => pollExisting(receipt));
  }

  async function receive(output, context) {
    if (!current(context)) return;
    pending = null;
    if (output?.remainingExecutions === 0) unavailable = true;
    if (output?.status === 'stale') {
      result.innerHTML = `<h4 tabindex="-1">${pilot.stale}</h4>`;
      unavailable = true;
      await onStale?.();
    } else if (output?.provider !== 'evolus' || output?.caseId !== caseId || output?.revision !== revision || output?.requiresSemanticHumanReview !== true) {
      result.innerHTML = `<h4 tabindex="-1">${strings.failure}</h4>`;
    } else if (output.status === 'pending' && typeof output.sessionId === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(output.sessionId)) {
      showPending(output.sessionId, context);
    } else if (['disabled','blocked'].includes(output.status)) {
      unavailable = true;
      result.innerHTML = `<h4 tabindex="-1">${pilot.unavailable}</h4>`;
    } else if (output.status === 'timeout') {
      result.innerHTML = `<h4 tabindex="-1">${pilot.timeout}</h4>`;
    } else if (output.status === 'abstained' && output.formatValid === true && output.candidate?.abstention === true) {
      result.innerHTML = `<h4 tabindex="-1">${strings.abstention}</h4><p data-original>${esc(output.candidate.reason)}</p><p class="caption">${pilot.answer}</p>`;
    } else if (output.status === 'candidate' && output.formatValid === true && output.candidate?.humanReviewRequired === true && output.candidate?.abstention === false && typeof output.candidate.answer === 'string' && Array.isArray(output.candidate.citations) && output.candidate.citations.length) {
      const candidate = output.candidate;
      result.innerHTML = `<h4 tabindex="-1">${pilot.answer}</h4><p class="callout" data-original>${esc(candidate.answer)}</p><p class="caption">${pilot.sources}</p>${candidate.citations.map(source => `<article class="source"><strong>${esc(source.sourceId)}</strong>${sourceReadingView(source, { originalTag:'blockquote' })}</article>`).join('')}`;
    } else {
      result.innerHTML = `<h4 tabindex="-1">${strings.failure}</h4>`;
    }
    if (current(context)) focusResult();
  }

  async function execute(route, body, context, loading) {
    working = true;
    updateControls();
    result.innerHTML = `<p role="status">${loading}</p>`;
    try {
      const output = await request(route, body);
      await receive(output, context);
    } catch (error) {
      if (!current(context)) return;
      result.innerHTML = `<h4 tabindex="-1">${error.status === 409 ? pilot.stale : strings.failure}</h4>`;
      notify(error.status === 409 ? pilot.stale : strings.failure, true);
      if (error.status === 409) { pending = null; unavailable = true; await onStale?.(); }
      // A failed poll keeps the existing session; it can only be checked again.
      else if (pending) {
        const receipt = pending;
        result.innerHTML += `<button type="button" data-evolus-poll>${pilot.poll}</button>`;
        result.querySelector('[data-evolus-poll]').addEventListener('click', () => pollExisting(receipt));
      }
      if (current(context)) focusResult();
    } finally {
      working = false;
      updateControls();
    }
  }

  async function pollExisting(receipt) {
    if (working || !pending || pending !== receipt || !current(receipt.context)) return;
    await execute('/api/evolus/poll', { sessionId:receipt.sessionId, expectedRevision:revision }, receipt.context, pilot.checking);
  }
  ask.addEventListener('click', async () => {
    if (working || pending || unavailable || !alive() || !inScope()) return;
    const context = { version:questionVersion, question:question() };
    await execute('/api/evolus/query', { caseId, question:evolusScope.question, expectedRevision:revision }, context, strings.working);
  });
  // A remount may recover the server's local receipt, never a provider identifier.
  // Recovery renders a control only; it does not query, poll or accept old output.
  if (inScope() && pendingSession?.caseId === caseId && pendingSession.revision === revision
    && pendingSession.requiresSemanticHumanReview === true && typeof pendingSession.sessionId === 'string'
    && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pendingSession.sessionId)) {
    showPending(pendingSession.sessionId, { version:questionVersion, question:question() });
  }
  updateControls();
}

export async function mountModelPanel(container, { item, revision, request, notify, onStale, onCardSaved }) {
  const session = Symbol('model-session');
  sessions.set(container, session);
  const alive = () => container.isConnected && sessions.get(container) === session;
  const language = Object.hasOwn(copy, document.documentElement.lang.slice(0,2)) ? document.documentElement.lang.slice(0,2) : 'en';
  const strings = copy[language];
  const [modelStatus, evolusStatus] = await Promise.allSettled([request('/api/model/status'), request('/api/evolus/status')]);
  if (!alive()) return;
  const pilot = evolusStatus.status === 'fulfilled' ? evolusStatus.value : null;
  if (pilot?.enabled) {
    if (pilot.provider === 'evolus' && pilot.scope?.caseId === evolusScope.caseId && pilot.scope?.question === evolusScope.question && item.id === evolusScope.caseId) {
      mountEvolusPanel(container, { item, revision, request, notify, onStale, alive, language,
        canStart:pilot.canStart, pendingSession:pilot.pendingSession });
    }
    return;
  }
  const status = modelStatus.status === 'fulfilled' ? modelStatus.value : null;
  if (!status?.enabled) return;
  const host = document.createElement('section');
  host.className = 'section model-reading';
  host.innerHTML = `<h3>${strings.title}</h3><p>${strings.description}</p><button type="button" class="primary" data-model-ask>${strings.ask}</button><div data-model-result aria-live="polite"></div><p class="caption">${strings.noAction}</p>`;
  container.append(host);
  let working = false;
  const ask = host.querySelector('[data-model-ask]');
  const result = host.querySelector('[data-model-result]');
  let questionVersion=0;
  container.addEventListener('retorno-question-changed',()=> {
    questionVersion+=1;
    result.innerHTML='';
  });
  const focusResult = () => result.querySelector('h4')?.focus({ preventScroll:true });
  ask.addEventListener('click', async () => {
    if (working) return;
    const question = container.querySelector('#evidence-question')?.value.trim();
    if (!question) { container.querySelector('#evidence-question')?.focus(); return; }
    const requestedVersion=questionVersion;
    working = true; ask.disabled = true;
    result.innerHTML = `<p role="status">${strings.working}</p>`;
    try {
      const output = await request('/api/model/query', { caseId:item.id, question, expectedRevision:revision });
      if (!alive() || requestedVersion !== questionVersion) return;
      if (output.mode === 'human_handoff') {
        result.innerHTML = `<h4 tabindex="-1">${strings.handoff}</h4>`;
      } else if (!output.formatValid || !output.candidate) {
        result.innerHTML = `<h4 tabindex="-1">${strings.failure}</h4>`;
      } else if (output.candidate.abstention) {
        result.innerHTML = `<h4 tabindex="-1">${strings.abstention}</h4><p data-original lang="en">${esc(output.candidate.reason)}</p><p class="caption">${strings.english}</p>`;
      } else {
        const candidate = output.candidate;
        result.innerHTML = `<h4 tabindex="-1">${strings.english}</h4><p class="callout" data-original lang="en">${esc(candidate.answer)}</p><p class="caption">${strings.format}</p>${candidate.citations.map(source=>`<article class="source"><strong>${esc(source.sourceId)}</strong>${sourceReadingView(source, { originalTag:'blockquote' })}</article>`).join('')}<label class="check"><input type="checkbox" data-model-reviewed><span>${strings.review}</span></label><button type="button" data-model-save disabled>${strings.save}</button>`;
        const confirm = result.querySelector('[data-model-reviewed]');
        const save = result.querySelector('[data-model-save]');
        confirm.addEventListener('change',()=> { save.disabled = !confirm.checked; });
        save.addEventListener('click',async()=> {
          if (!confirm.checked || working || requestedVersion !== questionVersion) return;
          working = true; save.disabled = true; confirm.disabled = true; ask.disabled = true;
          try {
            const card = await request('/api/evidence/card', { caseId:item.id, expectedRevision:revision, sourceDigest:output.sourceDigest, sourceIds:candidate.citations.map(source=>source.sourceId), reviewerConfirmed:true });
            if (alive()) { notify(strings.saved); save.textContent = strings.saved; focusResult(); await onCardSaved?.(card); }
          } catch (error) { if (alive()) { notify(strings.failure,true); if(error.status===409) await onStale(); else {confirm.disabled=false;save.disabled=false;} } }
          finally { working=false; if(alive()) ask.disabled=false; }
        });
      }
      focusResult();
    } catch(error) {
      if (!alive()) return;
      result.innerHTML = `<h4 tabindex="-1">${strings.failure}</h4>`;
      notify(strings.failure,true);
      if (error.status === 409) await onStale(); else focusResult();
    } finally { working=false; if(alive()) ask.disabled=false; }
  });
}
