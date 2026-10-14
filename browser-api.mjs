import { createCareBrowserApi } from './care-browser-api.mjs';
import { createState, transition, viewState, validateState, getModelInput } from './engine.mjs';
import { queryEvidence, createEvidenceCard, evidenceContext, validStore, MAX_REVIEWS, MAX_REVIEW_BYTES } from './evidence.mjs';
import { fixtures as defaultFixtures } from './fixtures.mjs';
import { errorText, ui } from './i18n.mjs';
import { readRecordedAMDArchive } from './recorded-amd.mjs';

// This adapter is local to this app. It never intercepts or replaces fetch.
export const STORAGE_KEY = 'patientkeeper-retorno-public-v1';
const LOCK_NAME = `${STORAGE_KEY}-transaction`;
const MAX_STATE_BYTES = 128 * 1024;
const MAX_STORE_BYTES = MAX_STATE_BYTES + MAX_REVIEW_BYTES + 1024;
const encoder = new TextEncoder();
class DemoError extends Error {
  constructor(status, code, message) { super(message); this.status=status;this.code=code; }
}
function fail(status, code, message) { throw new DemoError(status, code, message); }
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && keys.every(key => Object.hasOwn(value,key))
    && own.every(key => typeof key === 'string' && keys.includes(key) && Object.getOwnPropertyDescriptor(value,key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(value,key));
}
function bodyCheck(body, keys) { if (!exact(body,keys)) fail(400,'INVALID_BODY','O pedido não possui o formato esperado.'); }
function revision(body,state) {
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail(400,'INVALID_REVISION','Informe a revisão inteira do estado exibido.');
  if (body.expectedRevision !== state.revision) fail(409,'STALE_REVISION','O estado mudou. Atualize a tela antes de repetir a ação.');
}
// Validate JSON-like descriptors first, so getters/toJSON are never invoked.
function safeJson(value, depth = 0) {
  if (depth > 25) fail(400,'INVALID_BODY','O pedido não possui o formato esperado.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || ![Object.prototype,Array.prototype].includes(Object.getPrototypeOf(value))) fail(400,'INVALID_BODY','O pedido não possui o formato esperado.');
  const own=Reflect.ownKeys(value);
  if (Array.isArray(value) && own.length !== value.length + 1) fail(400,'INVALID_BODY','O pedido não possui o formato esperado.');
  for (const key of own) {
    if (key === 'length' && Array.isArray(value)) continue;
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if (typeof key !== 'string' || ['__proto__','constructor','prototype','toJSON'].includes(key) || !descriptor?.enumerable || !('value' in descriptor) || Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(key)) fail(400,'INVALID_BODY','O pedido não possui o formato esperado.');
    safeJson(descriptor.value,depth+1);
  }
}
function serialize(value, limit) {
  safeJson(value);
  const raw=JSON.stringify(value);
  if (encoder.encode(raw).length > limit) fail(413,'BODY_TOO_LARGE','O pedido excede o limite local de 128 KB.');
  return raw;
}
const emptyReviews = () => ({schemaVersion:1,demo:true,reviews:[]});
const unchangedModel = Object.freeze({configured:false,enabled:false,inferenceVerified:false,amdVerified:false,requiresSemanticHumanReview:true});

export function createBrowserApi(options = {}) {
  const fixtures=options.fixtures ?? defaultFixtures;
  const now=options.now ?? (()=>new Date().toISOString());
  const lockManager=options.lockManager ?? globalThis.navigator?.locks;
  let queue=Promise.resolve();
  const storage = () => {
    try {
      const target=Object.hasOwn(options,'storage') ? options.storage : globalThis.localStorage;
      if (!target?.getItem || !target?.setItem) throw new Error();
      return target;
    } catch { fail(503,'STORAGE_UNAVAILABLE','Este navegador não permite abrir o armazenamento local. Seus dados não foram substituídos.'); }
  };
  function validateEnvelope(value) {
    if (!exact(value,['schemaVersion','demo','state','reviews']) || value.schemaVersion !== 1 || value.demo !== true || !validStore(value.reviews)) throw new Error();
    if (encoder.encode(JSON.stringify(value.state)).length > MAX_STATE_BYTES || encoder.encode(JSON.stringify(value.reviews)).length > MAX_REVIEW_BYTES) throw new Error();
    validateState(value.state,fixtures);
    return value;
  }
  function load() {
    let raw;
    try { raw=storage().getItem(STORAGE_KEY); } catch(error) { if (error instanceof DemoError) throw error;fail(503,'STORAGE_UNAVAILABLE','Este navegador não permite abrir o armazenamento local. Seus dados não foram substituídos.'); }
    if (raw === null) return {raw,value:{schemaVersion:1,demo:true,state:createState(fixtures,now()),reviews:emptyReviews()}};
    try {
      if (typeof raw !== 'string' || encoder.encode(raw).length > MAX_STORE_BYTES) throw new Error();
      return {raw,value:validateEnvelope(JSON.parse(raw))};
    } catch { fail(500,'DEMO_STORE_CORRUPT','Os dados salvos desta demonstração são inválidos. Eles foram preservados; exporte uma cópia do armazenamento antes de limpar os dados do site.'); }
  }
  function commit(value,previousRaw) {
    validateEnvelope(value);
    const next=JSON.stringify(value);
    if (encoder.encode(next).length > MAX_STORE_BYTES) fail(413,'REVIEW_LIMIT','Os recibos atingiram o limite local de 512 KB. Preserve o arquivo antes de continuar.');
    const target=storage();
    try {
      if (target.getItem(STORAGE_KEY) !== previousRaw) fail(409,'STALE_REVISION','O estado mudou. Atualize a tela antes de repetir a ação.');
      // One bounded setItem is atomic; Web Locks coordinates all this demo's tabs.
      target.setItem(STORAGE_KEY,next);
    } catch(error) { if (error instanceof DemoError) throw error;fail(503,'STORAGE_WRITE_FAILED','Este navegador não permite salvar o progresso. Nenhuma alteração foi registrada.'); }
  }
  async function execute(path,body) {
    if (path === '/amd-runs.json' && body === undefined) {
      let archive;
      if (Object.hasOwn(options,'archive')) archive=structuredClone(options.archive);
      else {
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
        try {
          const response=await fetch(new URL('./amd-runs.json',import.meta.url),{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
          if (!response.ok) throw new Error();
          const raw=await response.text();
          if (encoder.encode(raw).length > 512*1024) throw new Error();
          archive=JSON.parse(raw);
        } catch { fail(503,'ARCHIVE_UNAVAILABLE','A execução gravada está indisponível. Nenhum pedido a um modelo ao vivo foi feito.'); }
        finally { clearTimeout(timeout); }
      }
      if (!readRecordedAMDArchive(archive).valid) fail(500,'INVALID_ARCHIVE','Não foi possível validar o arquivo de execuções gravadas.');
      return archive;
    }
    if (path === '/api/model/status' && body === undefined) return {...unchangedModel};
    if (path === '/api/model/query') fail(503,'MODEL_NOT_CONFIGURED','A conexão de IA não está configurada nesta demonstração.');
    if (path === '/api/health' && body === undefined) return {demo:true,isolated:true,aiConnected:false,storage:'browser_local',externalContact:false};
    const methods=new Map([['/api/state','GET'],['/api/export','GET'],['/api/evidence/export','GET'],['/api/actions','POST'],['/api/reset','POST'],['/api/import','POST'],['/api/ai/context','POST'],['/api/evidence/query','POST'],['/api/evidence/card','POST'],['/api/evidence/reviews','POST']]);
    if (!methods.has(path)) fail(404,'NOT_FOUND','Esta ação não pertence ao fluxo administrativo da demo.');
    if ((body === undefined ? 'GET':'POST') !== methods.get(path)) fail(405,'METHOD_NOT_ALLOWED','O pedido não possui o formato esperado.');
    if (!lockManager?.request) fail(501,'LOCKS_UNAVAILABLE','Este navegador não oferece bloqueio seguro entre abas. Use uma versão atual do Chrome, Edge, Firefox ou Safari com HTTPS.');
    let requestBody;
    if (body !== undefined) requestBody=JSON.parse(serialize(body,MAX_STATE_BYTES));
    return lockManager.request(LOCK_NAME,async ()=>{
      const {raw,value}=load(),state=value.state;
      let result,next=null;
      switch (path) {
        case '/api/state': result=viewState(state,fixtures);break;
        case '/api/export': result=state;break;
        case '/api/evidence/export': result=value.reviews;break;
        case '/api/actions': {
          bodyCheck(requestBody,['expectedRevision','action']);revision(requestBody,state);
          next={...value,state:transition(state,requestBody.action,fixtures,now())};result=viewState(next.state,fixtures);break;
        }
        case '/api/reset': {
          bodyCheck(requestBody,['expectedRevision','confirmed']);revision(requestBody,state);
          if (requestBody.confirmed !== true) fail(400,'HUMAN_CONFIRMATION_REQUIRED','Confirme a substituição do progresso fictício pelo estado inicial.');
          if (state.revision >= Number.MAX_SAFE_INTEGER) fail(400,'REVISION_LIMIT','A revisão do estado atingiu o limite da demo.');
          const initial=createState(fixtures,now());initial.revision=state.revision+1;
          next={...value,state:initial};result=viewState(initial,fixtures);break;
        }
        case '/api/import': {
          bodyCheck(requestBody,['expectedRevision','state']);revision(requestBody,state);validateState(requestBody.state,fixtures);
          if (state.revision >= Number.MAX_SAFE_INTEGER) fail(400,'REVISION_LIMIT','A revisão do estado atingiu o limite da demo.');
          const imported=structuredClone(requestBody.state);imported.revision=state.revision+1;validateState(imported,fixtures);
          next={...value,state:imported};result=viewState(imported,fixtures);break;
        }
        case '/api/ai/context': {
          bodyCheck(requestBody,['caseId','question','expectedRevision']);revision(requestBody,state);
          result={enabled:false,revision:state.revision,input:getModelInput(state,requestBody.caseId,requestBody.question,fixtures)};break;
        }
        case '/api/evidence/query': {
          if (!globalThis.crypto?.subtle || !globalThis.crypto?.randomUUID) fail(503,'CRYPTO_UNAVAILABLE','Esta demonstração precisa de HTTPS ou localhost para conferir as fontes com segurança.');
          result=await queryEvidence(state,requestBody,fixtures);break;
        }
        case '/api/evidence/card': {
          if (!globalThis.crypto?.subtle || !globalThis.crypto?.randomUUID) fail(503,'CRYPTO_UNAVAILABLE','Esta demonstração precisa de HTTPS ou localhost para conferir as fontes com segurança.');
          const card=await createEvidenceCard(state,requestBody,fixtures,now());
          const selection=card.sources.map(source=>source.sourceId).toSorted().join('\n');
          const existing=value.reviews.reviews.find(review=>review.caseId === card.caseId && review.sourceDigest === card.sourceDigest && review.sources.map(source=>source.sourceId).toSorted().join('\n') === selection);
          if (existing) { result=existing;break; }
          if (value.reviews.reviews.length >= MAX_REVIEWS) fail(413,'REVIEW_LIMIT','O arquivo local atingiu o limite de 120 conferências. Preserve os recibos antes de continuar.');
          const reviews={...value.reviews,reviews:[...value.reviews.reviews,card]};
          if (encoder.encode(JSON.stringify(reviews)).length > MAX_REVIEW_BYTES) fail(413,'REVIEW_LIMIT','Os recibos atingiram o limite local de 512 KB. Preserve o arquivo antes de continuar.');
          next={...value,reviews};result=card;break;
        }
        case '/api/evidence/reviews': {
          bodyCheck(requestBody,['caseId']);
          if (!globalThis.crypto?.subtle) fail(503,'CRYPTO_UNAVAILABLE','Esta demonstração precisa de HTTPS ou localhost para conferir as fontes com segurança.');
          const input=await evidenceContext(state,requestBody.caseId,fixtures);
          const reviews=value.reviews.reviews.filter(card=>card.caseId === requestBody.caseId).toReversed();
          result={caseId:requestBody.caseId,revision:state.revision,currentSourceDigest:input.sourceDigest,latest:reviews[0]??null,reviews};break;
        }
      }
      if (next || raw === null) commit(next ?? value,raw);
      return structuredClone(result);
    });
  }
  return async function request(path,body) {
    const operation=queue.then(()=>execute(path,body));
    queue=operation.catch(()=>{});
    try { return await operation; }
    catch(error) {
      const known=typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code);
      const publicError=new Error(known ? errorText(error.message,'Não foi possível salvar. Nenhuma alteração foi registrada.') : ui('Não foi possível salvar. Nenhuma alteração foi registrada.'));
      publicError.status=Number.isInteger(error?.status) ? error.status : known ? 400:500;
      publicError.code=known ? error.code:'INTERNAL_ERROR';
      throw publicError;
    }
  };
}
export const request = createCareBrowserApi(createBrowserApi());
