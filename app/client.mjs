import { ui, getLanguage, setLanguage, stamp, localizeTree, searchText, errorText } from './i18n.mjs';
import { evidenceView, mountEvidencePanel } from './evidence-client.mjs';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const owners = ['SEC-SIM-A','SEC-SIM-B','SEC-SIM-C','COORD-SIM-A','MED-SIM-A','MED-SIM-B'];
const displayTitles = ['Retorno cancelado sem reposição','Distribuição da pendência','Contato registrado sem resposta','Prefere não receber novos contatos','Janela clínica não informada','Regra administrativa antiga e vigente','Agenda e fila divergentes','Urgência declarada no registro'];
const displayTitle = item => displayTitles[Number(item.id.slice(-2))-1] ?? item.title;
const displayNext = item => {
  if (!item.owner || item.stage > 0 || item.id === 'SIM-RET-02' || item.id === 'SIM-RET-01' && item.contactCount > 0) return item.nextAction;
  return ({
    'SIM-RET-01':'Conferir a orientação da equipe antes de oferecer um horário. A política fictícia permite apenas colher disponibilidade.',
    'SIM-RET-03':'Conferir o registro de contato e a política da equipe. A ausência de resposta não autoriza uma nova tentativa.',
    'SIM-RET-04':'Manter a recusa visível e encaminhar o processo à coordenação, sem preparar novo contato.',
    'SIM-RET-05':'Levar a pergunta à equipe médica. A janela clínica precisa ser definida por ela.',
    'SIM-RET-06':'Conferir a regra vigente e o próximo responsável antes de qualquer contato.',
    'SIM-RET-07':'Conferir agenda e fila com a coordenação. Não afirmar confirmação enquanto houver divergência.',
    'SIM-RET-08':'Apresentar o pedido à equipe médica pela rota humana definida por ela. A remarcação não responde a uma questão clínica.'
  })[item.id] ?? item.nextAction;
};
let state, currentId, currentTab = 'summary', filter = 'open', search = '', busy = false, noticeTimer, pendingAction;
const edits = new Map();


function notify(message, error = false) {
  clearTimeout(noticeTimer);
  $('#notice').hidden = false;
  $('#notice').classList.toggle('error',error);
  $('#notice').textContent = ui(message);
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, error ? 14000 : 7000);
}
async function request(path, body) {
  let response;
  try { response = await fetch(path, body === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }
  catch { throw new Error(ui('Servidor local indisponível.')); }
  let result;
  try { result = await response.json(); } catch { throw new Error(ui('O servidor local não respondeu no formato esperado.')); }
  if (!response.ok) {
    const error = new Error(errorText(typeof result.error === 'string' ? result.error : result.message || result.error?.message));
    error.status = response.status;
    throw error;
  }
  return result;
}
function setBusy(value) {
  busy = value;
  document.body.classList.toggle('busy',value);
  document.querySelectorAll('button,input,select,textarea').forEach(control => {
    if (value) { control.dataset.previousDisabled = String(control.disabled); control.disabled = true; }
    else if (control.dataset.previousDisabled !== undefined) { control.disabled = control.dataset.previousDisabled === 'true'; delete control.dataset.previousDisabled; }
  });
}
function isResolved(item) { return item.status === 'resolvido_administrativamente'; }
function matches(item) {
  const query = searchText(search);
  const searchable = searchText([item.id,...['pt','en','es'].flatMap(lang => [ui(item.id.replace('SIM-RET-','Caso '),lang),ui(displayTitle(item),lang),ui(item.owner || 'Sem responsável',lang),ui(item.statusLabel,lang)])].join(' '));
  if (query && !searchable.includes(query)) return false;
  return filter === 'all' || filter === 'open' && !isResolved(item) || filter === 'unowned' && !item.owner && !isResolved(item) || filter === 'medical' && !!item.medicalHandoff && !isResolved(item) || filter === 'waiting' && item.status === 'aguardando_resposta' || filter === 'blocked' && item.preference.status === 'prefere_nao_receber' && !isResolved(item) || filter === 'resolved' && isResolved(item);
}
function statusClass(item) { return item.preference.status === 'prefere_nao_receber' ? 'stop' : item.medicalHandoff || item.status === 'divergencia_aguardando_revisao' || !item.owner ? 'warn' : ''; }
function renderQueue() {
  const list = state.cases.filter(matches);
  if (!list.some(item => item.id === currentId)) { currentId = list[0]?.id || null; currentTab = 'summary'; }
  $('#queue-count').textContent = `${list.length} ${list.length === 1 ? 'caso neste filtro' : 'casos neste filtro'}`;
  $('#cases').innerHTML = list.length ? list.map(item => `<button type="button" class="case" data-case="${esc(item.id)}" aria-pressed="${item.id === currentId}"><span class="eyebrow">${esc(item.id.replace('SIM-RET-','Caso '))} · Fictício</span><strong>${esc(displayTitle(item))}</strong><small>${esc(item.owner || 'Atribuição pendente')}</small><span class="tag ${statusClass(item)}">${esc(item.statusLabel)}</span></button>`).join('') : '<div class="empty-state"><p>Nenhum caso neste filtro. Ajuste a busca ou escolha outra fila.</p></div>';
}
function summaryView(item) {
  const resolved = isResolved(item);
  const editable = edits.has(item.id);
  const draftText = editable ? edits.get(item.id) : item.draft.text;
  return `<div class="next-action"><h3>Próximo passo</h3><p>${esc(displayNext(item))}</p></div><div class="evidence-entry"><div><strong>O próximo passo tem uma origem.</strong><p>Confira os registros e prepare um cartão revisado antes de agir.</p></div><button type="button" id="open-evidence">Conferir com fontes <span aria-hidden="true">↗</span></button></div>
    ${item.medicalHandoff ? `<div class="callout ${item.id.endsWith('08') ? 'stop' : ''}"><strong>Depende da equipe médica</strong><p>${esc(item.medicalHandoff)}</p></div>` : ''}
    <section class="section"><h3>Responsabilidade compartilhada</h3><form id="owner-form" class="field-row"><div class="field"><label for="owner">Pessoa fictícia responsável</label><select id="owner" ${resolved ? 'disabled' : ''}><option value="">Atribuição pendente</option>${owners.map(owner => `<option value="${owner}" ${owner === item.owner ? 'selected' : ''}>${owner}</option>`).join('')}</select></div><button id="assign" type="submit" ${resolved ? 'disabled' : ''}>Registrar atribuição</button></form><p class="caption">A coordenação distribui o trabalho e confere apoio e capacidade. Não há ranking individual.</p></section>
    <section class="section"><div class="section-title-row"><h3>Contato administrativo</h3><span class="tag ${item.preference.status === 'prefere_nao_receber' ? 'stop' : 'warn'}">${esc(item.preference.label)}</span></div>
      ${item.draft.allowed && !resolved ? `<p>Exemplo predefinido para coletar disponibilidade. Uma oferta de horário depende da orientação da equipe.</p><form id="draft-form"><label for="draft-text">Rascunho fictício · Revisão humana</label><p class="caption original-label">Texto original · Português</p><textarea id="draft-text" data-original lang="pt-BR" maxlength="2000">${esc(draftText)}</textarea><div class="form-actions"><button type="submit" id="save-draft">Salvar rascunho</button><span id="draft-status" class="draft-status">${editable ? 'Alteração ainda não salva.' : 'Texto preparado; não gerado por IA.'}</span></div></form><label class="check"><input type="checkbox" id="reviewed" ${item.draft.reviewed && !editable ? 'checked' : ''} ${editable || !String(draftText ?? '').trim() ? 'disabled' : ''}><span id="review-label">${editable ? 'Salve a alteração antes de registrar a revisão.' : 'Revisei este rascunho fictício. Isso não registra um contato.'}</span></label>` : `<div class="callout ${item.preference.status === 'prefere_nao_receber' ? 'stop' : ''}">${esc(item.draft.reason || 'Contato indisponível nesta etapa.')}</div>`}
      <div class="contact-summary"><span>${item.contactCount} ${item.contactCount === 1 ? 'contato fictício registrado' : 'contatos fictícios registrados'}</span><button type="button" id="record-contact" ${item.canRecordContact && !editable ? '' : 'disabled'}>Registrar contato fictício</button></div>${item.contactCount > 0 && !resolved ? '<p class="caption">Uma nova tentativa depende de decisão humana e política registrada. Esta demonstração não autoriza contato adicional.</p>' : ''}<p class="caption">Este registro descreve uma ação simulada. A demonstração não envia mensagens nem confirma uma consulta por gerar texto.</p></section>
    ${item.id === 'SIM-RET-01' ? `<section class="section"><h3>Conferir a remarcação</h3><p>Avance com registros humanos fictícios. A pendência continua aberta até a conferência final.</p>
      <div class="step ${item.stage >= 1 ? 'complete' : ''}"><span class="step-num">${item.stage >= 1 ? '✓' : '1'}</span><div><strong>Orientação da equipe</strong><p>Ativar o registro fictício da opção autorizada, sem inferir intervalo clínico.</p></div><button type="button" id="register-orientation" ${item.canRegisterOrientation ? '' : 'disabled'}>${item.stage >= 1 ? 'Registrada' : 'Registrar orientação'}</button></div>
      <div class="step ${item.stage >= 2 ? 'complete' : ''}"><span class="step-num">${item.stage >= 2 ? '✓' : '2'}</span><div><strong>Resposta e agenda</strong><p>Registrar a confirmação e a reposição fictícias. Conferir suas fontes antes do encerramento.</p></div><button type="button" id="confirm-response" ${item.canConfirm ? '' : 'disabled'}>${item.stage >= 2 ? 'Registradas' : 'Registrar confirmação'}</button></div>
      <div class="step ${item.stage >= 3 ? 'complete' : ''}"><span class="step-num">${item.stage >= 3 ? '✓' : '3'}</span><div><strong>Encerramento administrativo</strong><p>Encerrar somente com confirmação, agenda e responsável conferidos.</p></div><button type="button" class="primary" id="close-case" ${item.canClose ? '' : 'disabled'}>${item.stage >= 3 ? 'Resolvida' : 'Conferir e encerrar'}</button></div>
    </section>` : ''}`;
}
function sourcesView(item) {
  return `<section class="section"><h3>Registros da etapa atual</h3><p>Confira a origem de cada informação. Os registros de evolução aparecem somente depois da ação humana correspondente.</p>${item.activeSources.map(source => `<article class="source ${source.vigente === false ? 'historical' : ''}"><div class="source-head"><strong>${esc(source.id)}</strong><span class="tag ${source.vigente === false ? 'warn' : ''}">${source.vigente === false ? 'Regra histórica' : source.vigente === true ? 'Regra vigente' : 'Registro fictício'}</span></div><p class="caption original-label">Fonte original · Português</p><p data-original lang="pt-BR">${esc(source.trecho)}</p>${source.substituida_por ? `<p class="caption">Substituída por ${esc(source.substituida_por)}.</p>` : ''}</article>`).join('')}<p class="caption">A aba Conferência consulta estes trechos localmente. IA/AMD ainda não conectados; fontes históricas ficam separadas da ação atual.</p></section>`;
}
function historyView(item) {
  return `<section class="section"><h3>Histórico do caso fictício</h3><p>Atribuições e etapas são salvas neste computador, com registro de data e hora.</p>${item.history.length ? `<p class="caption original-label">Histórico original · Português</p><ol class="timeline">${item.history.map(event => `<li><div><p data-original lang="pt-BR">${esc(event.text)}</p><time datetime="${esc(event.at)}">${esc(stamp(event.at))}</time></div></li>`).join('')}</ol>` : '<div class="empty-state"><p>Nenhuma alteração humana registrada neste caso. Os registros iniciais estão na aba Registros.</p></div>'}</section>`;
}
function renderDetail() {
  const item = state.cases.find(entry => entry.id === currentId);
  if (!item) { $('#detail').innerHTML = '<div class="empty-state"><h2>Nenhum caso neste filtro</h2><p>Escolha outra fila para acompanhar as pendências.</p></div>'; localizeTree($('#detail')); return; }
  const tabs = [['summary','Acompanhamento'],['evidence','Conferência'],['sources','Registros'],['history','Histórico']];
  $('#detail').innerHTML = `<button type="button" id="return-to-queue" class="queue-return"><span aria-hidden="true">←</span> Voltar à fila</button><header class="detail-head"><div><p class="eyebrow">${esc(item.id)} · Dados fictícios</p><h2>${esc(displayTitle(item))}</h2></div><span class="tag ${statusClass(item)}">${esc(item.statusLabel)}</span></header><p class="context-line">${esc(item.owner ? `Responsável: ${item.owner}` : 'Responsável ainda não atribuído')} · Agenda fictícia</p><div class="tabs" role="tablist" aria-label="Informações da pendência">${tabs.map(([id,label]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-selected="${currentTab === id}" tabindex="${currentTab === id ? 0 : -1}" aria-controls="case-panel">${label}</button>`).join('')}</div><div id="case-panel" role="tabpanel" aria-labelledby="tab-${currentTab}" tabindex="0">${currentTab === 'summary' ? summaryView(item) : currentTab === 'evidence' ? evidenceView(item) : currentTab === 'sources' ? sourcesView(item) : historyView(item)}</div>`;
  localizeTree($('#detail'));
  bindDetail(item);
  if (currentTab === 'evidence') mountEvidencePanel($('#case-panel'), { item, revision:state.revision, request, notify, onStale:async () => { state = await request('/api/state'); render('tab-evidence'); } });
}
function render(focus = null) {
  for (const [key,value] of Object.entries(state.metrics)) { const target = $(`#metric-${key}`); if (target) target.textContent = value; }
  $('#storage-status').textContent = `Progresso salvo localmente · Versão ${state.revision} · Consulta extrativa disponível · IA/AMD ainda não conectados.`;
  renderQueue(); renderDetail();
  localizeTree(document.body);
  if (focus) {
    const target = document.getElementById(focus) || document.querySelector(`[data-case="${currentId}"]`);
    if (target && !target.disabled) target.focus({preventScroll:true}); else $('#detail').focus({preventScroll:true});
  }
}
async function mutate(path, data, message, focus, cleanup) {
  if (busy) return;
  setBusy(true);
  try {
    state = await request(path,{expectedRevision:state.revision,...data});
    cleanup?.();
    $('#action-dialog').close();
    $('#import-dialog').close();
    setBusy(false);
    render(focus);
    notify(message);
  } catch(error) {
    if (error.status === 409) {
      $('#action-dialog').close();
      $('#import-dialog').close();
      pendingAction = null;
      let refreshed = false;
      try { state = await request('/api/state'); setBusy(false); render(focus); refreshed = true; } catch { /* Preserve the visible state if connection also failed. */ }
      notify(refreshed ? 'O progresso mudou em outra aba. Carreguei a versão atual; confira o caso antes de repetir a ação.' : 'O progresso mudou em outra aba, mas não consegui carregar a versão atual. Recarregue antes de continuar.',true);
    } else {
      // Undo a checkbox's optimistic appearance, preserving unsaved draft edits.
      if (state && !$('#import-dialog').open) { setBusy(false); render(focus); }
      notify(error.message || 'Não foi possível salvar. O progresso não foi alterado.',true);
      if ($('#import-dialog').open) $('#import-error').textContent = error.message;
    }
  } finally { setBusy(false); }
}
function action(item, payload, message, focus, cleanup) { return mutate('/api/actions',{action:{caseId:item.id,...payload}},message,focus,cleanup); }
function bindDetail(item) {
  $('#return-to-queue')?.addEventListener('click',() => { const button=document.querySelector(`[data-case="${currentId}"]`); (button || $('#search')).focus({preventScroll:true}); $('.queue').scrollIntoView({behavior:'instant',block:'start'}); button?.scrollIntoView({behavior:'instant',block:'nearest'}); });
  $('#open-evidence')?.addEventListener('click', () => { currentTab='evidence'; renderDetail(); $('#tab-evidence').focus({preventScroll:true}); });
  $('#owner-form')?.addEventListener('submit',event => { event.preventDefault(); action(item,{type:'assign',owner:$('#owner').value || null},'Atribuição fictícia salva. O próximo passo continua visível.','assign'); });
  $('#draft-text')?.addEventListener('input',event => {
    edits.set(item.id,event.target.value);
    $('#draft-status').textContent = ui('Alteração ainda não salva.');
    $('#reviewed').checked = false; $('#reviewed').disabled = true;
    $('#review-label').textContent = ui('Salve a alteração antes de registrar a revisão.');
    $('#record-contact').disabled = true;
  });
  $('#draft-form')?.addEventListener('submit',event => { event.preventDefault(); action(item,{type:'draft_save',text:$('#draft-text').value},'Rascunho salvo. Registre a revisão antes do contato fictício.','save-draft',() => edits.delete(item.id)); });
  $('#reviewed')?.addEventListener('change',event => { const reviewed=event.target.checked; action(item,{type:'draft_review',reviewed},reviewed ? 'Revisão salva. Nenhum contato foi registrado.' : 'Revisão desmarcada.','reviewed'); });
  $('#record-contact')?.addEventListener('click',() => openAction('Contato fictício registrado por uma pessoa','Você está registrando apenas a ação de contato deste exemplo. Isso não envia a mensagem e não registra resposta ou confirmação.',[{key:'confirmed',label:'Confirmo o registro de um contato inteiramente fictício.'}],{path:'/api/actions',data:{action:{type:'contact_record',caseId:item.id}},message:'Contato fictício salvo. A pendência aguarda resposta; não foi encerrada.',focus:'record-contact'}));
  $('#register-orientation')?.addEventListener('click',() => openAction('Registrar orientação da equipe fictícia','Esta ação simula o registro humano da orientação da equipe e acrescenta sua fonte ao exemplo. Nenhum intervalo clínico é calculado ou oferecido.',[{key:'confirmed',label:'Autorizo acrescentar a orientação inteiramente fictícia a este exemplo.'}],{path:'/api/actions',data:{action:{type:'register_orientation',caseId:item.id}},message:'Orientação fictícia registrada. A próxima etapa registra resposta e agenda simuladas.',focus:'register-orientation'}));
  $('#confirm-response')?.addEventListener('click',() => openAction('Registrar resposta e reposição fictícias','Esta ação acrescenta dois fatos simulados: confirmação da opção autorizada e reposição correspondente na agenda. As fontes ficarão na aba Registros; confira-as antes de encerrar. A pendência permanece aberta.',[{key:'confirmationReviewed',label:'Autorizo registrar uma resposta fictícia confirmando a opção autorizada.'},{key:'calendarReviewed',label:'Autorizo registrar a reposição correspondente na agenda fictícia.'}],{path:'/api/actions',data:{action:{type:'confirm_response',caseId:item.id}},message:'Resposta e agenda fictícias registradas. Confira suas fontes antes do encerramento administrativo.',focus:'confirm-response'}));
  $('#close-case')?.addEventListener('click',() => openAction('Encerrar após a conferência humana','A resolução administrativa depende de confirmação e agenda consistentes. A ação será registrada no histórico deste caso fictício.',[{key:'confirmationReviewed',label:'Conferi a confirmação humana fictícia.'},{key:'calendarReviewed',label:'Conferi que agenda e fila correspondem à reposição autorizada.'}],{path:'/api/actions',data:{action:{type:'close',caseId:item.id}},message:'Pendência fictícia resolvida após conferência humana. Confira a fila de resolvidas.',focus:'filter'}));
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click',() => { currentTab=button.dataset.tab; renderDetail(); $(`#tab-${currentTab}`).focus({preventScroll:true}); });
    button.addEventListener('keydown',event => {
      const ids=['summary','evidence','sources','history'];
      let index=ids.indexOf(button.dataset.tab);
      if (event.key === 'ArrowRight') index=(index+1)%ids.length;
      else if(event.key === 'ArrowLeft') index=(index+ids.length-1)%ids.length;
      else if(event.key === 'Home') index=0;
      else if(event.key === 'End') index=ids.length-1;
      else return;
      event.preventDefault();currentTab=ids[index];renderDetail();$(`#tab-${currentTab}`).focus({preventScroll:true});
    });
  });
}
function openAction(title,description,checks,operation) {
  pendingAction={...operation,keys:checks.map(check => check.key)};
  $('#dialog-title').textContent=title;$('#dialog-description').textContent=description;
  $('#dialog-checks').innerHTML=checks.map(check => `<label class="check"><input type="checkbox" data-confirm="${check.key}" required><span>${esc(check.label)}</span></label>`).join('');
  $('#confirm-dialog').disabled=true;
  localizeTree($('#action-dialog'));
  $('#action-dialog').showModal();
}
$('#dialog-checks').addEventListener('change',() => { $('#confirm-dialog').disabled=!Array.from(document.querySelectorAll('[data-confirm]')).every(input => input.checked); });
$('#action-form').addEventListener('submit',event => {
  event.preventDefault();
  if (!pendingAction || !Array.from(document.querySelectorAll('[data-confirm]')).every(input => input.checked)) return;
  const {path,data,message,focus,keys,cleanup}=pendingAction;
  const confirmations=Object.fromEntries(keys.map(key => [key,true]));
  const body=data.action ? {...data,action:{...data.action,...confirmations}} : {...data,...confirmations};
  mutate(path,body,message,focus,cleanup);
});
for(const id of ['cancel-dialog','back-dialog']) $(`#${id}`).onclick=() => $('#action-dialog').close();
for(const id of ['cancel-import','back-import']) $(`#${id}`).onclick=() => $('#import-dialog').close();
$('#open-reset').onclick=() => openAction('Reiniciar os oito casos fictícios','O progresso atual e os rascunhos não salvos serão substituídos pelo estado inicial. Exporte uma cópia antes de reiniciar, se quiser preservá-lo.',[{key:'confirmed',label:'Confirmo a substituição do progresso da demonstração.'}],{path:'/api/reset',data:{},message:'Os oito casos fictícios voltaram ao estado inicial.',focus:'filter',cleanup:() => edits.clear()});
$('#open-import').onclick=() => { $('#import-form').reset();$('#import-error').textContent='';localizeTree($('#import-dialog'));$('#import-dialog').showModal(); };
$('#import-form').addEventListener('submit',async event => {
  event.preventDefault();
  const file=$('#import-file').files[0];
  if (!file || !$('#import-confirm').checked || busy) return;
  if (file.size > 128*1024) { $('#import-error').textContent=ui('O arquivo excede o tamanho permitido para estes oito casos.');return; }
  try {
    const imported=JSON.parse(await file.text());
    await mutate('/api/import',{state:imported},'Progresso fictício importado e salvo neste computador.','filter',() => edits.clear());
  } catch { $('#import-error').textContent=ui('Não foi possível ler o JSON. Use um arquivo exportado nesta demonstração.'); }
});
$('#cases').addEventListener('click',event => {
  const button=event.target.closest('[data-case]');
  if (!button || busy) return;
  currentId=button.dataset.case;currentTab='summary';render();
  if (window.matchMedia('(max-width:760px)').matches) { $('#detail').focus({preventScroll:true});$('#detail').scrollIntoView({behavior:'instant',block:'start'}); }
  else document.querySelector(`[data-case="${currentId}"]`)?.focus({preventScroll:true});
});
$('#filter').addEventListener('change',event => { if (busy) return;filter=event.target.value;render(); });
$('#search').addEventListener('input',event => { if (busy) return;search=event.target.value;render(); });
window.addEventListener('beforeunload',event => { if (edits.size) { event.preventDefault();event.returnValue=''; } });
$('#language').value=getLanguage();
localizeTree(document.body);
$('#language').addEventListener('change',event => {
  if (busy) return;
  if ($('#case-panel')?.getAttribute('aria-busy') === 'true') { event.target.value=getLanguage();notify('Aguarde a consulta ou o salvamento antes de trocar o idioma.');return; }
  const detailScroll=$('#detail').scrollTop, queueScroll=$('#cases').scrollTop;
  const ownerSelection=$('#owner')?.value;
  setLanguage(event.target.value);
  if (state) render(); else localizeTree(document.body);
  if (ownerSelection !== undefined && $('#owner')) $('#owner').value=ownerSelection;
  $('#detail').scrollTop=detailScroll;$('#cases').scrollTop=queueScroll;$('#language').focus({preventScroll:true});
});
try {
  state=await request('/api/state');render();
} catch(error) {
  $('#queue-count').textContent=ui('Servidor local indisponível.');
  $('#detail').innerHTML='<div class="empty-state"><h2>Não foi possível abrir o progresso</h2><p>Confira se a demonstração local está aberta e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.</p><button type="button" id="retry">Tentar novamente</button></div>';
  localizeTree($('#detail'));
  $('#retry').onclick=() => location.reload();
  notify(error.message,true);
}
