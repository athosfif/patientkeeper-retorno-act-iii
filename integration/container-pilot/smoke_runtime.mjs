// Execute through stdin in the named, network-disabled local pilot container.
// This probe never enables a provider, supplies a key, or writes a case action.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const port = 8769;
const base = `http://127.0.0.1:${port}`;
const checks = [];
const check = async (name, run) => { await run(); checks.push({ name, passed: true }); };
const request = (route, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const req = http.request(base + route, { method, timeout: 3000,
    headers: { ...(payload ? { 'Content-Type': 'application/json' } : {}), ...headers } }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let json;
      try { json = JSON.parse(text); } catch { /* Static assets are text. */ }
      resolve({ status: response.statusCode, headers: response.headers, text, json });
    });
  });
  req.on('timeout', () => req.destroy(new Error('Local probe timed out')));
  req.on('error', reject);
  req.end(payload);
});
const sha = value => createHash('sha256').update(value).digest('hex');
const result = { schemaVersion: 1, checkedAtUtc: new Date().toISOString(),
  mode: 'inside_container_loopback_http', noProviderConfiguration: true,
  node: process.version, platform: process.platform, architecture: process.arch,
  providerCalls: 0, hostPortPublished: false, browserQaPerformed: false, checks };

try {
  // docker run returns before Node has necessarily completed startup/imports.
  // Readiness is bounded; a probe must not mistake that interval for a bind bug.
  let ready = false;
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try { if ((await request('/api/health')).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'The local application did not become ready within 5 seconds');
  result.readinessWaitMs = Date.now() - started;
  await check('unprivileged Linux process with providers disabled', async () => {
    assert.equal(process.platform, 'linux');
    assert.equal(process.getuid(), 1000);
    for (const flag of ['RETORNO_MODEL_ENABLED', 'RETORNO_VOICE_ENABLED', 'RETORNO_EVOLUS_ENABLED']) {
      assert.equal(process.env[flag], '0');
    }
    for (const key of ['RETORNO_MODEL_API_KEY', 'RETORNO_EVOLUS_API_KEY']) assert.equal(process.env[key], undefined);
    const status = await readFile('/proc/self/status', 'utf8');
    assert.match(status, /^CapEff:\s+0+$/m);
    assert.match(status, /^NoNewPrivs:\s+1$/m);
  });
  await check('root filesystem is read-only and temporary directory writable', async () => {
    await assert.rejects(writeFile('/opt/retorno/.container-write-probe', 'fictional'), { code: 'EROFS' });
    await writeFile('/tmp/container-write-probe', 'fictional');
    await unlink('/tmp/container-write-probe');
  });
  await check('HTTP listener is loopback-only inside the container', async () => {
    const proc = await readFile('/proc/net/tcp', 'utf8');
    const hexPort = port.toString(16).toUpperCase().padStart(4, '0');
    const listeners = proc.trim().split('\n').slice(1).map(line => line.trim().split(/\s+/))
      .filter(fields => fields[3] === '0A' && fields[1].endsWith(':' + hexPort));
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0][1], `0100007F:${hexPort}`);
  });
  await check('health and response policy', async () => {
    const health = await request('/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(health.json, { demo: true, aiConnected: false, storage: 'local_file' });
    assert.equal(health.headers['cache-control'], 'no-store');
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    assert.match(health.headers['content-security-policy'], /connect-src 'self'/);
  });
  const initial = await request('/api/export');
  assert.equal(initial.status, 200);
  const stateHash = sha(initial.text);
  const revision = initial.json.revision;
  await check('synthetic queue and doctor journey load', async () => {
    const state = await request('/api/state');
    assert.equal(state.status, 200);
    assert.ok(state.json.cases.length >= 1);
    assert.ok(state.json.cases.every(item => item.id.startsWith('SIM-RET-')));
    const care = await request('/api/care/state');
    assert.equal(care.status, 200);
    assert.equal(care.json.episodeId, 'SIM-CARE-01');
    assert.equal(care.json.clinicalProtocol.status, 'pending');
  });
  await check('model, voice, Evolus status disabled', async () => {
    const model = await request('/api/model/status');
    assert.equal(model.status, 200); assert.equal(model.json.enabled, false);
    assert.equal(model.json.configured, false); assert.equal(model.json.amdVerified, false);
    assert.equal(model.json.localPilotBudget.reservedRequests, 0);
    const voice = await request('/api/voice/status');
    assert.equal(voice.status, 200); assert.equal(voice.json.enabled, false);
    assert.equal(voice.json.syntheticOnly, true);
    const evolus = await request('/api/evolus/status');
    assert.equal(evolus.status, 200); assert.equal(evolus.json.enabled, false);
    assert.equal(evolus.json.configured, false); assert.equal(evolus.json.canStart, false);
    assert.equal(evolus.json.reservedExecutions, 0);
  });
  await check('model query refuses disabled integration without state mutation', async () => {
    const response = await request('/api/model/query', { method: 'POST', body: {
      caseId: 'SIM-RET-02', question: 'Who is responsible for this pending task?', expectedRevision: revision } });
    assert.equal(response.status, 503); assert.equal(response.json.error.code, 'MODEL_NOT_CONFIGURED');
  });
  await check('Evolus query refuses disabled integration without a workflow', async () => {
    const response = await request('/api/evolus/query', { method: 'POST', body: {
      caseId: 'SIM-RET-02', question: 'Qual pendência continua aberta e quem é o responsável?', expectedRevision: revision } });
    assert.equal(response.status, 503); assert.equal(response.json.error.code, 'EVOLUS_NOT_CONFIGURED');
    assert.equal(response.json.sessionId, null); assert.equal(response.json.candidate, null);
  });
  await check('voice refuses transcription when disabled', async () => {
    const response = await request('/api/voice/transcribe', { method: 'POST', body: {
      fileName: 'fictional.wav', mimeType: 'audio/wav', language: 'en',
      base64: Buffer.from('RIFFxxxxWAVExxxx').toString('base64'), syntheticConfirmed: true } });
    assert.equal(response.status, 503); assert.equal(response.json.error.code, 'VOICE_NOT_CONFIGURED');
  });
  await check('different Host rejected', async () => {
    const response = await request('/api/health', { headers: { Host: 'public.example.invalid' } });
    assert.equal(response.status, 403); assert.equal(response.json.error.code, 'LOCAL_HOST_REQUIRED');
  });
  await check('cross-origin write rejected', async () => {
    const response = await request('/api/evolus/query', { method: 'POST', body: {},
      headers: { Origin: 'https://public.example.invalid' } });
    assert.equal(response.status, 403); assert.equal(response.json.error.code, 'SAME_ORIGIN_REQUIRED');
  });
  await check('stale source context rejected', async () => {
    const response = await request('/api/ai/context', { method: 'POST', body: {
      caseId: 'SIM-RET-02', question: 'Who is responsible?', expectedRevision: revision + 1 } });
    assert.equal(response.status, 409); assert.equal(response.json.error.code, 'STALE_REVISION');
  });
  await check('static shell and all declared assets load', async () => {
    const source = await readFile('/opt/retorno/app/server.mjs', 'utf8');
    const block = source.split('const STATIC_FILES = new Map([', 2)[1].split(']);', 1)[0];
    const routes = [...block.matchAll(/\['(\/[^']*)', \['([^']+)'/g)].map(match => match[1]);
    assert.ok(routes.length >= 20);
    for (const route of routes) {
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.ok(response.text.length > 0, route);
    }
    result.staticRoutesChecked = routes.length;
  });
  await check('recorded Gemma evidence loads as replay only', async () => {
    const response = await request('/gemma-runs.json');
    assert.equal(response.status, 200); assert.equal(response.json.schemaVersion, 1);
    assert.equal(response.json.statistics.totalAttempts, 5);
    assert.equal(response.json.statistics.clinicalValidated, false);
    result.recordedEvidenceSha256 = sha(response.text);
  });
  await check('sensitive or non-allowlisted paths inaccessible', async () => {
    for (const route of ['/.env', '/data/state.json', '/Dockerfile', '/app/server.mjs',
      '/integration/evolus-pilot/rest-client.mjs', '/voice-transcription-worker.py']) {
      assert.equal((await request(route)).status, 404, route);
    }
  });
  await check('failed integration requests preserve administrative state and counters', async () => {
    const after = await request('/api/export');
    assert.equal(sha(after.text), stateHash);
    assert.equal((await request('/api/model/status')).json.localPilotBudget.reservedRequests, 0);
    assert.equal((await request('/api/evolus/status')).json.reservedExecutions, 0);
    result.administrativeStateSha256Before = stateHash;
    result.administrativeStateSha256After = sha(after.text);
  });
  const files = [];
  const walk = async (directory, prefix = '') => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await walk(directory + '/' + entry.name, name + '/');
      else {
        assert.equal(entry.isFile(), true, name);
        const bytes = await readFile(directory + '/' + entry.name);
        files.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
      }
    }
  };
  await walk('/opt/retorno');
  result.runtimeFiles = files.sort((a, b) => a.path.localeCompare(b.path));
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = { name: error.name, message: error.message, code: error.code ?? null };
  process.exitCode = 1;
}
console.log(JSON.stringify(result, null, 2));
