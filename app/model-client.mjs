import { sourceReadingView } from './source-reading.mjs';
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

export async function mountModelPanel(container, { item, revision, request, notify, onStale, onCardSaved }) {
  const session = Symbol('model-session');
  sessions.set(container, session);
  const alive = () => container.isConnected && sessions.get(container) === session;
  const strings = copy[document.documentElement.lang.slice(0,2)] || copy.en;
  let status;
  try { status = await request('/api/model/status'); } catch { return; }
  if (!alive() || !status.enabled) return;
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
