import { mountRecordedAMDPanel } from './recorded-amd-client.mjs';
import { ui, stamp, localizeTree, normalizeSuggestedQuestion } from './i18n.mjs';
import { mountModelPanel } from './model-client.mjs';
import { sourceReadingView } from './source-reading.mjs';
// ACT III, 12/10/2026: local, extractive evidence workflow. No model inference.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const drafts = new Map();
const sessions = new WeakMap();
const panels = new Map();


export function evidenceView(item) {
  const question = drafts.has(item.id) ? drafts.get(item.id) : ui('Qual pendência continua aberta e quem é o responsável?');
  return `<section class="evidence-workspace" aria-labelledby="evidence-heading">
    <div class="evidence-intro"><div><p class="eyebrow">Ler → conferir → preparar</p><h3 id="evidence-heading">Um retorno, com a origem à vista.</h3><p>Localize os registros desta etapa e prepare um cartão com os trechos que você conferiu.</p></div><span class="tag">Consulta local · Sem modelo</span></div>
    <form id="evidence-question-form"><label for="evidence-question">O que precisa conferir neste caso fictício?</label><textarea data-original id="evidence-question" maxlength="2000" rows="2" required>${esc(question)}</textarea><div class="evidence-prompts" aria-label="Perguntas administrativas sugeridas"><button type="button" data-question="Qual pendência continua aberta e quem é o responsável?">Pendência e responsável</button><button type="button" data-question="Qual preferência de contato foi registrada?">Preferência de contato</button><button type="button" data-question="Há confirmação consistente na agenda e na fila?">Agenda e confirmação</button></div><div class="form-actions"><button type="submit" class="primary" id="evidence-search">Conferir com fontes</button><span class="caption">Somente os registros da etapa atual; não altera o caso.</span></div></form>
    <p class="caption lexical-limit">A busca é lexical, em fontes portuguesas. As perguntas sugeridas usam um equivalente fixo em português; perguntas livres em outros idiomas podem não encontrar termos. Não há tradução ou interpretação automática.</p><div id="evidence-result" aria-live="polite"><div class="evidence-empty"><span aria-hidden="true">01</span><div><strong>Comece pela pergunta.</strong><p>A consulta encontra trechos literais. A pessoa confere o significado e decide o próximo passo.</p></div></div></div>
    <div id="evidence-card"></div>
    <details class="evidence-receipts"><summary>Revisões salvas deste caso</summary><div id="evidence-saved-reviews"><p class="caption">Consultando os registros locais…</p></div></details>
    <p class="caption evidence-limit">Esta consulta não faz inferência de IA. Um cartão organiza registros fictícios conferidos; não é orientação médica, contato enviado ou confirmação de agenda.</p>
  </section>`;
}

function renderCard(card) {
  return `<article class="return-card" aria-labelledby="return-card-heading"><header><p class="eyebrow">PatientKeeper — Retorno</p><span class="tag">Conferência registrada</span></header><h3 id="return-card-heading" tabindex="-1">Cartão de conferência</h3><p class="card-subtitle">${esc(card.caseId)} · Somente dados fictícios</p><ol class="card-sources">${(card.sources || []).map(source => `<li>${sourceReadingView(source)}<span>Origem: ${esc(source.sourceId)}</span></li>`).join('')}</ol><div class="card-foot"><p>Registro ${esc(card.reviewId)}<br>${esc(stamp(card.createdAt))} · Versão do progresso ${esc(card.revision)}</p><p>Não envia mensagens.<br>Não altera a agenda ou encerra a pendência.</p></div></article>`;
}

export function mountEvidencePanel(container, { item, revision, request, notify, onStale }) {
  const token = Symbol('evidence-session');
  sessions.set(container, token);
  const alive = () => container.isConnected && sessions.get(container) === token;
  const $ = selector => container.querySelector(selector);
  const memory = panels.get(item.id) || {revision,report:null,card:null,cardStale:false,selection:[],reviewed:false,savedSelection:null};
  panels.set(item.id,memory);
  if (memory.revision !== revision) { memory.report=null;memory.selection=[];memory.reviewed=false;memory.savedSelection=null;memory.card=null;memory.cardStale=false;memory.revision=revision; }
  let report = memory.report;
  let working = false;
  const focusHeading = selector => { const heading=$(selector); heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'nearest',behavior:'instant'}); };
  const renderSavedCard = () => { if (memory.card) { $('#evidence-card').innerHTML=`${memory.cardStale ? '<p class="callout">Registro anterior. Refaça a consulta para conferir as fontes atuais.</p>' : ''}${renderCard(memory.card)}`;localizeTree($('#evidence-card')); } };

  function setWorking(value) {
    working = value;
    container.setAttribute('aria-busy', String(value));
    container.querySelectorAll('button,input,textarea').forEach(control => {
      if (value) { control.dataset.evidenceWasDisabled = String(control.disabled); control.disabled = true; }
      else if (control.dataset.evidenceWasDisabled !== undefined) { control.disabled = control.dataset.evidenceWasDisabled === 'true'; delete control.dataset.evidenceWasDisabled; }
    });
  }
  const errorMessage = error => error.status === 409 ? 'Os registros mudaram. Confira a versão atual antes de preparar o cartão.' : error.message || 'Não foi possível consultar os registros locais.';
  async function handleError(error) {
    if (!alive()) return;
    notify(errorMessage(error), true);
    if (error.status === 409) await onStale();
  }

  async function loadReviews() {
    try {
      const data = await request('/api/evidence/reviews', { caseId:item.id });
      if (!alive()) return;
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      if (memory.card) { memory.cardStale=memory.card.sourceDigest !== data.currentSourceDigest;renderSavedCard(); }
      $('#evidence-saved-reviews').innerHTML = reviews.length ? `<p class="caption">${reviews.length} ${reviews.length === 1 ? 'conferência salva' : 'conferências salvas'}. Uma revisão anterior precisa ser refeita se os registros mudarem.</p>${reviews.map(card => `<div class="saved-review"><strong>${esc(stamp(card.createdAt))}</strong><span class="caption">Versão do progresso ${esc(card.revision)} · ${(card.sources || []).length} ${(card.sources || []).length === 1 ? 'trecho' : 'trechos'}</span><button type="button" data-review="${esc(card.reviewId)}">Abrir cartão salvo</button></div>`).join('')}` : '<p class="caption">Nenhuma conferência registrada ainda. O cartão fica salvo separadamente do caso.</p>';
      localizeTree($('#evidence-saved-reviews'));
      container.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', () => {
        const card = reviews.find(entry => entry.reviewId === button.dataset.review);
        if (!card) return;
        $('#evidence-card').innerHTML = `${card.sourceDigest !== data.currentSourceDigest ? '<p class="callout">Registro anterior. Refaça a consulta para conferir as fontes atuais.</p>' : ''}${renderCard(card)}`;
        memory.card=card;memory.cardStale=card.sourceDigest !== data.currentSourceDigest;localizeTree($('#evidence-card'));
        $('#evidence-card').scrollIntoView({block:'nearest',behavior:'instant'});focusHeading('#return-card-heading');
      }));
    } catch (error) {
      if (!alive()) return;
      $('#evidence-saved-reviews').innerHTML = '<p class="caption">Não foi possível abrir as revisões salvas. Seus registros não foram substituídos.</p>';localizeTree($('#evidence-saved-reviews'));
    }
  }

  function renderReport() {
    let savedSelection = memory.savedSelection;
    const matches = report.matches || [];
    const title = report.outcome === 'human_handoff' ? 'A equipe precisa assumir esta pergunta.' : report.outcome === 'no_support' ? 'A consulta local não encontrou trechos suficientes.' : 'Confira a informação no registro de origem.';
    $('#evidence-result').innerHTML = `<section class="evidence-findings"><div class="evidence-result-heading"><h3 id="evidence-result-heading" tabindex="-1">${esc(title)}</h3><span class="tag ${report.outcome === 'sources_found' ? '' : 'warn'}">${matches.length} ${matches.length === 1 ? 'trecho localizado' : 'trechos localizados'}</span></div>${report.reason ? `<p class="${report.outcome === 'sources_found' ? 'caption' : 'callout'}">${esc(report.reason)}</p>` : ''}${matches.map((source, index) => `<article class="evidence-excerpt"><div class="source-head"><strong>${esc(source.sourceId)}</strong><span class="tag">Registro da etapa atual</span></div>${sourceReadingView(source, { originalTag:'blockquote' })}${report.cardAllowed === false ? '<p class="caption">Cartão bloqueado enquanto esta conferência depende da equipe.</p>' : `<label class="check"><input type="checkbox" data-select-source="${esc(source.sourceId)}" id="evidence-source-${index}" ${memory.selection.includes(source.sourceId) ? 'checked' : ''}><span>Conferi este trecho e quero incluí-lo no cartão.</span></label>`}</article>`).join('')}${report.historicalSources?.length ? `<details class="historical-note"><summary>${report.historicalSources.length} registro histórico separado</summary>${report.historicalSources.map(source => `<article class="source historical"><strong>${esc(source.sourceId || source.id)}</strong>${sourceReadingView(source)}<p class="caption">Histórico: não pode determinar a ação atual nem entrar no cartão.</p></article>`).join('')}</details>` : ''}${matches.length && report.cardAllowed !== false ? `<div class="evidence-review"><label class="check"><input type="checkbox" id="evidence-review-confirm" ${memory.reviewed ? 'checked' : ''}><span>Conferi o significado dos trechos selecionados e a etapa atual. Este cartão é somente administrativo.</span></label><button type="button" class="primary" id="evidence-save-card" disabled>Preparar cartão revisado</button><p class="caption">Sua conferência ficará registrada; a pendência continua no mesmo estado.</p></div>` : ''}</section>`;
    $('#evidence-card').innerHTML = '';
    localizeTree($('#evidence-result'));
    const update = () => {
      const selectedIds = [...container.querySelectorAll('[data-select-source]:checked')].map(input => input.dataset.selectSource);
      memory.selection=selectedIds;
      const selected = selectedIds.length;
      const reviewed = $('#evidence-review-confirm')?.checked;memory.reviewed=!!reviewed;
      const alreadySaved = savedSelection === JSON.stringify(selectedIds.toSorted());
      if ($('#evidence-save-card')) { $('#evidence-save-card').disabled = !selected || !reviewed || working || alreadySaved; $('#evidence-save-card').textContent = ui(alreadySaved ? 'Conferência salva' : 'Preparar cartão revisado'); }
    };
    container.querySelectorAll('[data-select-source]').forEach(input => input.addEventListener('change', () => {
      $('#evidence-review-confirm').checked = false;
      update();
    }));
    $('#evidence-review-confirm')?.addEventListener('change', update);
    $('#evidence-save-card')?.addEventListener('click', async () => {
      const sourceIds = [...container.querySelectorAll('[data-select-source]:checked')].map(input => input.dataset.selectSource);
      if (working || !sourceIds.length || !$('#evidence-review-confirm').checked) return;
      setWorking(true);
      try {
        const response = await request('/api/evidence/card', {caseId:item.id,expectedRevision:revision,sourceDigest:report.sourceDigest,sourceIds,reviewerConfirmed:true});
        if (!alive()) return;
        const card = response.card || response;
        savedSelection = JSON.stringify(sourceIds.toSorted());memory.savedSelection=savedSelection;memory.card=card;memory.cardStale=false;
        $('#evidence-card').innerHTML = renderCard(card);localizeTree($('#evidence-card'));
        notify('Conferência salva. Nenhum contato, agenda ou encerramento foi registrado.');
        await loadReviews();focusHeading('#return-card-heading');
      } catch (error) { await handleError(error); }
      finally { if (alive()) { setWorking(false); update(); } }
    });
    update();renderSavedCard();
  }

  const questionChanged = () => {
    drafts.set(item.id,$('#evidence-question').value);
    report=null;memory.report=null;memory.selection=[];memory.reviewed=false;memory.savedSelection=null;
    $('#evidence-result').innerHTML='<p class="caption">A pergunta mudou. Refaça a consulta para conferir os registros.</p>';
    localizeTree($('#evidence-result'));
    container.dispatchEvent(new CustomEvent('retorno-question-changed'));
  };
  $('#evidence-question').addEventListener('input', questionChanged);
  container.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
    $('#evidence-question').value = ui(button.dataset.question);
    questionChanged();
    $('#evidence-question').focus();
  }));
  $('#evidence-question-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (working) return;
    const question = $('#evidence-question').value.trim();
    if (!question) return;
    setWorking(true);
    $('#evidence-result').innerHTML = '<p class="evidence-loading" role="status">Localizando as fontes da etapa atual…</p>';
    $('#evidence-card').innerHTML = '';memory.report=null;memory.card=null;memory.cardStale=false;memory.selection=[];memory.reviewed=false;memory.savedSelection=null;
    localizeTree($('#evidence-result'));
    try {
      const result = await request('/api/evidence/query', {caseId:item.id,question:normalizeSuggestedQuestion(question),expectedRevision:revision});
      if (!alive()) return;
      report = result;memory.report=result;
      setWorking(false);
      renderReport();focusHeading('#evidence-result-heading');
    } catch (error) {
      if (!alive()) return;
      report = null;memory.report=null;
      $('#evidence-result').innerHTML = '<p class="callout">A consulta não foi concluída. Confira o aviso e tente novamente.</p>';
      localizeTree($('#evidence-result'));
      await handleError(error);
    } finally { if (alive()) setWorking(false); }
  });
  if (report) renderReport();
  else renderSavedCard();
  loadReviews();
  mountRecordedAMDPanel(container, { item, revision, request, notify, onStale });
  mountModelPanel(container, { item, revision, request, notify, onStale,
    onCardSaved:async card => {
      if (!alive()) return;
      memory.card=card;memory.cardStale=false;renderSavedCard();
      await loadReviews();focusHeading('#return-card-heading');
    },
  });
}
