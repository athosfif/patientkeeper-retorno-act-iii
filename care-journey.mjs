// An isolated synthetic episode. Importing this module performs no I/O.
// Clinical instructions remain pending; only receipt of team instructions is demonstrated.
export const CARE_EPISODE_ID = 'SIM-CARE-01';
export const CARE_OWNERS = Object.freeze(['MED-SIM-A', 'MED-SIM-B']);
export const CARE_MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const CARE_MAX_AUDIO_SECONDS = 120;
export const CARE_SURGERY_LABELS = Object.freeze({pt:'Cirurgia de joanete e bunionete',en:'Bunion and bunionette surgery',es:'Cirugía de juanete y juanete de sastre'});
const MAX_HISTORY = 160;
const SOURCE_TEXT = 'Exemplo administrativo fictício: o médico aprova conferir se a pessoa recebeu as orientações da sua equipe e encaminhar dúvidas à própria equipe. Este registro não contém cuidados clínicos, medicamentos, dosagens ou intervalos de retorno. A rotina simulada não exige operação da secretaria.';
const STATE_KEYS = ['schemaVersion','demo','episodeId','revision','createdAt','updatedAt','status','phase','owner','nextAction','dueAt','contactPreference','protocol','clinicalProtocol','message','transcript','note','contacts','responses','resolution','history','receipts'];
const ACTION_FIELDS = {
  plan: ['phase','owner','nextAction','dueAt'],
  preference: ['value'],
  protocol_update: ['version','sourceId','sourceText'],
  protocol_review: ['confirmed'],
  message_prepare: ['text'],
  message_review: ['confirmed'],
  contact_simulate: ['confirmed'],
  response_record: ['text','contactId','confirmed'],
  transcript_set: ['text','segments','provenance','confirmed'],
  note_prepare: ['segmentIds'],
  note_review: ['confirmed'],
  close: ['text','confirmed'],
};
const copy = Object.freeze({
  en: { preoperative:'Preoperative', postoperative:'Postoperative', open:'Open administrative episode', resolved:'Human-reviewed resolution', not_recorded:'Not recorded', opt_in:'Opt-in recorded for simulation', refused:'Further contact refused', pending:'Review pending', reviewed:'Reviewed in simulation', prepared:'Prepared · not sent', simulated:'Contact recorded in simulation', empty:'Not prepared', draft:'Extractive draft', manual_text:'Text entered manually', local_asr:'Local audio transcription', noTranscript:'No transcript', noDue:'No administrative check scheduled' },
  pt: { preoperative:'Pré-operatório', postoperative:'Pós-operatório', open:'Episódio administrativo aberto', resolved:'Resolução conferida por uma pessoa', not_recorded:'Não registrada', opt_in:'Opt-in registrado na simulação', refused:'Novos contatos recusados', pending:'Revisão pendente', reviewed:'Revisado na simulação', prepared:'Preparada · não enviada', simulated:'Contato registrado na simulação', empty:'Não preparado', draft:'Rascunho extrativo', manual_text:'Texto inserido manualmente', local_asr:'Transcrição local de áudio', noTranscript:'Sem transcrição', noDue:'Sem conferência administrativa agendada' },
  es: { preoperative:'Preoperatorio', postoperative:'Posoperatorio', open:'Episodio administrativo abierto', resolved:'Resolución revisada por una persona', not_recorded:'No registrada', opt_in:'Opt-in registrado en la simulación', refused:'Se rechazaron nuevos contactos', pending:'Revisión pendiente', reviewed:'Revisado en la simulación', prepared:'Preparada · no enviada', simulated:'Contacto registrado en la simulación', empty:'No preparado', draft:'Borrador extractivo', manual_text:'Texto introducido manualmente', local_asr:'Transcripción local de audio', noTranscript:'Sin transcripción', noDue:'Sin revisión administrativa programada' },
});

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function record(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('CARE_INVALID_SHAPE');
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key)
    || !Object.getOwnPropertyDescriptor(value,key)?.enumerable
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))) fail('CARE_INVALID_SHAPE');
}
function list(value, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum
    || Reflect.ownKeys(value).length !== value.length + 1) fail('CARE_INVALID_SHAPE');
  for (let index=0; index<value.length; index+=1) {
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor,'value')) fail('CARE_INVALID_SHAPE');
  }
}
function text(value, maximum, empty=false) {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim())) fail('CARE_INVALID_TEXT');
}
function id(value) { if (typeof value !== 'string' || !/^[A-Z0-9][A-Z0-9._-]{0,79}$/.test(value)) fail('CARE_INVALID_ID'); }
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,19) !== value.slice(0,19)) fail('CARE_INVALID_TIME');
}
function integer(value) { if (!Number.isSafeInteger(value) || value < 0) fail('CARE_INVALID_SHAPE'); }
const clone = value => JSON.parse(JSON.stringify(value));
const languageOf = language => Object.hasOwn(copy,language) ? language : 'en';
const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))));

export function createCareJourneyState(now=new Date().toISOString()) {
  timestamp(now);
  return {
    schemaVersion:1, demo:true, episodeId:CARE_EPISODE_ID, revision:0, createdAt:now, updatedAt:now,
    status:'open', phase:'preoperative', owner:'MED-SIM-A', nextAction:'', dueAt:null, contactPreference:'not_recorded',
    protocol:{id:'PROTO-ADMIN-01',version:'ADMIN-DEMO-1',sourceId:'TEAM-RECEIPT-01',sourceText:SOURCE_TEXT,revision:0,reviewedRevision:null,reviewedAt:null},
    clinicalProtocol:{status:'pending',version:null,source:null},
    message:{text:'',revision:0,reviewedRevision:null,reviewedProtocolRevision:null,reviewedAt:null},
    transcript:{text:'',segments:[],provenance:null,revision:0,recordedAt:null},
    note:{text:'',segmentIds:[],revision:0,transcriptRevision:null,reviewedRevision:null,reviewedProtocolRevision:null,reviewedAt:null},
    contacts:[],responses:[],resolution:null,history:[],receipts:[],
  };
}

function checkTranscript(transcript) {
  record(transcript,['text','segments','provenance','revision','recordedAt']);
  text(transcript.text,12000,true); integer(transcript.revision); list(transcript.segments,80);
  if (transcript.provenance === null) {
    if (transcript.text !== '' || transcript.segments.length || transcript.recordedAt !== null) fail('CARE_INVALID_TRANSCRIPT');
    return;
  }
  record(transcript.provenance,['mode','engine','modelId','modelRevision']);
  const p=transcript.provenance;
  if (!['manual_text','local_asr'].includes(p.mode)) fail('CARE_INVALID_TRANSCRIPT');
  if (p.mode === 'manual_text') {
    if ([p.engine,p.modelId,p.modelRevision].some(value=>value !== null)) fail('CARE_INVALID_TRANSCRIPT');
  } else {
    for (const value of [p.engine,p.modelId,p.modelRevision]) {
      if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(value)) fail('CARE_INVALID_TRANSCRIPT');
    }
  }
  if (!transcript.text.trim() || !transcript.segments.length) fail('CARE_INVALID_TRANSCRIPT');
  timestamp(transcript.recordedAt);
  let previousEnd=0;
  const ids=new Set();
  for (const segment of transcript.segments) {
    record(segment,['id','text','start','end']); id(segment.id); text(segment.text,3000);
    if (ids.has(segment.id)) fail('CARE_INVALID_TRANSCRIPT'); ids.add(segment.id);
    if (p.mode === 'manual_text') {
      if (segment.start !== null || segment.end !== null) fail('CARE_INVALID_TRANSCRIPT');
    } else {
      if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < previousEnd
        || segment.end <= segment.start || segment.end > CARE_MAX_AUDIO_SECONDS) fail('CARE_INVALID_TRANSCRIPT');
      previousEnd=segment.end;
    }
  }
  if (transcript.segments.map(segment=>segment.text.trim()).join(' ').replace(/\s+/g,' ').trim()
    !== transcript.text.replace(/\s+/g,' ').trim()) fail('CARE_INVALID_TRANSCRIPT');
}

function noteText(transcript, segmentIds) {
  return segmentIds.map(segmentId => {
    const segment=transcript.segments.find(item=>item.id === segmentId);
    if (!segment) fail('CARE_UNKNOWN_SEGMENT');
    return `[${segment.id}] ${segment.text}`;
  }).join('\n\n');
}

export function validateCareJourneyState(state) {
  record(state,STATE_KEYS);
  if (state.schemaVersion !== 1 || state.demo !== true || state.episodeId !== CARE_EPISODE_ID
    || !['open','resolved'].includes(state.status) || !['preoperative','postoperative'].includes(state.phase)
    || (state.owner !== null && !CARE_OWNERS.includes(state.owner))
    || !['not_recorded','opt_in','refused'].includes(state.contactPreference)) fail('CARE_INVALID_STATE');
  integer(state.revision); timestamp(state.createdAt); timestamp(state.updatedAt);
  if (Date.parse(state.updatedAt) < Date.parse(state.createdAt)) fail('CARE_INVALID_TIME');
  text(state.nextAction,500,true); if (state.dueAt !== null) timestamp(state.dueAt);
  record(state.protocol,['id','version','sourceId','sourceText','revision','reviewedRevision','reviewedAt']);
  const protocol=state.protocol;
  if (protocol.id !== 'PROTO-ADMIN-01') fail('CARE_INVALID_STATE');
  id(protocol.version); id(protocol.sourceId); text(protocol.sourceText,4000); integer(protocol.revision);
  if (protocol.reviewedRevision !== null && protocol.reviewedRevision !== protocol.revision) fail('CARE_INVALID_REVIEW');
  if ((protocol.reviewedRevision === null) !== (protocol.reviewedAt === null)) fail('CARE_INVALID_REVIEW');
  if (protocol.reviewedAt !== null) timestamp(protocol.reviewedAt);
  record(state.clinicalProtocol,['status','version','source']);
  if (state.clinicalProtocol.status !== 'pending' || state.clinicalProtocol.version !== null || state.clinicalProtocol.source !== null) fail('CARE_CLINICAL_PROTOCOL_PENDING');
  record(state.message,['text','revision','reviewedRevision','reviewedProtocolRevision','reviewedAt']);
  const message=state.message; text(message.text,2000,true); integer(message.revision);
  if (message.reviewedRevision !== null && (message.reviewedRevision !== message.revision
    || message.reviewedProtocolRevision !== protocol.revision || protocol.reviewedRevision !== protocol.revision
    || state.contactPreference !== 'opt_in' || !message.text.trim())) fail('CARE_INVALID_REVIEW');
  if ((message.reviewedRevision === null) !== (message.reviewedAt === null)
    || (message.reviewedRevision === null) !== (message.reviewedProtocolRevision === null)) fail('CARE_INVALID_REVIEW');
  if (message.reviewedAt !== null) timestamp(message.reviewedAt);
  checkTranscript(state.transcript);
  record(state.note,['text','segmentIds','revision','transcriptRevision','reviewedRevision','reviewedProtocolRevision','reviewedAt']);
  const note=state.note; text(note.text,16000,true); integer(note.revision); list(note.segmentIds,80);
  if (new Set(note.segmentIds).size !== note.segmentIds.length) fail('CARE_INVALID_NOTE');
  if (note.text) {
    if (note.transcriptRevision !== state.transcript.revision || !note.segmentIds.length
      || note.text !== noteText(state.transcript,note.segmentIds)) fail('CARE_INVALID_NOTE');
  } else if (note.segmentIds.length || note.transcriptRevision !== null) fail('CARE_INVALID_NOTE');
  if (note.reviewedRevision !== null && (note.reviewedRevision !== note.revision
    || note.reviewedProtocolRevision !== protocol.revision || !note.text)) fail('CARE_INVALID_REVIEW');
  if ((note.reviewedRevision === null) !== (note.reviewedAt === null)
    || (note.reviewedRevision === null) !== (note.reviewedProtocolRevision === null)) fail('CARE_INVALID_REVIEW');
  if (note.reviewedAt !== null) timestamp(note.reviewedAt);
  list(state.contacts,20); list(state.responses,30); list(state.history,MAX_HISTORY); list(state.receipts,MAX_HISTORY);
  const contactIds=new Set();
  for (const contact of state.contacts) {
    record(contact,['id','at','messageText','messageRevision','protocolVersion','protocolRevision','status']);
    id(contact.id); timestamp(contact.at); text(contact.messageText,2000); id(contact.protocolVersion);
    integer(contact.messageRevision); integer(contact.protocolRevision);
    if (contact.status !== 'simulation' || contactIds.has(contact.id)) fail('CARE_INVALID_STATE');
    contactIds.add(contact.id);
  }
  const responseIds=new Set();
  for (const response of state.responses) {
    record(response,['id','at','text','contactId','status']); id(response.id); timestamp(response.at); text(response.text,2000);
    if (response.status !== 'simulated_received' || responseIds.has(response.id)
      || (response.contactId !== null && !contactIds.has(response.contactId))) fail('CARE_INVALID_STATE');
    responseIds.add(response.id);
  }
  if (state.history.length !== state.revision || state.receipts.length !== state.revision) fail('CARE_INVALID_HISTORY');
  let previous=Date.parse(state.createdAt);
  for (const [index,event] of state.history.entries()) {
    record(event,['id','type','at','revision']);
    if (event.id !== `CARE-EVT-${String(index+1).padStart(4,'0')}` || !Object.hasOwn(ACTION_FIELDS,event.type) || event.revision !== index+1) fail('CARE_INVALID_HISTORY');
    timestamp(event.at); if (Date.parse(event.at)<previous) fail('CARE_INVALID_TIME'); previous=Date.parse(event.at);
  }
  if (state.history.length && state.history.at(-1).at !== state.updatedAt) fail('CARE_INVALID_HISTORY');
  const receiptKeys=new Set();
  for (const receipt of state.receipts) {
    record(receipt,['key','action','revision']); id(receipt.key); text(receipt.action,30000); integer(receipt.revision);
    if (receipt.revision < 1 || receipt.revision > state.revision || receiptKeys.has(receipt.key)) fail('CARE_INVALID_HISTORY');
    receiptKeys.add(receipt.key);
  }
  if (state.resolution !== null) {
    record(state.resolution,['at','text','humanSimulation']); timestamp(state.resolution.at); text(state.resolution.text,1000);
    if (state.status !== 'resolved' || state.resolution.humanSimulation !== true || !state.owner || !state.nextAction.trim()
      || !state.dueAt || (!state.responses.length && state.contactPreference !== 'refused')
      || (note.text && note.reviewedRevision !== note.revision)) fail('CARE_INVALID_RESOLUTION');
  } else if (state.status !== 'open') fail('CARE_INVALID_RESOLUTION');
  if (JSON.stringify(state).length > 512000) fail('CARE_STATE_LIMIT');
  return true;
}

function clearMessageReview(state) { state.message.reviewedRevision=null; state.message.reviewedProtocolRevision=null; state.message.reviewedAt=null; }
function clearNoteReview(state) { state.note.reviewedRevision=null; state.note.reviewedProtocolRevision=null; state.note.reviewedAt=null; }
function requirePlan(state) { if (!state.owner || !state.nextAction.trim() || !state.dueAt) fail('CARE_PLAN_REQUIRED'); }
function requireContact(state) {
  requirePlan(state);
  if (state.contactPreference !== 'opt_in') fail('CARE_CONTACT_BLOCKED');
  if (state.protocol.reviewedRevision !== state.protocol.revision) fail('CARE_PROTOCOL_REVIEW_REQUIRED');
}
function confirmed(action) { if (action.confirmed !== true) fail('CARE_HUMAN_CONFIRMATION_REQUIRED'); }
function actionValues(action,now) {
  // Validate nested data before serialization: input must not execute toJSON or accessors.
  for (const field of ACTION_FIELDS[action.type]) {
    if (['segments','provenance','segmentIds'].includes(field)) continue;
    const value=action[field];
    if (field==='confirmed') { if(typeof value!=='boolean') fail('CARE_INVALID_SHAPE'); }
    else if (field==='contactId' && value===null) continue;
    else if (typeof value!=='string') fail('CARE_INVALID_SHAPE');
  }
  if (action.type==='transcript_set') checkTranscript({text:action.text,segments:action.segments,provenance:action.provenance,revision:0,recordedAt:now});
  if (action.type==='note_prepare') { list(action.segmentIds,80); for(const segmentId of action.segmentIds) id(segmentId); }
}

export function transitionCareJourney(state,action,options) {
  validateCareJourneyState(state);
  record(options,['expectedRevision','now']); integer(options.expectedRevision); timestamp(options.now);
  if (!action || typeof action !== 'object' || !Object.hasOwn(ACTION_FIELDS,Object.getOwnPropertyDescriptor(action,'type')?.value)) fail('CARE_UNKNOWN_ACTION');
  record(action,['type','idempotencyKey',...ACTION_FIELDS[action.type]]); id(action.idempotencyKey);
  actionValues(action,options.now);
  const actionText=canonical(action);
  const receipt=state.receipts.find(item=>item.key === action.idempotencyKey);
  if (receipt) {
    if (receipt.action !== actionText) fail('CARE_IDEMPOTENCY_CONFLICT');
    return clone(state);
  }
  if (options.expectedRevision !== state.revision) fail('CARE_STALE_CONTEXT');
  if (state.status === 'resolved') fail('CARE_RESOLVED_IMMUTABLE');
  if (Date.parse(options.now) < Date.parse(state.updatedAt)) fail('CARE_INVALID_TIME');
  if (state.history.length >= MAX_HISTORY) fail('CARE_HISTORY_LIMIT');
  const next=clone(state);
  switch(action.type) {
    case 'plan':
      if (!['preoperative','postoperative'].includes(action.phase) || !CARE_OWNERS.includes(action.owner)) fail('CARE_INVALID_PLAN');
      text(action.nextAction,500); timestamp(action.dueAt);
      if (Date.parse(action.dueAt) < Date.parse(options.now)) fail('CARE_INVALID_DUE');
      next.phase=action.phase; next.owner=action.owner; next.nextAction=action.nextAction; next.dueAt=action.dueAt;
      clearMessageReview(next); break;
    case 'preference':
      if (!['not_recorded','opt_in','refused'].includes(action.value)) fail('CARE_INVALID_PREFERENCE');
      next.contactPreference=action.value; clearMessageReview(next); break;
    case 'protocol_update':
      id(action.version); id(action.sourceId); text(action.sourceText,4000);
      next.protocol={...next.protocol,version:action.version,sourceId:action.sourceId,sourceText:action.sourceText,revision:next.protocol.revision+1,reviewedRevision:null,reviewedAt:null};
      clearMessageReview(next); clearNoteReview(next); break;
    case 'protocol_review':
      confirmed(action); requirePlan(next);
      next.protocol.reviewedRevision=next.protocol.revision; next.protocol.reviewedAt=options.now; break;
    case 'message_prepare':
      requireContact(next); text(action.text,2000);
      next.message.text=action.text; next.message.revision+=1; clearMessageReview(next); break;
    case 'message_review':
      confirmed(action); requireContact(next); text(next.message.text,2000);
      next.message.reviewedRevision=next.message.revision; next.message.reviewedProtocolRevision=next.protocol.revision; next.message.reviewedAt=options.now; break;
    case 'contact_simulate': {
      confirmed(action); requireContact(next);
      if (next.message.reviewedRevision !== next.message.revision || !next.message.text.trim()) fail('CARE_MESSAGE_REVIEW_REQUIRED');
      if (next.contacts.some(contact=>contact.messageText === next.message.text && contact.protocolVersion === next.protocol.version)) fail('CARE_DUPLICATE_CONTACT');
      const last=next.contacts.at(-1);
      if (last && !next.responses.some(response=>response.contactId === last.id)) fail('CARE_REPLY_PENDING');
      if (next.contacts.length>=20) fail('CARE_HISTORY_LIMIT');
      next.contacts.push({id:`CARE-CONTACT-${String(next.contacts.length+1).padStart(3,'0')}`,at:options.now,messageText:next.message.text,messageRevision:next.message.revision,protocolVersion:next.protocol.version,protocolRevision:next.protocol.revision,status:'simulation'});
      break;
    }
    case 'response_record':
      confirmed(action); text(action.text,2000);
      if (action.contactId !== null && !next.contacts.some(contact=>contact.id === action.contactId)) fail('CARE_UNKNOWN_CONTACT');
      if (next.responses.length>=30) fail('CARE_HISTORY_LIMIT');
      next.responses.push({id:`CARE-REPLY-${String(next.responses.length+1).padStart(3,'0')}`,at:options.now,text:action.text,contactId:action.contactId,status:'simulated_received'}); break;
    case 'transcript_set': {
      confirmed(action);
      const transcript={text:action.text,segments:action.segments,provenance:action.provenance,revision:next.transcript.revision+1,recordedAt:options.now};
      checkTranscript(transcript); next.transcript=clone(transcript);
      next.note={text:'',segmentIds:[],revision:next.note.revision+1,transcriptRevision:null,reviewedRevision:null,reviewedProtocolRevision:null,reviewedAt:null}; break;
    }
    case 'note_prepare':
      list(action.segmentIds,80);
      if (!action.segmentIds.length || new Set(action.segmentIds).size !== action.segmentIds.length) fail('CARE_INVALID_NOTE');
      next.note={text:noteText(next.transcript,action.segmentIds),segmentIds:clone(action.segmentIds),revision:next.note.revision+1,transcriptRevision:next.transcript.revision,reviewedRevision:null,reviewedProtocolRevision:null,reviewedAt:null}; break;
    case 'note_review':
      confirmed(action); requirePlan(next);
      if (!next.note.text || next.note.transcriptRevision !== next.transcript.revision) fail('CARE_NOTE_REQUIRED');
      next.note.reviewedRevision=next.note.revision; next.note.reviewedProtocolRevision=next.protocol.revision; next.note.reviewedAt=options.now; break;
    case 'close':
      confirmed(action); requirePlan(next); text(action.text,1000);
      if (!next.responses.length && next.contactPreference !== 'refused') fail('CARE_RESPONSE_REQUIRED');
      if (next.note.text && next.note.reviewedRevision !== next.note.revision) fail('CARE_NOTE_REVIEW_REQUIRED');
      next.status='resolved'; next.resolution={at:options.now,text:action.text,humanSimulation:true}; break;
    default: fail('CARE_UNKNOWN_ACTION');
  }
  next.revision+=1; next.updatedAt=options.now;
  next.history.push({id:`CARE-EVT-${String(next.revision).padStart(4,'0')}`,type:action.type,at:options.now,revision:next.revision});
  next.receipts.push({key:action.idempotencyKey,action:actionText,revision:next.revision});
  validateCareJourneyState(next); return next;
}

export function viewCareJourney(state,{language='en',now=new Date().toISOString()}={}) {
  validateCareJourneyState(state); timestamp(now);
  const lang=languageOf(language),labels=copy[lang];
  const protocolReviewed=state.protocol.reviewedRevision === state.protocol.revision;
  const messageReviewed=Boolean(state.message.text.trim()) && state.message.reviewedRevision === state.message.revision;
  const noteReviewed=Boolean(state.note.text) && state.note.reviewedRevision === state.note.revision;
  const open=state.status === 'open',planReady=Boolean(state.owner && state.nextAction.trim() && state.dueAt);
  const contactReady=open && planReady && state.contactPreference === 'opt_in' && protocolReviewed;
  const last=state.contacts.at(-1);
  return {
    ...clone(state),language:lang,labels,surgeryLabel:CARE_SURGERY_LABELS[lang],phaseLabel:labels[state.phase],statusLabel:labels[state.status],preferenceLabel:labels[state.contactPreference],
    protocolReviewed,messageReviewed,noteReviewed,planReady,administrativeOverdue:open && state.dueAt !== null && Date.parse(state.dueAt)<Date.parse(now),
    messageStatus:!state.message.text ? labels.empty : messageReviewed ? labels.reviewed : labels.prepared,
    transcriptLabel:state.transcript.provenance ? labels[state.transcript.provenance.mode] : labels.noTranscript,
    noteStatus:!state.note.text ? labels.empty : noteReviewed ? labels.reviewed : labels.draft,
    canPrepareMessage:contactReady,canReviewMessage:contactReady && Boolean(state.message.text.trim()),
    canSimulateContact:contactReady && messageReviewed && !state.contacts.some(contact=>contact.messageText===state.message.text && contact.protocolVersion===state.protocol.version)
      && (!last || state.responses.some(response=>response.contactId===last.id)),
    canClose:open && planReady && (state.responses.length>0 || state.contactPreference==='refused') && (!state.note.text || noteReviewed),
    externalContact:false,liveModelGeneration:false,signedMedicalRecord:false,clinicalCareAvailable:false,
  };
}

export function exportCareJourneySummary(state,{language='en'}={}) {
  validateCareJourneyState(state);
  return {
    schemaVersion:1,demo:true,episodeId:state.episodeId,revision:state.revision,language:languageOf(language),
    phase:state.phase,status:state.status,owner:state.owner,nextAdministrativeAction:state.nextAction,administrativeDueAt:state.dueAt,
    contactPreference:state.contactPreference,administrativeProtocol:clone(state.protocol),clinicalProtocol:clone(state.clinicalProtocol),
    preparedMessage:{text:state.message.text,reviewedInSimulation:state.message.reviewedRevision===state.message.revision && Boolean(state.message.text)},
    contacts:clone(state.contacts),responses:clone(state.responses),
    note:{text:state.note.text,citations:state.note.segmentIds.map(segmentId=>clone(state.transcript.segments.find(segment=>segment.id===segmentId))),reviewedInSimulation:state.note.reviewedRevision===state.note.revision && Boolean(state.note.text),transcriptProvenance:clone(state.transcript.provenance)},
    resolution:clone(state.resolution),history:clone(state.history),
    externalContact:false,liveModelGeneration:false,signedMedicalRecord:false,clinicalCareAvailable:false,
    warning:'Synthetic administrative demonstration. Export is not a signed medical record or evidence of messages sent.',
  };
}
