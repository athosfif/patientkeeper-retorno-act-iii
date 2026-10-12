import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAppServer } from '../server.mjs';

const assign = { type: 'assign', caseId: 'SIM-RET-02', owner: 'SEC-SIM-C' };

async function setup(t) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'retorno-server-test-'));
  const apps = new Set();
  const start = async (options = {}) => {
    const app = await createAppServer({ dataDir, port: 0, ...options });
    apps.add(app);
    return app;
  };
  const stop = async (app) => {
    if (!apps.delete(app)) return;
    await app.close();
  };
  t.after(async () => {
    for (const app of apps) await app.close();
    await rm(dataDir, { recursive: true, force: true });
  });
  return { dataDir, start, stop, app: await start() };
}

async function json(url, pathname, body, extra = {}) {
  const response = await fetch(`${url}${pathname}`, body === undefined ? extra : {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...extra.headers },
    body: JSON.stringify(body), ...extra,
  });
  return { response, body: await response.json() };
}

// Raw HTTP avoids fetch's URL normalization and lets the tests exercise Host,
// traversal, chunked input and the server's actual method handling.
function rawRequest(url, { pathname = '/', method = 'GET', headers = {}, chunks = [] } = {}) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: target.hostname, port: target.port, path: pathname, method,
      headers: { Host: target.host, ...headers },
    }, (response) => {
      const data = [];
      response.on('data', (chunk) => data.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(data).toString('utf8');
        let body;
        try { body = JSON.parse(text); } catch { body = text; }
        resolve({ status: response.statusCode, headers: response.headers, body });
      });
      response.on('error', reject);
    });
    request.on('error', reject);
    chunks.forEach((chunk) => request.write(chunk));
    request.end();
  });
}

test('health and initial state explicitly describe a local synthetic demo', async (t) => {
  const { app, dataDir } = await setup(t);
  const health = await json(app.url, '/api/health');
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.body, { demo: true, aiConnected: false, storage: 'local_file' });
  assert.equal(health.response.headers.get('access-control-allow-origin'), null);
  const state = await json(app.url, '/api/state');
  assert.equal(state.response.status, 200);
  assert.equal(state.body.revision, 0);
  assert.equal(state.body.cases.length, 8);
  assert.ok(state.body.metrics);
  assert.deepEqual((await readdir(dataDir)).sort(), ['state.json']);
  const persisted = JSON.parse(await readFile(path.join(dataDir, 'state.json'), 'utf8'));
  assert.equal(persisted.revision, 0);
});

test('a human action persists atomically and survives restarting the local server', async (t) => {
  const { app, dataDir, start, stop } = await setup(t);
  const result = await json(app.url, '/api/actions', { expectedRevision: 0, action: assign });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.revision, 1);
  const exported = await json(app.url, '/api/export');
  assert.equal(exported.body.revision, 1);
  assert.equal(exported.response.headers.get('content-disposition'), 'attachment; filename="retorno-sintetico.json"');
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir, 'state.json'), 'utf8')), exported.body);
  assert.deepEqual((await readdir(dataDir)).sort(), ['state.json']);
  await stop(app);
  const restarted = await start();
  const recovered = await json(restarted.url, '/api/export');
  assert.deepEqual(recovered.body, exported.body);
});

test('concurrent requests with the same revision cannot both mutate the state', async (t) => {
  const { app } = await setup(t);
  const results = await Promise.all([
    json(app.url, '/api/actions', { expectedRevision: 0, action: assign }),
    json(app.url, '/api/actions', { expectedRevision: 0, action: { ...assign, owner: 'SEC-SIM-A' } }),
  ]);
  assert.deepEqual(results.map((result) => result.response.status).sort(), [200, 409]);
  const stale = results.find((result) => result.response.status === 409);
  assert.equal(stale.body.error.code, 'STALE_REVISION');
  assert.equal((await json(app.url, '/api/state')).body.revision, 1);
});

test('invalid actions and envelopes leave the stored state untouched', async (t) => {
  const { app, dataDir } = await setup(t);
  const before = await readFile(path.join(dataDir, 'state.json'), 'utf8');
  for (const body of [
    { expectedRevision: 0, action: { type: 'send', caseId: 'SIM-RET-04' } },
    { expectedRevision: 0, action: assign, privateEmail: 'not-allowed@example.invalid' },
    { expectedRevision: '0', action: assign },
    { expectedRevision: -1, action: assign },
    [], null,
  ]) {
    const result = await json(app.url, '/api/actions', body);
    assert.equal(result.response.status, 400);
    assert.ok(result.body.error.code);
    assert.equal(Object.hasOwn(result.body.error, 'stack'), false);
  }
  assert.equal(await readFile(path.join(dataDir, 'state.json'), 'utf8'), before);
});

test('reset requires confirmation, respects the current revision and advances it', async (t) => {
  const { app } = await setup(t);
  await json(app.url, '/api/actions', { expectedRevision: 0, action: assign });
  const rejected = await json(app.url, '/api/reset', { expectedRevision: 1, confirmed: false });
  assert.equal(rejected.response.status, 400);
  assert.equal(rejected.body.error.code, 'RESET_CONFIRMATION_REQUIRED');
  const stale = await json(app.url, '/api/reset', { expectedRevision: 0, confirmed: true });
  assert.equal(stale.response.status, 409);
  const reset = await json(app.url, '/api/reset', { expectedRevision: 1, confirmed: true });
  assert.equal(reset.response.status, 200);
  assert.equal(reset.body.revision, 2);
  assert.equal(reset.body.cases.length, 8);
});

test('export/import restores canonical synthetic state without reusing an old revision', async (t) => {
  const { app } = await setup(t);
  const initial = (await json(app.url, '/api/export')).body;
  await json(app.url, '/api/actions', { expectedRevision: 0, action: assign });
  const imported = await json(app.url, '/api/import', { expectedRevision: 1, state: initial });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.revision, 2);
  const exported = (await json(app.url, '/api/export')).body;
  assert.deepEqual(exported, { ...initial, revision: 2 });
  const stale = await json(app.url, '/api/import', { expectedRevision: 1, state: initial });
  assert.equal(stale.response.status, 409);
});

test('import rejects extra data, malformed schema and arbitrary cases', async (t) => {
  const { app, dataDir } = await setup(t);
  const initial = (await json(app.url, '/api/export')).body;
  const before = await readFile(path.join(dataDir, 'state.json'), 'utf8');
  const extraCase = structuredClone(initial);
  if (Array.isArray(extraCase.cases)) extraCase.cases.push({ id: 'REAL-CASE-01' });
  else extraCase.cases = { ...extraCase.cases, 'REAL-CASE-01': { id: 'REAL-CASE-01' } };
  for (const state of [
    { ...initial, privateCredentials: 'arbitrary-data-must-not-import' },
    { ...initial, schemaVersion: 'unrecognized' }, extraCase,
  ]) {
    const result = await json(app.url, '/api/import', { expectedRevision: 0, state });
    assert.equal(result.response.status, 400);
    assert.ok(result.body.error.code);
    assert.equal(JSON.stringify(result.body).includes('arbitrary-data-must-not-import'), false);
  }
  assert.equal(await readFile(path.join(dataDir, 'state.json'), 'utf8'), before);
});

test('AI endpoint only prepares the active allowlisted input and keeps AI disabled', async (t) => {
  const { app } = await setup(t);
  const result = await json(app.url, '/api/ai/context', {
    caseId: 'SIM-RET-01', question: 'Qual pendência continua aberta?',
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.enabled, false);
  assert.ok(result.body.input);
  const input = JSON.stringify(result.body.input);
  assert.ok(input.includes('SIM01-AGENDA'));
  assert.deepEqual(Object.keys(result.body.input).sort(), ['caseId', 'question', 'sources']);
  for (const source of result.body.input.sources) {
    for (const key of Object.keys(source)) {
      assert.ok(['id', 'trecho', 'versao', 'vigente', 'substituida_por'].includes(key));
    }
  }
  for (const excluded of ['teste_evidencia', 'answer_esperada', 'acoes_humanas_esperadas', 'SIM01-EVOL-', '"rascunho":', 'criterios_futuros']) {
    assert.equal(input.includes(excluded), false, `Excluded field or future source: ${excluded}`);
  }
  assert.equal((await json(app.url, '/api/state')).body.revision, 0);
  const unknown = await json(app.url, '/api/ai/context', { caseId: 'REAL-CASE-01', question: 'Pergunta' });
  assert.equal(unknown.response.status, 400);
});

test('static allowlist blocks state, source, hidden files and path traversal', async (t) => {
  const { app } = await setup(t);
  for (const pathname of [
    '/data/state.json', '/state.json', '/server.mjs', '/engine.mjs', '/tests/server.test.mjs',
    '/.env', '/../CASOS-SINTETICOS.json', '/%2e%2e/CASOS-SINTETICOS.json',
    '/styles.css/../../server.mjs', '/%2f..%2fserver.mjs', '/..\\server.mjs',
  ]) {
    const response = await rawRequest(app.url, { pathname });
    assert.equal(response.status, 404, pathname);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  }
});

test('the interface allowlist serves HTML, CSS and the module with safe content headers', async (t) => {
  const { app } = await setup(t);
  for (const [pathname, contentType] of [
    ['/', 'text/html; charset=utf-8'], ['/index.html', 'text/html; charset=utf-8'],
    ['/styles.css', 'text/css; charset=utf-8'], ['/client.mjs?v=1', 'text/javascript; charset=utf-8'],
  ]) {
    const response = await rawRequest(app.url, { pathname });
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], contentType);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.ok(response.headers['content-security-policy'].includes("connect-src 'self'"));
    assert.ok(String(response.body).length > 0);
  }
  const head = await rawRequest(app.url, { pathname: '/', method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);
});

test('wrong methods return JSON errors with the allowed method and no CORS support', async (t) => {
  const { app } = await setup(t);
  for (const [pathname, method, expectedAllow] of [
    ['/api/state', 'POST', 'GET'], ['/api/actions', 'GET', 'POST'],
    ['/api/reset', 'OPTIONS', 'POST'], ['/styles.css', 'POST', 'GET, HEAD'],
  ]) {
    const response = await rawRequest(app.url, { pathname, method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, expectedAllow);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(response.body.error.code, 'METHOD_NOT_ALLOWED');
  }
});

test('mutation origins must match the local request origin and Host must be loopback', async (t) => {
  const { app } = await setup(t);
  const target = new URL(app.url);
  for (const host of ['evil.example', `evil.example:${target.port}`, `127.0.0.1:${Number(target.port) + 1}`, `127.0.0.1:${target.port}@evil.example`]) {
    const result = await rawRequest(app.url, { pathname: '/api/state', headers: { Host: host } });
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'LOCAL_HOST_REQUIRED');
  }
  for (const origin of ['https://evil.example', 'null', `http://localhost:${target.port}`]) {
    const result = await json(app.url, '/api/actions', { expectedRevision: 0, action: assign }, { headers: { 'Content-Type': 'application/json', Origin: origin } });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.error.code, 'SAME_ORIGIN_REQUIRED');
  }
  const accepted = await json(app.url, '/api/actions', { expectedRevision: 0, action: assign }, { headers: { 'Content-Type': 'application/json', Origin: app.url } });
  assert.equal(accepted.response.status, 200);
});

test('malformed JSON, UTF-8 and content types cannot mutate state', async (t) => {
  const { app } = await setup(t);
  for (const chunks of [['{'], [''], [Buffer.from([0xff, 0xfe])]]) {
    const result = await rawRequest(app.url, { pathname: '/api/actions', method: 'POST', headers: { 'Content-Type': 'application/json' }, chunks });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, 'INVALID_JSON');
  }
  const badType = await rawRequest(app.url, { pathname: '/api/actions', method: 'POST', headers: { 'Content-Type': 'text/plain' }, chunks: ['{}'] });
  assert.equal(badType.status, 415);
  assert.equal(badType.body.error.code, 'JSON_REQUIRED');
  assert.equal((await json(app.url, '/api/state')).body.revision, 0);
});

test('request body limit applies to declared and chunked payloads', async (t) => {
  const { app } = await setup(t);
  const oversized = JSON.stringify({ padding: 'x'.repeat(128 * 1024) });
  for (const headers of [
    { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(oversized) },
    { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
  ]) {
    const result = await rawRequest(app.url, { pathname: '/api/import', method: 'POST', headers, chunks: [oversized] });
    assert.equal(result.status, 413);
    assert.equal(result.body.error.code, 'BODY_TOO_LARGE');
  }
  assert.equal((await json(app.url, '/api/state')).body.revision, 0);
});

test('existing corrupt storage fails visibly and is never silently overwritten', async (t) => {
  const { app, dataDir, stop } = await setup(t);
  await stop(app);
  const corrupt = '{"private":"preserve-for-review"';
  await writeFile(path.join(dataDir, 'state.json'), corrupt);
  await assert.rejects(createAppServer({ dataDir, port: 0 }), { code: 'STORE_CORRUPT' });
  assert.equal(await readFile(path.join(dataDir, 'state.json'), 'utf8'), corrupt);
});

test('syntactically valid but noncanonical stored data also fails without replacement', async (t) => {
  const { app, dataDir, stop } = await setup(t);
  await stop(app);
  const corrupt = JSON.stringify({ schemaVersion: 1, revision: 0, cases: [] });
  await writeFile(path.join(dataDir, 'state.json'), corrupt);
  await assert.rejects(createAppServer({ dataDir, port: 0 }), { code: 'STORE_CORRUPT' });
  assert.equal(await readFile(path.join(dataDir, 'state.json'), 'utf8'), corrupt);
});

test('state-file symlinks cannot expose another file through the export API', async (t) => {
  const { app, dataDir, stop } = await setup(t);
  await stop(app);
  const statePath = path.join(dataDir, 'state.json');
  const original = await readFile(statePath, 'utf8');
  const otherPath = path.join(dataDir, 'other.json');
  await writeFile(otherPath, original);
  await rm(statePath);
  await symlink(otherPath, statePath);
  await assert.rejects(createAppServer({ dataDir, port: 0 }), { code: 'STORE_CORRUPT' });
  assert.equal(await readFile(otherPath, 'utf8'), original);
});

test('a disk commit failure reports an error and does not apply the action in memory', async (t) => {
  const { app, dataDir } = await setup(t);
  const before = (await json(app.url, '/api/export')).body;
  await rm(path.join(dataDir, 'state.json'));
  await mkdir(path.join(dataDir, 'state.json'));
  const result = await json(app.url, '/api/actions', { expectedRevision: 0, action: assign });
  assert.equal(result.response.status, 500);
  assert.equal(result.body.error.code, 'STORE_UNAVAILABLE');
  assert.deepEqual((await json(app.url, '/api/export')).body, before);
  assert.deepEqual((await readdir(dataDir)).sort(), ['state.json']);
});

test('server configuration rejects non-loopback interfaces and invalid ports', async () => {
  for (const host of ['0.0.0.0', '::', 'example.com', '192.168.1.10']) {
    await assert.rejects(createAppServer({ host, port: 0 }), { code: 'LOCAL_BIND_REQUIRED' });
  }
  for (const port of [-1, 65536, 1.2, '8769', Number.NaN]) {
    await assert.rejects(createAppServer({ port }), { code: 'INVALID_PORT' });
  }
});
