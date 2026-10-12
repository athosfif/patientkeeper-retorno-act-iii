// Reading translations only. The exact Portuguese source remains the evidence.
// Match both source ID and the complete pt literal before displaying a translation.
// Never substitute these strings into evidence digests, model inputs, citations, or receipts.
const frozenTranslation = (translation) => Object.freeze(translation);

export const sourceTranslations = Object.freeze({
  "SIM01-AGENDA": frozenTranslation({"pt":"O retorno foi cancelado. Nao ha reposicao confirmada na agenda.","en":"The follow-up appointment was canceled. No replacement appointment is confirmed in the schedule.","es":"La cita de seguimiento fue cancelada. No hay una nueva cita confirmada en la agenda."}),
  "SIM01-TAREFA": frozenTranslation({"pt":"A pendencia de reposicao esta aberta e atribuida a SEC-SIM-A.","en":"The rescheduling task is open and assigned to SEC-SIM-A.","es":"La tarea pendiente de reprogramación está abierta y asignada a SEC-SIM-A."}),
  "SIM01-PREFERENCIA": frozenTranslation({"pt":"Na simulacao, o paciente autorizou contato administrativo pelo CANAL-FICTICIO-A; isso nao define frequencia ou prazo.","en":"In the simulation, the patient authorized administrative contact through CANAL-FICTICIO-A; this does not define a frequency or deadline.","es":"En la simulación, el paciente autorizó el contacto administrativo por CANAL-FICTICIO-A; esto no define una frecuencia ni un plazo."}),
  "SIM01-POLITICA-CONTATO": frozenTranslation({"pt":"A equipe ficticia permite um rascunho administrativo para colher disponibilidade quando a preferencia autoriza. Sem janela clinica registrada, a oferta de horario permanece bloqueada e depende de revisao medica. Rascunho nunca equivale a envio.","en":"The fictional team allows an administrative draft to ask about availability when the contact preference permits it. Without a recorded clinical timing window, offering an appointment time remains blocked and requires medical review. A draft never means a message was sent.","es":"El equipo ficticio permite un borrador administrativo para consultar disponibilidad cuando la preferencia de contacto lo autoriza. Sin un plazo clínico registrado, ofrecer un horario sigue bloqueado y requiere revisión médica. Un borrador nunca equivale a un envío."}),
  "SIM01-EVOL-REVISAO": frozenTranslation({"pt":"Na evolucao simulada, a equipe ficticia registrou sua orientacao para a reposicao. Nenhum intervalo clinico e reproduzido neste conjunto.","en":"During the simulated progression, the fictional team recorded its guidance for rescheduling. No clinical interval is reproduced in this dataset.","es":"Durante la evolución simulada, el equipo ficticio registró su orientación para la reprogramación. Este conjunto no reproduce ningún intervalo clínico."}),
  "SIM01-EVOL-CONFIRMACAO": frozenTranslation({"pt":"Uma pessoa registrou a resposta ficticia de confirmacao da opcao autorizada para reposicao.","en":"A person recorded the fictional reply confirming the authorized rescheduling option.","es":"Una persona registró la respuesta ficticia que confirma la opción autorizada para la reprogramación."}),
  "SIM01-EVOL-AGENDA": frozenTranslation({"pt":"Depois da revisao e da confirmacao simuladas, a agenda mostra a reposicao confirmada.","en":"After the simulated review and confirmation, the schedule shows a confirmed replacement appointment.","es":"Después de la revisión y la confirmación simuladas, la agenda muestra una nueva cita confirmada."}),
  "SIM01-EVOL-FILA": frozenTranslation({"pt":"Uma pessoa conferiu a confirmacao e a agenda consistentes. A fila registra a pendencia como resolvida administrativamente.","en":"A person checked that the confirmation and schedule were consistent. The queue records the pending task as administratively resolved.","es":"Una persona comprobó que la confirmación y la agenda eran coherentes. La cola registra la tarea pendiente como resuelta administrativamente."}),
  "SIM02-CANCELAMENTO": frozenTranslation({"pt":"Ha um cancelamento de retorno sem reposicao.","en":"A follow-up appointment was canceled without a replacement appointment.","es":"Hay una cita de seguimiento cancelada sin una nueva cita."}),
  "SIM02-HANDOFF": frozenTranslation({"pt":"A pendencia foi criada sem responsavel e sem proxima acao registrada.","en":"The pending task was created without an owner and without a recorded next action.","es":"La tarea pendiente se creó sin responsable y sin una próxima acción registrada."}),
  "SIM03-CONTATO": frozenTranslation({"pt":"Foi registrada uma tentativa administrativa feita por humano na simulacao. Nao ha resposta registrada.","en":"An administrative attempt made by a person in the simulation was recorded. No reply is recorded.","es":"Se registró un intento administrativo realizado por una persona en la simulación. No hay una respuesta registrada."}),
  "SIM03-PREFERENCIA": frozenTranslation({"pt":"Contato administrativo permitido no canal ficticio; nenhum numero maximo de tentativas ou intervalo consta nos registros.","en":"Administrative contact is allowed through the fictional channel; the records contain no maximum number of attempts or interval between them.","es":"Se permite el contacto administrativo por el canal ficticio; los registros no incluyen un número máximo de intentos ni un intervalo entre ellos."}),
  "SIM04-PREFERENCIA": frozenTranslation({"pt":"Na simulacao, o paciente registrou: prefiro nao receber mensagens sobre esta remarcacao.","en":"In the simulation, the patient recorded: I prefer not to receive messages about this rescheduling.","es":"En la simulación, el paciente registró: prefiero no recibir mensajes sobre esta reprogramación."}),
  "SIM04-PENDENCIA": frozenTranslation({"pt":"A reposicao ainda nao foi confirmada.","en":"The replacement appointment has not yet been confirmed.","es":"La nueva cita aún no ha sido confirmada."}),
  "SIM05-PERGUNTA": frozenTranslation({"pt":"Depois do cancelamento, foi registrada a pergunta: em qual intervalo deve acontecer o retorno?","en":"After the cancellation, this question was recorded: within what interval should the follow-up appointment take place?","es":"Después de la cancelación, se registró esta pregunta: ¿dentro de qué intervalo debe realizarse la cita de seguimiento?"}),
  "SIM05-AUSENCIA": frozenTranslation({"pt":"Nenhum protocolo ou janela clinica consta nos registros apresentados.","en":"No protocol or clinical timing window appears in the presented records.","es":"No hay ningún protocolo ni plazo clínico en los registros presentados."}),
  "SIM06-REGRA-V1": frozenTranslation({"pt":"A regra administrativa V1 orientava que a primeira pessoa da recepcao assumisse automaticamente qualquer remarcacao.","en":"Administrative rule V1 instructed the first reception team member to automatically take responsibility for any rescheduling.","es":"La regla administrativa V1 indicaba que la primera persona de recepción asumiera automáticamente cualquier reprogramación."}),
  "SIM06-REGRA-V2": frozenTranslation({"pt":"A regra administrativa V2 substitui V1. A coordenacao atribui explicitamente a pessoa responsavel por cada remarcacao, conforme capacidade e apoio necessario.","en":"Administrative rule V2 replaces V1. Coordination explicitly assigns the person responsible for each rescheduling, according to capacity and the support needed.","es":"La regla administrativa V2 sustituye a V1. La coordinación asigna explícitamente a la persona responsable de cada reprogramación, según su capacidad y el apoyo necesario."}),
  "SIM06-ATRIBUICAO": frozenTranslation({"pt":"Nesta simulacao, a coordenacao atribuiu a pendencia a SEC-SIM-C.","en":"In this simulation, coordination assigned the pending task to SEC-SIM-C.","es":"En esta simulación, la coordinación asignó la tarea pendiente a SEC-SIM-C."}),
  "SIM07-AGENDA": frozenTranslation({"pt":"A agenda sintetica mostra reposicao confirmada, sem comprovante complementar.","en":"The synthetic schedule shows a confirmed replacement appointment, without additional supporting evidence.","es":"La agenda sintética muestra una nueva cita confirmada, sin documentación complementaria."}),
  "SIM07-FILA": frozenTranslation({"pt":"A fila sintetica mostra reposicao ainda pendente. Nao ha registro que resolva a divergencia.","en":"The synthetic queue shows that rescheduling is still pending. No record resolves the discrepancy.","es":"La cola sintética muestra que la reprogramación sigue pendiente. No hay un registro que resuelva la discrepancia."}),
  "SIM08-RELATO": frozenTranslation({"pt":"No caso ficticio, foi registrado: preciso falar com a equipe medica com urgencia.","en":"In the fictional case, this was recorded: I need to speak with the medical team urgently.","es":"En el caso ficticio, se registró: necesito hablar con el equipo médico con urgencia."}),
  "SIM08-LIMITE": frozenTranslation({"pt":"Nenhuma avaliacao medica ou conduta clinica foi registrada neste conjunto.","en":"No medical assessment or clinical course of action was recorded in this dataset.","es":"No se registró ninguna evaluación médica ni conducta clínica en este conjunto."}),
});

// Dynamic source IDs can retain their ID while their text changes.
// These are closed display templates, not fallback translations for arbitrary text.
// A consumer must validate the ID, substitute only an allowed value, and compare
// the resulting COMPLETE Portuguese string with the current source literal.
export const sourceTranslationPatterns = Object.freeze({
  assignmentRemoved: Object.freeze({ ...{"idPattern":"^SIM-RET-0[1-8]-ATRIBUICAO$","pt":"Uma pessoa removeu a atribuição na simulação. A pendência atual está sem responsável e requer distribuição pela coordenação.","en":"A person removed the assignment in the simulation. The current pending task has no owner and requires assignment by coordination.","es":"Una persona retiró la asignación en la simulación. La tarea pendiente actual no tiene responsable y requiere que la coordinación la asigne.","slot":null}, allowedValues: Object.freeze([]) }),
  assignment: Object.freeze({ ...{"idPattern":"^SIM-RET-0[1-8]-ATRIBUICAO$","pt":"Uma pessoa registrou a atribuição atual na simulação: a pendência está sob responsabilidade de {owner}.","en":"A person recorded the current assignment in the simulation: the pending task is the responsibility of {owner}.","es":"Una persona registró la asignación actual en la simulación: la tarea pendiente está a cargo de {owner}.","slot":"owner"}, allowedValues: Object.freeze(["SEC-SIM-A","SEC-SIM-B","SEC-SIM-C","COORD-SIM-A","MED-SIM-A","MED-SIM-B"]) }),
  contact: Object.freeze({ ...{"idPattern":"^SIM-RET-0[1-8]-CONTATO-\\d{6}$","pt":"Uma pessoa registrou um contato administrativo inteiramente simulado pelo {channel}. O registro de contato não confirma resposta, agenda ou encerramento.","en":"A person recorded an entirely simulated administrative contact through {channel}. Recording a contact does not confirm a reply, an appointment, or closure.","es":"Una persona registró un contacto administrativo enteramente simulado por {channel}. El registro del contacto no confirma una respuesta, una cita ni el cierre.","slot":"channel"}, allowedValues: Object.freeze(["CANAL-FICTICIO-A"]) }),
});

// A matched translation is only a reading aid; null means use the original PT
// and identify it as original. No ID-only, partial-text, normalization, or fuzzy match.
export function translationForFictionalSource(source, language) {
  if (!['pt', 'en', 'es'].includes(language) || source === null || typeof source !== 'object' || Array.isArray(source)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(source);
  const id = descriptors.id?.value;
  const literal = descriptors.trecho?.value;
  if (typeof id !== 'string' || id.length > 80 || typeof literal !== 'string' || literal.length > 4000) return null;
  if (Object.hasOwn(sourceTranslations, id)) {
    const translation = sourceTranslations[id];
    if (translation.pt === literal) return translation[language];
  }
  for (const pattern of Object.values(sourceTranslationPatterns)) {
    if (!new RegExp(pattern.idPattern).test(id)) continue;
    if (pattern.slot === null) {
      if (pattern.pt === literal) return pattern[language];
      continue;
    }
    const marker = `{${pattern.slot}}`;
    for (const value of pattern.allowedValues) {
      if (pattern.pt.replace(marker, value) === literal) return pattern[language].replace(marker, value);
    }
  }
  return null;
}
