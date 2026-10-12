import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { open, lstat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { getModelInput, viewState } from './engine.mjs';

export const MAX_REVIEWS = 120;
export const MAX_REVIEW_BYTES = 512 * 1024;
export const MAX_CARD_SOURCES = 12;
const REVIEW_FILE = 'evidence-reviews.json';
const SOURCE_KEYS = ['id', 'trecho', 'versao', 'vigente', 'substituida_por'];
const CARD_KEYS = ['mode', 'caseId', 'revision', 'createdAt', 'reviewId', 'sourceDigest', 'sources', 'noExternalContact', 'administrativeStateUnchanged'];
const STOP_WORDS = new Set('qual quais quem como onde quando porque para sobre com sem uma umas uns um dos das do da de e o a os as que esta este estes estas esse essa isso isto nos na no em ao aos por foi ha nao registrada registrado registros registro mostre mostrar consta constam existe existem'.split(' '));

export class EvidenceError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function fail(status, code, message) { throw new EvidenceError(status, code, message); }
function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
    && own.every((key) => typeof key === 'string' && keys.includes(key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
}
function envelope(body, keys) {
  if (!exactObject(body, keys)) fail(400, 'INVALID_EVIDENCE_BODY', 'O pedido de conferência não possui o formato esperado.');
}
function revision(body, state) {
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail(400, 'INVALID_REVISION', 'Informe a revisão inteira do estado exibido.');
  if (body.expectedRevision !== state.revision) fail(409, 'STALE_REVISION', 'O estado mudou. Atualize a conferência antes de continuar.');
}
function normalize(text) { return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase(); }
// Small, explicit word-family normalization for administrative labels. Quotes
// remain literal; this does not translate free questions or infer an answer.
const WORD_FAMILIES = new Map([
  ['responsabilidade','responsavel'],['responsabilidades','responsavel'],['responsaveis','responsavel'],['pendencias','pendencia'],
  // Explicit administrative vocabulary only: the preference excerpt says
  // "prefiro ... mensagens" while its suggested question says "preferência de contato".
  ['preferencias','preferencia'],['prefiro','preferencia'],
  ['contatos','contato'],['mensagem','contato'],['mensagens','contato'],
  ['confirmada','confirmacao'],['confirmado','confirmacao'],['confirmadas','confirmacao'],['confirmados','confirmacao'],
]);
function terms(text) { return [...new Set((normalize(text).match(/[a-z0-9]+/g) ?? []).map(word => WORD_FAMILIES.get(word) || word))].filter((word) => word.length >= 3 && !STOP_WORDS.has(word)); }

// A conservative lexical boundary, not a clinical classifier or a guarantee
// against adversarial wording. No generative answer or action is produced.
function requiresHandoff(question) {
  const text = normalize(question);
  return /\b(diagnost\w*|sintoma\w*|medicamento\w*|medication\w*|medicine\w*|prescri\w*|dosagem\w*|dose\w*|dosis|tratamento\w*|tratamiento\w*|conduta\w*|dor|dolor\w*|pain|febre|fever|fiebre|sangramento|bleeding|sangrado|urgenc\w*|urgent|emergenc\w*|clinico\w*|clinica\w*|clinical|pos.operatorio|cirurgia|surgery|complicac\w*|intervalo|prazo|quantos dias|devo esperar|posso esperar|medical|diagnosis|symptom\w*|dosage|treatment|emergency)\b/.test(text)
    || /\b(envie\w*|enviar|mande\w*|mandar|dispare\w*|disparar|agende\w*|agendar|confirme\w*|confirmar|encerre\w*|encerrar|feche\w*|fechar|atribua\w*|atribuir|execute\w*|executar|ignore\w*|ignorar|desconsidere\w*|substitua\w*|substituir|send|schedule|confirm|close|execute|ignore)\b/.test(text)
    || /\b(system|assistant|developer)\s*:/.test(text);
}
function context(state, caseId, fixtures) {
  const input = getModelInput(state, caseId, 'Conferência administrativa de fontes.', fixtures);
  const sources = input.sources.map((source) => Object.fromEntries(SOURCE_KEYS.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]])));
  const canonical = { caseId: input.caseId, revision: state.revision, sources: sources.toSorted((a, b) => a.id.localeCompare(b.id)) };
  return { ...canonical, sourceDigest: createHash('sha256').update(JSON.stringify(canonical)).digest('hex') };
}
function historical(source) { return source.vigente === false || Object.hasOwn(source, 'substituida_por'); }
function hasAdministrativeConflict(state, caseId, fixtures) {
  return viewState(state, fixtures).cases.find((item) => item.id === caseId)?.status === 'divergencia_aguardando_revisao';
}

export function queryEvidence(state, body, fixtures) {
  envelope(body, ['caseId', 'question', 'expectedRevision']);
  revision(body, state);
  // Reuse the engine's positive projection and its case/question bounds.
  getModelInput(state, body.caseId, body.question, fixtures);
  const input = context(state, body.caseId, fixtures);
  const result = {
    mode: 'local_extracts', caseId: body.caseId, revision: state.revision,
    question: body.question, sourceDigest: input.sourceDigest, matches: [],
    historicalSources: input.sources.filter(historical).map((source) => ({ sourceId: source.id, quote: source.trecho, historical: true })),
    outcome: 'no_support', reason: 'A busca literal local não encontrou termos suficientes nas fontes vigentes. Isso não comprova ausência de informação.',
    cardAllowed: false, humanReviewRequired: true, amdVerified: false, aiConnected: false,
  };
  if (hasAdministrativeConflict(state, body.caseId, fixtures)) {
    // Preserve the known disagreement even when lexical retrieval would select
    // just one record. These are literal records for reading, not a resolution.
    result.outcome = 'human_handoff';
    result.reason = 'O estado administrativo registra divergência entre os registros. Confira todas as fontes vigentes com a equipe humana; um cartão permanece bloqueado até a resolução pelo fluxo responsável.';
    result.matches = input.sources.filter((source) => !historical(source))
      .map((source) => ({ sourceId: source.id, quote: source.trecho, historical: false }));
    return result;
  }
  if (requiresHandoff(body.question)) {
    result.outcome = 'human_handoff';
    result.reason = 'Esta consulta requer conferência pela equipe humana. A regra lexical local é conservadora e não faz avaliação clínica nem executa ações.';
    return result;
  }
  const queryTerms = terms(body.question);
  if (!queryTerms.length) return result;
  result.matches = input.sources.filter((source) => !historical(source))
    .map((source) => { const tokens = new Set(terms(source.trecho)); return { source, score: queryTerms.filter((token) => tokens.has(token)).length }; })
    .filter((candidate) => candidate.score >= Math.min(2, queryTerms.length))
    .toSorted((a, b) => b.score - a.score || a.source.id.localeCompare(b.source.id))
    .slice(0, MAX_CARD_SOURCES)
    .map(({ source }) => ({ sourceId: source.id, quote: source.trecho, historical: false }));
  if (result.matches.length) {
    result.outcome = 'sources_found';
    result.cardAllowed = true;
    result.reason = 'Trechos com termos em comum foram encontrados. Confira sua pertinência: a busca literal não interpreta o significado nem recomenda uma ação.';
  }
  return result;
}

export function createEvidenceCard(state, body, fixtures, now = new Date().toISOString()) {
  envelope(body, ['caseId', 'expectedRevision', 'sourceDigest', 'sourceIds', 'reviewerConfirmed']);
  revision(body, state);
  if (body.reviewerConfirmed !== true) fail(400, 'REVIEW_CONFIRMATION_REQUIRED', 'Confirme pessoalmente a conferência dos trechos selecionados.');
  const input = context(state, body.caseId, fixtures);
  if (hasAdministrativeConflict(state, body.caseId, fixtures)) {
    fail(409, 'EVIDENCE_CONFLICT', 'O estado administrativo registra divergência. Resolva-a pelo fluxo humano responsável antes de preparar um cartão.');
  }
  if (typeof body.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(body.sourceDigest)) fail(400, 'INVALID_SOURCE_DIGEST', 'O identificador das fontes é inválido.');
  if (body.sourceDigest !== input.sourceDigest) fail(409, 'STALE_EVIDENCE', 'As fontes ou a fase mudaram. Faça uma nova consulta e confira os trechos.');
  if (!Array.isArray(body.sourceIds) || body.sourceIds.length < 1 || body.sourceIds.length > MAX_CARD_SOURCES
      || body.sourceIds.some((id) => typeof id !== 'string' || !/^[A-Z0-9-]{1,80}$/.test(id))
      || new Set(body.sourceIds).size !== body.sourceIds.length) fail(400, 'INVALID_SOURCE_SELECTION', 'Selecione de um a doze identificadores únicos das fontes disponíveis.');
  const selected = body.sourceIds.map((id) => {
    const source = input.sources.find((candidate) => candidate.id === id);
    if (!source) fail(400, 'SOURCE_NOT_AVAILABLE', 'Uma fonte selecionada não pertence à fase ativa deste caso.');
    if (historical(source)) fail(400, 'HISTORICAL_SOURCE', 'Fontes históricas não podem sustentar este cartão de conferência.');
    return { sourceId: source.id, quote: source.trecho };
  });
  if (!validDate(now)) fail(400, 'INVALID_REVIEW_DATE', 'A data do recibo é inválida.');
  return {
    mode: 'local_evidence_card', caseId: body.caseId, revision: state.revision,
    createdAt: now, reviewId: `REVIEW-${randomUUID()}`, sourceDigest: input.sourceDigest,
    sources: selected, noExternalContact: true, administrativeStateUnchanged: true,
  };
}
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function validCard(card) {
  return exactObject(card, CARD_KEYS) && card.mode === 'local_evidence_card'
    && /^SIM-RET-0[1-8]$/.test(card.caseId) && Number.isSafeInteger(card.revision) && card.revision >= 0
    && validDate(card.createdAt) && typeof card.reviewId === 'string' && /^REVIEW-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(card.reviewId)
    && typeof card.sourceDigest === 'string' && /^[a-f0-9]{64}$/.test(card.sourceDigest)
    && card.noExternalContact === true && card.administrativeStateUnchanged === true
    && Array.isArray(card.sources) && card.sources.length > 0 && card.sources.length <= MAX_CARD_SOURCES
    && new Set(card.sources.map((source) => source?.sourceId)).size === card.sources.length
    && card.sources.every((source) => exactObject(source, ['sourceId', 'quote'])
      && typeof source.sourceId === 'string' && /^[A-Z0-9-]{1,80}$/.test(source.sourceId)
      && typeof source.quote === 'string' && source.quote.length > 0 && source.quote.length <= 4000);
}
function validStore(store) {
  return exactObject(store, ['schemaVersion', 'demo', 'reviews']) && store.schemaVersion === 1 && store.demo === true
    && Array.isArray(store.reviews) && store.reviews.length <= MAX_REVIEWS
    && store.reviews.every(validCard) && new Set(store.reviews.map((card) => card.reviewId)).size === store.reviews.length;
}
function corrupt() { fail(500, 'REVIEW_STORE_CORRUPT', 'O arquivo separado de conferências é inválido. Preserve-o para revisão.'); }

export async function readEvidenceReviews(dataDir) {
  const reviewPath = path.join(dataDir, REVIEW_FILE);
  let stats;
  try { stats = await lstat(reviewPath); } catch (error) {
    if (error.code === 'ENOENT') return { schemaVersion: 1, demo: true, reviews: [] };
    fail(500, 'REVIEW_STORE_UNAVAILABLE', 'Não foi possível ler os recibos locais de conferência.');
  }
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > MAX_REVIEW_BYTES) corrupt();
  let handle;
  try {
    handle = await open(reviewPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const openedStats = await handle.stat();
    if (!openedStats.isFile() || openedStats.size > MAX_REVIEW_BYTES) corrupt();
    const buffer = Buffer.alloc(MAX_REVIEW_BYTES + 1);
    let size = 0;
    while (size <= MAX_REVIEW_BYTES) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, size);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > MAX_REVIEW_BYTES) corrupt();
    const bytes = buffer.subarray(0, size);
    const store = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!validStore(store)) corrupt();
    return store;
  } catch (error) {
    if (error instanceof EvidenceError) throw error;
    corrupt();
  } finally { if (handle) await handle.close().catch(() => {}); }
}

export async function persistEvidenceCard(dataDir, card) {
  if (!validCard(card)) fail(400, 'INVALID_REVIEW_CARD', 'O cartão de conferência é inválido.');
  const store = await readEvidenceReviews(dataDir);
  // Repeating the same explicit acknowledgement preserves its existing receipt.
  // It does not manufacture another review or imply an authenticated reviewer.
  const selection = card.sources.map((source) => source.sourceId).toSorted().join('\n');
  const existing = store.reviews.find((review) => review.caseId === card.caseId && review.sourceDigest === card.sourceDigest
    && review.sources.map((source) => source.sourceId).toSorted().join('\n') === selection);
  if (existing) return existing;
  if (store.reviews.length >= MAX_REVIEWS) fail(413, 'REVIEW_LIMIT', 'O arquivo local atingiu o limite de 120 conferências. Preserve os recibos antes de continuar.');
  const next = { ...store, reviews: [...store.reviews, card] };
  const bytes = `${JSON.stringify(next, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > MAX_REVIEW_BYTES) fail(413, 'REVIEW_LIMIT', 'Os recibos atingiram o limite local de 512 KB. Preserve o arquivo antes de continuar.');
  const temporaryPath = path.join(dataDir, `.evidence-review-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(bytes, 'utf8'); await handle.sync(); await handle.close(); handle = null;
    await rename(temporaryPath, path.join(dataDir, REVIEW_FILE));
  } catch {
    fail(500, 'REVIEW_STORE_UNAVAILABLE', 'Não foi possível salvar o recibo. A conferência não foi registrada.');
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
  }
  return card;
}

export async function listEvidenceReviews(dataDir, state, body, fixtures) {
  envelope(body, ['caseId']);
  const input = context(state, body.caseId, fixtures);
  const store = await readEvidenceReviews(dataDir);
  const reviews = store.reviews.filter((card) => card.caseId === body.caseId).toReversed();
  return { caseId: body.caseId, revision: state.revision, currentSourceDigest: input.sourceDigest, latest: reviews[0] ?? null, reviews };
}
