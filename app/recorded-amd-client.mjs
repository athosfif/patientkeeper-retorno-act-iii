import { evaluateRecordedAMDRecord, findRecordedAMDRecord, readRecordedAMDStatistics } from './recorded-amd.mjs';

const sessions = new WeakMap();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const copy = {
  en: {
    title:'Recorded AMD execution', badge:'GPU off · No live inference',
    intro:'This earlier run answers only the fixed question below. We compare all its input records with the current case before displaying its candidate.',
    checking:'Checking the recorded run against the current sources…',
    question:'Question used in the recorded run · English', answer:'Recorded model candidate · Original output',
    source:'Literal source excerpt · Portuguese',
    review:'Check every statement against its cited records. Valid citation format does not establish that the answer is supported.',
    abstention:'The recorded model abstained',
    provenance:'Execution receipt', model:'Model', revision:'Pinned model revision', device:'AMD device', duration:'Recorded generation time', shutdown:'Confirmed GPU shutdown',
    pilot:'Pilot archive', baseline:'Baseline cases', accepted:'format checks accepted', semantic:'The meaning of these answers has not been approved by human review.',
    noAction:'Viewing this record generates no new answer, saves no review card and changes no case, contact or appointment.',
    reasons:{
      NO_RECORDED_RUN:'No recorded AMD run is available for this case. Use its current source records.',
      AMBIGUOUS_RECORD:'More than one run is listed for this case. A fixed run must be selected in the published archive before displaying a candidate.',
      INVALID_ARCHIVE:'The recorded-run archive could not be validated.',
      INVALID_RECORD:'The recorded run does not have the required format.',
      CONTEXT_CHANGED:'The current sources differ from the recorded input. The earlier candidate is not displayed for this changed case.',
      UNVERIFIED_PROVENANCE:'The archive does not contain the required AMD hardware, pinned model and confirmed shutdown evidence.',
      UNVERIFIED_EXECUTION:'The recorded GPU execution or its result could not be verified.',
      RECORDED_CANDIDATE_REJECTED:'This run did not produce an accepted candidate. Its failed output is not presented as an answer.',
      INVALID_RECORDED_CANDIDATE:'The recorded candidate failed a new format or literal-reference check.',
      HUMAN_HANDOFF:'This case requires the responsible human team. Only the execution receipt is shown; no recorded model answer is displayed.',
      LOAD_FAILED:'The recorded run is unavailable. No live model request was made.',
    },
  },
  pt: {
    title:'Execução AMD gravada', badge:'GPU desligada · Sem inferência ao vivo',
    intro:'Esta execução anterior responde somente à pergunta fixa abaixo. Conferimos todos os registros de entrada com o caso atual antes de mostrar a candidata.',
    checking:'Conferindo a execução gravada com as fontes atuais…',
    question:'Pergunta usada na execução gravada · Inglês', answer:'Candidata gravada do modelo · Saída original',
    source:'Trecho literal da fonte · Português',
    review:'Confira cada afirmação com seus registros citados. Formato de citação válido não comprova que a resposta esteja sustentada.',
    abstention:'O modelo gravado se absteve',
    provenance:'Recibo da execução', model:'Modelo', revision:'Revisão fixa do modelo', device:'Dispositivo AMD', duration:'Tempo de geração registrado', shutdown:'Desligamento confirmado da GPU',
    pilot:'Arquivo do piloto', baseline:'Casos baseline', accepted:'conferências de formato aceitas', semantic:'O significado destas respostas não foi aprovado em revisão humana.',
    noAction:'Abrir este registro não gera nova resposta, salva cartão de revisão ou altera caso, contato ou agenda.',
    reasons:{
      NO_RECORDED_RUN:'Não há execução AMD gravada disponível para este caso. Use seus registros atuais.',
      AMBIGUOUS_RECORD:'Há mais de uma execução para este caso. O arquivo publicado precisa selecionar uma execução fixa antes de mostrar a candidata.',
      INVALID_ARCHIVE:'Não foi possível validar o arquivo de execuções gravadas.',
      INVALID_RECORD:'A execução gravada não possui o formato necessário.',
      CONTEXT_CHANGED:'As fontes atuais diferem da entrada gravada. A candidata anterior não é mostrada para este caso alterado.',
      UNVERIFIED_PROVENANCE:'O arquivo não contém a evidência necessária de hardware AMD, modelo fixado e desligamento confirmado.',
      UNVERIFIED_EXECUTION:'Não foi possível verificar a execução gravada na GPU ou seu resultado.',
      RECORDED_CANDIDATE_REJECTED:'Esta execução não produziu uma candidata aceita. A saída que falhou não é apresentada como resposta.',
      INVALID_RECORDED_CANDIDATE:'A candidata gravada falhou na nova conferência de formato ou referência literal.',
      HUMAN_HANDOFF:'Este caso depende da equipe humana responsável. Mostramos apenas o recibo da execução, sem resposta gravada do modelo.',
      LOAD_FAILED:'A execução gravada está indisponível. Nenhum pedido a um modelo ao vivo foi feito.',
    },
  },
  es: {
    title:'Ejecución AMD grabada', badge:'GPU apagada · Sin inferencia en vivo',
    intro:'Esta ejecución anterior responde solo a la pregunta fija de abajo. Comparamos todos sus registros de entrada con el caso actual antes de mostrar la candidata.',
    checking:'Comprobando la ejecución grabada con las fuentes actuales…',
    question:'Pregunta utilizada en la ejecución grabada · Inglés', answer:'Candidata grabada del modelo · Salida original',
    source:'Fragmento literal de la fuente · Portugués',
    review:'Revise cada afirmación con sus registros citados. Un formato de cita válido no demuestra que la respuesta esté respaldada.',
    abstention:'El modelo grabado se abstuvo',
    provenance:'Recibo de ejecución', model:'Modelo', revision:'Revisión fija del modelo', device:'Dispositivo AMD', duration:'Tiempo de generación registrado', shutdown:'Apagado confirmado de la GPU',
    pilot:'Archivo del piloto', baseline:'Casos baseline', accepted:'comprobaciones de formato aceptadas', semantic:'El significado de estas respuestas no ha sido aprobado por revisión humana.',
    noAction:'Abrir este registro no genera otra respuesta, guarda una tarjeta de revisión ni modifica el caso, contacto o agenda.',
    reasons:{
      NO_RECORDED_RUN:'No hay una ejecución AMD grabada disponible para este caso. Consulte sus registros actuales.',
      AMBIGUOUS_RECORD:'Hay varias ejecuciones para este caso. El archivo publicado debe seleccionar una ejecución fija antes de mostrar la candidata.',
      INVALID_ARCHIVE:'No se pudo validar el archivo de ejecuciones grabadas.',
      INVALID_RECORD:'La ejecución grabada no tiene el formato requerido.',
      CONTEXT_CHANGED:'Las fuentes actuales difieren de la entrada grabada. La candidata anterior no se muestra para este caso modificado.',
      UNVERIFIED_PROVENANCE:'El archivo no contiene la evidencia requerida de hardware AMD, modelo fijado y apagado confirmado.',
      UNVERIFIED_EXECUTION:'No se pudo verificar la ejecución grabada en la GPU o su resultado.',
      RECORDED_CANDIDATE_REJECTED:'Esta ejecución no produjo una candidata aceptada. Su salida fallida no se presenta como respuesta.',
      INVALID_RECORDED_CANDIDATE:'La candidata grabada no superó la nueva comprobación de formato o cita literal.',
      HUMAN_HANDOFF:'Este caso requiere al equipo humano responsable. Solo se muestra el recibo de ejecución, sin respuesta grabada del modelo.',
      LOAD_FAILED:'La ejecución grabada no está disponible. No se realizó ninguna solicitud a un modelo en vivo.',
    },
  },
};

/** Read-only panel. The parent owns card creation through its existing review flow. */
export async function mountRecordedAMDPanel(container, { item, revision, request, notify, onStale, onCardSaved }) {
  const token = Symbol('recorded-amd-session');
  sessions.set(container, token);
  container.querySelectorAll('[data-recorded-amd-panel]').forEach(panel => panel.remove());
  const strings = copy[document.documentElement.lang.slice(0, 2)] || copy.en;
  const host = document.createElement('section');
  host.className = 'section model-reading recorded-amd-reading';
  host.dataset.recordedAmdPanel = '';
  const alive = () => container.isConnected && host.isConnected && sessions.get(container) === token;
  host.innerHTML = `<div class="section-title-row"><h3>${strings.title}</h3></div><p class="caption" data-recorded-amd-status>${strings.checking}</p><div data-recorded-amd-result aria-live="polite"></div>`;
  container.append(host);
  const status = host.querySelector('[data-recorded-amd-status]');
  const result = host.querySelector('[data-recorded-amd-result]');
  let statistics = null;
  const statisticsHTML = () => statistics ? `<p class="caption">${strings.pilot}: <strong>${statistics.formatValidAttempts}/${statistics.totalAttempts}</strong> ${strings.accepted} · ${strings.baseline}: <strong>${statistics.formatValidBaselineCases}/${statistics.baselineCases}</strong> ${strings.accepted}. ${strings.semantic}</p>` : '';
  const receiptHTML = checked => {
    if (!checked?.provenance || checked.gpuOff !== true) return '';
    const { provenance } = checked;
    const versions = ['torch', 'transformers', 'python'].filter(key => provenance[key])
      .map(key => `${key} ${provenance[key]}`).join(' · ');
    return `<details class="evidence-receipts"><summary>${strings.provenance}</summary><p class="caption" data-original>${esc(provenance.runId)}</p><p class="caption">${strings.model}: <span data-original>${esc(provenance.model)}</span><br>${strings.revision}: <span data-original>${esc(provenance.revision)}</span><br>${strings.device}: <span data-original>${esc(provenance.deviceName)}</span><br><span data-original>HIP ${esc(provenance.torchHip)} · ${esc(provenance.dtype)}${versions ? ` · ${esc(versions)}` : ''}</span><br>${strings.duration}: <span data-original>${esc(checked.latencySeconds)} s</span><br>${strings.shutdown}: <time data-original datetime="${esc(provenance.cloudShutdownAt)}">${esc(provenance.cloudShutdownAt)}</time></p></details>`;
  };
  const unavailable = (code, checked) => {
    if (checked?.gpuOff === true) status.innerHTML = `<span class="tag">${strings.badge}</span>`;
    else status.textContent = strings.title;
    result.innerHTML = `<p class="callout" data-recorded-amd-unavailable>${strings.reasons[code] || strings.reasons.INVALID_RECORD}</p>${statisticsHTML()}${receiptHTML(checked)}<p class="caption">${strings.noAction}</p>`;
  };
  try {
    const archive = await request('/amd-runs.json');
    if (!alive()) return;
    statistics = readRecordedAMDStatistics(archive);
    const found = findRecordedAMDRecord(archive, item.id);
    if (!found.record) { unavailable(found.code); return; }
    const record = found.record;
    const query = { caseId: item.id, question: record.context.question, expectedRevision: revision };
    // Both reads use the same immutable displayed revision. The evidence engine
    // decides whether the current question needs human review before any replay.
    const [response, report] = await Promise.all([
      request('/api/ai/context', query), request('/api/evidence/query', query),
    ]);
    if (!alive()) return;
    // The backend must enforce expectedRevision; a mismatched response also fails closed.
    if (response?.revision !== revision || report?.revision !== revision) { unavailable('CONTEXT_CHANGED'); return; }
    if (report.mode !== 'local_extracts' || report.caseId !== item.id || report.question !== record.context.question
      || !['sources_found', 'no_support', 'human_handoff'].includes(report.outcome)) {
      unavailable('LOAD_FAILED'); return;
    }
    const checked = evaluateRecordedAMDRecord(record, response.input, {
      humanHandoff: report.outcome === 'human_handoff' || !!item.medicalHandoff || item.status === 'divergencia_aguardando_revisao',
    });
    if (!checked.available) { unavailable(checked.code, checked); return; }
    status.innerHTML = `<span class="tag">${strings.badge}</span>`;
    const { candidate } = checked;
    result.innerHTML = `<p>${strings.intro}</p>${statisticsHTML()}<p class="caption">${strings.question}</p><p data-original lang="en">${esc(checked.question)}</p><h4>${candidate.abstention ? strings.abstention : strings.answer}</h4><p class="callout" data-original>${esc(candidate.abstention ? candidate.reason : candidate.answer)}</p><p class="caption">${strings.review}</p>${candidate.citations.map(source => `<article class="evidence-excerpt"><strong>${esc(source.sourceId)}</strong><p class="original-label">${strings.source}</p><blockquote data-original lang="pt-BR">${esc(source.trecho)}</blockquote></article>`).join('')}${receiptHTML(checked)}<p class="caption evidence-limit">${strings.noAction}</p>`;
  } catch (error) {
    if (!alive()) return;
    unavailable(error.status === 409 ? 'CONTEXT_CHANGED' : 'LOAD_FAILED');
    if (error.status === 409) await onStale?.();
  }
}
