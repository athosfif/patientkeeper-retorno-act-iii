import http from 'node:http';
import { mkdir, readFile, lstat, open, rename, unlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  createState, transition, viewState, validateState, getModelInput,
} from './engine.mjs';
import { EvidenceError, queryEvidence, createEvidenceCard, persistEvidenceCard, listEvidenceReviews } from './evidence.mjs';
import { validateModelConfiguration, executeModelQuery } from './model-transport.mjs';
import { createModelBudget } from './model-budget.mjs';
import { MODEL_REQUEST_MAX_TOKENS } from './ai-contract.mjs';
import { createCareStore } from './care-store.mjs';
import { createVoiceTranscriber, VOICE_MAX_AUDIO_BYTES } from './voice-transcription.mjs';

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURES = path.resolve(APP_DIR, '..', 'CASOS-SINTETICOS.json');
const MAX_BODY_BYTES = 128 * 1024;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/theme-init.js', ['theme-init.js', 'text/javascript; charset=utf-8']],
  ['/theme.mjs', ['theme.mjs', 'text/javascript; charset=utf-8']],
  ['/calendar.mjs', ['calendar.mjs', 'text/javascript; charset=utf-8']],
  ['/calendar-client.mjs', ['calendar-client.mjs', 'text/javascript; charset=utf-8']],
  ['/care-journey.mjs', ['care-journey.mjs', 'text/javascript; charset=utf-8']],
  ['/care-journey-client.mjs', ['care-journey-client.mjs', 'text/javascript; charset=utf-8']],
  ['/care-journey.css', ['care-journey.css', 'text/css; charset=utf-8']],
  ['/selection-controls.css', ['selection-controls.css', 'text/css; charset=utf-8']],
  ['/recorded-gemma.css', ['recorded-gemma.css', 'text/css; charset=utf-8']],
  ['/recorded-gemma.mjs', ['recorded-gemma.mjs', 'text/javascript; charset=utf-8']],
  ['/ai-contract.mjs', ['ai-contract.mjs', 'text/javascript; charset=utf-8']],
  ['/recorded-gemma-client.mjs', ['recorded-gemma-client.mjs', 'text/javascript; charset=utf-8']],
  ['/gemma-runs.json', ['../docs/recorded-gemma-runs.json', 'application/json; charset=utf-8']],
  ['/client.mjs', ['client.mjs', 'text/javascript; charset=utf-8']],
  ['/evidence-client.mjs', ['evidence-client.mjs', 'text/javascript; charset=utf-8']],
  ['/i18n.mjs', ['i18n.mjs', 'text/javascript; charset=utf-8']],
  ['/source-reading.mjs', ['source-reading.mjs', 'text/javascript; charset=utf-8']],
  ['/source-translations.mjs', ['source-translations.mjs', 'text/javascript; charset=utf-8']],
  ['/model-client.mjs', ['model-client.mjs', 'text/javascript; charset=utf-8']],
]);
const API_METHODS = new Map([
  ['/api/health', 'GET'], ['/api/state', 'GET'], ['/api/export', 'GET'],
  ['/api/actions', 'POST'], ['/api/reset', 'POST'], ['/api/import', 'POST'],
  ['/api/ai/context', 'POST'],
  ['/api/evidence/query', 'POST'], ['/api/evidence/card', 'POST'], ['/api/evidence/reviews', 'POST'],
  ['/api/model/status', 'GET'], ['/api/model/query', 'POST'],
  ['/api/care/state', 'GET'], ['/api/care/actions', 'POST'],
  ['/api/voice/status', 'GET'], ['/api/voice/transcribe', 'POST'],
]);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkEnvelope(body, requiredKeys) {
  if (!isObject(body) || Object.keys(body).length !== requiredKeys.length
      || requiredKeys.some((key) => !Object.hasOwn(body, key))) {
    throw new ApiError(400, 'INVALID_BODY', 'O pedido não possui o formato esperado.');
  }
}

function checkRevision(body, current) {
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
    throw new ApiError(400, 'INVALID_REVISION', 'Informe a revisão inteira do estado exibido.');
  }
  if (body.expectedRevision !== current.revision) {
    throw new ApiError(409, 'STALE_REVISION', 'O estado mudou. Atualize a tela antes de repetir a ação.');
  }
}

function commonHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  };
}

function sendJson(response, status, body, extraHeaders = {}) {
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  response.writeHead(status, {
    ...commonHeaders(), 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length, ...extraHeaders,
  });
  response.end(bytes);
}

function sendError(response, error) {
  // Engine validation errors have deliberate public messages. Never expose I/O
  // paths, request contents, stack traces or incidental runtime errors.
  const known = error instanceof ApiError || error instanceof EvidenceError;
  const engine = !known && typeof error?.code === 'string'
    && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code) && !/^E[A-Z]+$/.test(error.code);
  const status = known ? error.status : engine ? 400 : 500;
  sendJson(response, status, {
    error: {
      code: known || engine ? error.code : 'INTERNAL_ERROR',
      message: known || engine ? error.message : 'Não foi possível concluir o pedido local.',
    },
  }, error?.allow ? { Allow: error.allow } : {});
}

function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(contentType)) {
    request.resume();
    throw new ApiError(415, 'JSON_REQUIRED', 'Use Content-Type: application/json.');
  }
  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    request.resume();
    throw new ApiError(413, 'BODY_TOO_LARGE', 'O pedido excede o limite local de 128 KB.');
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    let finished = false;
    const chunks = [];
    const fail = (error) => {
      if (finished) return;
      finished = true;
      chunks.length = 0;
      reject(error);
    };
    request.on('data', (chunk) => {
      if (finished) return;
      size += chunk.length;
      if (size > maxBytes) {
        fail(new ApiError(413, 'BODY_TOO_LARGE', 'O pedido excede o limite local de 128 KB.'));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (finished) return;
      finished = true;
      try {
        const source = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        resolve(JSON.parse(source));
      } catch {
        reject(new ApiError(400, 'INVALID_JSON', 'O corpo deve ser um JSON válido em UTF-8.'));
      }
    });
    request.on('aborted', () => fail(new ApiError(400, 'INCOMPLETE_BODY', 'O pedido foi interrompido.')));
    request.on('error', () => fail(new ApiError(400, 'INCOMPLETE_BODY', 'O pedido foi interrompido.')));
  });
}

function assertLocalRequest(request, port) {
  const permittedHosts = new Set([
    `127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`,
  ]);
  if (port === 80) {
    permittedHosts.add('127.0.0.1');
    permittedHosts.add('localhost');
    permittedHosts.add('[::1]');
  }
  const host = request.headers.host;
  if (typeof host !== 'string' || !permittedHosts.has(host.toLowerCase())) {
    throw new ApiError(403, 'LOCAL_HOST_REQUIRED', 'Este servidor aceita somente acesso local.');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.origin;
    if (origin !== undefined && origin !== `http://${host.toLowerCase()}`) {
      throw new ApiError(403, 'SAME_ORIGIN_REQUIRED', 'A ação deve partir da mesma página local.');
    }
  }
}

async function readExistingState(statePath, fixtures) {
  let stats;
  try { stats = await lstat(statePath); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new ApiError(500, 'STORE_UNAVAILABLE', 'Não foi possível ler o estado local.');
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new ApiError(500, 'STORE_CORRUPT', 'O estado local é inválido. Preserve o arquivo para revisão.');
  }
  if (stats.size > MAX_BODY_BYTES) {
    throw new ApiError(500, 'STORE_CORRUPT', 'O estado local excede o limite de segurança. Preserve o arquivo para revisão.');
  }
  try {
    const candidate = JSON.parse(await readFile(statePath, 'utf8'));
    validateState(candidate, fixtures);
    return candidate;
  } catch {
    throw new ApiError(500, 'STORE_CORRUPT', 'O estado local é inválido. Preserve o arquivo para revisão.');
  }
}

async function saveState(dataDir, state) {
  const temporaryPath = path.join(dataDir, `.state-${randomUUID()}.tmp`);
  const statePath = path.join(dataDir, 'state.json');
  const bytes = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > MAX_BODY_BYTES) {
    throw new ApiError(413, 'STORE_LIMIT', 'O histórico local atingiu 128 KB. Exporte-o antes de reiniciar a demo.');
  }
  let handle;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporaryPath, statePath);
  } catch {
    throw new ApiError(500, 'STORE_UNAVAILABLE', 'Não foi possível salvar o estado local. A ação não foi aplicada.');
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
  }
}

/** Start a loopback-only, synthetic-data application without external services. */
export async function createAppServer({
  dataDir = path.join(APP_DIR, 'data'), port = 8769,
  fixturesPath = DEFAULT_FIXTURES, host = '127.0.0.1',
  modelConfiguration = null, modelFetch, modelBudgetLimits = {},
  voiceConfiguration = null, voiceTranscriber = null,
} = {}) {
  if (!['127.0.0.1', '::1'].includes(host)) {
    throw new ApiError(400, 'LOCAL_BIND_REQUIRED', 'Use apenas 127.0.0.1 ou ::1 para iniciar a demo.');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ApiError(400, 'INVALID_PORT', 'A porta deve ser um inteiro entre 0 e 65535.');
  }
  let fixtures;
  try { fixtures = JSON.parse(await readFile(fixturesPath, 'utf8')); } catch {
    throw new ApiError(500, 'FIXTURES_UNAVAILABLE', 'Não foi possível ler os casos sintéticos da demo.');
  }
  const resolvedDataDir = path.resolve(dataDir);
  await mkdir(resolvedDataDir, { recursive: true, mode: 0o700 });
  const directoryStats = await lstat(resolvedDataDir);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    throw new ApiError(500, 'INVALID_DATA_DIR', 'A pasta de dados deve ser uma pasta local regular.');
  }
  const storageDir = await realpath(resolvedDataDir);
  let state = await readExistingState(path.join(storageDir, 'state.json'), fixtures);
  if (state === null) {
    state = createState(fixtures, new Date().toISOString());
    validateState(state, fixtures);
    await saveState(storageDir, state);
  }
  let mutationQueue = Promise.resolve();
  const enqueue = (operation) => {
    const result = mutationQueue.then(operation);
    mutationQueue = result.catch(() => {});
    return result;
  };
  let boundPort;
  const modelSetup = validateModelConfiguration(modelConfiguration);
  const modelBudget = createModelBudget(modelBudgetLimits);
  let modelInFlight = false;
  const voice = voiceTranscriber ?? createVoiceTranscriber(voiceConfiguration);
  // Lazy access preserves the original queue until the new journey is opened.
  let careStore;
  const care = () => careStore ??= createCareStore(storageDir);

  const server = http.createServer(async (request, response) => {
    try {
      assertLocalRequest(request, boundPort);
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) {
        throw new ApiError(400, 'INVALID_URL', 'O caminho local é inválido.');
      }
      // Compare raw paths to an exact allowlist. Never resolve a client path on disk.
      const pathname = request.url.split('?')[0];
      const staticFile = STATIC_FILES.get(pathname);
      if (staticFile) {
        if (!['GET', 'HEAD'].includes(request.method)) {
          const error = new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido neste caminho.');
          error.allow = 'GET, HEAD';
          throw error;
        }
        let bytes;
        try { bytes = await readFile(path.join(APP_DIR, staticFile[0])); } catch {
          throw new ApiError(404, 'NOT_FOUND', 'Arquivo da interface ainda não disponível.');
        }
        response.writeHead(200, {
          ...commonHeaders(), 'Content-Type': staticFile[1], 'Content-Length': bytes.length,
        });
        response.end(request.method === 'HEAD' ? undefined : bytes);
        return;
      }
      const allowedMethod = API_METHODS.get(pathname);
      if (!allowedMethod) throw new ApiError(404, 'NOT_FOUND', 'Caminho local não encontrado.');
      if (request.method !== allowedMethod) {
        const error = new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido neste caminho.');
        error.allow = allowedMethod;
        throw error;
      }
      if (pathname === '/api/health') {
        sendJson(response, 200, { demo: true, aiConnected: false, storage: 'local_file' });
        return;
      }
      if (pathname === '/api/state') {
        sendJson(response, 200, viewState(state, fixtures));
        return;
      }
      if (pathname === '/api/export') {
        sendJson(response, 200, state, {
          'Content-Disposition': 'attachment; filename="retorno-sintetico.json"',
        });
        return;
      }
      if (pathname === '/api/model/status') {
        const budget = modelBudget.snapshot();
        const outputBudgetCompatible = budget.maxOutputTokens >= MODEL_REQUEST_MAX_TOKENS;
        sendJson(response, 200, {
          configured: modelSetup.valid && modelSetup.enabled,
          enabled: modelSetup.valid && modelSetup.enabled && !budget.exhausted && outputBudgetCompatible,
          disabledReason: modelSetup.valid && modelSetup.enabled && !outputBudgetCompatible ? {
            code: 'MODEL_BUDGET_OUTPUT_LIMIT',
            message: `The local pilot output limit of ${budget.maxOutputTokens} tokens is below the current contract request of ${MODEL_REQUEST_MAX_TOKENS} tokens. No model request can be sent with these settings.`,
          } : null,
          localPilotBudget: budget,
          providerQuotaVerified: false,
          inferenceVerified: false, amdVerified: false,
          requiresSemanticHumanReview: true,
        });
        return;
      }
      if (pathname === '/api/care/state') {
        sendJson(response, 200, (await care()).snapshot());
        return;
      }
      if (pathname === '/api/voice/status') {
        sendJson(response, 200, await voice.status());
        return;
      }
      const body = await readJsonBody(request, pathname === '/api/voice/transcribe' ? Math.ceil(VOICE_MAX_AUDIO_BYTES / 3) * 4 + 4096 : MAX_BODY_BYTES);
      if (pathname === '/api/care/actions') {
        checkEnvelope(body, ['expectedRevision', 'action']);
        const store = await care();
        sendJson(response, 200, await store.act(body.action, body.expectedRevision));
        return;
      }
      if (pathname === '/api/voice/transcribe') {
        checkEnvelope(body, ['fileName', 'mimeType', 'base64', 'language', 'syntheticConfirmed']);
        if (body.syntheticConfirmed !== true) throw new ApiError(400, 'VOICE_SYNTHETIC_ONLY', 'Use only a fictional recording in this prototype.');
        if (typeof body.base64 !== 'string' || body.base64.length > Math.ceil(VOICE_MAX_AUDIO_BYTES / 3) * 4
          || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64)) {
          throw new ApiError(400, 'VOICE_INVALID_INPUT', 'Choose a WAV or MP3 file of up to 5 MB.');
        }
        const audio = Buffer.from(body.base64, 'base64');
        const controller = new AbortController();
        const abort = () => { if (!response.writableEnded) controller.abort(); };
        response.once('close', abort);
        try {
          const output = await voice.transcribe({ bytes: audio, fileName: body.fileName, mimeType: body.mimeType,
            language: body.language, syntheticConfirmed: true }, { signal: controller.signal });
          if (!response.destroyed) sendJson(response, 200, output);
        } catch (error) {
          const status = error.code === 'VOICE_BUSY' ? 429 : error.code === 'VOICE_TIMEOUT' ? 504
            : ['VOICE_NOT_CONFIGURED', 'VOICE_MODEL_UNAVAILABLE', 'VOICE_RUNTIME_UNAVAILABLE'].includes(error.code) ? 503 : 400;
          throw new ApiError(status, /^VOICE_[A-Z_]+$/.test(error.code ?? '') ? error.code : 'VOICE_TRANSCRIPTION_FAILED', 'The audio was not transcribed. Review the file or use the text alternative.');
        } finally { audio.fill(0); response.off('close', abort); }
        return;
      }
      if (pathname === '/api/model/query') {
        // Capture only the current positive projection. No model output can
        // modify the case, agenda, contact history or receipt automatically.
        await mutationQueue;
        const report = queryEvidence(state, body, fixtures);
        if (report.outcome === 'human_handoff' || viewState(state, fixtures).cases.find(item => item.id === body.caseId)?.medicalHandoff) {
          sendJson(response, 200, {
            mode: 'human_handoff', caseId: body.caseId, revision: state.revision,
            sourceDigest: report.sourceDigest, candidate: null,
            transportAttempted: false, amdVerified: false,
            reason: 'Human review is required. No model request was made.',
            requiresSemanticHumanReview: true,
          });
          return;
        }
        if (!modelSetup.valid || !modelSetup.enabled) {
          throw new ApiError(503, 'MODEL_NOT_CONFIGURED', 'Model connection is not enabled. The local source check remains available.');
        }
        if (modelInFlight) throw new ApiError(429, 'MODEL_BUSY', 'One model request is already running. Wait before trying again.');
        if (modelBudget.snapshot().exhausted) throw new ApiError(429, 'MODEL_BUDGET_EXHAUSTED', 'The local pilot request limit has been reached. Check the recorded usage before a new explicitly bounded pilot.');
        const capturedRevision = state.revision;
        const input = getModelInput(state, body.caseId, body.question, fixtures);
        modelInFlight = true;
        let execution;
        try {
          execution = await executeModelQuery(input, modelConfiguration, { budget: modelBudget, ...(modelFetch ? { fetchImpl: modelFetch } : {}) });
        } finally { modelInFlight = false; }
        await mutationQueue;
        if (capturedRevision !== state.revision) throw new ApiError(409, 'STALE_MODEL_CONTEXT', 'The progress changed while the model was running. Check the current records again.');
        sendJson(response, 200, {
          ...execution, candidate: execution.formatValid ? execution.candidate : null,
          mode: 'model_candidate', caseId: body.caseId, revision: capturedRevision,
          sourceDigest: report.sourceDigest,
          administrativeStateUnchanged: true, noExternalContact: true,
          localPilotBudget: modelBudget.snapshot(), providerQuotaVerified: false,
          amdVerified: false, requiresSemanticHumanReview: true,
        });
        return;
      }
      if (pathname === '/api/ai/context') {
        const revisionRequested = Object.hasOwn(body || {}, 'expectedRevision');
        checkEnvelope(body, revisionRequested ? ['caseId', 'question', 'expectedRevision'] : ['caseId', 'question']);
        if (revisionRequested) checkRevision(body, state);
        sendJson(response, 200, { enabled: false, revision: state.revision,
          input: getModelInput(state, body.caseId, body.question, fixtures) });
        return;
      }
      if (pathname.startsWith('/api/evidence/')) {
        // Serialize with human actions so a receipt cannot be committed against
        // a phase that changed while its separate file was being written.
        const evidence = await enqueue(async () => {
          if (pathname === '/api/evidence/query') return queryEvidence(state, body, fixtures);
          if (pathname === '/api/evidence/card') {
            const card = createEvidenceCard(state, body, fixtures);
            return persistEvidenceCard(storageDir, card);
          }
          return listEvidenceReviews(storageDir, state, body, fixtures);
        });
        sendJson(response, 200, evidence);
        return;
      }
      const result = await enqueue(async () => {
        if (pathname === '/api/actions') checkEnvelope(body, ['expectedRevision', 'action']);
        if (pathname === '/api/reset') checkEnvelope(body, ['expectedRevision', 'confirmed']);
        if (pathname === '/api/import') checkEnvelope(body, ['expectedRevision', 'state']);
        checkRevision(body, state);
        let next;
        if (pathname === '/api/actions') {
          next = transition(state, body.action, fixtures, new Date().toISOString());
        } else if (pathname === '/api/reset') {
          if (body.confirmed !== true) {
            throw new ApiError(400, 'RESET_CONFIRMATION_REQUIRED', 'Confirme explicitamente o reinício da demo.');
          }
          next = createState(fixtures, new Date().toISOString());
          next.revision = state.revision + 1;
        } else {
          validateState(body.state, fixtures);
          next = structuredClone(body.state);
          next.revision = state.revision + 1;
        }
        validateState(next, fixtures);
        if (next.revision !== state.revision + 1) {
          throw new ApiError(500, 'INVALID_TRANSITION', 'A ação não produziu a próxima revisão do estado.');
        }
        await saveState(storageDir, next);
        state = next;
        return viewState(state, fixtures);
      });
      sendJson(response, 200, result);
    } catch (error) {
      request.resume();
      if (!response.destroyed && !response.headersSent) sendError(response, error);
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      boundPort = server.address().port;
      resolve();
    });
  });
  const url = `http://${host === '::1' ? '[::1]' : host}:${boundPort}`;
  const close = async () => {
    voice.cancel();
    const closed = new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server.closeIdleConnections();
    await mutationQueue;
    if (careStore) await (await careStore).flush();
    await closed;
  };
  return { server, url, close };
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryFile === fileURLToPath(import.meta.url)) {
  try {
    const app = await createAppServer({
      ...(process.env.RETORNO_DATA_DIR ? { dataDir: process.env.RETORNO_DATA_DIR } : {}),
      ...(process.env.RETORNO_PORT !== undefined ? { port: Number(process.env.RETORNO_PORT) } : {}),
      ...(process.env.RETORNO_VOICE_ENABLED === '1' ? { voiceConfiguration: {
        pythonExecutable: process.env.RETORNO_VOICE_PYTHON,
        modelDirectory: process.env.RETORNO_VOICE_MODEL_DIR,
        modelId: process.env.RETORNO_VOICE_MODEL_ID,
        modelRevision: process.env.RETORNO_VOICE_MODEL_REVISION,
        tempRoot: path.join(process.env.RETORNO_DATA_DIR || path.join(APP_DIR, 'data'), 'voice-tmp'),
      } } : {}),
      modelBudgetLimits: {
        ...(process.env.RETORNO_MODEL_MAX_REQUESTS !== undefined ? { maxRequests: Number(process.env.RETORNO_MODEL_MAX_REQUESTS) } : {}),
        ...(process.env.RETORNO_MODEL_MAX_REQUEST_BYTES !== undefined ? { maxRequestBytes: Number(process.env.RETORNO_MODEL_MAX_REQUEST_BYTES) } : {}),
        ...(process.env.RETORNO_MODEL_MAX_OUTPUT_TOKENS !== undefined ? { maxOutputTokens: Number(process.env.RETORNO_MODEL_MAX_OUTPUT_TOKENS) } : {}),
      },
      ...(process.env.RETORNO_MODEL_ENABLED === '1' ? { modelConfiguration: {
        endpoint: process.env.RETORNO_MODEL_ENDPOINT,
        model: process.env.RETORNO_MODEL_NAME,
        ...(process.env.RETORNO_MODEL_RESPONSE_FORMAT !== undefined ? { responseFormat: process.env.RETORNO_MODEL_RESPONSE_FORMAT } : {}),
        ...(process.env.RETORNO_MODEL_API_KEY ? { apiKey: process.env.RETORNO_MODEL_API_KEY } : {}),
      }} : {}),
    });
    console.log(`Retorno · demonstração local: ${app.url}`);
    console.log(process.env.RETORNO_MODEL_ENABLED === '1'
      ? 'Dados sintéticos · configuração de modelo solicitada · AMD ainda exige evidência própria'
      : 'Dados sintéticos · IA desconectada · nenhum envio externo');
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      await app.close();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error(JSON.stringify({ error: { code: error.code ?? 'STARTUP_ERROR', message: error instanceof ApiError ? error.message : 'Não foi possível iniciar o servidor local.' } }));
    process.exitCode = 1;
  }
}
