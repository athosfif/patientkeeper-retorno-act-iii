import { sourceReadingView } from './source-reading.mjs';
import { readRecordedGemmaArchive, readRecordedGemmaStatistics, findRecordedGemmaRecord, evaluateRecordedGemmaCurrentRead } from './recorded-gemma.mjs';

const sessions=new WeakMap();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const copy={
  en:{title:'Recorded Gemma run',badge:'Replay · No live model',checking:'Checking the archived question and all current sources…',
    intro:'This panel replays one fixed administrative question from the fictional return queue. It cannot answer a new question.',
    total:'Recorded attempts',candidates:'Candidates',abstentions:'Abstention',timeouts:'Timeout',
    summary:'Four received outputs passed format and literal-reference checks. Administrative source support was audited; no formal semantic or clinical approval is claimed.',
    question:'Archived question · Original English',answer:'Recorded candidate · Original English',abstained:'Recorded abstention · Original English',review:'Compare every statement with its original excerpts before using it.',
    receipt:'Recorded execution and usage',requested:'Requested model',used:'Service used-model identifier',response:'Original response identifier',notRetained:'Not retained',
    identity:'Official usage linked the two model names. The first response identifier was not retained. This service attribution does not independently verify physical GPU hardware, model weights or a checkpoint revision.',
    duration:'Recorded duration',route:'Execution path',direct:'Direct contract test',product:'Local product API',usage:'Provider dashboard snapshot',tokens:'Total tokens · as displayed',cost:'Cost · as displayed',remaining:'Remaining · as displayed',observed:'Observed at',
    tokenLimit:'Per-attempt token usage was retained for four outputs only. The timeout has no recovered answer or per-attempt usage; dashboard totals are separate observations, not an inferred response.',
    timeoutRow:'03 · No answer retained',audit:'Five-attempt record',source:'Source observation',
    noAction:'Read-only replay: no new inference, review-card save, message, appointment or case change.',
    care:'These five calls belong to the return queue (SIM-RET), not the doctor episode (SIM-CARE). Local voice uses faster-whisper on CPU; the consultation note is a literal extract, not a Gemma-generated note.',
    reasons:{NO_RECORDED_RUN:'No fixed Gemma replay is selected for this case.',AMBIGUOUS_RECORD:'The archive cannot choose between multiple records.',INVALID_ARCHIVE:'The published archive could not be verified.',INVALID_RECORD:'The original recorded evidence could not be verified.',CONTEXT_CHANGED:'The question, sources or displayed revision changed. The earlier answer is withheld.',HUMAN_HANDOFF:'This case requires the responsible human team. No model answer is displayed.',RECORDED_TIMEOUT:'This attempt timed out. No answer was retained; a timeout is not an abstention.',INVALID_RECORDED_CANDIDATE:'The candidate failed its current literal-reference check.',LOAD_FAILED:'The recorded source check is unavailable. No live model request was made.'}},
  pt:{title:'Execução Gemma gravada',badge:'Replay · Sem modelo ao vivo',checking:'Conferindo a pergunta arquivada e todas as fontes atuais…',
    intro:'Este painel reproduz uma pergunta administrativa fixa da fila fictícia de retorno. Não responde a uma pergunta nova.',
    total:'Tentativas gravadas',candidates:'Candidatas',abstentions:'Abstenção',timeouts:'Timeout',
    summary:'Quatro saídas recebidas passaram pelo formato e pelas referências literais. Houve conferência do apoio nas fontes administrativas; não se declara aprovação semântica formal ou clínica.',
    question:'Pergunta arquivada · Original em inglês',answer:'Candidata gravada · Original em inglês',abstained:'Abstenção gravada · Original em inglês',review:'Confira cada afirmação nos trechos originais antes de usar a candidata.',
    receipt:'Execução e uso registrados',requested:'Modelo solicitado',used:'Identificador usado pelo serviço',response:'Identificador da resposta original',notRetained:'Não retido',
    identity:'O uso oficial vinculou os dois nomes do modelo. O identificador da primeira resposta não foi retido. A atribuição ao serviço não verifica de forma independente a GPU física, os pesos ou a revisão do modelo.',
    duration:'Duração registrada',route:'Caminho da execução',direct:'Teste direto do contrato',product:'API local do produto',usage:'Captura do painel do provedor',tokens:'Total de tokens · como exibido',cost:'Custo · como exibido',remaining:'Saldo · como exibido',observed:'Observado em',
    tokenLimit:'O uso de tokens por tentativa foi retido somente para quatro saídas. O timeout não tem resposta ou uso individual recuperados; os totais do painel são observações separadas, sem inferir uma resposta.',
    timeoutRow:'03 · Nenhuma resposta retida',audit:'Registro das cinco tentativas',source:'Observação da fonte',
    noAction:'Replay somente leitura: não faz inferência nova, salva cartão de revisão, envia mensagem ou altera agenda e caso.',
    care:'Estas cinco chamadas pertencem à fila de retorno (SIM-RET), não ao episódio do médico (SIM-CARE). A voz local usa faster-whisper em CPU; a nota de consulta é uma extração literal, não uma nota gerada por Gemma.',
    reasons:{NO_RECORDED_RUN:'Não há replay Gemma fixo selecionado para este caso.',AMBIGUOUS_RECORD:'O arquivo não pode escolher entre registros múltiplos.',INVALID_ARCHIVE:'Não foi possível verificar o arquivo publicado.',INVALID_RECORD:'Não foi possível verificar a evidência gravada original.',CONTEXT_CHANGED:'A pergunta, as fontes ou a versão exibida mudaram. A resposta anterior não é mostrada.',HUMAN_HANDOFF:'Este caso depende da equipe humana responsável. Nenhuma resposta do modelo é mostrada.',RECORDED_TIMEOUT:'Esta tentativa teve timeout. Não houve resposta retida; timeout não é abstenção.',INVALID_RECORDED_CANDIDATE:'A candidata falhou na conferência atual das referências literais.',LOAD_FAILED:'A conferência das fontes gravadas está indisponível. Nenhum pedido ao modelo ao vivo foi feito.'}},
  es:{title:'Ejecución Gemma grabada',badge:'Replay · Sin modelo en vivo',checking:'Comprobando la pregunta archivada y todas las fuentes actuales…',
    intro:'Este panel reproduce una pregunta administrativa fija de la cola ficticia de retorno. No responde a una pregunta nueva.',
    total:'Intentos grabados',candidates:'Candidatas',abstentions:'Abstención',timeouts:'Timeout',
    summary:'Cuatro salidas recibidas superaron el formato y las referencias literales. Se revisó el respaldo de las fuentes administrativas; no se afirma aprobación semántica formal ni clínica.',
    question:'Pregunta archivada · Original en inglés',answer:'Candidata grabada · Original en inglés',abstained:'Abstención grabada · Original en inglés',review:'Compruebe cada afirmación con sus fragmentos originales antes de utilizarla.',
    receipt:'Ejecución y uso registrados',requested:'Modelo solicitado',used:'Identificador utilizado por el servicio',response:'Identificador de la respuesta original',notRetained:'No conservado',
    identity:'El uso oficial vinculó los dos nombres del modelo. No se conservó el identificador de la primera respuesta. La atribución al servicio no verifica de forma independiente la GPU física, los pesos ni la revisión del modelo.',
    duration:'Duración registrada',route:'Ruta de ejecución',direct:'Prueba directa del contrato',product:'API local del producto',usage:'Captura del panel del proveedor',tokens:'Total de tokens · como se muestra',cost:'Costo · como se muestra',remaining:'Saldo · como se muestra',observed:'Observado en',
    tokenLimit:'Solo se conservó el uso de tokens por intento para cuatro salidas. El timeout no tiene respuesta ni uso individual recuperados; los totales del panel son observaciones separadas, sin inferir una respuesta.',
    timeoutRow:'03 · Ninguna respuesta conservada',audit:'Registro de cinco intentos',source:'Observación de la fuente',
    noAction:'Replay de solo lectura: no realiza inferencia nueva, guarda tarjetas, envía mensajes ni cambia agenda o caso.',
    care:'Estas cinco llamadas pertenecen a la cola de retorno (SIM-RET), no al episodio del médico (SIM-CARE). La voz local usa faster-whisper en CPU; la nota de consulta es una extracción literal, no una nota generada por Gemma.',
    reasons:{NO_RECORDED_RUN:'No hay replay Gemma fijo seleccionado para este caso.',AMBIGUOUS_RECORD:'El archivo no puede elegir entre varios registros.',INVALID_ARCHIVE:'No se pudo verificar el archivo publicado.',INVALID_RECORD:'No se pudo verificar la evidencia grabada original.',CONTEXT_CHANGED:'La pregunta, las fuentes o la versión mostrada cambiaron. La respuesta anterior no se muestra.',HUMAN_HANDOFF:'Este caso requiere al equipo humano responsable. No se muestra respuesta del modelo.',RECORDED_TIMEOUT:'Este intento tuvo timeout. No se conservó respuesta; timeout no es abstención.',INVALID_RECORDED_CANDIDATE:'La candidata no superó la comprobación actual de referencias literales.',LOAD_FAILED:'La comprobación de fuentes grabadas no está disponible. No se realizó ninguna petición al modelo en vivo.'}},
};

/** Mounting performs only archive/context/evidence reads. Language changes only paint. */
export function mountRecordedGemmaPanel(container,{item,revision,request,language='en',onStale}={}) {
  if(!container||typeof request!=='function')throw new TypeError('A container and read-only request function are required.');
  container.querySelectorAll('[data-recorded-gemma-panel]').forEach(panel=>panel.remove());
  const session=Symbol('recorded-gemma');sessions.set(container,session);
  const host=document.createElement('section');host.className='section recorded-gemma';host.dataset.recordedGemmaPanel='';container.append(host);
  let lang=Object.hasOwn(copy,language)?language:'en',generation=0,destroyed=false,archive=null,statistics=null,checked=null,pending=true,code=null;
  let selectedItem=item,displayedRevision=revision;
  const alive=()=>!destroyed&&container.isConnected&&host.isConnected&&sessions.get(container)===session;
  const strings=()=>copy[lang];
  function receiptHTML() {
    const s=strings(),proof=checked?.receipt;if(!proof)return '';
    return `<details class="rg-receipt"><summary>${s.receipt}</summary><dl><div><dt>${s.requested}</dt><dd data-original>${esc(proof.requestedModel)}</dd></div><div><dt>${s.used}</dt><dd data-original>${esc(proof.usedModel??s.notRetained)}</dd></div><div><dt>${s.response}</dt><dd data-original>${esc(proof.responseModel??s.notRetained)}</dd></div><div><dt>${s.duration}</dt><dd data-original>${proof.durationMs} ms</dd></div><div><dt>${s.route}</dt><dd>${proof.route==='local_product_API_shared_budget'?s.product:s.direct}</dd></div></dl><p class="caption">${s.identity}</p><p class="caption rg-hash" data-original>SHA-256 ${esc(proof.artifactSha256)}</p></details>`;
  }
  function statisticsHTML() {
    if(!statistics)return '';const s=strings(),usage=statistics.usage;
    const attempts=archive.records.map(record=>`<li><span data-original>${esc(record.id)} · ${esc(record.context.caseId)}</span><strong>${record.status==='timeout'?s.timeouts:record.status==='abstained'?s.abstentions:s.candidates}</strong><span data-original>${record.durationMs} ms</span></li>`).join('');
    return `<div class="rg-statistics" aria-label="${s.audit}">${[['total',statistics.totalAttempts],['candidates',statistics.affirmativeCandidates],['abstentions',statistics.abstentions],['timeouts',statistics.timeoutsWithoutAnswer]].map(([label,value])=>`<div><strong>${value}</strong><span>${s[label]}</span></div>`).join('')}</div><p class="caption">${s.summary}</p><details class="rg-receipt"><summary>${s.audit}</summary><p class="caption">${s.requested}: <span data-original>${esc(archive.service.requestedModel)}</span><br>${s.used}: <span data-original>${esc(archive.service.usedModel)}</span></p><p class="caption">${s.identity}</p><ol class="rg-attempts">${attempts}</ol></details><details class="rg-receipt"><summary>${s.usage}</summary><dl>${[['tokens',usage.totalTokensDisplayed],['cost',usage.costDisplayed],['remaining',usage.remainingDisplayed],['observed',usage.observedAt]].map(([label,value])=>`<div><dt>${s[label]}</dt><dd data-original>${esc(value)}</dd></div>`).join('')}</dl><p class="caption">${s.tokenLimit}</p><a href="${esc(usage.source)}" target="_blank" rel="noopener noreferrer">${s.source}</a></details>`;
  }
  function render() {
    if(!alive())return;const s=strings();
    const result=pending?`<p role="status" class="caption">${s.checking}</p>`:checked?.available
      ?`<p>${s.intro}</p><p class="rg-label">${s.question}</p><p class="rg-question" data-original lang="en">${esc(checked.question)}</p><h4>${checked.candidate.abstention?s.abstained:s.answer}</h4><p class="rg-answer" data-original lang="en">${esc(checked.candidate.abstention?checked.candidate.reason:checked.candidate.answer)}</p><p class="caption">${s.review}</p>${checked.candidate.citations.map(source=>`<article class="rg-excerpt"><strong data-original>${esc(source.sourceId)}</strong>${sourceReadingView(source,{language:lang,originalTag:'blockquote'})}</article>`).join('')}`
      :`<p class="rg-unavailable" role="status">${s.reasons[code]??s.reasons.LOAD_FAILED}</p>`;
    host.innerHTML=`<header class="rg-heading"><div><p class="rg-eyebrow">AMD Token Factory · 14 Oct 2026</p><h3>${s.title}</h3></div><span class="rg-badge">${s.badge}</span></header>${statisticsHTML()}<div data-recorded-gemma-result aria-live="polite">${result}${receiptHTML()}</div><p class="caption rg-limit">${s.noAction}</p><p class="caption rg-care-limit">${s.care}</p>`;
  }
  async function refresh(next={}) {
    if(Object.hasOwn(next,'item'))selectedItem=next.item;if(Object.hasOwn(next,'revision'))displayedRevision=next.revision;
    const token=++generation,currentItem=selectedItem,currentRevision=displayedRevision;
    pending=true;checked=null;code=null;render();
    try {
      if(!archive) {
        const raw=await request('/gemma-runs.json');if(!alive()||token!==generation)return;
        const verified=await readRecordedGemmaArchive(raw);if(!alive()||token!==generation)return;
        if(!verified.valid){code='INVALID_ARCHIVE';return;}
        archive=verified.archive;statistics=await readRecordedGemmaStatistics(archive);if(!alive()||token!==generation)return;
        if(!statistics){archive=null;code='INVALID_ARCHIVE';return;}
      }
      const found=findRecordedGemmaRecord(archive,currentItem?.id);
      if(!found.record){code=found.code;return;}
      const record=found.record,query={caseId:currentItem.id,question:record.context.question,expectedRevision:currentRevision};
      const [contextResponse,evidenceResponse]=await Promise.all([request('/api/ai/context',query),request('/api/evidence/query',query)]);
      if(!alive()||token!==generation)return;
      const evaluated=await evaluateRecordedGemmaCurrentRead(record,contextResponse,evidenceResponse,{caseId:currentItem.id,revision:currentRevision,
        humanHandoff:Boolean(currentItem.medicalHandoff)||currentItem.status==='divergencia_aguardando_revisao'});
      if(!alive()||token!==generation)return;
      checked=evaluated;code=evaluated.code;
    }catch(error){if(alive()&&token===generation){code=error?.status===409?'CONTEXT_CHANGED':'LOAD_FAILED';if(error?.status===409)await onStale?.();}}
    finally{if(alive()&&token===generation){pending=false;render();}}
  }
  render();const ready=refresh();
  return Object.freeze({ready,refresh,setLanguage(next){lang=Object.hasOwn(copy,next)?next:'en';render();},destroy(){destroyed=true;generation+=1;host.remove();}});
}
