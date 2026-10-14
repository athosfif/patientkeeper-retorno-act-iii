import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createState, viewState } from '../app/engine.mjs';
import { readRecordedAMDArchive, recordedContextMatches } from '../app/recorded-amd.mjs';
import { readRecordedGemmaArchive } from '../app/recorded-gemma.mjs';

// Positive allowlist: no app/data, credentials, remote transport or test oracle.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPY = ['recorded-gemma.mjs', 'recorded-gemma-client.mjs', 'recorded-gemma.css', 'care-journey.mjs', 'care-journey-client.mjs', 'care-journey.css', 'care-browser-api.mjs', 'selection-controls.css', 'styles.css', 'favicon.svg', 'theme-init.js', 'theme.mjs', 'calendar.mjs', 'calendar-client.mjs', 'evidence-client.mjs', 'model-client.mjs', 'engine.mjs', 'recorded-amd-client.mjs', 'recorded-amd.mjs', 'ai-contract.mjs', 'source-reading.mjs', 'source-translations.mjs'];
const SOURCE_KEYS = ['id', 'trecho', 'versao', 'vigente', 'substituida_por'];
const pick = (value, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
function replaceOnce(source, needle, value) {
  if (source.split(needle).length !== 2) throw new Error(`Build marker missing or ambiguous: ${needle.slice(0, 60)}`);
  return source.replace(needle, value);
}
// The static product has no audio backend. Remove the entire local file-reading,
// encoding and upload callback before publishing; a disabled UI is not enough.
export function browserClientWithoutVoiceUpload(source) {
  const startMarker = "  transcribeAudio: async (file, { signal, onProgress, language = 'pt' } = {}) => {\n";
  const endMarker = "  },\n});\nvoid request('/api/voice/status')";
  if (typeof source !== 'string' || source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) {
    throw new Error('The local voice callback boundary is missing or ambiguous.');
  }
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (end < start) throw new Error('The local voice callback boundary changed.');
  const replacement = "  transcribeAudio: async () => {\n    throw Object.assign(new Error('VOICE_UNAVAILABLE'), { code: 'VOICE_UNAVAILABLE' });\n";
  const portable = source.slice(0, start) + replacement + source.slice(end);
  if (/\bfetch\s*\(/.test(portable) || /file\.arrayBuffer\s*\(|\bbtoa\s*\(/.test(portable)) {
    throw new Error('The static client still contains an upload or direct network transport.');
  }
  return portable;
}
function browserCareAdapter(source) {
  const careImport = "import { createCareBrowserApi } from './care-browser-api.mjs';\n";
  const original = 'export const request = createBrowserApi();';
  const generated = 'export const request = createCareBrowserApi(createBrowserApi());';
  // The adapter is also an output file. Recognize only our exact prior wrapper
  // so a checked-in public build can be reproduced without nesting wrappers.
  if (source.startsWith(careImport)) {
    if (source.split(careImport).length !== 2 || source.split(generated).length !== 2 || source.includes(original)) {
      throw new Error('The generated browser adapter boundary is ambiguous.');
    }
    source = replaceOnce(source.slice(careImport.length), generated, original);
  } else if (source.includes(careImport) || source.includes(generated)) {
    throw new Error('The browser adapter wrapper is unexpected.');
  }
  return careImport + replaceOnce(source, original, generated);
}
function browserEvidence(source) {
  const end = source.indexOf('function corrupt()');
  if (end < 0) throw new Error('Evidence persistence boundary was not found.');
  let portable = source.slice(0, end).replace(/^import .*from 'node:[^']+';\n/gm, '');
  portable = replaceOnce(portable, "const REVIEW_FILE = 'evidence-reviews.json';\n", '');
  portable = replaceOnce(portable, 'function context(state, caseId, fixtures) {', 'export async function evidenceContext(state, caseId, fixtures) {');
  portable = replaceOnce(portable, "return { ...canonical, sourceDigest: createHash('sha256').update(JSON.stringify(canonical)).digest('hex') };", "const bytes = new TextEncoder().encode(JSON.stringify(canonical));\n  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);\n  const sourceDigest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');\n  return { ...canonical, sourceDigest };");
  portable = replaceOnce(portable, 'export function queryEvidence(', 'export async function queryEvidence(');
  portable = replaceOnce(portable, 'export function createEvidenceCard(', 'export async function createEvidenceCard(');
  const contextCall = 'const input = context(state, body.caseId, fixtures);';
  if (portable.split(contextCall).length !== 3) throw new Error('Evidence context calls changed; review the browser conversion.');
  portable = portable.replaceAll(contextCall, 'const input = await evidenceContext(state, body.caseId, fixtures);');
  portable = replaceOnce(portable, '${randomUUID()}', '${globalThis.crypto.randomUUID()}');
  portable = replaceOnce(portable, 'function validCard(', 'export function validCard(');
  portable = replaceOnce(portable, 'function validStore(', 'export function validStore(');
  if (/node:|createHash|\bBuffer\b|readEvidenceReviews|persistEvidenceCard/.test(portable)) throw new Error('Portable evidence still references Node persistence.');
  return '// Generated from app/evidence.mjs. Domain checks and literal excerpts are preserved.\n' + portable;
}
function publicFixtures(source) {
  const casos = source.casos.map(item => {
    const projected = pick(item, ['id', 'titulo', 'estado_administrativo', 'responsavel']);
    projected.paciente = pick(item.paciente, ['dados_reais', 'nome', 'telefone', 'email']);
    projected.preferencia_contato = pick(item.preferencia_contato, ['registro_ficticio', 'status', 'canal']);
    projected.proxima_acao = pick(item.proxima_acao, ['texto']);
    projected.fontes = item.fontes.map(source => pick(source, SOURCE_KEYS));
    projected.rascunho = pick(item.rascunho, ['permitido_na_simulacao', 'texto', 'motivo']);
    if (item.handoff) projected.handoff = pick(item.handoff, ['motivo']);
    if (item.evolucao_demonstrativa) projected.evolucao_demonstrativa = { fontes_apos_ativacao:item.evolucao_demonstrativa.fontes_apos_ativacao.map(source => pick(source, SOURCE_KEYS)) };
    return projected;
  });
  const fixtures = { casos };
  viewState(createState(fixtures), fixtures); // Validate the exact public projection before writing.
  return fixtures;
}
const FINAL_ARCHIVE = 'evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL';
const CLOUD_SHUTDOWN_AT = '2026-10-12T17:39:42Z';
const SELECTED_RUNS = [
  ['SIM-RET-01','RUN-20261012T172749Z-a19ac764',1],
  ['SIM-RET-02','RUN-20261012T172749Z-a19ac764',2],
  ['SIM-RET-03','RUN-20261012T173007Z-ff69817d',1],
  ['SIM-RET-04','RUN-20261012T173027Z-0c611e08',1],
  ['SIM-RET-05','RUN-20261012T173042Z-356bd353',1],
  ['SIM-RET-06','RUN-20261012T173057Z-9edc6353',1],
  ['SIM-RET-07','RUN-20261012T173115Z-cc32d521',1],
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function recordedArchive(root) {
  const cases=publicFixtures(JSON.parse(await readFile(path.join(root,'CASOS-SINTETICOS.json'),'utf8')));
  const baseline=createState(cases);
  const originalInputs=await Promise.all(['scripts/amd-pilot-inputs.json',`${FINAL_ARCHIVE}/amd-demo-inputs.json`].map(async name=>{
    const bytes=await readFile(path.join(root,name));return {name,bytes,sha256:sha256(bytes),contexts:JSON.parse(bytes)};
  }));
  const attempts=[];
  const dirs=(await readdir(path.join(root,FINAL_ARCHIVE))).filter(name=>/^RUN-[A-Za-z0-9-]+$/.test(name)).toSorted();
  for (const runId of dirs) {
    const runDir=path.join(root,FINAL_ARCHIVE,runId);
    const [environmentBytes,inputBytes,names]=await Promise.all([readFile(path.join(runDir,'environment.json')),readFile(path.join(runDir,'product-inputs.json')),readdir(runDir)]);
    const environment=JSON.parse(environmentBytes),inputs=JSON.parse(inputBytes);
    if (environment.runId !== runId) throw new Error('Recorded AMD run provenance mismatch.');
    // The worker rewrites its selected prefix without a trailing newline. The
    // original input hash can refer to a larger request file; retain both hashes.
    const original=originalInputs.find(input=>input.sha256 === environment.inputSha256);
    if (sha256(inputBytes) !== environment.inputSha256 && (!original || inputs.some((context,index)=>!recordedContextMatches(context,original.contexts[index])))) throw new Error('Recorded AMD input provenance mismatch.');
    for (const name of names.filter(name=>/^result-\d{2}\.json$/.test(name)).toSorted()) {
      const resultBytes=await readFile(path.join(runDir,name)),result=JSON.parse(resultBytes);
      const context=inputs[result.index-1];
      if (!context || context.caseId !== result.caseId || result.runId !== runId || result.gpuInferenceExecuted !== true || result.semanticApproved !== false) throw new Error('Recorded AMD result does not match its original input.');
      const rawName=`raw-${String(result.index).padStart(2,'0')}.txt`,rawBytes=await readFile(path.join(runDir,rawName));
      const provenance=pick(environment,['runId','observedAt','model','revision','modelSource','deviceName','torchHip','dtype','torch','transformers','python','attentionImplementation','cacheOnly','scriptSha256','inputSha256']);
      provenance.cloudShutdownVerified=true;provenance.cloudShutdownAt=CLOUD_SHUTDOWN_AT;
      provenance.shutdownEvidence='Separate authenticated AMD Developer Cloud portal observation; not a model-generated status.';
      provenance.inputFile='product-inputs.json';provenance.productInputsSha256=sha256(inputBytes);provenance.resultFile=name;provenance.resultSha256=sha256(resultBytes);provenance.rawOutputFile=rawName;provenance.rawOutputSha256=sha256(rawBytes);
      attempts.push({context,result,rawOutput:rawBytes.toString('utf8'),provenance});
    }
  }
  const records=SELECTED_RUNS.map(([caseId,runId,index])=>{
    const found=attempts.find(record=>record.result.caseId === caseId && record.result.runId === runId && record.result.index === index);
    if (!found) throw new Error('A selected baseline AMD run is absent.');
    const item=viewState(baseline,cases).cases.find(item=>item.id === caseId);
    const current={caseId,question:found.context.question,sources:item.activeSources};
    if (!recordedContextMatches(found.context,current)) throw new Error(`Recorded AMD baseline mismatch: ${caseId}`);
    return found;
  });
  const selected=new Set(records.map(record=>`${record.result.runId}/${record.result.index}`));
  const otherAttempts=attempts.filter(record=>!selected.has(`${record.result.runId}/${record.result.index}`));
  const statistics={totalAttempts:attempts.length,formatValidAttempts:attempts.filter(record=>record.result.validation?.formatValid === true).length,baselineCases:records.length,formatValidBaselineCases:records.filter(record=>record.result.validation?.formatValid === true).length,semanticApproved:false};
  if (statistics.totalAttempts !== 9 || statistics.formatValidAttempts !== 3 || statistics.baselineCases !== 7 || statistics.formatValidBaselineCases !== 2) throw new Error('The authoritative AMD attempt totals changed; review the public selection explicitly.');
  const archive={schemaVersion:1,kind:'recorded_amd_synthetic_evidence',liveInference:false,
    selectionPolicy:'One fixed run per original baseline case. The separate successful assigned-case diagnostic and the later rejected case-01 prompt remain in otherAttempts; neither replaces an original baseline result.',
    statistics,
    cloudSession:{status:'OFF',verifiedAt:CLOUD_SHUTDOWN_AT,evidence:'Authenticated AMD Developer Cloud portal showed Request Notebook enabled; this observation is separate from the GPU execution records.'},
    sourceBundle:{bytes:93993,sha256:'fdceb4c2af55d15a2418b814226d1902315168c3f54716e5113d7188e35f25bc'},
    records,otherAttempts};
  if (!readRecordedAMDArchive(archive).valid) throw new Error('The public AMD replay archive failed validation.');
  return archive;
}
const publicCopy = [
  ['Demonstração isolada no navegador', 'Isolated browser demo', 'Demostración aislada en el navegador'],
  ['As alterações ficam somente neste navegador. Limpar os dados do site apaga o progresso.', 'Changes stay only in this browser. Clearing site data erases progress.', 'Los cambios quedan solo en este navegador. Borrar los datos del sitio elimina el progreso.'],
  ['Armazenamento deste navegador · Sem contato externo ou IA remota.', 'Browser storage · No external contact or remote AI.', 'Almacenamiento de este navegador · Sin contacto externo ni IA remota.'],
  ['Este navegador não permite salvar o progresso. Nenhuma alteração foi registrada.', 'This browser does not allow progress to be saved. No change was recorded.', 'Este navegador no permite guardar el progreso. No se registró ningún cambio.'],
  ['Os dados salvos desta demonstração são inválidos. Eles foram preservados; exporte uma cópia do armazenamento antes de limpar os dados do site.', 'This demo’s saved data is invalid. It has been preserved; copy the browser storage before clearing site data.', 'Los datos guardados de esta demostración no son válidos. Se han conservado; copie el almacenamiento antes de borrar los datos del sitio.'],
  ['Este navegador não oferece bloqueio seguro entre abas. Use uma versão atual do Chrome, Edge, Firefox ou Safari com HTTPS.', 'This browser does not support safe coordination between tabs. Use a current Chrome, Edge, Firefox or Safari over HTTPS.', 'Este navegador no admite coordinación segura entre pestañas. Use una versión actual de Chrome, Edge, Firefox o Safari con HTTPS.'],
  ['Esta demonstração precisa de HTTPS ou localhost para conferir as fontes com segurança.', 'This demo requires HTTPS or localhost to verify source records securely.', 'Esta demostración requiere HTTPS o localhost para verificar las fuentes de forma segura.'],
  ['Não foi possível salvar. Nenhuma alteração foi registrada.', 'Could not save. No change was recorded.', 'No se pudo guardar. No se registró ningún cambio.'],
  ['Este navegador não permite abrir o armazenamento local. Seus dados não foram substituídos.', 'This browser does not allow local storage to be opened. Your data was not replaced.', 'Este navegador no permite abrir el almacenamiento local. Sus datos no se sustituyeron.'],
  ['Confira se o navegador permite armazenamento para este site e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.', 'Check that this browser allows storage for this site, then reload. Your records will not be replaced automatically.', 'Compruebe que el navegador permite almacenar datos de este sitio y recargue. Sus registros no se sustituirán automáticamente.'],
  ['Armazenamento do navegador indisponível.', 'Browser storage unavailable.', 'Almacenamiento del navegador no disponible.'],
  ['Progresso fictício importado e salvo somente neste navegador.', 'Fictional progress imported and saved only in this browser.', 'Progreso ficticio importado y guardado solo en este navegador.'],
  ['Atribuições e etapas são salvas somente neste navegador, com registro de data e hora.', 'Assignments and stages are saved only in this browser, with timestamps.', 'Las asignaciones y etapas se guardan solo en este navegador, con fecha y hora.'],
  ['Exportar recibos de conferência', 'Export review receipts', 'Exportar recibos de revisión'],
  ['A cópia do progresso não inclui os recibos de conferência. Exporte-os separadamente; reiniciar os casos preserva esses recibos neste navegador.', 'The progress copy does not include review receipts. Export them separately; resetting cases keeps these receipts in this browser.', 'La copia del progreso no incluye los recibos de revisión. Expórtelos por separado; reiniciar los casos conserva estos recibos en este navegador.'],
  ['Confirme a substituição do progresso fictício pelo estado inicial.', 'Confirm replacement of fictional progress with the initial state.', 'Confirme la sustitución del progreso ficticio por el estado inicial.'],
  ['Protótipo administrativo com casos fictícios. A equipe define regras de contato e janelas clínicas. Consulta literal de fontes e execução AMD gravada; GPU desligada, sem inferência ao vivo. Não faz avaliação clínica, ranking da equipe ou envio automático.', 'Administrative prototype with fictional cases. The team defines contact rules and clinical timing. Literal source lookup and a recorded AMD execution; GPU off, no live inference. No clinical assessment, staff ranking, or automatic messages.', 'Prototipo administrativo con casos ficticios. El equipo define las reglas de contacto y los plazos clínicos. Consulta literal de fuentes y ejecución AMD grabada; GPU apagada, sin inferencia en vivo. Sin evaluación clínica, clasificación del equipo ni mensajes automáticos.'],
  ['A aba Conferência consulta estes trechos localmente. A execução AMD gravada é apresentada separadamente; fontes históricas ficam separadas da ação atual.', 'The Review tab looks up these excerpts locally. The recorded AMD execution is shown separately; historical sources are kept apart from the current action.', 'La pestaña Revisión consulta estos fragmentos localmente. La ejecución AMD grabada se muestra por separado; las fuentes históricas se separan de la acción actual.'],
  ['Armazenamento deste navegador · Execução AMD gravada · Sem inferência ao vivo.', 'Browser storage · Recorded AMD execution · No live inference.', 'Almacenamiento de este navegador · Ejecución AMD grabada · Sin inferencia en vivo.'],
];
export async function buildPublicDemo({ root = ROOT, outputDir = path.join(root, 'public-demo') } = {}) {
  const names = [...COPY, 'client.mjs', 'i18n.mjs', 'index.html', 'evidence.mjs'];
  const [files, rawFixtures, adapter, archive] = await Promise.all([
    Promise.all(names.map(async name => [name, await readFile(path.join(root, 'app', name), 'utf8')])),
    readFile(path.join(root, 'CASOS-SINTETICOS.json'), 'utf8'),
    readFile(path.join(root, 'public-demo', 'browser-api.mjs'), 'utf8'),
    recordedArchive(root),
  ]);
  const gemmaRaw = JSON.parse(await readFile(path.join(root, 'docs/recorded-gemma-runs.json'), 'utf8'));
  if (!(await readRecordedGemmaArchive(gemmaRaw)).valid) throw new Error('Recorded Gemma archive failed its pinned evidence check.');
  const content = new Map(files), generated = new Map(COPY.map(name => [name, content.get(name)]));
  generated.set('styles.css', content.get('styles.css') + `\n/* Recorded execution is a separate reading surface, not a live AI answer. */\n.recorded-amd-reading.section{padding:24px;margin-top:28px;border-top:1px solid var(--line);border-radius:10px;background:var(--surface-subtle);min-width:0;overflow-wrap:anywhere}.recorded-amd-reading .section-title-row h3{font:400 18px/1.35 Georgia,"Times New Roman",serif;letter-spacing:-.02em}.recorded-amd-reading h4{font-size:14px;margin:20px 0 10px}.recorded-amd-reading .evidence-excerpt{background:var(--white)}.recorded-amd-reading .evidence-excerpt>strong{font-size:11px}.recorded-amd-reading .evidence-receipts .caption{overflow-wrap:anywhere}.recorded-amd-reading .caption{line-height:1.6}.recorded-amd-reading .callout{line-height:1.65}@media(max-width:480px){.recorded-amd-reading.section{padding:18px}}\n`);
  generated.set('browser-api.mjs', browserCareAdapter(adapter));
  generated.set('amd-runs.json',JSON.stringify(archive,null,2)+'\n');
  generated.set('gemma-runs.json',JSON.stringify(gemmaRaw,null,2)+'\n');
  let evidenceClient=content.get('evidence-client.mjs');
  if (!evidenceClient.includes("from './recorded-amd-client.mjs'")) evidenceClient="import { mountRecordedAMDPanel } from './recorded-amd-client.mjs';\n"+evidenceClient;
  if (!evidenceClient.includes('mountRecordedAMDPanel(container,')) evidenceClient=replaceOnce(evidenceClient,'  mountModelPanel(container,','  mountRecordedAMDPanel(container, { item, revision, request, notify, onStale });\n  mountModelPanel(container,');
  generated.set('evidence-client.mjs',evidenceClient);
  const client = content.get('client.mjs');
  const start = client.indexOf('async function request(path, body) {'), end = client.indexOf('function setBusy(value) {', start);
  if (start < 0 || end < 0) throw new Error('The client request boundary was not found.');
  let browserClient = "import { request } from './browser-api.mjs';\n" + client.slice(0, start) + client.slice(end);
  browserClient = browserClientWithoutVoiceUpload(browserClient);
  const exportHandler = `$('#export').addEventListener('click',async event => {\n  event.preventDefault();\n  try {\n    const snapshot=await request('/api/export');\n    const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)+'\\n'],{type:'application/json'}));\n    const link=document.createElement('a');link.href=url;link.download='retorno-ficticio-navegador.json';\n    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);\n  } catch(error) { notify(error.message,true); }\n});\n`;
  browserClient = replaceOnce(browserClient, "$('#open-reset').onclick", exportHandler + "$('#open-reset').onclick");
  browserClient += `\n$('#export-reviews').addEventListener('click',async ()=>{\n  try {\n    const receipts=await request('/api/evidence/export');\n    const url=URL.createObjectURL(new Blob([JSON.stringify(receipts,null,2)+'\\n'],{type:'application/json'}));\n    const link=document.createElement('a');link.href=url;link.download='retorno-recibos-ficticios.json';\n    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);\n  } catch(error) { notify(error.message,true); }\n});\n`;
  browserClient = browserClient.replaceAll('Atribuições e etapas são salvas neste computador, com registro de data e hora.', 'Atribuições e etapas são salvas somente neste navegador, com registro de data e hora.')
    .replaceAll('Progresso fictício importado e salvo neste computador.', 'Progresso fictício importado e salvo somente neste navegador.')
    .replaceAll('Servidor local indisponível.', 'Armazenamento do navegador indisponível.')
    .replaceAll('Confira se a demonstração local está aberta e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.', 'Confira se o navegador permite armazenamento para este site e recarregue. Nenhum estado inicial substituirá seus registros automaticamente.')
    .replaceAll('Progresso salvo localmente · Versão', 'Progresso salvo neste navegador · Versão')
    .replaceAll('Consulta extrativa disponível · IA/AMD ainda não conectados.', 'Consulta literal disponível · Execução AMD gravada · Sem inferência ao vivo.')
    .replaceAll('A aba Conferência consulta estes trechos localmente. IA/AMD ainda não conectados; fontes históricas ficam separadas da ação atual.', 'A aba Conferência consulta estes trechos localmente. A execução AMD gravada é apresentada separadamente; fontes históricas ficam separadas da ação atual.');
  generated.set('client.mjs', browserClient);
  let translations = replaceOnce(content.get('i18n.mjs'), 'export const catalog = [', `export const catalog = [\n${publicCopy.map(row => '  ' + JSON.stringify(row) + ',').join('\n')}`);
  translations = replaceOnce(translations, 'Progresso salvo localmente · Versão (\\d+)', 'Progresso salvo neste navegador · Versão (\\d+)');
  translations = replaceOnce(translations, 'Consulta extrativa disponível · IA\\/AMD ainda não conectados\\.', 'Consulta literal disponível · Execução AMD gravada · Sem inferência ao vivo\\.');
  translations = translations.replaceAll('Progress saved locally · Version', 'Progress saved in this browser · Version').replaceAll('Progreso guardado localmente · Versión', 'Progreso guardado en este navegador · Versión')
    .replaceAll('Literal source lookup available · AI/AMD not connected yet.', 'Literal source lookup available · Recorded AMD execution · No live inference.')
    .replaceAll('Consulta literal de fuentes disponible · IA/AMD aún no conectados.', 'Consulta literal de fuentes disponible · Ejecución AMD grabada · Sin inferencia en vivo.');
  generated.set('i18n.mjs', translations);
  generated.set('index.html', content.get('index.html').replaceAll('href="/care-journey.css"','href="./care-journey.css"').replaceAll('href="/selection-controls.css"','href="./selection-controls.css"').replaceAll('href="/recorded-gemma.css"','href="./recorded-gemma.css"').replaceAll('href="/styles.css"','href="./styles.css"').replaceAll('href="/favicon.svg"','href="./favicon.svg"').replaceAll('src="/client.mjs"','src="./client.mjs"').replaceAll('src="/theme-init.js"','src="./theme-init.js"').replaceAll('href="/"','href="./"').replaceAll('href="/api/export"','href="#export"').replace('Demonstração local','Demonstração isolada no navegador').replace('As alterações ficam neste computador.','As alterações ficam somente neste navegador. Limpar os dados do site apaga o progresso.').replace('Armazenamento local · IA/RAG ainda não conectados.','Armazenamento deste navegador · Execução AMD gravada · Sem inferência ao vivo.').replace('<button id="open-import"', '<button id="export-reviews" type="button">Exportar recibos de conferência</button><button id="open-import"').replace('<p class="caption" id="storage-status">','<p class="caption">A cópia do progresso não inclui os recibos de conferência. Exporte-os separadamente; reiniciar os casos preserva esses recibos neste navegador.</p><p class="caption" id="storage-status">').replace('Protótipo com dados fictícios. A equipe médica define as orientações e os prazos clínicos. Fontes conferíveis e revisão humana. Não envia mensagens nem altera consultas reais.', publicCopy.find(row=>row[0].startsWith('Protótipo administrativo'))[0]).replace('Protótipo administrativo com casos fictícios. A equipe define regras de contato e janelas clínicas. Consulta local com fontes; integração IA/AMD pendente. Não faz avaliação clínica, ranking da equipe ou envio automático.', publicCopy.find(row=>row[0].startsWith('Protótipo administrativo'))[0]));
  generated.set('evidence.mjs', browserEvidence(content.get('evidence.mjs')));
  generated.set('fixtures.mjs', '// Public fictional fixtures only. Test expectations and local progress are excluded.\nexport const fixtures = ' + JSON.stringify(publicFixtures(JSON.parse(rawFixtures)), null, 2) + ';\n');
  generated.set('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n`);
  await mkdir(outputDir, { recursive:true });
  for (const [name, source] of generated) await writeFile(path.join(outputDir, name), source, 'utf8');
  return { files:[...generated.keys()], cases:8, persistence:'browser-local', remoteInference:false,recordedAMD:archive.statistics };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildPublicDemo()));
