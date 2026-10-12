// A separate read-only calendar fixture. Its invented dates and times are UI
// examples, not case evidence, clinical timing, or appointment confirmations.
export const REFERENCE_DATE = '2026-10-12';
export const REFERENCE_MONTH = Object.freeze({ year: 2026, month: 9 });
export const TIME_ZONE = 'America/Sao_Paulo';

const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const doctors = freeze([
  { id: 'MED-SIM-A', name: 'MED-SIM-A' },
  { id: 'MED-SIM-B', name: 'MED-SIM-B' },
]);

// Every linked item is a review task or a reported record, never a verified
// replacement appointment. Unlinked availability examples cannot be booked.
export const entries = freeze([
  {
    id: 'AGENDA-SIM-01', date: '2026-10-12', start: '08:30', end: '09:00',
    doctorId: 'MED-SIM-A', caseId: 'SIM-RET-02', kind: 'review', status: 'pending',
    text: {
      en: ['Check the handoff owner', 'Administrative task example. Review who owns the pending case; no appointment is confirmed.'],
      pt: ['Conferir o responsável pelo handoff', 'Exemplo de tarefa administrativa. Confira quem assume a pendência; nenhuma consulta está confirmada.'],
      es: ['Revisar el responsable del traspaso', 'Ejemplo de tarea administrativa. Revise quién asume el caso pendiente; ninguna cita está confirmada.'],
    },
  },
  {
    id: 'AGENDA-SIM-02', date: '2026-10-12', start: '09:00', end: '09:30',
    doctorId: 'MED-SIM-A', caseId: 'SIM-RET-01', kind: 'record', status: 'cancelled',
    text: {
      en: ['Cancelled slot example', 'An invented calendar position illustrates the cancellation. There is no confirmed replacement in the case records.'],
      pt: ['Exemplo de horário cancelado', 'Uma posição inventada na agenda ilustra o cancelamento. Os registros do caso não confirmam reposição.'],
      es: ['Ejemplo de horario cancelado', 'Una posición inventada en la agenda ilustra la cancelación. Los registros del caso no confirman una nueva cita.'],
    },
  },
  {
    id: 'AGENDA-SIM-03', date: '2026-10-12', start: '09:30', end: '10:00',
    doctorId: 'MED-SIM-A', caseId: 'SIM-RET-05', kind: 'review', status: 'medical',
    text: {
      en: ['Route the missing timing question', 'A medical team review is required. This sample task time does not set a clinical window or permit rescheduling.'],
      pt: ['Encaminhar a dúvida sobre prazo ausente', 'É necessária revisão pela equipe médica. O horário desta tarefa de exemplo não define janela clínica nem permite remarcação.'],
      es: ['Derivar la pregunta sobre el plazo ausente', 'Se necesita revisión del equipo médico. La hora de esta tarea de ejemplo no define un plazo clínico ni permite reprogramar.'],
    },
  },
  {
    id: 'AGENDA-SIM-04', date: '2026-10-12', start: '10:00', end: '10:30',
    doctorId: 'MED-SIM-B', caseId: 'SIM-RET-04', kind: 'review', status: 'blocked',
    text: {
      en: ['Review the contact restriction', 'The recorded refusal remains in force. Viewing this task does not authorize another message or a booking.'],
      pt: ['Conferir a restrição de contato', 'A recusa registrada continua vigente. Abrir esta tarefa não autoriza outra mensagem nem agendamento.'],
      es: ['Revisar la restricción de contacto', 'La negativa registrada sigue vigente. Abrir esta tarea no autoriza otro mensaje ni una reserva.'],
    },
  },
  {
    id: 'AGENDA-SIM-05', date: '2026-10-12', start: '10:30', end: '11:00',
    doctorId: 'MED-SIM-B', caseId: 'SIM-RET-08', kind: 'review', status: 'medical',
    text: {
      en: ['Route the declared urgency', 'Only the fictional report is recorded. Clinical urgency and appropriate timing require medical team assessment; this calendar does not assess them.'],
      pt: ['Encaminhar a urgência declarada', 'Existe apenas o relato fictício registrado. A urgência clínica e o prazo adequado exigem avaliação da equipe médica; esta agenda não os avalia.'],
      es: ['Derivar la urgencia declarada', 'Solo consta el relato ficticio. La urgencia clínica y el plazo adecuado necesitan evaluación del equipo médico; esta agenda no los evalúa.'],
    },
  },
  {
    id: 'AGENDA-SIM-06', date: '2026-10-13', start: '09:00', end: '09:30',
    doctorId: 'MED-SIM-B', caseId: 'SIM-RET-03', kind: 'review', status: 'waiting',
    text: {
      en: ['Check whether a reply exists', 'One human contact attempt is recorded and no reply is present. The task does not authorize another attempt.'],
      pt: ['Conferir se há resposta registrada', 'Há uma tentativa humana de contato e nenhuma resposta. A tarefa não autoriza uma nova tentativa.'],
      es: ['Comprobar si existe una respuesta', 'Consta un intento de contacto humano y ninguna respuesta. La tarea no autoriza un nuevo intento.'],
    },
  },
  {
    id: 'AGENDA-SIM-07', date: '2026-10-13', start: '09:30', end: '10:00',
    doctorId: 'MED-SIM-A', caseId: 'SIM-RET-06', kind: 'review', status: 'pending',
    text: {
      en: ['Check the current assignment rule', 'Review the current V2 rule and explicit owner. A superseded rule cannot assign the pending task automatically.'],
      pt: ['Conferir a regra vigente de atribuição', 'Revise a regra V2 vigente e o responsável explícito. Uma regra substituída não atribui a pendência automaticamente.'],
      es: ['Revisar la regla vigente de asignación', 'Revise la regla V2 vigente y el responsable explícito. Una regla sustituida no asigna el caso pendiente automáticamente.'],
    },
  },
  {
    id: 'AGENDA-SIM-08', date: '2026-10-14', start: '09:00', end: '09:30',
    doctorId: 'MED-SIM-B', caseId: 'SIM-RET-07', kind: 'record', status: 'conflict',
    text: {
      en: ['Unresolved calendar–queue conflict', 'The case reports a calendar confirmation but the queue remains pending. This invented slot is not confirmation evidence; human source review is still required.'],
      pt: ['Divergência entre agenda e fila', 'O caso relata confirmação na agenda, mas a fila continua pendente. Este horário inventado não comprova confirmação; ainda é necessária conferência humana das fontes.'],
      es: ['Conflicto entre agenda y cola', 'El caso informa confirmación en la agenda, pero la cola sigue pendiente. Este horario inventado no prueba una confirmación; se necesita revisión humana de las fuentes.'],
    },
  },
  {
    id: 'AGENDA-SIM-09', date: '2026-10-14', start: '10:00', end: '10:30',
    doctorId: 'MED-SIM-A', caseId: null, kind: 'availability', status: 'available',
    text: {
      en: ['Example availability', 'An unlinked fictional slot for exploring the calendar. It cannot be booked and does not authorize an offer to any case.'],
      pt: ['Disponibilidade de exemplo', 'Horário fictício sem caso vinculado para explorar a agenda. Não permite reserva nem autoriza oferta para qualquer caso.'],
      es: ['Disponibilidad de ejemplo', 'Horario ficticio sin caso vinculado para explorar la agenda. No permite reservar ni autoriza ofrecerlo a ningún caso.'],
    },
  },
  {
    id: 'AGENDA-SIM-10', date: '2026-10-16', start: '14:00', end: '14:30',
    doctorId: 'MED-SIM-B', caseId: null, kind: 'availability', status: 'available',
    text: {
      en: ['Example availability', 'An unlinked fictional slot for exploring the calendar. It cannot be booked and does not authorize an offer to any case.'],
      pt: ['Disponibilidade de exemplo', 'Horário fictício sem caso vinculado para explorar a agenda. Não permite reserva nem autoriza oferta para qualquer caso.'],
      es: ['Disponibilidad de ejemplo', 'Horario ficticio sin caso vinculado para explorar la agenda. No permite reservar ni autoriza ofrecerlo a ningún caso.'],
    },
  },
]);

const labels = freeze({
  en: {
    title: 'Doctor calendar', subtitle: 'Explore the fictional agenda, then check the linked case.',
    calendarLabel: 'Fictional monthly doctor calendar', previous: 'Previous month', next: 'Next month',
    referenceDate: 'October example', allDoctors: 'All fictional doctors', doctorLabel: 'Doctor',
    dateLabel: 'Selected day', emptyDay: 'No example items on this day.', openCase: 'Open linked case',
    readOnly: 'Read-only example', dayItems: 'Agenda items', linkedCases: 'Linked cases',
    disclaimer: 'Invented dates and times · Brasília (UTC−3). These items do not confirm appointments, set clinical timing, or change case records.',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekdayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    statuses: { available: 'Example availability', cancelled: 'Cancelled example', pending: 'Administrative review', waiting: 'Reply missing', blocked: 'Contact blocked', medical: 'Medical team review', conflict: 'Unresolved conflict' },
    kinds: { availability: 'Unlinked example slot', review: 'Review task', record: 'Reported record' },
  },
  pt: {
    title: 'Calendário do médico', subtitle: 'Explore a agenda fictícia e confira o caso vinculado.',
    calendarLabel: 'Calendário mensal fictício do médico', previous: 'Mês anterior', next: 'Próximo mês',
    referenceDate: 'Exemplo de outubro', allDoctors: 'Todos os médicos fictícios', doctorLabel: 'Médico',
    dateLabel: 'Dia selecionado', emptyDay: 'Nenhum item de exemplo neste dia.', openCase: 'Abrir caso vinculado',
    readOnly: 'Exemplo somente para leitura', dayItems: 'Itens da agenda', linkedCases: 'Casos vinculados',
    disclaimer: 'Datas e horários inventados · Brasília (UTC−3). Estes itens não confirmam consultas, definem prazos clínicos nem alteram registros dos casos.',
    weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    weekdayNames: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'],
    statuses: { available: 'Disponibilidade de exemplo', cancelled: 'Cancelamento de exemplo', pending: 'Revisão administrativa', waiting: 'Sem resposta registrada', blocked: 'Contato bloqueado', medical: 'Revisão da equipe médica', conflict: 'Divergência não resolvida' },
    kinds: { availability: 'Horário de exemplo sem vínculo', review: 'Tarefa de conferência', record: 'Registro relatado' },
  },
  es: {
    title: 'Calendario del médico', subtitle: 'Explore la agenda ficticia y revise el caso vinculado.',
    calendarLabel: 'Calendario mensual ficticio del médico', previous: 'Mes anterior', next: 'Mes siguiente',
    referenceDate: 'Ejemplo de octubre', allDoctors: 'Todos los médicos ficticios', doctorLabel: 'Médico',
    dateLabel: 'Día seleccionado', emptyDay: 'No hay elementos de ejemplo este día.', openCase: 'Abrir el caso vinculado',
    readOnly: 'Ejemplo de solo lectura', dayItems: 'Elementos de la agenda', linkedCases: 'Casos vinculados',
    disclaimer: 'Fechas y horas inventadas · Brasilia (UTC−3). Estos elementos no confirman citas, definen plazos clínicos ni cambian los registros de los casos.',
    weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    weekdayNames: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    statuses: { available: 'Disponibilidad de ejemplo', cancelled: 'Cancelación de ejemplo', pending: 'Revisión administrativa', waiting: 'Sin respuesta registrada', blocked: 'Contacto bloqueado', medical: 'Revisión del equipo médico', conflict: 'Conflicto sin resolver' },
    kinds: { availability: 'Horario de ejemplo sin vínculo', review: 'Tarea de revisión', record: 'Registro informado' },
  },
});

export function calendarLabels(language = 'en') {
  return labels[language] ?? labels.en;
}

export function entryLabel(entry, language = 'en') {
  const text = entry?.text?.[language] ?? entry?.text?.en;
  if (!text) throw new TypeError('A calendar entry with localized text is required.');
  return Object.freeze({ title: text[0], description: text[1] });
}

function checkMonth(year, month) {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError('A year from 1 to 9999 and a zero-based month from 0 to 11 are required.');
  }
}

function utcDate(year, month, day) {
  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(year, month, day);
  return result;
}

function isoDate(date) {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function checkDate(value) {
  // Adjacent cells can reach year 0 or 10000 at the supported month limits.
  if (typeof value !== 'string' || !/^\d{4,5}-\d{2}-\d{2}$/.test(value)) throw new RangeError('A valid ISO calendar date is required.');
  const [year, month, day] = value.split('-').map(Number);
  const parsed = utcDate(year, month - 1, day);
  if (year > 10000 || month < 1 || month > 12 || day < 1 || isoDate(parsed) !== value) throw new RangeError('A valid ISO calendar date is required.');
}

function checkDoctor(doctorId) {
  if (doctorId !== 'all' && !doctors.some((doctor) => doctor.id === doctorId)) throw new RangeError('Unknown fictional doctor.');
}

export function shiftMonth(year, month, delta) {
  checkMonth(year, month);
  if (!Number.isInteger(delta)) throw new RangeError('The month offset must be an integer.');
  const shifted = year * 12 + month + delta;
  const result = { year: Math.floor(shifted / 12), month: ((shifted % 12) + 12) % 12 };
  checkMonth(result.year, result.month);
  return Object.freeze(result);
}

export function monthGrid(year, month) {
  checkMonth(year, month);
  const first = utcDate(year, month, 1);
  const offset = (first.getUTCDay() + 6) % 7;
  return freeze(Array.from({ length: 42 }, (_, index) => {
    const date = utcDate(year, month, 1 - offset + index);
    return {
      date: isoDate(date), day: date.getUTCDate(), inMonth: date.getUTCFullYear() === year && date.getUTCMonth() === month,
      weekday: index % 7,
    };
  }));
}

const ordered = (values) => Object.freeze(values.slice().sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id)));

export function entriesForDay(date, doctorId = 'all') {
  checkDate(date);
  checkDoctor(doctorId);
  return ordered(entries.filter((entry) => entry.date === date && (doctorId === 'all' || entry.doctorId === doctorId)));
}

export function entriesForMonth(year, month, doctorId = 'all') {
  checkMonth(year, month);
  checkDoctor(doctorId);
  const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`;
  return ordered(entries.filter((entry) => entry.date.startsWith(prefix) && (doctorId === 'all' || entry.doctorId === doctorId)));
}

export function monthSummary(year, month, doctorId = 'all') {
  const selected = entriesForMonth(year, month, doctorId);
  const result = { total: selected.length, linkedCases: new Set(selected.map((entry) => entry.caseId).filter(Boolean)).size };
  for (const status of Object.keys(labels.en.statuses)) result[status] = selected.filter((entry) => entry.status === status).length;
  return Object.freeze(result);
}
