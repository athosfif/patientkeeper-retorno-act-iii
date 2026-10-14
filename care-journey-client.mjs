import { CARE_OWNERS, CARE_MAX_AUDIO_BYTES, createCareJourneyState, validateCareJourneyState, transitionCareJourney, viewCareJourney, exportCareJourneySummary } from './care-journey.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const translations={
  en:{
    title:'Doctor workspace',eyebrow:'One synthetic episode',description:'The doctor reviews the sources and approves the administrative routine. The practice receives an organized record without reception staff operating the demonstration.',
    surgeryNote:'Fictional scenario label, not a surgical indication. No patient identity or medical instructions are included.',
    limit:'Synthetic data only. No WhatsApp messages are sent. Clinical care requires an authorized team protocol; this export is not a signed medical record.',
    journey:'Journey',consultation:'Consultation',contacts:'Contacts',loading:'Loading the isolated episode…',retry:'Try again',saved:'Synthetic episode saved.',memory:'Session memory only. Reloading discards this episode.',server:'Isolated local episode. Persistence does not establish secure clinic operation.',
    owner:'Responsible person',unassigned:'Choose a fictional owner',phase:'Phase',next:'Next administrative action',nextPlaceholder:'E.g. Check receipt of the team instructions',due:'Check by · Brasília (UTC−3)',dueHint:'A human schedules this administrative check. The system does not calculate clinical timing.',savePlan:'Save administrative plan',overdue:'Administrative check overdue',revision:'Revision',
    protocol:'Team instructions',clinicalPending:'Clinical protocol pending',clinicalHint:'No medication, fasting, weight-bearing, wound-care or postoperative interval is generated. Ask the responsible medical team for its authorized instructions.',
    administrative:'Administrative receipt example',version:'Source version',sourceId:'Source ID',sourceText:'Original administrative source · Portuguese',saveProtocol:'Save administrative source',protocolCheck:'I reviewed this administrative source in the simulation. This is not clinical approval.',reviewProtocol:'Record simulated source review',
    preference:'Contact preference',savePreference:'Save preference',whatsapp:'WhatsApp message draft',messageHint:'The sample only asks whether the team instructions were received. It provides no clinical care and sends nothing.',messageText:'Prepared text',prepare:'Save prepared message',messageCheck:'I reviewed this exact message and its current source in the simulation.',reviewMessage:'Record message review',simulateCheck:'I confirm a contact record that is entirely simulated, without sending a message.',simulate:'Record simulated contact',unsaved:'Unsaved edits. Save before review or contact.',
    messageExample:'Hello! This is a fictional administrative example. Did you receive the instructions from your care team? Any questions about your care should go to that team.',
    reply:'Received response · simulation',replyText:'Fictional response',replyLink:'Related simulated contact',unlinked:'No related contact record',replyCheck:'This response is entirely fictional. It is not a WhatsApp delivery or read receipt.',saveReply:'Record simulated response',noReplies:'No simulated response recorded.',noContacts:'No contact recorded in the simulation.',contactHistory:'Simulated contact records',responseHistory:'Simulated responses',notSent:'SIMULATION · NOT SENT',
    audio:'Local audio transcription',audioHint:'Choose a fictional WAV or MP3, up to 5 MB and 2 minutes. The local version processes audio on this computer. Review the transcript before preparing the draft.',audioFile:'Synthetic audio file',audioCheck:'This audio contains only fictional content and no patient or personal data.',transcribe:'Transcribe locally',unavailable:'Local transcription is not connected. You can explicitly insert a transcript below.',cancel:'Cancel transcription',working:'Transcribing locally…',cancelled:'Transcription cancelled. No new transcript was saved.',audioError:'The audio could not be transcribed. The previous transcript remains unchanged.',audioLimit:'Use a WAV or MP3 no larger than 5 MB.',
    manual:'Insert transcript text',manualHint:'Manual input is labeled as text entered manually, never as audio heard or automatically transcribed.',manualText:'Fictional transcript text',manualCheck:'I confirm this text is entirely fictional.',saveManual:'Save manual transcript',transcriptOriginal:'Original transcript · review required',noTranscript:'No transcript has been recorded.',segments:'Choose literal segments',extract:'Prepare extractive note',note:'Consultation note draft',noteHint:'This note copies only selected transcript excerpts with segment IDs. No diagnosis, prescription or model-generated summary is inferred.',noteCheck:'I reviewed these exact excerpts in the simulation. This is not a professional signature.',reviewNote:'Record simulated note review',modelPending:'Model-generated note has not been executed. The draft below is a literal extraction.',
    resolution:'Human administrative resolution',resolutionText:'Describe the fictional administrative resolution',resolutionCheck:'I checked the response or refusal and this administrative resolution in the simulation.',close:'Record human resolution',closed:'Resolved episode. History is preserved and edits are disabled.',history:'Episode history',noHistory:'No human action has been recorded.',export:'Export synthetic summary',exportHint:'Export contains synthetic text and provenance only. No audio file, patient identity, or signed record is exported.',
    failure:'Could not save. No local change was recorded.',stale:'The episode changed. Review the refreshed version before trying again.',blocked:'Contact requires a complete plan, recorded opt-in, a reviewed source and a reviewed message.',confirm:'Explicit confirmation is required.',planRequired:'Assign an owner, next administrative action and check time first.',reviewRequired:'Review the current text and source before continuing.',
    actions:{plan:'Administrative plan saved',preference:'Contact preference recorded',protocol_update:'Administrative source updated',protocol_review:'Source reviewed in simulation',message_prepare:'Message prepared',message_review:'Message reviewed in simulation',contact_simulate:'Contact recorded in simulation',response_record:'Response recorded in simulation',transcript_set:'Transcript source recorded',note_prepare:'Extractive draft prepared',note_review:'Draft reviewed in simulation',close:'Human administrative resolution recorded'},
  },
  pt:{
    title:'Central do médico',eyebrow:'Um episódio fictício',description:'O médico confere as fontes e aprova a rotina administrativa. O consultório recebe um registro organizado sem exigir que a secretaria opere a demonstração.',
    surgeryNote:'Rótulo de cenário fictício, não indicação cirúrgica. Não há identificação de paciente nem instruções médicas.',
    limit:'Somente dados fictícios. Nenhuma mensagem WhatsApp é enviada. Cuidados clínicos dependem do protocolo autorizado da equipe; este arquivo não é prontuário assinado.',
    journey:'Jornada',consultation:'Consulta',contacts:'Contatos',loading:'Abrindo o episódio isolado…',retry:'Tentar novamente',saved:'Episódio fictício salvo.',memory:'Somente memória desta sessão. Recarregar descarta este episódio.',server:'Episódio local isolado. A persistência não comprova segurança para operação em consultório.',
    owner:'Pessoa responsável',unassigned:'Escolha um responsável fictício',phase:'Fase',next:'Próxima ação administrativa',nextPlaceholder:'Ex.: Conferir recebimento das orientações da equipe',due:'Conferir até · Brasília (UTC−3)',dueHint:'Uma pessoa agenda esta conferência administrativa. O sistema não calcula prazo clínico.',savePlan:'Salvar plano administrativo',overdue:'Conferência administrativa atrasada',revision:'Versão',
    protocol:'Orientações da equipe',clinicalPending:'Protocolo clínico pendente',clinicalHint:'Não são gerados medicamentos, jejum, carga, cuidados de ferida ou intervalo pós-operatório. Consulte as orientações autorizadas da equipe médica responsável.',
    administrative:'Exemplo administrativo de recebimento',version:'Versão da fonte',sourceId:'ID da fonte',sourceText:'Fonte administrativa original · Português',saveProtocol:'Salvar fonte administrativa',protocolCheck:'Revisei esta fonte administrativa na simulação. Isso não é aprovação clínica.',reviewProtocol:'Registrar revisão simulada da fonte',
    preference:'Preferência de contato',savePreference:'Salvar preferência',whatsapp:'Rascunho de mensagem WhatsApp',messageHint:'O exemplo apenas pergunta se as orientações da equipe foram recebidas. Não fornece cuidados clínicos nem envia mensagem.',messageText:'Texto preparado',prepare:'Salvar mensagem preparada',messageCheck:'Revisei esta mensagem exata e sua fonte atual na simulação.',reviewMessage:'Registrar revisão da mensagem',simulateCheck:'Confirmo um registro de contato inteiramente simulado, sem enviar mensagem.',simulate:'Registrar contato simulado',unsaved:'Alterações não salvas. Salve antes de revisar ou registrar contato.',
    messageExample:'Olá! Este é um exemplo administrativo fictício. Você recebeu as orientações da sua equipe? Dúvidas sobre seus cuidados devem ser encaminhadas à própria equipe.',
    reply:'Resposta recebida · simulação',replyText:'Resposta fictícia',replyLink:'Contato simulado relacionado',unlinked:'Sem registro de contato relacionado',replyCheck:'Esta resposta é inteiramente fictícia. Não é recibo de entrega ou leitura do WhatsApp.',saveReply:'Registrar resposta simulada',noReplies:'Nenhuma resposta simulada registrada.',noContacts:'Nenhum contato registrado na simulação.',contactHistory:'Registros de contato simulado',responseHistory:'Respostas simuladas',notSent:'SIMULAÇÃO · NÃO ENVIADO',
    audio:'Transcrição local de áudio',audioHint:'Escolha um WAV ou MP3 fictício, até 5 MB e 2 minutos. A versão local processa o áudio neste computador. Confira a transcrição antes de preparar o rascunho.',audioFile:'Áudio fictício',audioCheck:'Este áudio contém apenas conteúdo fictício, sem dados pessoais ou de pacientes.',transcribe:'Transcrever localmente',unavailable:'Transcrição local não conectada. Você pode inserir uma transcrição explicitamente abaixo.',cancel:'Cancelar transcrição',working:'Transcrevendo localmente…',cancelled:'Transcrição cancelada. Nenhuma transcrição nova foi salva.',audioError:'Não foi possível transcrever o áudio. A transcrição anterior permanece intacta.',audioLimit:'Use WAV ou MP3 com até 5 MB.',
    manual:'Inserir texto da transcrição',manualHint:'A entrada manual é identificada como texto inserido manualmente; nunca como áudio ouvido ou transcrito automaticamente.',manualText:'Texto fictício da transcrição',manualCheck:'Confirmo que este texto é inteiramente fictício.',saveManual:'Salvar transcrição manual',transcriptOriginal:'Transcrição original · revisão necessária',noTranscript:'Nenhuma transcrição foi registrada.',segments:'Escolha os segmentos literais',extract:'Preparar nota extrativa',note:'Rascunho de nota da consulta',noteHint:'Esta nota copia apenas os trechos selecionados da transcrição com IDs de segmento. Não infere diagnóstico, prescrição ou resumo gerado por modelo.',noteCheck:'Revisei estes trechos exatos na simulação. Isso não é assinatura profissional.',reviewNote:'Registrar revisão simulada da nota',modelPending:'Geração de nota por modelo ainda não executada. O rascunho abaixo é uma extração literal.',
    resolution:'Resolução administrativa humana',resolutionText:'Descreva a resolução administrativa fictícia',resolutionCheck:'Conferi a resposta ou recusa e esta resolução administrativa na simulação.',close:'Registrar resolução humana',closed:'Episódio resolvido. O histórico permanece disponível e as alterações estão desativadas.',history:'Histórico do episódio',noHistory:'Nenhuma ação humana foi registrada.',export:'Exportar resumo fictício',exportHint:'O arquivo contém apenas texto fictício e proveniência. Não exporta áudio, identificação de paciente ou prontuário assinado.',
    failure:'Não foi possível salvar. Nenhuma alteração local foi registrada.',stale:'O episódio mudou. Confira a versão atualizada antes de tentar novamente.',blocked:'O contato exige plano completo, opt-in registrado, fonte revisada e mensagem revisada.',confirm:'É necessária confirmação explícita.',planRequired:'Atribua responsável, próxima ação administrativa e horário de conferência primeiro.',reviewRequired:'Confira o texto e a fonte atuais antes de continuar.',
    actions:{plan:'Plano administrativo salvo',preference:'Preferência de contato registrada',protocol_update:'Fonte administrativa atualizada',protocol_review:'Fonte revisada na simulação',message_prepare:'Mensagem preparada',message_review:'Mensagem revisada na simulação',contact_simulate:'Contato registrado na simulação',response_record:'Resposta registrada na simulação',transcript_set:'Fonte da transcrição registrada',note_prepare:'Rascunho extrativo preparado',note_review:'Nota revisada na simulação',close:'Resolução administrativa humana registrada'},
  },
  es:{
    title:'Espacio del médico',eyebrow:'Un episodio ficticio',description:'El médico revisa las fuentes y aprueba la rutina administrativa. El consultorio recibe un registro organizado sin exigir que recepción opere la demostración.',
    surgeryNote:'Etiqueta de un escenario ficticio, no una indicación quirúrgica. No contiene identidad del paciente ni instrucciones médicas.',
    limit:'Solo datos ficticios. No se envían mensajes de WhatsApp. Los cuidados clínicos requieren un protocolo autorizado del equipo; este archivo no es una historia clínica firmada.',
    journey:'Recorrido',consultation:'Consulta',contacts:'Contactos',loading:'Abriendo el episodio aislado…',retry:'Intentar de nuevo',saved:'Episodio ficticio guardado.',memory:'Solo memoria de esta sesión. Recargar elimina este episodio.',server:'Episodio local aislado. La persistencia no demuestra seguridad para la operación de un consultorio.',
    owner:'Persona responsable',unassigned:'Elija un responsable ficticio',phase:'Fase',next:'Próxima acción administrativa',nextPlaceholder:'Ej.: Comprobar recepción de instrucciones del equipo',due:'Revisar antes de · Brasilia (UTC−3)',dueHint:'Una persona programa esta revisión administrativa. El sistema no calcula plazos clínicos.',savePlan:'Guardar plan administrativo',overdue:'Revisión administrativa atrasada',revision:'Versión',
    protocol:'Instrucciones del equipo',clinicalPending:'Protocolo clínico pendiente',clinicalHint:'No se generan medicamentos, ayuno, carga, cuidados de heridas ni intervalos posoperatorios. Consulte las instrucciones autorizadas del equipo médico responsable.',
    administrative:'Ejemplo administrativo de recepción',version:'Versión de la fuente',sourceId:'ID de la fuente',sourceText:'Fuente administrativa original · Portugués',saveProtocol:'Guardar fuente administrativa',protocolCheck:'Revisé esta fuente administrativa en la simulación. Esto no es aprobación clínica.',reviewProtocol:'Registrar revisión simulada de la fuente',
    preference:'Preferencia de contacto',savePreference:'Guardar preferencia',whatsapp:'Borrador de mensaje WhatsApp',messageHint:'El ejemplo solo pregunta si se recibieron las instrucciones del equipo. No proporciona cuidados clínicos ni envía mensajes.',messageText:'Texto preparado',prepare:'Guardar mensaje preparado',messageCheck:'Revisé este mensaje exacto y su fuente actual en la simulación.',reviewMessage:'Registrar revisión del mensaje',simulateCheck:'Confirmo un registro de contacto totalmente simulado, sin enviar mensajes.',simulate:'Registrar contacto simulado',unsaved:'Cambios sin guardar. Guarde antes de revisar o registrar contacto.',
    messageExample:'¡Hola! Este es un ejemplo administrativo ficticio. ¿Recibió las instrucciones de su equipo? Las preguntas sobre sus cuidados deben dirigirse al propio equipo.',
    reply:'Respuesta recibida · simulación',replyText:'Respuesta ficticia',replyLink:'Contacto simulado relacionado',unlinked:'Sin registro de contacto relacionado',replyCheck:'Esta respuesta es totalmente ficticia. No es un recibo de entrega o lectura de WhatsApp.',saveReply:'Registrar respuesta simulada',noReplies:'No hay respuestas simuladas registradas.',noContacts:'No hay contactos registrados en la simulación.',contactHistory:'Registros de contacto simulado',responseHistory:'Respuestas simuladas',notSent:'SIMULACIÓN · NO ENVIADO',
    audio:'Transcripción local de audio',audioHint:'Elija un WAV o MP3 ficticio, hasta 5 MB y 2 minutos. La versión local procesa el audio en este equipo. Revise la transcripción antes de preparar el borrador.',audioFile:'Audio ficticio',audioCheck:'Este audio solo contiene contenido ficticio, sin datos personales ni de pacientes.',transcribe:'Transcribir localmente',unavailable:'La transcripción local no está conectada. Puede introducir explícitamente una transcripción abajo.',cancel:'Cancelar transcripción',working:'Transcribiendo localmente…',cancelled:'Transcripción cancelada. No se guardó una transcripción nueva.',audioError:'No se pudo transcribir el audio. La transcripción anterior permanece intacta.',audioLimit:'Use WAV o MP3 de hasta 5 MB.',
    manual:'Introducir texto de transcripción',manualHint:'La entrada manual se identifica como texto introducido manualmente; nunca como audio escuchado o transcrito automáticamente.',manualText:'Texto ficticio de la transcripción',manualCheck:'Confirmo que este texto es totalmente ficticio.',saveManual:'Guardar transcripción manual',transcriptOriginal:'Transcripción original · necesita revisión',noTranscript:'No hay transcripción registrada.',segments:'Elija los segmentos literales',extract:'Preparar nota extractiva',note:'Borrador de nota de consulta',noteHint:'Esta nota copia solo los fragmentos seleccionados de la transcripción con IDs de segmento. No infiere diagnóstico, prescripción ni resumen generado por modelo.',noteCheck:'Revisé estos fragmentos exactos en la simulación. Esto no es una firma profesional.',reviewNote:'Registrar revisión simulada de la nota',modelPending:'La generación de nota por modelo aún no se ha ejecutado. El borrador abajo es una extracción literal.',
    resolution:'Resolución administrativa humana',resolutionText:'Describa la resolución administrativa ficticia',resolutionCheck:'Revisé la respuesta o negativa y esta resolución administrativa en la simulación.',close:'Registrar resolución humana',closed:'Episodio resuelto. El historial se conserva y la edición está desactivada.',history:'Historial del episodio',noHistory:'No hay acciones humanas registradas.',export:'Exportar resumen ficticio',exportHint:'El archivo solo contiene texto ficticio y procedencia. No exporta audio, identidad del paciente ni historia clínica firmada.',
    failure:'No se pudo guardar. No se registraron cambios locales.',stale:'El episodio cambió. Revise la versión actualizada antes de intentar de nuevo.',blocked:'El contacto requiere plan completo, opt-in registrado, fuente revisada y mensaje revisado.',confirm:'Se necesita confirmación explícita.',planRequired:'Asigne responsable, próxima acción administrativa y horario de revisión primero.',reviewRequired:'Revise el texto y la fuente actuales antes de continuar.',
    actions:{plan:'Plan administrativo guardado',preference:'Preferencia de contacto registrada',protocol_update:'Fuente administrativa actualizada',protocol_review:'Fuente revisada en la simulación',message_prepare:'Mensaje preparado',message_review:'Mensaje revisado en la simulación',contact_simulate:'Contacto registrado en la simulación',response_record:'Respuesta registrada en la simulación',transcript_set:'Fuente de la transcripción registrada',note_prepare:'Borrador extractivo preparado',note_review:'Nota revisada en la simulación',close:'Resolución administrativa humana registrada'},
  },
};
translations.en.audioLanguage='Audio language';
translations.pt.audioLanguage='Idioma do áudio';
translations.es.audioLanguage='Idioma del audio';
translations.en.selectedAudio='Selected audio';
translations.pt.selectedAudio='Áudio selecionado';
translations.es.selectedAudio='Audio seleccionado';
translations.en.owner='Responsible doctor';
translations.pt.owner='Médico responsável';
translations.es.owner='Médico responsable';
translations.en.simulate='Run approved routine · simulation';
translations.pt.simulate='Executar rotina aprovada · simulação';
translations.es.simulate='Ejecutar rutina aprobada · simulación';
translations.en.protocolCheck='As the fictional doctor, I reviewed this administrative source. This is not clinical approval.';
translations.pt.protocolCheck='Como médico fictício, conferi esta fonte administrativa. Isso não é aprovação clínica.';
translations.es.protocolCheck='Como médico ficticio, revisé esta fuente administrativa. Esto no es aprobación clínica.';
const checkedLanguage=value=>Object.hasOwn(translations,value)?value:'en';
const key=()=>`CJ-${(globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(16).slice(2)}`).toUpperCase()}`;
const localDue=value=>value?new Date(Date.parse(value)-3*60*60*1000).toISOString().slice(0,16):'';
const toDue=value=>{ if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('CARE_INVALID_DUE'); return new Date(`${value}:00-03:00`).toISOString(); };

/** Mounts an isolated synthetic workflow. No storage, media permission or model call is implicit. */
export function mountCareJourney(container,{language='en',notify=()=>{},request,transcribeAudio,persistence}={}) {
  if (!container || typeof container.addEventListener !== 'function') throw new TypeError('A container is required.');
  let lang=checkedLanguage(language),tab='journey',state=null,working=false,destroyed=false,generation=0,transcriber=transcribeAudio;
  let transcription=null,audioStatus='',audioError=false,audioInput=null,audioConfirmedFile=null;
  const drafts=new Map();
  const $=selector=>container.querySelector(selector);
  const t=()=>translations[lang];
  const alive=()=>!destroyed && container.isConnected;
  const value=(id,fallback='')=>drafts.has(id)?drafts.get(id):fallback;
  const checkbox=(id,label)=>`<label class="cj-check"><input type="checkbox" id="${id}"><span>${esc(label)}</span></label>`;
  const field=(id,label,content,extra='')=>`<div class="cj-field"><label for="${id}">${esc(label)}</label><input id="${id}" value="${esc(value(id,content))}" ${extra}></div>`;
  const textarea=(id,label,content,max)=>`<div class="cj-field"><label for="${id}">${esc(label)}</label><textarea id="${id}" maxlength="${max}">${esc(value(id,content))}</textarea></div>`;
  const choices=(id,label,items,current)=>{
    const selected=value(id,current),selectedIndex=items.findIndex(item=>item.value===selected);
    return `<fieldset class="cj-choice-field"><legend id="${id}-label">${esc(label)}</legend><input type="hidden" id="${id}" value="${esc(selected)}"><div class="cj-choices" role="radiogroup" aria-labelledby="${id}-label" data-cj-choice-group="${id}">${items.map((item,index)=>`<button type="button" id="${id}-choice-${esc(item.value)}" role="radio" aria-checked="${item.value===selected}" tabindex="${index===(selectedIndex<0?0:selectedIndex)?0:-1}" data-cj-choice="${esc(item.value)}"><span class="cj-choice-mark" aria-hidden="true">✓</span><span>${esc(item.label)}</span></button>`).join('')}</div></fieldset>`;
  };
  const stamp=at=>new Intl.DateTimeFormat(lang==='pt'?'pt-BR':lang==='es'?'es':'en',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(at));
  const dirty=(ids,original)=>ids.some((id,index)=>value(id,original[index])!==original[index]);
  const messageDirty=()=>state && value('cj-message',state.message.text||t().messageExample)!==(state.message.text||t().messageExample);
  const protocolDirty=()=>state && dirty(['cj-source-version','cj-source-id','cj-source-text'],[state.protocol.version,state.protocol.sourceId,state.protocol.sourceText]);
  const planDirty=()=>state && dirty(['cj-phase','cj-owner','cj-next','cj-due'],[state.phase,state.owner??'',state.nextAction,localDue(state.dueAt)]);
  const selectedAudio=()=>audioInput?.files?.[0]??null;
  function updateAudioName() {
    const label=$('#cj-audio-selected'),file=selectedAudio();
    if(!label)return;
    label.hidden=!file;label.textContent=file?`${t().selectedAudio}: ${file.name}`:'';
  }
  function clearAudioSource() {
    if(audioInput)audioInput.value='';audioConfirmedFile=null;
    if($('#cj-audio-confirm'))$('#cj-audio-confirm').checked=false;
    updateAudioName();
  }
  function audioChanged() {
    // New selection never inherits the previous file's declaration or async result.
    transcription?.controller.abort();transcription=null;generation+=1;
    audioConfirmedFile=null;audioStatus='';audioError=false;
    if($('#cj-audio-confirm'))$('#cj-audio-confirm').checked=false;
    if($('#cj-audio-status'))$('#cj-audio-status').textContent='';
    if($('#cj-cancel-audio'))$('#cj-cancel-audio').hidden=true;
    updateAudioName();updateDisabled();
  }
  const say=(message,error=false)=>{ if(alive()) notify(message,error); };
  const readableError=error=>{
    const code=error?.code??'';
    if(code==='CARE_STALE_CONTEXT') return t().stale;
    if(code==='CARE_PLAN_REQUIRED'||code==='CARE_INVALID_DUE') return t().planRequired;
    if(code==='CARE_CONTACT_BLOCKED'||code==='CARE_REPLY_PENDING'||code==='CARE_DUPLICATE_CONTACT') return t().blocked;
    if(code.includes('REVIEW')||code==='CARE_PROTOCOL_REVIEW_REQUIRED') return t().reviewRequired;
    if(code==='CARE_HUMAN_CONFIRMATION_REQUIRED') return t().confirm;
    return t().failure;
  };
  const protocolHTML=v=>`<article class="cj-card"><div class="cj-card-head"><h3>${esc(t().protocol)}</h3><span class="cj-tag cj-warning">${esc(t().clinicalPending)}</span></div><p class="cj-callout">${esc(t().clinicalHint)}</p><h4>${esc(t().administrative)}</h4><span class="cj-tag">${esc(v.protocolReviewed?v.labels.reviewed:v.labels.pending)}</span><form id="cj-protocol-form"><div class="cj-fields">${field('cj-source-version',t().version,state.protocol.version,'maxlength="80"')}${field('cj-source-id',t().sourceId,state.protocol.sourceId,'maxlength="80"')}</div>${textarea('cj-source-text',t().sourceText,state.protocol.sourceText,4000)}<button type="submit">${esc(t().saveProtocol)}</button></form>${checkbox('cj-protocol-confirm',t().protocolCheck)}<button type="button" id="cj-protocol-review">${esc(t().reviewProtocol)}</button></article>`;
  const planHTML=v=>`<article class="cj-card"><h3>${esc(t().journey)}</h3><form id="cj-plan-form"><div class="cj-fields">${choices('cj-phase',t().phase,['preoperative','postoperative'].map(item=>({value:item,label:v.labels[item]})),state.phase)}${choices('cj-owner',t().owner,CARE_OWNERS.map(owner=>({value:owner,label:owner})),state.owner??'')}</div>${field('cj-next',t().next,state.nextAction,`maxlength="500" placeholder="${esc(t().nextPlaceholder)}"`)}${field('cj-due',t().due,localDue(state.dueAt),'type="datetime-local"')}<p class="cj-caption">${esc(t().dueHint)}</p><button type="submit" class="cj-primary">${esc(t().savePlan)}</button></form></article>`;
  const contactsHTML=v=>`<div class="cj-grid"><article class="cj-card"><h3>${esc(t().whatsapp)}</h3><p>${esc(t().messageHint)}</p><form id="cj-preference-form">${choices('cj-preference',t().preference,['not_recorded','opt_in','refused'].map(item=>({value:item,label:v.labels[item]})),state.contactPreference)}<button type="submit">${esc(t().savePreference)}</button></form><span class="cj-tag ${state.contactPreference==='refused'?'cj-warning':''}">${esc(v.preferenceLabel)}</span><form id="cj-message-form">${textarea('cj-message',t().messageText,state.message.text||t().messageExample,2000)}<span class="cj-caption" id="cj-message-status">${esc(v.messageStatus)}</span><button id="cj-prepare-message" type="submit">${esc(t().prepare)}</button></form>${checkbox('cj-message-confirm',t().messageCheck)}<button id="cj-message-review" type="button">${esc(t().reviewMessage)}</button>${checkbox('cj-contact-confirm',t().simulateCheck)}<button id="cj-contact-simulate" type="button" class="cj-primary">${esc(t().simulate)}</button><p class="cj-caption">${esc(t().notSent)}</p></article><article class="cj-card"><h3>${esc(t().reply)}</h3><form id="cj-reply-form">${textarea('cj-reply',t().replyText,'',2000)}<label for="cj-reply-contact">${esc(t().replyLink)}</label><select id="cj-reply-contact"><option value="">${esc(t().unlinked)}</option>${state.contacts.map(contact=>`<option value="${contact.id}" ${value('cj-reply-contact',state.contacts.at(-1)?.id??'')===contact.id?'selected':''}>${contact.id} · ${esc(stamp(contact.at))}</option>`).join('')}</select>${checkbox('cj-reply-confirm',t().replyCheck)}<button type="submit" id="cj-save-reply">${esc(t().saveReply)}</button></form><h4>${esc(t().responseHistory)}</h4>${state.responses.length?state.responses.toReversed().map(reply=>`<article class="cj-entry"><span class="cj-tag">${reply.id}</span><p>${esc(reply.text)}</p><time datetime="${reply.at}">${esc(stamp(reply.at))}</time></article>`).join(''):`<p class="cj-caption">${esc(t().noReplies)}</p>`}</article></div><article class="cj-card"><h3>${esc(t().contactHistory)}</h3>${state.contacts.length?state.contacts.toReversed().map(contact=>`<article class="cj-entry"><span class="cj-tag">${esc(t().notSent)}</span><strong>${contact.id}</strong><p>${esc(contact.messageText)}</p><small>${esc(contact.protocolVersion)} · ${esc(stamp(contact.at))}</small></article>`).join(''):`<p>${esc(t().noContacts)}</p>`}</article>`;
  const consultationHTML=v=>`<div class="cj-grid"><article class="cj-card"><h3>${esc(t().audio)}</h3><p>${esc(t().audioHint)}</p><form id="cj-audio-form"><label for="cj-audio">${esc(t().audioFile)}</label><input type="file" id="cj-audio" accept=".wav,.mp3,audio/wav,audio/mpeg">${checkbox('cj-audio-confirm',t().audioCheck)}<div class="cj-actions"><button type="submit" id="cj-transcribe" class="cj-primary">${esc(t().transcribe)}</button><button type="button" id="cj-cancel-audio" ${transcription?'':'hidden'}>${esc(t().cancel)}</button></div></form>${typeof transcriber==='function'?'':`<p class="cj-callout">${esc(t().unavailable)}</p>`}<p id="cj-audio-status" class="cj-caption ${audioError?'cj-error':''}" role="status">${esc(audioStatus)}</p><details><summary>${esc(t().manual)}</summary><p>${esc(t().manualHint)}</p><form id="cj-manual-form">${textarea('cj-transcript-text',t().manualText,'',12000)}${checkbox('cj-manual-confirm',t().manualCheck)}<button type="submit" id="cj-save-manual">${esc(t().saveManual)}</button></form></details></article><article class="cj-card"><h3>${esc(t().transcriptOriginal)}</h3><span class="cj-tag">${esc(v.transcriptLabel)}</span>${state.transcript.provenance?`<p class="cj-caption">${esc(state.transcript.provenance.engine??'')} ${esc(state.transcript.provenance.modelId??'')} ${esc(state.transcript.provenance.modelRevision??'')}</p><h4>${esc(t().segments)}</h4><form id="cj-note-form">${state.transcript.segments.map(segment=>`<label class="cj-segment"><input type="checkbox" name="cj-segment" value="${segment.id}"><span><strong>${segment.id}${segment.start===null?'':` · ${segment.start.toFixed(1)}–${segment.end.toFixed(1)}s`}</strong><span>${esc(segment.text)}</span></span></label>`).join('')}<button type="submit" id="cj-extract">${esc(t().extract)}</button></form>`:`<p>${esc(t().noTranscript)}</p>`}</article></div><article class="cj-card"><div class="cj-card-head"><h3>${esc(t().note)}</h3><span class="cj-tag">${esc(v.noteStatus)}</span></div><p>${esc(t().noteHint)}</p><p class="cj-callout">${esc(t().modelPending)}</p>${state.note.text?`<pre class="cj-literal">${esc(state.note.text)}</pre>${checkbox('cj-note-confirm',t().noteCheck)}<button type="button" id="cj-note-review">${esc(t().reviewNote)}</button>`:''}</article>`;
  const resolutionHTML=v=>`<article class="cj-card cj-resolution"><h3>${esc(t().resolution)}</h3>${state.resolution?`<p class="cj-callout">${esc(t().closed)}</p><p>${esc(state.resolution.text)}</p><time datetime="${state.resolution.at}">${esc(stamp(state.resolution.at))}</time>`:`<form id="cj-close-form">${textarea('cj-resolution',t().resolutionText,'',1000)}${checkbox('cj-close-confirm',t().resolutionCheck)}<button type="submit" id="cj-close" class="cj-primary">${esc(t().close)}</button></form>`}</article>`;
  function render(focus) {
    if(!alive()) return;
    container.classList.add('care-journey');
    if(!state) { container.innerHTML=`<p role="status">${esc(t().loading)}</p>`;return; }
    const v=viewCareJourney(state,{language:lang});
    container.innerHTML=`<header class="cj-heading"><div><p class="cj-eyebrow">${esc(t().eyebrow)} · ${state.episodeId}</p><h2>${esc(t().title)}</h2><p>${esc(t().description)}</p></div><span class="cj-tag">${esc(v.statusLabel)}</span></header><div class="cj-scenario"><strong>${esc(v.surgeryLabel)}</strong><p>${esc(t().surgeryNote)}</p></div><div class="cj-summary"><div><span>${esc(t().phase)}</span><strong>${esc(v.phaseLabel)}</strong></div><div><span>${esc(t().owner)}</span><strong>${esc(state.owner??t().unassigned)}</strong></div><div><span>${esc(t().next)}</span><strong>${esc(state.nextAction||'—')}</strong></div><div><span>${esc(t().due)}</span><strong>${esc(state.dueAt?stamp(state.dueAt):v.labels.noDue)}</strong>${v.administrativeOverdue?`<small class="cj-error">${esc(t().overdue)}</small>`:''}</div></div><nav class="cj-tabs" role="tablist" aria-label="${esc(t().title)}">${['journey','consultation','contacts'].map(item=>`<button type="button" id="cj-tab-${item}" data-cj-tab="${item}" role="tab" aria-selected="${tab===item}" aria-controls="cj-panel" tabindex="${tab===item?0:-1}">${esc(t()[item])}</button>`).join('')}</nav><div id="cj-panel" role="tabpanel" aria-labelledby="cj-tab-${tab}">${tab==='journey'?`<div class="cj-grid">${planHTML(v)}${protocolHTML(v)}</div>`:tab==='contacts'?contactsHTML(v):consultationHTML(v)}${resolutionHTML(v)}</div><details class="cj-history"><summary>${esc(t().history)} · ${state.history.length}</summary>${state.history.length?`<ol>${state.history.toReversed().map(event=>`<li><strong>${esc(t().actions[event.type])}</strong><time datetime="${event.at}">${esc(stamp(event.at))}</time><span>${esc(t().revision)} ${event.revision}</span></li>`).join('')}</ol>`:`<p>${esc(t().noHistory)}</p>`}</details><footer class="cj-footer"><button type="button" id="cj-export">${esc(t().export)}</button><p>${esc(t().exportHint)}</p><p class="cj-caption">${esc(t().limit)}</p><p class="cj-caption">${esc(typeof request==='function'||persistence?t().server:t().memory)} · ${esc(t().revision)} ${state.revision}</p></footer>`;
    const newAudioInput=$('#cj-audio');
    if(newAudioInput) {
      // Reattach the actual file input; recreating only its name loses the selected File.
      if(audioInput) newAudioInput.replaceWith(audioInput);
      else {audioInput=newAudioInput;audioInput.addEventListener('change',audioChanged);}
      audioInput.setAttribute('aria-describedby','cj-audio-selected');
      audioInput.insertAdjacentHTML('afterend',`<p id="cj-audio-selected" class="cj-caption" role="status" hidden></p>${choices('cj-audio-language',t().audioLanguage,[{value:'pt',label:'Português'},{value:'en',label:'English'}],'pt')}`);
      $('#cj-audio-confirm').checked=Boolean(selectedAudio()&&audioConfirmedFile===selectedAudio());
      updateAudioName();
    }
    bind(); updateDisabled(v); if(focus) $('#'+focus)?.focus({preventScroll:true});
  }
  function updateDisabled(v=state&&viewCareJourney(state,{language:lang})) {
    if(!v) return;
    const locked=working||Boolean(transcription)||state.status==='resolved';
    const conditions=new Map([
      ['cj-protocol-review',!$('#cj-protocol-confirm')?.checked||!v.planReady||protocolDirty()||planDirty()],
      ['cj-prepare-message',!v.canPrepareMessage],
      ['cj-message-review',!v.canReviewMessage||!$('#cj-message-confirm')?.checked||messageDirty()],
      ['cj-contact-simulate',!v.canSimulateContact||!$('#cj-contact-confirm')?.checked||messageDirty()],
      ['cj-save-reply',!$('#cj-reply-confirm')?.checked],
      ['cj-transcribe',typeof transcriber!=='function'||!$('#cj-audio-confirm')?.checked||!selectedAudio()||audioConfirmedFile!==selectedAudio()],
      ['cj-save-manual',!$('#cj-manual-confirm')?.checked],
      ['cj-extract',!container.querySelector('input[name="cj-segment"]:checked')],
      ['cj-note-review',!$('#cj-note-confirm')?.checked||!v.planReady],
      ['cj-close',!v.canClose||!$('#cj-close-confirm')?.checked],
    ]);
    // Apply the final state once. Resetting every control first closes native menus and loses focus.
    container.querySelectorAll('#cj-panel input,#cj-panel textarea,#cj-panel select,#cj-panel button').forEach(element=>{
      const disabled=element.id==='cj-cancel-audio'?working||!transcription:locked||Boolean(conditions.get(element.id));
      if(element.disabled!==disabled) element.disabled=disabled;
    });
    const messageStatus=$('#cj-message-status'),statusText=messageDirty()?t().unsaved:v.messageStatus;
    if(messageStatus&&messageStatus.textContent!==statusText) messageStatus.textContent=statusText;
  }
  async function refresh() {
    const token=++generation;
    try {
      const candidate=typeof request==='function'?await request('/api/care/state'):persistence?.load?await persistence.load():state??createCareJourneyState();
      if(!alive()||token!==generation) return;
      const loaded=candidate??createCareJourneyState(); validateCareJourneyState(loaded); state=loaded; render();
    } catch(error) {
      if(!alive()||token!==generation) return;
      if(state) render();else{container.innerHTML=`<p role="alert">${esc(t().failure)}</p><button type="button" id="cj-retry">${esc(t().retry)}</button>`;$('#cj-retry').onclick=refresh;}
      say(readableError(error),true);
    }
  }
  async function mutate(action,clear=[],fromAudio=false) {
    if(!state||working||state.status==='resolved'||(transcription&&!fromAudio)) return false;
    working=true; updateDisabled();
    const expectedRevision=state.revision;
    try {
      const data={type:action.type,idempotencyKey:key(),...action};
      const next=typeof request==='function'?await request('/api/care/actions',{expectedRevision,action:data}):transitionCareJourney(state,data,{expectedRevision,now:new Date().toISOString()});
      validateCareJourneyState(next);
      if(typeof request!=='function'&&persistence?.save) await persistence.save(next);
      if(!alive()) return false;
      state=next; for(const id of clear) drafts.delete(id); render(); say(t().saved);return true;
    } catch(error) {
      if(alive()){say(readableError(error),true);if(error?.code==='CARE_STALE_CONTEXT') await refresh();}
      return false;
    } finally {working=false;if(alive()) updateDisabled();}
  }
  function bind() {
    for(const button of container.querySelectorAll('[data-cj-tab]')) {
      button.onclick=()=>{if(transcription||working)return;tab=button.dataset.cjTab;render(button.id);};
      button.onkeydown=event=>{
        const items=['journey','consultation','contacts'];let index=items.indexOf(tab);
        if(event.key==='ArrowRight')index=(index+1)%3;else if(event.key==='ArrowLeft')index=(index+2)%3;else if(event.key==='Home')index=0;else if(event.key==='End')index=2;else return;
        event.preventDefault();if(!working&&!transcription){tab=items[index];render('cj-tab-'+tab);}
      };
    }
    for(const group of container.querySelectorAll('[data-cj-choice-group]')) {
      const buttons=[...group.querySelectorAll('[data-cj-choice]')],input=$('#'+group.dataset.cjChoiceGroup);
      const choose=button=>{
        if(button.disabled||working||transcription||state.status==='resolved') return;
        input.value=button.dataset.cjChoice;drafts.set(input.id,input.value);
        for(const item of buttons){item.setAttribute('aria-checked',String(item===button));item.tabIndex=item===button?0:-1;}
        updateDisabled();
      };
      for(const button of buttons) {
        button.onclick=()=>choose(button);
        button.onkeydown=event=>{
          let index=buttons.indexOf(button);
          if(event.key==='ArrowRight'||event.key==='ArrowDown') index=(index+1)%buttons.length;
          else if(event.key==='ArrowLeft'||event.key==='ArrowUp') index=(index+buttons.length-1)%buttons.length;
          else if(event.key==='Home') index=0;
          else if(event.key==='End') index=buttons.length-1;
          else return;
          event.preventDefault();const next=buttons[index];if(next.disabled)return;choose(next);next.focus({preventScroll:true});
        };
      }
    }
    for(const control of container.querySelectorAll('input:not([type=checkbox]):not([type=file]):not([type=hidden]),textarea')) control.addEventListener('input',()=>{drafts.set(control.id,control.value);updateDisabled();});
    for(const control of container.querySelectorAll('select')) control.addEventListener('change',()=>{drafts.set(control.id,control.value);updateDisabled();});
    container.querySelectorAll('input[type=checkbox]:not(#cj-audio-confirm)').forEach(control=>control.addEventListener('change',()=>updateDisabled()));
    if($('#cj-audio-confirm'))$('#cj-audio-confirm').addEventListener('change',()=>{
      audioConfirmedFile=$('#cj-audio-confirm').checked?selectedAudio():null;updateDisabled();
    });
    const form=(id,handler)=>{if($('#'+id)) $('#'+id).onsubmit=event=>{event.preventDefault();try{handler();}catch(error){say(readableError(error),true);}};};
    form('cj-plan-form',()=>mutate({type:'plan',phase:$('#cj-phase').value,owner:$('#cj-owner').value,nextAction:$('#cj-next').value.trim(),dueAt:toDue($('#cj-due').value)},['cj-phase','cj-owner','cj-next','cj-due']));
    form('cj-protocol-form',()=>mutate({type:'protocol_update',version:$('#cj-source-version').value,sourceId:$('#cj-source-id').value,sourceText:$('#cj-source-text').value},['cj-source-version','cj-source-id','cj-source-text']));
    if($('#cj-protocol-review')) $('#cj-protocol-review').onclick=()=>mutate({type:'protocol_review',confirmed:$('#cj-protocol-confirm').checked});
    form('cj-preference-form',()=>mutate({type:'preference',value:$('#cj-preference').value},['cj-preference']));
    form('cj-message-form',()=>mutate({type:'message_prepare',text:$('#cj-message').value},['cj-message']));
    if($('#cj-message-review')) $('#cj-message-review').onclick=()=>mutate({type:'message_review',confirmed:$('#cj-message-confirm').checked});
    if($('#cj-contact-simulate')) $('#cj-contact-simulate').onclick=()=>mutate({type:'contact_simulate',confirmed:$('#cj-contact-confirm').checked});
    form('cj-reply-form',()=>mutate({type:'response_record',text:$('#cj-reply').value,contactId:$('#cj-reply-contact').value||null,confirmed:$('#cj-reply-confirm').checked},['cj-reply','cj-reply-contact']));
    form('cj-manual-form',()=>{
      const pieces=$('#cj-transcript-text').value.split(/\n+/).map(text=>text.trim()).filter(Boolean);
      return mutate({type:'transcript_set',text:pieces.join(' '),segments:pieces.map((text,index)=>({id:`SEG-${String(index+1).padStart(3,'0')}`,text,start:null,end:null})),provenance:{mode:'manual_text',engine:null,modelId:null,modelRevision:null},confirmed:$('#cj-manual-confirm').checked},['cj-transcript-text']);
    });
    form('cj-note-form',()=>mutate({type:'note_prepare',segmentIds:[...container.querySelectorAll('input[name="cj-segment"]:checked')].map(control=>control.value)}));
    if($('#cj-note-review')) $('#cj-note-review').onclick=()=>mutate({type:'note_review',confirmed:$('#cj-note-confirm').checked});
    form('cj-close-form',()=>mutate({type:'close',text:$('#cj-resolution').value,confirmed:$('#cj-close-confirm').checked},['cj-resolution']));
    form('cj-audio-form',()=>startTranscription());
    if($('#cj-cancel-audio')) $('#cj-cancel-audio').onclick=cancelTranscription;
    $('#cj-export').onclick=()=>{
      const blob=new Blob([JSON.stringify(exportCareJourneySummary(state,{language:lang}),null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='patientkeeper-synthetic-care-summary.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
  function cancelTranscription() {
    if(!transcription||working)return;
    transcription.controller.abort();transcription=null;generation+=1;audioStatus=t().cancelled;audioError=false;
    clearAudioSource();
    if(alive()) render('cj-transcribe');
  }
  async function startTranscription() {
    if(working||transcription||typeof transcriber!=='function'||!$('#cj-audio-confirm')?.checked)return;
    const file=selectedAudio();
    if(audioConfirmedFile!==file)return;
    if(!file||file.size>CARE_MAX_AUDIO_BYTES||!file.size||!/\.(wav|mp3)$/i.test(file.name)) {audioStatus=t().audioLimit;audioError=true;if($('#cj-audio-status'))$('#cj-audio-status').textContent=audioStatus;return;}
    const token=++generation,controller=new AbortController();transcription={token,controller};audioStatus=t().working;audioError=false;updateDisabled();
    $('#cj-audio-status').textContent=audioStatus;$('#cj-cancel-audio').hidden=false;
    try {
      const audioLanguage=$('#cj-audio-language')?.value==='en'?'en':'pt';
      const result=await transcriber(file,{signal:controller.signal,language:audioLanguage,onProgress:progress=>{
        if(!alive()||transcription?.token!==token||selectedAudio()!==file||audioConfirmedFile!==file)return;
        const fraction=typeof progress==='number'?progress:progress?.fraction;
        if(Number.isFinite(fraction)&&fraction>=0&&fraction<=1) $('#cj-audio-status').textContent=`${t().working} ${Math.round(fraction*100)}%`;
      }});
      if(!alive()||controller.signal.aborted||transcription?.token!==token||selectedAudio()!==file||audioConfirmedFile!==file)return;
      const rawProvenance=result?.provenance??(result?.status==='transcribed'&&result?.model?{mode:'local_asr',engine:'faster-whisper',modelId:result.model.id,modelRevision:result.model.revision}:null);
      const provenance=rawProvenance?{mode:rawProvenance.mode,engine:rawProvenance.engine,modelId:rawProvenance.modelId,modelRevision:rawProvenance.modelRevision}:null;
      if(!provenance||provenance.mode!=='local_asr'||!Array.isArray(result?.segments))throw new Error('CARE_INVALID_TRANSCRIPT');
      const action={type:'transcript_set',text:result.text,segments:result.segments.map((segment,index)=>({id:`SEG-${String(index+1).padStart(3,'0')}`,text:segment.text,start:segment.start,end:segment.end})),provenance,confirmed:true};
      // Validate the callback result before making any persistence request.
      transitionCareJourney(state,{...action,idempotencyKey:key()},{expectedRevision:state.revision,now:new Date().toISOString()});
      const saved=await mutate(action,['cj-transcript-text'],true);
      if(!alive()||controller.signal.aborted||transcription?.token!==token||selectedAudio()!==file||audioConfirmedFile!==file)return;
      if(saved)clearAudioSource();
      audioStatus='';
    } catch {
      if(alive()&&!controller.signal.aborted&&transcription?.token===token){audioStatus=t().audioError;audioError=true;say(audioStatus,true);}
    } finally {
      if(transcription?.token===token){transcription=null;if(alive())render('cj-transcribe');}
    }
  }
  const controller={
    refresh,
    setLanguage(next){lang=checkedLanguage(next);render();},
    setTranscriber(callback){if(typeof callback!=='function'&&callback!==undefined)throw new TypeError('A transcription callback is required.');cancelTranscription();transcriber=callback;render();},
    destroy(){destroyed=true;generation+=1;transcription?.controller.abort();transcription=null;clearAudioSource();audioInput=null;container.replaceChildren();},
  };
  render();void refresh();return controller;
}
