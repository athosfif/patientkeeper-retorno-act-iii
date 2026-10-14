// Local UI translations only. Canonical source quotes and user drafts stay literal.
export const LANGUAGES = Object.freeze({ en:'English', pt:'Português', es:'Español' });
const LOCALES = { en:'en', pt:'pt-BR', es:'es' };
const STORAGE_KEY = 'patientkeeper-retorno-language';
export const catalog = [
  ["Demonstração isolada no navegador","Isolated browser demo","Demostración aislada en el navegador"],
  ["As alterações ficam somente neste navegador. Limpar os dados do site apaga o progresso.","Changes stay only in this browser. Clearing site data erases progress.","Los cambios quedan solo en este navegador. Borrar los datos del sitio elimina el progreso."],
  ["Armazenamento deste navegador · Sem contato externo ou IA remota.","Browser storage · No external contact or remote AI.","Almacenamiento de este navegador · Sin contacto externo ni IA remota."],
  ["Este navegador não permite salvar o progresso. Nenhuma alteração foi registrada.","This browser does not allow progress to be saved. No change was recorded.","Este navegador no permite guardar el progreso. No se registró ningún cambio."],
  ["Os dados salvos desta demonstração são inválidos. Eles foram preservados; exporte uma cópia do armazenamento antes de limpar os dados do site.","This demo’s saved data is invalid. It has been preserved; copy the browser storage before clearing site data.","Los datos guardados de esta demostración no son válidos. Se han conservado; copie el almacenamiento antes de borrar los datos del sitio."],
  ["Este navegador não oferece bloqueio seguro entre abas. Use uma versão atual do Chrome, Edge, Firefox ou Safari com HTTPS.","This browser does not support safe coordination between tabs. Use a current Chrome, Edge, Firefox or Safari over HTTPS.","Este navegador no admite coordinación segura entre pestañas. Use una versión actual de Chrome, Edge, Firefox o Safari con HTTPS."],
  ["Esta demonstração precisa de HTTPS ou localhost para conferir as fontes com segurança.","This demo requires HTTPS or localhost to verify source records securely.","Esta demostración requiere HTTPS o localhost para verificar las fuentes de forma segura."],
  ["Não foi possível salvar. Nenhuma alteração foi registrada.","Could not save. No change was recorded.","No se pudo guardar. No se registró ningún cambio."],
  ["Este navegador não permite abrir o armazenamento local. Seus dados não foram substituídos.","This browser does not allow local storage to be opened. Your data was not replaced.","Este navegador no permite abrir el almacenamiento local. Sus datos no se sustituyeron."],
  ["Confira se o navegador permite armazenamento para este site e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.","Check that this browser allows storage for this site, then reload. Your records will not be replaced automatically.","Compruebe que el navegador permite almacenar datos de este sitio y recargue. Sus registros no se sustituirán automáticamente."],
  ["Armazenamento do navegador indisponível.","Browser storage unavailable.","Almacenamiento del navegador no disponible."],
  ["Progresso fictício importado e salvo somente neste navegador.","Fictional progress imported and saved only in this browser.","Progreso ficticio importado y guardado solo en este navegador."],
  ["Atribuições e etapas são salvas somente neste navegador, com registro de data e hora.","Assignments and stages are saved only in this browser, with timestamps.","Las asignaciones y etapas se guardan solo en este navegador, con fecha y hora."],
  ["Exportar recibos de conferência","Export review receipts","Exportar recibos de revisión"],
  ["A cópia do progresso não inclui os recibos de conferência. Exporte-os separadamente; reiniciar os casos preserva esses recibos neste navegador.","The progress copy does not include review receipts. Export them separately; resetting cases keeps these receipts in this browser.","La copia del progreso no incluye los recibos de revisión. Expórtelos por separado; reiniciar los casos conserva estos recibos en este navegador."],
  ["Confirme a substituição do progresso fictício pelo estado inicial.","Confirm replacement of fictional progress with the initial state.","Confirme la sustitución del progreso ficticio por el estado inicial."],
  ["Protótipo administrativo com casos fictícios. A equipe define regras de contato e janelas clínicas. Consulta literal de fontes e execução AMD gravada; GPU desligada, sem inferência ao vivo. Não faz avaliação clínica, ranking da equipe ou envio automático.","Administrative prototype with fictional cases. The team defines contact rules and clinical timing. Literal source lookup and a recorded AMD execution; GPU off, no live inference. No clinical assessment, staff ranking, or automatic messages.","Prototipo administrativo con casos ficticios. El equipo define las reglas de contacto y los plazos clínicos. Consulta literal de fuentes y ejecución AMD grabada; GPU apagada, sin inferencia en vivo. Sin evaluación clínica, clasificación del equipo ni mensajes automáticos."],
  ["A aba Conferência consulta estes trechos localmente. A execução AMD gravada é apresentada separadamente; fontes históricas ficam separadas da ação atual.","The Review tab looks up these excerpts locally. The recorded AMD execution is shown separately; historical sources are kept apart from the current action.","La pestaña Revisión consulta estos fragmentos localmente. La ejecución AMD grabada se muestra por separado; las fuentes históricas se separan de la acción actual."],
  ["Armazenamento deste navegador · Execução AMD gravada · Sem inferência ao vivo.","Browser storage · Recorded AMD execution · No live inference.","Almacenamiento de este navegador · Ejecución AMD grabada · Sin inferencia en vivo."],
  ['Protótipo com dados fictícios. A equipe médica define as orientações e os prazos clínicos. Fontes conferíveis e revisão humana. Não envia mensagens nem altera consultas reais.', 'Prototype with fictional data. The medical team defines care instructions and clinical timing. Reviewable sources and human review. No messages are sent and no real appointments are changed.', 'Prototipo con datos ficticios. El equipo médico define las indicaciones y los plazos clínicos. Fuentes verificables y revisión humana. No envía mensajes ni modifica citas reales.'],
  ['Central do médico', 'Doctor workspace', 'Espacio del médico'],
  ['Pular para o conteúdo','Skip to content','Saltar al contenido'],
  ['Aguarde a consulta ou o salvamento antes de mudar a visualização.','Wait for the query or save before changing views.','Espere a que termine la consulta o el guardado antes de cambiar de vista.'],
  ['Navegação do trabalho','Workspace navigation','Navegación del trabajo'],
  ['Agenda médica','Doctor calendar','Agenda médica'],
  ['PatientKeeper — Retorno | Conferir com fontes','PatientKeeper — Retorno | Check the sources','PatientKeeper — Retorno | Revisar las fuentes'],
  ['Idioma','Language','Idioma'],
  ['Pular para a pendência','Skip to the pending case','Saltar al caso pendiente'],
  ['PatientKeeper — Retorno, início','PatientKeeper — Retorno, home','PatientKeeper — Retorno, inicio'],
  ['Demonstração local','Local demo','Demostración local'],
  ['Continuidade do retorno','Follow-up continuity','Continuidad del seguimiento'],
  ['Toda pendência precisa','Every pending case needs','Cada caso pendiente necesita'],
  ['de um próximo passo.','a next step.','un próximo paso.'],
  ['Do cancelamento à conferência: uma fila com responsável, registros de origem e um cartão preparado por quem revisou.','From cancellation to review: an assigned queue, source records, and a card prepared by the reviewer.','De la cancelación a la revisión: una cola con responsable, registros de origen y una tarjeta preparada por quien revisó.'],
  ['Somente casos fictícios','Fictional cases only','Solo casos ficticios'],
  ['As alterações ficam neste computador.','Changes stay on this computer.','Los cambios quedan en este ordenador.'],
  ['Nenhuma mensagem é enviada.','No messages are sent.','No se envían mensajes.'],
  ['Indicadores do processo','Process indicators','Indicadores del proceso'],
  ['Pendências abertas','Open cases','Casos pendientes'],
  ['Sem responsável','Unassigned','Sin responsable'],
  ['Revisão médica','Medical team review','Revisión del equipo médico'],
  ['Resoluções conferidas','Reviewed resolutions','Resoluciones revisadas'],
  ['Fila de retornos','Follow-up queue','Cola de seguimiento'],
  ['Buscar caso ou responsável','Search for a case or assignee','Buscar un caso o responsable'],
  ['Ex.: Caso 01 ou SEC-SIM-A','E.g. Case 01 or SEC-SIM-A','Ej.: Caso 01 o SEC-SIM-A'],
  ['Mostrar','Show','Mostrar'],
  ['Todos os casos','All cases','Todos los casos'],
  ['Aguardando resposta','Awaiting a reply','Esperando respuesta'],
  ['Contato bloqueado','Contact blocked','Contacto bloqueado'],
  ['Resolvidas','Resolved cases','Casos resueltos'],
  ['Carregando os casos…','Loading cases…','Cargando los casos…'],
  ['Detalhe da pendência','Pending case details','Detalles del caso pendiente'],
  ['Carregando a demonstração','Loading the demo','Cargando la demostración'],
  ['Abrindo os oito casos fictícios e seu histórico local.','Opening the eight fictional cases and their local history.','Abriendo los ocho casos ficticios y su historial local.'],
  ['Dados da demonstração','Demo data','Datos de la demostración'],
  ['Salve uma cópia do progresso ou retome uma cópia destes mesmos oito casos. Importe somente o arquivo desta demonstração, sem dados de pacientes.','Save a copy of your progress or restore these same eight cases. Import only this demo’s file, with no patient data.','Guarde una copia del progreso o restaure estos mismos ocho casos. Importe solo el archivo de esta demostración, sin datos de pacientes.'],
  ['Exportar progresso fictício','Export fictional progress','Exportar el progreso ficticio'],
  ['Importar progresso','Import progress','Importar progreso'],
  ['Reiniciar oito casos','Reset eight cases','Reiniciar los ocho casos'],
  ['Armazenamento local · IA/RAG ainda não conectados.','Local storage · AI/RAG not connected yet.','Almacenamiento local · IA/RAG aún no conectados.'],
  ['Protótipo administrativo com casos fictícios. A equipe define regras de contato e janelas clínicas. Consulta local com fontes; integração IA/AMD pendente. Não faz avaliação clínica, ranking da equipe ou envio automático.','Administrative prototype with fictional cases. The team defines contact rules and clinical timing. Local source lookup; AI/AMD integration pending. No clinical assessment, staff ranking, or automatic messages.','Prototipo administrativo con casos ficticios. El equipo define las reglas de contacto y los plazos clínicos. Consulta local de fuentes; integración IA/AMD pendiente. Sin evaluación clínica, clasificación del equipo ni mensajes automáticos.'],
  ['Registro humano · Dados fictícios','Human record · Fictional data','Registro humano · Datos ficticios'],
  ['Fechar confirmação','Close confirmation','Cerrar confirmación'],
  ['Voltar','Back','Volver'],
  ['Confirmar na demonstração','Confirm in the demo','Confirmar en la demostración'],
  ['Somente progresso fictício','Fictional progress only','Solo progreso ficticio'],
  ['Fechar importação','Close import','Cerrar importación'],
  ['Retomar uma cópia','Restore a copy','Restaurar una copia'],
  ['O arquivo substitui o progresso local. Apenas o formato e os casos desta demonstração são aceitos.','This file replaces local progress. Only this demo’s format and cases are accepted.','El archivo sustituye el progreso local. Solo se aceptan el formato y los casos de esta demostración.'],
  ['Arquivo JSON exportado nesta demonstração','JSON file exported from this demo','Archivo JSON exportado de esta demostración'],
  ['Confirmo que o arquivo contém somente estes casos fictícios.','I confirm the file contains only these fictional cases.','Confirmo que el archivo contiene solo estos casos ficticios.'],
  ['Retorno cancelado sem reposição','Cancelled follow-up without a replacement','Seguimiento cancelado sin nueva cita'],
  ['Distribuição da pendência','Assigning the pending case','Asignación del caso pendiente'],
  ['Contato registrado sem resposta','Recorded contact without a reply','Contacto registrado sin respuesta'],
  ['Prefere não receber novos contatos','Prefers no further contact','Prefiere no recibir más contactos'],
  ['Janela clínica não informada','Clinical timing not specified','Plazo clínico no indicado'],
  ['Regra administrativa antiga e vigente','Previous and current administrative rules','Reglas administrativas anterior y vigente'],
  ['Agenda e fila divergentes','Schedule and queue disagree','La agenda y la cola no coinciden'],
  ['Urgência declarada no registro','Urgency stated in the record','Urgencia declarada en el registro'],
  ['Conferir a orientação da equipe antes de oferecer um horário. A política fictícia permite apenas colher disponibilidade.','Check the team’s guidance before offering a time. The fictional policy only permits asking about availability.','Revise la orientación del equipo antes de ofrecer un horario. La política ficticia solo permite preguntar por disponibilidad.'],
  ['Conferir o registro de contato e a política da equipe. A ausência de resposta não autoriza uma nova tentativa.','Review the contact record and team policy. No reply does not authorize another attempt.','Revise el registro de contacto y la política del equipo. La falta de respuesta no autoriza otro intento.'],
  ['Manter a recusa visível e encaminhar o processo à coordenação, sem preparar novo contato.','Keep the refusal visible and refer the process to coordination, without preparing another contact.','Mantenga visible la negativa y remita el proceso a coordinación, sin preparar otro contacto.'],
  ['Levar a pergunta à equipe médica. A janela clínica precisa ser definida por ela.','Refer the question to the medical team. They must define the clinical timing.','Remita la pregunta al equipo médico. Este debe definir el plazo clínico.'],
  ['Conferir a regra vigente e o próximo responsável antes de qualquer contato.','Check the current rule and next assignee before any contact.','Revise la regla vigente y el próximo responsable antes de cualquier contacto.'],
  ['Conferir agenda e fila com a coordenação. Não afirmar confirmação enquanto houver divergência.','Review the schedule and queue with coordination. Do not claim confirmation while records disagree.','Revise la agenda y la cola con coordinación. No afirme una confirmación mientras haya discrepancias.'],
  ['Apresentar o pedido à equipe médica pela rota humana definida por ela. A remarcação não responde a uma questão clínica.','Refer the request to the medical team through their defined human route. Rescheduling does not answer a clinical question.','Presente la solicitud al equipo médico por la vía humana definida por este. Reprogramar una cita no responde a una pregunta clínica.'],
  ['O responsável atribuído deve conferir a preferência de contato e registrar a próxima ação com a coordenação.','The assignee must check the contact preference and record the next action with coordination.','La persona asignada debe revisar la preferencia de contacto y registrar la próxima acción con coordinación.'],
  ['Conferir se há resposta ao contato simulado e registrar orientação da equipe fictícia; não presumir confirmação nem frequência de novo contato.','Check for a reply to the simulated contact and record the fictional team’s guidance; do not assume confirmation or a repeat-contact frequency.','Compruebe si hay respuesta al contacto simulado y registre la orientación del equipo ficticio; no suponga confirmación ni frecuencia de nuevos contactos.'],
  ['Conferir a escolha humana de uma opção fictícia autorizada; revisar a resposta de confirmação e a agenda antes de registrar a reposição.','Check the human selection of an authorized fictional option; review the confirmation reply and schedule before recording the replacement.','Revise la selección humana de una opción ficticia autorizada; compruebe la respuesta de confirmación y la agenda antes de registrar la nueva cita.'],
  ['Uma pessoa deve conferir a confirmação e a agenda consistentes antes de encerrar administrativamente a pendência.','A person must check that confirmation and schedule agree before closing the case administratively.','Una persona debe comprobar que la confirmación y la agenda coinciden antes de cerrar administrativamente el caso.'],
  ['Resolução administrativa fictícia conferida; consultar as evidências e o histórico humano.','Fictional administrative resolution reviewed; consult its evidence and human history.','Resolución administrativa ficticia revisada; consulte sus evidencias y el historial humano.'],
  ['A coordenação deve atribuir um responsável e conferir o apoio necessário para a próxima ação.','Coordination must assign a person and check the support needed for the next action.','Coordinación debe asignar una persona y comprobar el apoyo necesario para la próxima acción.'],
  ['Remarcação pendente','Rescheduling pending','Reprogramación pendiente'],
  ['Contato bloqueado por preferência','Contact blocked by preference','Contacto bloqueado por preferencia'],
  ['Revisão médica necessária','Medical team review needed','Se necesita revisión del equipo médico'],
  ['Registros divergentes · conferir','Conflicting records · review needed','Registros contradictorios · revisar'],
  ['Reposição confirmada · conferir encerramento','Replacement confirmed · review closure','Nueva cita confirmada · revisar el cierre'],
  ['Resolvido administrativamente','Administratively resolved','Resuelto administrativamente'],
  ['Contato administrativo permitido na simulação','Administrative contact allowed in the simulation','Contacto administrativo permitido en la simulación'],
  ['Preferência de contato não registrada','Contact preference not recorded','Preferencia de contacto no registrada'],
  ['Atribuição pendente','Assignment pending','Asignación pendiente'],
  ['Nenhum caso neste filtro. Ajuste a busca ou escolha outra fila.','No cases match this filter. Adjust the search or choose another queue.','Ningún caso coincide con este filtro. Ajuste la búsqueda o elija otra cola.'],
  ['Próximo passo','Next step','Próximo paso'],
  ['O próximo passo tem uma origem.','The next step has a source.','El próximo paso tiene un origen.'],
  ['Confira os registros e prepare um cartão revisado antes de agir.','Review the records and prepare a reviewed card before acting.','Revise los registros y prepare una tarjeta revisada antes de actuar.'],
  ['Conferir com fontes','Check the sources','Revisar las fuentes'],
  ['Depende da equipe médica','Requires the medical team','Requiere al equipo médico'],
  ['Responsabilidade compartilhada','Shared responsibility','Responsabilidad compartida'],
  ['Pessoa fictícia responsável','Fictional assignee','Responsable ficticio'],
  ['Registrar atribuição','Record assignment','Registrar asignación'],
  ['A coordenação distribui o trabalho e confere apoio e capacidade. Não há ranking individual.','Coordination distributes work and reviews support and capacity. No individual ranking.','Coordinación distribuye el trabajo y revisa el apoyo y la capacidad. Sin clasificación individual.'],
  ['Contato administrativo','Administrative contact','Contacto administrativo'],
  ['Exemplo predefinido para coletar disponibilidade. Uma oferta de horário depende da orientação da equipe.','Predefined example for asking about availability. Offering a time requires team guidance.','Ejemplo predefinido para preguntar por disponibilidad. Ofrecer un horario requiere orientación del equipo.'],
  ['Rascunho fictício · Revisão humana','Fictional draft · Human review','Borrador ficticio · Revisión humana'],
  ['Salvar rascunho','Save draft','Guardar borrador'],
  ['Alteração ainda não salva.','Change not saved yet.','Cambio aún no guardado.'],
  ['Texto preparado; não gerado por IA.','Prepared text; not AI-generated.','Texto preparado; no generado por IA.'],
  ['Salve a alteração antes de registrar a revisão.','Save the change before recording a review.','Guarde el cambio antes de registrar una revisión.'],
  ['Revisei este rascunho fictício. Isso não registra um contato.','I reviewed this fictional draft. This does not record a contact.','He revisado este borrador ficticio. Esto no registra un contacto.'],
  ['Contato indisponível nesta etapa.','Contact unavailable at this stage.','Contacto no disponible en esta etapa.'],
  ['Registrar contato fictício','Record fictional contact','Registrar contacto ficticio'],
  ['Uma nova tentativa depende de decisão humana e política registrada. Esta demonstração não autoriza contato adicional.','Another attempt requires a human decision and recorded policy. This demo does not authorize further contact.','Otro intento requiere una decisión humana y una política registrada. Esta demostración no autoriza más contactos.'],
  ['Este registro descreve uma ação simulada. A demonstração não envia mensagens nem confirma uma consulta por gerar texto.','This record describes a simulated action. The demo does not send messages or confirm an appointment by generating text.','Este registro describe una acción simulada. La demostración no envía mensajes ni confirma una cita por generar texto.'],
  ['Conferir a remarcação','Review rescheduling','Revisar la reprogramación'],
  ['Avance com registros humanos fictícios. A pendência continua aberta até a conferência final.','Proceed with fictional human records. The case stays open until the final review.','Avance con registros humanos ficticios. El caso permanece abierto hasta la revisión final.'],
  ['Orientação da equipe','Team guidance','Orientación del equipo'],
  ['Ativar o registro fictício da opção autorizada, sem inferir intervalo clínico.','Activate the fictional record of the authorized option, without inferring clinical timing.','Active el registro ficticio de la opción autorizada, sin inferir un plazo clínico.'],
  ['Registrada','Recorded','Registrada'],
  ['Registrar orientação','Record guidance','Registrar orientación'],
  ['Resposta e agenda','Reply and schedule','Respuesta y agenda'],
  ['Registrar a confirmação e a reposição fictícias. Conferir suas fontes antes do encerramento.','Record the fictional confirmation and replacement. Review their sources before closing.','Registre la confirmación y la nueva cita ficticias. Revise sus fuentes antes del cierre.'],
  ['Registradas','Recorded','Registradas'],
  ['Registrar confirmação','Record confirmation','Registrar confirmación'],
  ['Encerramento administrativo','Administrative closure','Cierre administrativo'],
  ['Encerrar somente com confirmação, agenda e responsável conferidos.','Close only after reviewing confirmation, schedule, and assignee.','Cierre solo tras revisar la confirmación, la agenda y el responsable.'],
  ['Resolvida','Resolved','Resuelta'],
  ['Conferir e encerrar','Review and close','Revisar y cerrar'],
  ['Registros da etapa atual','Current-stage records','Registros de la etapa actual'],
  ['Confira a origem de cada informação. Os registros de evolução aparecem somente depois da ação humana correspondente.','Check the source of each item. Progress records appear only after the corresponding human action.','Revise el origen de cada información. Los registros de avance aparecen solo después de la acción humana correspondiente.'],
  ['Regra histórica','Previous rule','Regla anterior'],
  ['Regra vigente','Current rule','Regla vigente'],
  ['Registro fictício','Fictional record','Registro ficticio'],
  ['A aba Conferência consulta estes trechos localmente. IA/AMD ainda não conectados; fontes históricas ficam separadas da ação atual.','The Review tab looks up these excerpts locally. AI/AMD not connected yet; previous sources stay separate from the current action.','La pestaña Revisión consulta estos fragmentos localmente. IA/AMD aún no conectados; las fuentes anteriores quedan separadas de la acción actual.'],
  ['Histórico do caso fictício','Fictional case history','Historial del caso ficticio'],
  ['Atribuições e etapas são salvas neste computador, com registro de data e hora.','Assignments and stages are saved on this computer with a date and time.','Las asignaciones y etapas se guardan en este ordenador con fecha y hora.'],
  ['Nenhuma alteração humana registrada neste caso. Os registros iniciais estão na aba Registros.','No human change recorded for this case. Initial records are in the Records tab.','Ningún cambio humano registrado en este caso. Los registros iniciales están en la pestaña Registros.'],
  ['Nenhum caso neste filtro','No cases match this filter','Ningún caso coincide con este filtro'],
  ['Escolha outra fila para acompanhar as pendências.','Choose another queue to follow pending cases.','Elija otra cola para seguir los casos pendientes.'],
  ['Acompanhamento','Follow-up','Seguimiento'],
  ['Conferência','Review','Revisión'],
  ['Registros','Records','Registros'],
  ['Histórico','History','Historial'],
  ['Informações da pendência','Pending case information','Información del caso pendiente'],
  ['Responsável ainda não atribuído','Assignee not assigned yet','Responsable aún no asignado'],
  ['Voltar à fila','Back to the queue','Volver a la cola'],
  ['O progresso mudou em outra aba. Carreguei a versão atual; confira o caso antes de repetir a ação.','Progress changed in another tab. The current version is loaded; review the case before repeating the action.','El progreso cambió en otra pestaña. Se cargó la versión actual; revise el caso antes de repetir la acción.'],
  ['O progresso mudou em outra aba, mas não consegui carregar a versão atual. Recarregue antes de continuar.','Progress changed in another tab, but the current version could not be loaded. Reload before continuing.','El progreso cambió en otra pestaña, pero no se pudo cargar la versión actual. Recargue antes de continuar.'],
  ['Não foi possível salvar. O progresso não foi alterado.','Could not save. Progress was not changed.','No se pudo guardar. El progreso no cambió.'],
  ['O servidor local não respondeu no formato esperado.','The local server did not respond in the expected format.','El servidor local no respondió con el formato esperado.'],
  ['Não foi possível registrar esta alteração.','Could not record this change.','No se pudo registrar este cambio.'],
  ['Atribuição fictícia salva. O próximo passo continua visível.','Fictional assignment saved. The next step remains visible.','Asignación ficticia guardada. El próximo paso sigue visible.'],
  ['Rascunho salvo. Registre a revisão antes do contato fictício.','Draft saved. Record the review before the fictional contact.','Borrador guardado. Registre la revisión antes del contacto ficticio.'],
  ['Revisão salva. Nenhum contato foi registrado.','Review saved. No contact was recorded.','Revisión guardada. No se registró ningún contacto.'],
  ['Revisão desmarcada.','Review unchecked.','Revisión desmarcada.'],
  ['Contato fictício registrado por uma pessoa','Fictional contact recorded by a person','Contacto ficticio registrado por una persona'],
  ['Você está registrando apenas a ação de contato deste exemplo. Isso não envia a mensagem e não registra resposta ou confirmação.','You are only recording this example’s contact action. This does not send a message or record a reply or confirmation.','Solo está registrando la acción de contacto de este ejemplo. Esto no envía un mensaje ni registra una respuesta o confirmación.'],
  ['Confirmo o registro de um contato inteiramente fictício.','I confirm the recording of an entirely fictional contact.','Confirmo el registro de un contacto completamente ficticio.'],
  ['Contato fictício salvo. A pendência aguarda resposta; não foi encerrada.','Fictional contact saved. The case awaits a reply; it has not been closed.','Contacto ficticio guardado. El caso espera respuesta; no se ha cerrado.'],
  ['Registrar orientação da equipe fictícia','Record fictional team guidance','Registrar orientación del equipo ficticio'],
  ['Esta ação simula o registro humano da orientação da equipe e acrescenta sua fonte ao exemplo. Nenhum intervalo clínico é calculado ou oferecido.','This action simulates a human record of team guidance and adds its source to the example. No clinical interval is calculated or offered.','Esta acción simula el registro humano de la orientación del equipo y añade su fuente al ejemplo. No se calcula ni ofrece ningún intervalo clínico.'],
  ['Autorizo acrescentar a orientação inteiramente fictícia a este exemplo.','I authorize adding the entirely fictional guidance to this example.','Autorizo añadir la orientación completamente ficticia a este ejemplo.'],
  ['Orientação fictícia registrada. A próxima etapa registra resposta e agenda simuladas.','Fictional guidance recorded. The next stage records a simulated reply and schedule.','Orientación ficticia registrada. La próxima etapa registra una respuesta y una agenda simuladas.'],
  ['Registrar resposta e reposição fictícias','Record fictional reply and replacement','Registrar respuesta y nueva cita ficticias'],
  ['Esta ação acrescenta dois fatos simulados: confirmação da opção autorizada e reposição correspondente na agenda. As fontes ficarão na aba Registros; confira-as antes de encerrar. A pendência permanece aberta.','This action adds two simulated facts: confirmation of the authorized option and its corresponding schedule replacement. Sources will appear in Records; review them before closing. The case stays open.','Esta acción añade dos hechos simulados: la confirmación de la opción autorizada y la nueva cita correspondiente en la agenda. Las fuentes aparecerán en Registros; revíselas antes del cierre. El caso permanece abierto.'],
  ['Autorizo registrar uma resposta fictícia confirmando a opção autorizada.','I authorize recording a fictional reply confirming the authorized option.','Autorizo registrar una respuesta ficticia que confirma la opción autorizada.'],
  ['Autorizo registrar a reposição correspondente na agenda fictícia.','I authorize recording the corresponding replacement in the fictional schedule.','Autorizo registrar la nueva cita correspondiente en la agenda ficticia.'],
  ['Resposta e agenda fictícias registradas. Confira suas fontes antes do encerramento administrativo.','Fictional reply and schedule recorded. Review their sources before administrative closure.','Respuesta y agenda ficticias registradas. Revise sus fuentes antes del cierre administrativo.'],
  ['Encerrar após a conferência humana','Close after human review','Cerrar después de la revisión humana'],
  ['A resolução administrativa depende de confirmação e agenda consistentes. A ação será registrada no histórico deste caso fictício.','Administrative resolution requires consistent confirmation and schedule. The action will be recorded in this fictional case’s history.','La resolución administrativa requiere una confirmación y agenda coherentes. La acción se registrará en el historial de este caso ficticio.'],
  ['Conferi a confirmação humana fictícia.','I reviewed the fictional human confirmation.','He revisado la confirmación humana ficticia.'],
  ['Conferi que agenda e fila correspondem à reposição autorizada.','I checked that schedule and queue match the authorized replacement.','He comprobado que la agenda y la cola coinciden con la nueva cita autorizada.'],
  ['Pendência fictícia resolvida após conferência humana. Confira a fila de resolvidas.','Fictional case resolved after human review. Check the resolved queue.','Caso ficticio resuelto tras la revisión humana. Revise la cola de casos resueltos.'],
  ['Reiniciar os oito casos fictícios','Reset the eight fictional cases','Reiniciar los ocho casos ficticios'],
  ['O progresso atual e os rascunhos não salvos serão substituídos pelo estado inicial. Exporte uma cópia antes de reiniciar, se quiser preservá-lo.','Current progress and unsaved drafts will be replaced by the initial state. Export a copy before resetting if you want to keep them.','El progreso actual y los borradores sin guardar se sustituirán por el estado inicial. Exporte una copia antes de reiniciar si desea conservarlos.'],
  ['Confirmo a substituição do progresso da demonstração.','I confirm replacement of the demo’s progress.','Confirmo la sustitución del progreso de la demostración.'],
  ['Os oito casos fictícios voltaram ao estado inicial.','The eight fictional cases returned to their initial state.','Los ocho casos ficticios volvieron a su estado inicial.'],
  ['O arquivo excede o tamanho permitido para estes oito casos.','The file exceeds the size limit for these eight cases.','El archivo supera el tamaño permitido para estos ocho casos.'],
  ['Progresso fictício importado e salvo neste computador.','Fictional progress imported and saved on this computer.','Progreso ficticio importado y guardado en este ordenador.'],
  ['Não foi possível ler o JSON. Use um arquivo exportado nesta demonstração.','Could not read the JSON. Use a file exported from this demo.','No se pudo leer el JSON. Use un archivo exportado de esta demostración.'],
  ['Servidor local indisponível.','Local server unavailable.','Servidor local no disponible.'],
  ['Não foi possível abrir o progresso','Could not open progress','No se pudo abrir el progreso'],
  ['Confira se a demonstração local está aberta e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.','Check that the local demo is running and reload. An initial state will not automatically replace your records.','Compruebe que la demostración local está abierta y recargue. Ningún estado inicial sustituirá sus registros automáticamente.'],
  ['Tentar novamente','Try again','Volver a intentar'],
  ['Ler → conferir → preparar','Read → review → prepare','Leer → revisar → preparar'],
  ['Um retorno, com a origem à vista.','A follow-up with its source in view.','Un seguimiento con su origen a la vista.'],
  ['Localize os registros desta etapa e prepare um cartão com os trechos que você conferiu.','Find this stage’s records and prepare a card with the excerpts you reviewed.','Localice los registros de esta etapa y prepare una tarjeta con los fragmentos que revisó.'],
  ['Consulta local · Sem modelo','Local lookup · No model','Consulta local · Sin modelo'],
  ['O que precisa conferir neste caso fictício?','What needs checking in this fictional case?','¿Qué necesita revisar en este caso ficticio?'],
  ['Perguntas administrativas sugeridas','Suggested administrative questions','Preguntas administrativas sugeridas'],
  ['Qual pendência continua aberta e quem é o responsável?','Which issue is still open, and who is responsible?','¿Qué asunto sigue pendiente y quién es responsable?'],
  ['Qual preferência de contato foi registrada?','Which contact preference was recorded?','¿Qué preferencia de contacto se registró?'],
  ['Há confirmação consistente na agenda e na fila?','Do the schedule and queue show a consistent confirmation?','¿La agenda y la cola muestran una confirmación coherente?'],
  ['Pendência e responsável','Issue and assignee','Asunto y responsable'],
  ['Preferência de contato','Contact preference','Preferencia de contacto'],
  ['Agenda e confirmação','Schedule and confirmation','Agenda y confirmación'],
  ['Somente os registros da etapa atual; não altera o caso.','Current-stage records only; does not change the case.','Solo registros de la etapa actual; no modifica el caso.'],
  ['Comece pela pergunta.','Start with the question.','Empiece por la pregunta.'],
  ['A pergunta mudou. Refaça a consulta para conferir os registros.','The question changed. Run the lookup again to check the records.','La pregunta cambió. Repita la consulta para revisar los registros.'],
  ['A consulta encontra trechos literais. A pessoa confere o significado e decide o próximo passo.','Lookup finds literal excerpts. A person reviews their meaning and decides the next step.','La consulta encuentra fragmentos literales. Una persona revisa su significado y decide el próximo paso.'],
  ['Revisões salvas deste caso','Saved reviews for this case','Revisiones guardadas de este caso'],
  ['Consultando os registros locais…','Checking local records…','Consultando los registros locales…'],
  ['Esta consulta não faz inferência de IA. Um cartão organiza registros fictícios conferidos; não é orientação médica, contato enviado ou confirmação de agenda.','This lookup does not run AI inference. A card organizes reviewed fictional records; it is not medical advice, a sent contact, or a confirmed appointment.','Esta consulta no ejecuta inferencia de IA. Una tarjeta organiza registros ficticios revisados; no es orientación médica, un contacto enviado ni una cita confirmada.'],
  ['Conferência registrada','Review recorded','Revisión registrada'],
  ['Cartão de conferência','Review card','Tarjeta de revisión'],
  ['Não envia mensagens.','Does not send messages.','No envía mensajes.'],
  ['Não altera a agenda ou encerra a pendência.','Does not change the schedule or close the case.','No modifica la agenda ni cierra el caso.'],
  ['Os registros mudaram. Confira a versão atual antes de preparar o cartão.','Records changed. Check the current version before preparing the card.','Los registros cambiaron. Revise la versión actual antes de preparar la tarjeta.'],
  ['Não foi possível consultar os registros locais.','Could not check local records.','No se pudieron consultar los registros locales.'],
  ['Abrir cartão salvo','Open saved card','Abrir tarjeta guardada'],
  ['Registro anterior. Refaça a consulta para conferir as fontes atuais.','Previous record. Run the lookup again to review current sources.','Registro anterior. Repita la consulta para revisar las fuentes actuales.'],
  ['Nenhuma conferência registrada ainda. O cartão fica salvo separadamente do caso.','No review recorded yet. Cards are saved separately from the case.','Aún no se ha registrado ninguna revisión. Las tarjetas se guardan por separado del caso.'],
  ['Não foi possível abrir as revisões salvas. Seus registros não foram substituídos.','Could not open saved reviews. Your records were not replaced.','No se pudieron abrir las revisiones guardadas. Sus registros no se sustituyeron.'],
  ['A equipe precisa assumir esta pergunta.','The team needs to take over this question.','El equipo debe hacerse cargo de esta pregunta.'],
  ['A consulta local não encontrou trechos suficientes.','Local lookup did not find enough excerpts.','La consulta local no encontró suficientes fragmentos.'],
  ['Confira a informação no registro de origem.','Check the information in its source record.','Revise la información en su registro de origen.'],
  ['Registro da etapa atual','Current-stage record','Registro de la etapa actual'],
  ['Cartão bloqueado enquanto esta conferência depende da equipe.','Card blocked while this review requires the team.','Tarjeta bloqueada mientras esta revisión requiera al equipo.'],
  ['Conferi este trecho e quero incluí-lo no cartão.','I reviewed this excerpt and want to include it in the card.','He revisado este fragmento y quiero incluirlo en la tarjeta.'],
  ['Histórico: não pode determinar a ação atual nem entrar no cartão.','Previous source: cannot determine the current action or appear in the card.','Fuente anterior: no puede determinar la acción actual ni aparecer en la tarjeta.'],
  ['Conferi o significado dos trechos selecionados e a etapa atual. Este cartão é somente administrativo.','I reviewed the meaning of the selected excerpts and the current stage. This card is administrative only.','He revisado el significado de los fragmentos seleccionados y la etapa actual. Esta tarjeta es solo administrativa.'],
  ['Preparar cartão revisado','Prepare reviewed card','Preparar tarjeta revisada'],
  ['Sua conferência ficará registrada; a pendência continua no mesmo estado.','Your review will be recorded; the case stays in the same state.','Su revisión quedará registrada; el caso permanece en el mismo estado.'],
  ['Conferência salva','Review saved','Revisión guardada'],
  ['Conferência salva. Nenhum contato, agenda ou encerramento foi registrado.','Review saved. No contact, schedule change, or closure was recorded.','Revisión guardada. No se registró ningún contacto, cambio de agenda ni cierre.'],
  ['Localizando as fontes da etapa atual…','Finding current-stage sources…','Localizando las fuentes de la etapa actual…'],
  ['A consulta não foi concluída. Confira o aviso e tente novamente.','Lookup did not finish. Check the notice and try again.','La consulta no finalizó. Revise el aviso y vuelva a intentar.'],
  ['Fonte original · Português','Original source · Portuguese','Fuente original · Portugués'],
  ['Texto original · Português','Original text · Portuguese','Texto original · Portugués'],
  ['Histórico original · Português','Original history · Portuguese','Historial original · Portugués'],
  ['Versão do progresso','Progress version','Versión del progreso'],
  ['A busca é lexical, em fontes portuguesas. As perguntas sugeridas usam um equivalente fixo em português; perguntas livres em outros idiomas podem não encontrar termos. Não há tradução ou interpretação automática.','Lookup is lexical, using Portuguese sources. Suggested questions use a fixed Portuguese equivalent; free-text questions in other languages may not match terms. No automatic translation or interpretation.','La búsqueda es léxica y utiliza fuentes en portugués. Las preguntas sugeridas usan un equivalente fijo en portugués; las preguntas libres en otros idiomas pueden no encontrar términos. Sin traducción ni interpretación automática.'],
  ['A busca literal local não encontrou termos suficientes nas fontes vigentes. Isso não comprova ausência de informação.','Local literal lookup did not find enough matching terms in current sources. This does not prove information is absent.','La búsqueda literal local no encontró suficientes términos en las fuentes vigentes. Esto no demuestra que falte información.'],
  ['O estado administrativo registra divergência entre os registros. Confira todas as fontes vigentes com a equipe humana; um cartão permanece bloqueado até a resolução pelo fluxo responsável.','The administrative state records a disagreement. Review all current sources with the human team; the card remains blocked until the responsible workflow resolves it.','El estado administrativo registra una discrepancia. Revise todas las fuentes vigentes con el equipo humano; la tarjeta permanece bloqueada hasta que el flujo responsable la resuelva.'],
  ['Esta consulta requer conferência pela equipe humana. A regra lexical local é conservadora e não faz avaliação clínica nem executa ações.','This question requires human team review. The conservative local lexical rule does not assess clinical conditions or execute actions.','Esta pregunta requiere revisión del equipo humano. La regla léxica local conservadora no evalúa condiciones clínicas ni ejecuta acciones.'],
  ['O pedido de conferência não possui o formato esperado.','The review request does not have the expected format.','La solicitud de revisión no tiene el formato esperado.'],
  ['O estado mudou. Atualize a conferência antes de continuar.','State changed. Refresh the review before continuing.','El estado cambió. Actualice la revisión antes de continuar.'],
  ['O estado administrativo registra divergência. Resolva-a pelo fluxo humano responsável antes de preparar um cartão.','The administrative state records a disagreement. Resolve it through the responsible human workflow before preparing a card.','El estado administrativo registra una discrepancia. Resuélvala mediante el flujo humano responsable antes de preparar una tarjeta.'],
  ['As fontes ou a fase mudaram. Faça uma nova consulta e confira os trechos.','Sources or stage changed. Run a new lookup and review the excerpts.','Las fuentes o la etapa cambiaron. Realice una nueva consulta y revise los fragmentos.'],
  ['Pendência resolvida administrativamente; o histórico permanece disponível.','Case resolved administratively; history remains available.','Caso resuelto administrativamente; el historial sigue disponible.'],
  ['Reposição confirmada; falta apenas a conferência humana para o encerramento.','Replacement confirmed; only human review for closure remains.','Nueva cita confirmada; solo falta la revisión humana para el cierre.'],
  ['A preferência registrada bloqueia novos rascunhos e contatos.','The recorded preference blocks new drafts and contacts.','La preferencia registrada bloquea nuevos borradores y contactos.'],
  ['Faltam um responsável atribuído e a preferência de contato registrada.','An assignee and recorded contact preference are missing.','Faltan un responsable asignado y una preferencia de contacto registrada.'],
  ['A preferência de contato precisa estar registrada antes de preparar um rascunho.','Contact preference must be recorded before preparing a draft.','Debe registrarse la preferencia de contacto antes de preparar un borrador.'],
  ['Este caso precisa de decisão humana antes de preparar contato.','This case needs a human decision before preparing contact.','Este caso requiere una decisión humana antes de preparar un contacto.'],
  ['A preferência e o canal de contato precisam estar registrados.','Contact preference and channel must be recorded.','Deben registrarse la preferencia y el canal de contacto.'],
  ['A coordenação precisa atribuir um responsável antes de preparar contato.','Coordination must assign a person before preparing contact.','Coordinación debe asignar una persona antes de preparar un contacto.'],
  ['Apenas coleta administrativa de disponibilidade; revisão humana obrigatória e nenhum envio.','Administrative availability collection only; mandatory human review and no sending.','Solo recogida administrativa de disponibilidad; revisión humana obligatoria y sin envío.'],
  ['Janela clinica nao informada; e preciso orientacao antes de oferecer um horario.','Clinical timing not specified; guidance is needed before offering a time.','Plazo clínico no indicado; se necesita orientación antes de ofrecer un horario.'],
  ['Janela clinica ausente; decisao nao pertence ao modelo.','Clinical timing absent; this decision does not belong to the model.','Plazo clínico ausente; esta decisión no corresponde al modelo.'],
  ['Urgencia declarada no relato; nao e inferencia ou triagem do modelo.','Urgency stated in the account; this is not model inference or triage.','Urgencia declarada en el relato; no es inferencia ni triaje del modelo.'],
  ['Preferencia de contato nao registrada; falta atribuicao.','Contact preference not recorded; assignment missing.','Preferencia de contacto no registrada; falta asignación.'],
  ['Contato adicional precisa de decisao humana e politica registrada; o modelo nao define frequencia.','Further contact requires a human decision and recorded policy; the model does not define frequency.','Más contactos requieren una decisión humana y una política registrada; el modelo no define la frecuencia.'],
  ['Preferencia explicita de nao receber.','Explicit preference for no contact.','Preferencia explícita de no recibir contactos.'],
  ['Nao gerar orientacao clinica; pergunta depende da equipe medica.','Do not generate clinical guidance; the question requires the medical team.','No generar orientación clínica; la pregunta requiere al equipo médico.'],
  ['Nao ha decisao humana de preparar contato neste caso de regra administrativa.','No human decision to prepare contact exists for this administrative-rule case.','No existe una decisión humana de preparar contacto en este caso de regla administrativa.'],
  ['Estado divergente e preferencia de contato nao registrada.','Conflicting state and contact preference not recorded.','Estado contradictorio y preferencia de contacto no registrada.'],
  ['Resposta clinica e rota de atendimento exigem equipe humana.','A clinical response and care route require the human team.','Una respuesta clínica y la vía de atención requieren al equipo humano.'],
  ['Trechos com termos em comum foram encontrados. Confira sua pertinência: a busca literal não interpreta o significado nem recomenda uma ação.','Excerpts with matching terms were found. Review their relevance: literal lookup does not interpret meaning or recommend an action.','Se encontraron fragmentos con términos coincidentes. Revise su pertinencia: la búsqueda literal no interpreta el significado ni recomienda una acción.'],
  ['Confirme pessoalmente a conferência dos trechos selecionados.','Personally confirm your review of the selected excerpts.','Confirme personalmente su revisión de los fragmentos seleccionados.'],
  ['Essa atribuição já está registrada.','This assignment is already recorded.','Esta asignación ya está registrada.'],
  ['Essa condição de revisão já está registrada.','This review status is already recorded.','Este estado de revisión ya está registrado.'],
  ['O contato deste rascunho já foi registrado na simulação.','Contact for this draft is already recorded in the simulation.','El contacto de este borrador ya está registrado en la simulación.'],
  ['O rascunho deve ser um texto de até 2.000 caracteres.','The draft must contain at most 2,000 characters.','El borrador debe contener como máximo 2.000 caracteres.'],
  ['Um rascunho vazio não pode receber revisão de contato.','An empty draft cannot receive a contact review.','Un borrador vacío no puede recibir una revisión de contacto.'],
  ['O arquivo separado de conferências é inválido. Preserve-o para revisão.','The separate review file is invalid. Preserve it for review.','El archivo separado de revisiones no es válido. Consérvelo para su revisión.'],
  ['Não foi possível ler os recibos locais de conferência.','Could not read the local review receipts.','No se pudieron leer los recibos locales de revisión.'],
  ['Não foi possível salvar o recibo. A conferência não foi registrada.','Could not save the receipt. The review was not recorded.','No se pudo guardar el recibo. La revisión no se registró.'],
  ['O arquivo local atingiu o limite de 120 conferências. Preserve os recibos antes de continuar.','The local file reached its limit of 120 reviews. Preserve the receipts before continuing.','El archivo local alcanzó el límite de 120 revisiones. Conserve los recibos antes de continuar.'],
  ['Os recibos atingiram o limite local de 512 KB. Preserve o arquivo antes de continuar.','Receipts reached the local 512 KB limit. Preserve the file before continuing.','Los recibos alcanzaron el límite local de 512 KB. Conserve el archivo antes de continuar.'],
  ['O pedido excede o limite local de 128 KB.','The request exceeds the local 128 KB limit.','La solicitud supera el límite local de 128 KB.'],
  ['O pedido foi interrompido.','The request was interrupted.','La solicitud se interrumpió.'],
  ['Aguarde a consulta ou o salvamento antes de trocar o idioma.','Wait for lookup or saving to finish before changing language.','Espere a que finalice la consulta o el guardado antes de cambiar el idioma.'],
];

const fold = value => String(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
const rows = new Map();
for (const row of catalog) for (const value of row) if (!rows.has(fold(value))) rows.set(fold(value),row);
let language = 'en';
try { const saved = globalThis.localStorage?.getItem(STORAGE_KEY); if (Object.hasOwn(LANGUAGES,saved)) language = saved; } catch { /* Browser storage is optional. */ }
export function getLanguage() { return language; }
export function getLocale(lang = language) { return LOCALES[lang] || LOCALES.en; }
export function setLanguage(value, storage) {
  language = Object.hasOwn(LANGUAGES,value) ? value : 'en';
  try { (storage === undefined ? globalThis.localStorage : storage)?.setItem(STORAGE_KEY,language); } catch { /* A blocked preference must not block the demo. */ }
  if (typeof document !== 'undefined') { document.documentElement.lang = getLocale(); document.title = ui('PatientKeeper — Retorno | Conferir com fontes'); }
  return language;
}
export function stamp(value, lang = language) { return new Intl.DateTimeFormat(getLocale(lang),{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)); }
export function ui(value, lang = language) {
  const text = String(value ?? '');
  const row = rows.get(fold(text));
  if (row) return row[{pt:0,en:1,es:2}[lang] ?? 1];
  const isEn = lang === 'en', isEs = lang === 'es';
  if (!isEn && !isEs) return text;
  const count = text.match(/^(\d+) (caso neste filtro|casos neste filtro)$/);
  if (count) return `${count[1]} ${isEn ? (count[1] === '1' ? 'case in this filter' : 'cases in this filter') : (count[1] === '1' ? 'caso en este filtro' : 'casos en este filtro')}`;
  const contact = text.match(/^(\d+) contatos? fictícios? registrados?$/);
  if (contact) return `${contact[1]} ${isEn ? (contact[1] === '1' ? 'fictional contact recorded' : 'fictional contacts recorded') : (contact[1] === '1' ? 'contacto ficticio registrado' : 'contactos ficticios registrados')}`;
  const sources = text.match(/^(\d+) trechos? localizados?$/);
  if (sources) return `${sources[1]} ${isEn ? (sources[1] === '1' ? 'excerpt found' : 'excerpts found') : (sources[1] === '1' ? 'fragmento localizado' : 'fragmentos localizados')}`;
  const historical = text.match(/^(\d+) registro histórico separado$/);
  if (historical) return `${historical[1]} ${isEn ? 'previous source(s) kept separate' : 'fuente(s) anterior(es) separada(s)'}`;
  const reviews = text.match(/^(\d+) conferências? salvas?\. Uma revisão anterior precisa ser refeita se os registros mudarem\.$/);
  if (reviews) return `${reviews[1]} ${isEn ? 'review(s) saved. Repeat a previous review if records change.' : 'revisión(es) guardada(s). Repita una revisión anterior si cambian los registros.'}`;
  const stage = text.match(/^Versão do progresso (\d+) · (\d+) (trecho|trechos)$/);
  if (stage) return `${ui('Versão do progresso',lang)} ${stage[1]} · ${stage[2]} ${isEn ? 'excerpt(s)' : 'fragmento(s)'}`;
  const storage = text.match(/^Progresso salvo neste navegador · Versão (\d+) · Consulta literal disponível · Execução AMD gravada · Sem inferência ao vivo\.$/);
  if (storage) return isEn ? `Progress saved in this browser · Version ${storage[1]} · Literal source lookup available · Recorded AMD execution · No live inference.` : `Progreso guardado en este navegador · Versión ${storage[1]} · Consulta literal de fuentes disponible · Ejecución AMD grabada · Sin inferencia en vivo.`;
  return text.replace(/Caso (\d+)/g,`${isEn ? 'Case' : 'Caso'} $1`).replace(/ · Fictício/g,isEn ? ' · Fictional' : ' · Ficticio').replace(/ · Dados fictícios/g,isEn ? ' · Fictional data' : ' · Datos ficticios').replace(/ · Somente dados fictícios/g,isEn ? ' · Fictional data only' : ' · Solo datos ficticios').replace(/ · Agenda fictícia/g,isEn ? ' · Fictional schedule' : ' · Agenda ficticia').replace(/^Responsável: /,isEn ? 'Assignee: ' : 'Responsable: ').replace(/^Responsável ainda não atribuído/,ui('Responsável ainda não atribuído',lang)).replace(/^Substituída por /,isEn ? 'Replaced by ' : 'Sustituida por ').replace(/^Origem: /,isEn ? 'Source: ' : 'Origen: ').replace(/^Registro (REVIEW-)/,isEn ? 'Record $1' : 'Registro $1').replace(/ · Versão do progresso (\d+)/g,` · ${ui('Versão do progresso',lang)} $1`);
}
export const suggestedQuestions = Object.freeze([
  'Qual pendência continua aberta e quem é o responsável?',
  'Qual preferência de contato foi registrada?',
  'Há confirmação consistente na agenda e na fila?',
]);
export function normalizeSuggestedQuestion(question) {
  const input = String(question).trim();
  for (const canonical of suggestedQuestions) for (const lang of Object.keys(LANGUAGES)) if (input === ui(canonical,lang)) return canonical;
  return input;
}
export function searchText(value) { return fold(value).toLocaleLowerCase('en'); }
export function errorText(message, fallback = 'Não foi possível registrar esta alteração.') {
  if (typeof message !== 'string' || !message.trim()) return ui(fallback);
  return rows.has(fold(message)) || getLanguage() === 'pt' ? ui(message) : ui(fallback);
}

const remembered = new WeakMap();
const rememberedAttributes = new WeakMap();
export function localizeTree(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes = []; let node;
  while ((node = walker.nextNode())) nodes.push(node);
  for (const textNode of nodes) {
    const parent = textNode.parentElement;
    if (!parent || parent.closest('[data-original],[data-source-reading],textarea,script,style,[data-language-option]')) continue;
    const previous = remembered.get(textNode);
    const canonical = previous && textNode.nodeValue === previous.last ? previous.canonical : textNode.nodeValue;
    const trim = canonical.trim(); if (!trim) continue;
    const next = canonical.replace(trim,ui(trim));
    textNode.nodeValue = next; remembered.set(textNode,{canonical,last:next});
  }
  for (const element of [root,...root.querySelectorAll('[aria-label],[placeholder],[title]')]) {
    if (element.closest?.('[data-original],[data-source-reading]')) continue;
    for (const name of ['aria-label','placeholder','title']) if (element.hasAttribute?.(name)) {
      let values = rememberedAttributes.get(element);
      if (!values) { values = new Map(); rememberedAttributes.set(element,values); }
      const previous = values.get(name);
      const current = element.getAttribute(name);
      const canonical = previous && previous.last === current ? previous.canonical : current;
      const next = ui(canonical); element.setAttribute(name,next); values.set(name,{canonical,last:next});
    }
  }
}
setLanguage(language);
