// Fixed, sanitized evidence from five earlier AMD Token Factory attempts.
// No transport, credentials, model loading or mutation belongs in this module.
import { buildModelRequest, validateModelCandidate } from './ai-contract.mjs';

export const GEMMA_REQUESTED_MODEL = 'Gemma-4-31B-IT';
export const GEMMA_USED_MODEL = 'self-dploy/Gemma-4-31B-IT';
export const GEMMA_SERVICE_SOURCE = 'https://notebooks.amd.com/tokenfactory';
export const GEMMA_ARCHIVE_SHA256 = '7c230f2ff3859aee8e7b82068fc90583d6aa222ddad991341d38715f292cbff2';
const IDENTITY_PROOF = '04e8a63911758aa2978bab7a7ef429fdd4d3304c632f81691896162c0b1710a5';
const MAPPING = 'official_usage_requested_used_mapping_20261014';
const RECORD_DIGESTS = Object.freeze({
  '01-same-qwen-sim01':'7c10fcdafd7603eaf45df842e4bf0557150da71a8259f6896ca14ed103abe5a8',
  '02-missing-essential-source':'043fd400a0aa6498d045b7e00ea5788e5101bf4fa464b5a031b194f8f96637b3',
  '03-same-qwen-sim06-policy':'f060b829f789352e4bed75b1c4dd9fcc083e7432338113111cd631241d418658',
  '04-untrusted-source-instruction':'c2c686c370d90967c0d79d5a9f2b84fe5f2dd06f3ae05536872988f80aa324c2',
  '05-same-qwen-sim04-app-positive':'a10d4942634929ebc62aa31e35cecaa1f6078ba539e1eaaafddb8f25362b6111',
});

function canonicalJson(value, depth=0) {
  if(depth>16)throw new TypeError('INVALID_ARCHIVE');
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype) {
    if(value.length>128||Reflect.ownKeys(value).length!==value.length+1)throw new TypeError('INVALID_ARCHIVE');
    const items=[];
    for(let index=0;index<value.length;index+=1){
      const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new TypeError('INVALID_ARCHIVE');
      items.push(canonicalJson(descriptor.value,depth+1));
    }
    return '['+items.join(',')+']';
  }
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype) {
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)))throw new TypeError('INVALID_ARCHIVE');
    return '{'+keys.sort().map(key=>{
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new TypeError('INVALID_ARCHIVE');
      return JSON.stringify(key)+':'+canonicalJson(descriptor.value,depth+1);
    }).join(',')+'}';
  }
  throw new TypeError('INVALID_ARCHIVE');
}
function capture(value) {
  const text=canonicalJson(value);
  if(new TextEncoder().encode(text).length>256*1024)throw new TypeError('INVALID_ARCHIVE');
  return {value:JSON.parse(text),text};
}
async function digest(text) {
  const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
function freeze(value) {
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
}
function context(input) {
  return JSON.parse(buildModelRequest(input,{model:'recorded/context-validation'}).messages[1].content);
}
export function recordedGemmaContextMatches(archived,current) {
  try{return JSON.stringify(context(archived))===JSON.stringify(context(current));}catch{return false;}
}
function receipt(record) {
  return {recordId:record.id,route:record.route,status:record.status,durationMs:record.durationMs,
    artifactSha256:record.artifactSha256,inputArtifactSha256:record.inputArtifactSha256,receiptSha256:record.receiptSha256,
    requestedModel:record.identity.requestedModel,responseModel:record.identity.responseModel,
    usedModel:record.status==='timeout'?null:GEMMA_USED_MODEL,mappingBasis:record.identity.mappingBasis,
    identityProofSha256:record.identity.identityProofSha256,providerUsage:record.providerUsage,
    physicalHardwareVerified:false,physicalWeightsInspected:false,modelRevision:null};
}
const denied=(code,proof)=>({available:false,code,candidate:null,liveInference:false,
  semanticApproved:false,clinicalValidated:false,requiresHumanReview:true,...(proof?{receipt:proof}:{})});

/** Capture before hashing/awaiting; caller mutation cannot rewrite checked evidence. */
export async function readRecordedGemmaArchive(raw) {
  try {
    const captured=capture(raw);
    if(await digest(captured.text)!==GEMMA_ARCHIVE_SHA256)return {valid:false,archive:null,code:'INVALID_ARCHIVE'};
    const archive=captured.value,service=archive.service;
    if(archive.schemaVersion!==1||service.requestedModel!==GEMMA_REQUESTED_MODEL||service.usedModel!==GEMMA_USED_MODEL
      ||service.source!==GEMMA_SERVICE_SOURCE||service.identityBasis!==MAPPING||service.identityProofSha256!==IDENTITY_PROOF
      ||service.physicalHardwareVerified!==false||service.physicalWeightsInspected!==false||service.modelRevision!==null
      ||archive.records.length!==5)return {valid:false,archive:null,code:'INVALID_ARCHIVE'};
    for(const record of archive.records) {
      const checked=context(record.context);
      if(record.status==='timeout') {
        if(record.candidate!==null||record.formatValid!==false||record.providerUsage!==null)throw new TypeError('INVALID_ARCHIVE');
      } else {
        const validation=validateModelCandidate(checked,record.candidate);
        if(!validation.formatValid||record.formatValid!==true
          ||(record.status==='abstained')!==validation.candidate.abstention)throw new TypeError('INVALID_ARCHIVE');
      }
    }
    return {valid:true,archive:freeze(archive),code:null};
  } catch{return {valid:false,archive:null,code:'INVALID_ARCHIVE'};}
}
export function findRecordedGemmaRecord(archive,caseId) {
  try {
    const selected=archive.selections.filter(item=>item.caseId===caseId);
    if(selected.length!==1)return {record:null,code:selected.length?'AMBIGUOUS_RECORD':'NO_RECORDED_RUN'};
    const records=archive.records.filter(record=>record.id===selected[0].recordId&&record.context.caseId===caseId);
    if(records.length!==1)return {record:null,code:'INVALID_ARCHIVE'};
    return {record:records[0],code:null};
  }catch{return {record:null,code:'INVALID_ARCHIVE'};}
}
export async function readRecordedGemmaStatistics(raw) {
  const checked=await readRecordedGemmaArchive(raw);
  if(!checked.valid)return null;
  const {archive}=checked,records=archive.records;
  const counted={totalAttempts:records.length,affirmativeCandidates:records.filter(record=>record.status==='candidate').length,
    abstentions:records.filter(record=>record.status==='abstained').length,timeoutsWithoutAnswer:records.filter(record=>record.status==='timeout').length,
    formatValidOutputs:records.filter(record=>record.formatValid===true).length,automaticRetries:0,
    newGemmaRequestsForCareModule:0,semanticApproved:false,clinicalValidated:false,controlledQwenGemmaBenchmark:false};
  if(canonicalJson(counted)!==canonicalJson(archive.statistics))return null;
  return freeze({...counted,retainedProviderTokens:records.reduce((sum,record)=>sum+(record.providerUsage?.totalTokens??0),0),
    attemptsWithoutPerAttemptUsage:records.filter(record=>record.providerUsage===null).length,usage:archive.usage});
}

/** Only the pinned original can be revalidated against the complete current input. */
export async function evaluateRecordedGemmaRecord(raw,currentInput,{humanHandoff=false}={}) {
  let record,current;
  try {
    const captured=capture(raw);record=captured.value;current=context(currentInput);
    if(await digest(captured.text)!==RECORD_DIGESTS[record.id])return denied('INVALID_RECORD');
  }catch{return denied('INVALID_RECORD');}
  if(!recordedGemmaContextMatches(record.context,current))return denied('CONTEXT_CHANGED');
  const proof=freeze(receipt(record));
  if(humanHandoff)return denied('HUMAN_HANDOFF',proof);
  if(record.status==='timeout')return denied('RECORDED_TIMEOUT',proof);
  const validation=validateModelCandidate(current,record.candidate);
  if(!record.formatValid||!validation.formatValid)return denied('INVALID_RECORDED_CANDIDATE',proof);
  return freeze({available:true,code:null,question:current.question,candidate:validation.candidate,receipt:proof,
    liveInference:false,semanticApproved:false,clinicalValidated:false,requiresHumanReview:true});
}

/** Bind both read-only API responses to one displayed revision and source digest. */
export async function evaluateRecordedGemmaCurrentRead(record,response,report,{caseId,revision,humanHandoff=false}={}) {
  let current,evidence;
  try{current=capture(response).value;evidence=capture(report).value;}catch{return denied('LOAD_FAILED');}
  if(!Number.isSafeInteger(revision)||revision<0||current.revision!==revision||evidence.revision!==revision)return denied('CONTEXT_CHANGED');
  if(current.enabled!==false||current.input?.caseId!==caseId||record.context.caseId!==caseId
    ||evidence.mode!=='local_extracts'||evidence.caseId!==caseId||evidence.question!==record.context.question
    ||current.input.question!==record.context.question||evidence.humanReviewRequired!==true
    ||!['sources_found','no_support','human_handoff'].includes(evidence.outcome))return denied('LOAD_FAILED');
  try {
    const input=context(current.input);
    const canonical={caseId:input.caseId,revision,sources:input.sources.toSorted((a,b)=>a.id.localeCompare(b.id))};
    if(await digest(JSON.stringify(canonical))!==evidence.sourceDigest)return denied('CONTEXT_CHANGED');
    return evaluateRecordedGemmaRecord(record,input,{humanHandoff:humanHandoff||evidence.outcome==='human_handoff'});
  }catch{return denied('LOAD_FAILED');}
}
