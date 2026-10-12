# PatientKeeper Retorno

A source. A reviewer. A next step.

PatientKeeper Retorno is an administrative prototype for clinic reception and coordination. It keeps a canceled follow-up visible while a person checks current records, assigns responsibility and prepares a cited review card. All eight cases are fictional. It does not diagnose, recommend treatment, contact patients or change real appointments.

**ACT-III-R03-20261012 — source, static demo and LabLab submission confirmed.** The public demo has eight fictional cases, EN/PT/ES selection and a recorded/GPU-off footer. At 18:42:56 UTC on October 12, public HTTPS checks matched all 18 deployed files to the exact `gh-pages` commit. LabLab confirmed submission at 19:27:49 UTC, with the R05 video and R08 PDF visible on the published project page in the existing Chrome session. [Open the submitted project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno).

## Product workflow

1. Choose a fictional follow-up and inspect its pending step and owner.
2. Open Review. Read current literal excerpts; historical records remain separate.
3. Explicitly select checked sources and confirm before preparing a cited card.
4. Inspect a known conflict or a clinical question: these require human handoff. The card cannot resolve the conflict automatically.
5. Switch EN/PT/ES. English is the initial navigation language. Records have reviewed reading translations; open the Portuguese original to inspect the unchanged evidence.

Reviewed EN/ES reading translations are separate display aids. The complete Portuguese original remains available and unchanged. Translation requires both a recognized source ID and an exact full Portuguese literal; unknown or altered records keep the original. Model answers and abstention reasons are original recorded outputs and are not translated. Evidence digests, inputs, citations and saved receipts retain the original Portuguese text.

A reviewed card records an interaction, not an authenticated clinical approval. It changes neither contact, appointment nor administrative closure. Source lookup is lexical; no match is a search limitation, not proof that information does not exist. Suggested questions map to the original administrative language.

## Actual AMD execution

On October 12, Qwen/Qwen2.5-1.5B-Instruct ran in **float32** on an **AMD Radeon Pro W7900D** using PyTorch HIP. The pinned model revision is `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, licensed Apache-2.0. The runtime recorded Python 3.14.4, PyTorch 2.13.0+rocm10.0.0, HIP 7.15.26333 and Transformers 4.57.1. vLLM, Evolus and Google services were not used.

| Archived cohort | Passed candidate-format checks | Rejected | Interpretation |
|---|---:|---:|---|
| Seven original baseline cases | 2 / 7 | 5 / 7 | SIM-RET-01 and SIM-RET-04 passed format and exact-reference checks. |
| Assigned-context diagnostic variant | 1 / 1 | 0 / 1 | SIM-RET-02 had different current input; it must not replace the unassigned baseline result. |
| Extra structured-prompt attempt | 0 / 1 | 1 / 1 | A separate SIM-RET-01 attempt failed the unchanged output contract. |
| All attempts | **3 / 9** | **6 / 9** | Format acceptance is not semantic or clinical approval. |

Accepted generation times were 6.810 seconds (baseline SIM-RET-01), 5.938 seconds (baseline SIM-RET-04) and 6.854 seconds (assigned variant). These are individual generation durations, not a latency benchmark or total cloud-session time. SIM-RET-04 repeated Portuguese in its answer despite the English instruction; the original output is preserved and labeled honestly.

[Attempt summary](evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) · [Exact synthetic inputs and results](evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/) · [Separate shutdown receipt](evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json). The authenticated portal was observed without an active notebook at **17:39:42 UTC / 14:39:42 Brasília**. Worker termination and cloud-session shutdown are different evidence. The earlier failed float16 run is preserved privately as R02 history.

## Recorded AMD panel

The static demonstration reads a published archive, then compares the fixed recorded question and **every** source record, including historical flags, with the current positive case projection. It displays an original candidate only after fresh format and literal-reference validation. Clinical or conflicting-record handoffs show execution metadata only. Rejected outputs are counted and not presented as answers.

**Recorded AMD execution · GPU off · No live inference.** The panel cannot answer a new question with a fixed old output, save a review card or trigger a case action. Format-valid meaning still needs human review; no formal semantic approval has been recorded. The sufficiency of recorded replay for the ACT III meaningful-AMD requirement is not established by this repository.

## Run and test the local source

Node.js v24.19.0 was observed. The local server uses Node built-ins; no dependency install is needed.

```sh
node app/server.mjs
node scripts/build-public-demo.mjs
node --test app/tests/*.test.mjs public-demo/tests/*.test.mjs
```

Open `http://127.0.0.1:8769/`. The server deliberately accepts local access only. Opening the HTML file directly does not supply APIs. A clean source copy creates progress under `app/data/`, which is excluded from Git. Reset the fictional cases to begin a fresh demonstration. Review-card receipts remain separate from administrative progress exports.

The exact source publication checkout passed **179/179** tests in 13 files, with zero failures or skipped tests. Its static build also passed. This includes source-reading gates, the browser adapter, recorded-run and model-contract checks, and server regression. These checks do not establish model accuracy, clinical safety, user benefit or contest eligibility. Public browser QA is recorded separately.

## Public static demo and GitHub Pages

The public variant is built separately under `public-demo/`. Domain checks, source review and progress storage run in the visitor’s browser; one visitor does not update another visitor’s progress. It performs no external contact or live GPU request. Clearing site data erases that browser’s progress.

```sh
node scripts/build-public-demo.mjs
```

The build requires the exact allowlisted synthetic R03 input/result files and the checked browser adapter. The server application and static output are separate artifacts. Deployment uses the **root of the `gh-pages` branch** on GitHub Pages; it does not deploy `app/` as a working remote API.

[Public source repository](https://github.com/athosfif/patientkeeper-retorno-act-iii) · [Open the published demo](https://athosfif.github.io/patientkeeper-retorno-act-iii/). The initial source publication is commit [05391ea](https://github.com/athosfif/patientkeeper-retorno-act-iii/commit/05391eadb16d7fb1da9a527b21534f143733fd92); documentation and the conceptual cover are synchronized in a subsequent source-only commit. The source-reading update is [gh-pages commit f1b4d91](https://github.com/athosfif/patientkeeper-retorno-act-iii/tree/f1b4d91dbb288ba3ae38b20d069eaf14151eb24d). All 18 public files returned HTTP 200 and matched their SHA-256 at 2026-10-12T18:42:56.144Z, without credentials. This verifies deployed bytes; it does not replace the browser interaction checks. GitHub Pages does not apply the Netlify-style `_headers` file; no custom response-header enforcement is claimed. No Netlify deployment is claimed.

## Origin, licenses and limits

**ADMIN-R01-20261005 is pre-event scaffolding**: queue, assignment, history and local persistence. October 12 increments add source review, cited receipts, conflict guards, EN/PT/ES navigation, the closed model contract, bounded optional transport, real AMD tests and recorded replay. [Baseline declaration](BASE-PREEXISTENTE.md). Reuse must be disclosed; specific contest eligibility remains a separate determination.

Own code uses [MIT](LICENSE). Qwen is Apache-2.0, with its exact model license retained in the pilot evidence. Model weights, credentials, private cloud URLs, sessions and `app/data/` are excluded. Literal outputs and failures are retained only from fictional input records.

Chrome R02 verified 320/390/768 widths, keyboard navigation, context preservation and saved-card recovery. The published R03 app loaded with eight cases, language selection and the truthful recorded-execution footer; its detailed browser and mobile checks are a separate release record. No target-user study, complete WCAG audit, clinical validation or measured operational savings is asserted.

[Requirements and evidence](docs/ACT-III-20261012/REQUISITOS-E-EVIDENCIAS.md) · [Submission copy](docs/ACT-III-20261012/SUBMISSION-DRAFT-EN.md) · [Release plan](docs/ACT-III-20261012/RELEASE-PLAN.md). Final submission is supported by the observed LabLab success message and matching delivered media; it does not establish a judging result.

The source archive retains an [earlier conceptual cover R01](assets/ACT-III-20261012/COVER-IA-R01/PATIENTKEEPER-RETORNO-COVER-IA-R01.png) and its [generation record](assets/ACT-III-20261012/COVER-IA-R01/GENERATION.md). It is not the delivered R08 cover. The delivered cover uses a revised R02 AI illustration, not a product screenshot or patient photograph.

## Submitted presentation media

Submission was confirmed on October 12, 2026 at 19:27:49 UTC / 16:27:49 Brasília by the LabLab success message: “You have successfully submitted your project for the AMD Developer Hackathon: ACT III event!” The existing Chrome session then displayed the published project with the exact R05 video and R08 PDF. Judging was shown as in progress; no evaluation, award or eligibility result is claimed.

[Submitted project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) · [Presentation PDF R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_nif3ozbuwn7a1lqs7vdgg5vt.pdf) · [Narrated video R05](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_yxmp2jbaeshptu64v71cswcn.mp4) · [Delivered cover R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/image/image_qwij0iodrs5swlszu3ere2r7.jpg)

The delivered MP4 is **186.271 seconds (3 minutes 6.271 seconds)**, with synthetic English narration supplied by Athos through Envato, synchronized English subtitles and edited captures of the fictional product. It is neither Athos speaking nor a continuous screen recording. The R08 cover composition uses the R02 conceptual AI illustration and the unchanged official FIGUEIRA wordmark. Reading translations are separate from original Portuguese evidence and recorded model answers.

Unauthenticated full-byte HTTPS checks returned **HTTP 200** for the PDF, video and delivered JPEG cover. Their SHA-256 values match the final media receipt: PDF `968b38f3aa74b53240fc72135051b2cbe55343edf43cff166ecf40762052ce70` (4,694,100 bytes), video `ea2cb3b7e82102f22b0b1b155e2abc1c3f6fd046bca1857d2e8ae96887030347` (7,235,091 bytes), and cover `a536d51bb75626d3d49650fa3b7197da01e86f8030001d8cd7991d36217e4c6a` (227,489 bytes). LabLab converted the uploaded PNG to JPEG, so the delivered cover has its own hash.

The project page was verified in the existing Chrome session. A direct unauthenticated HTTP request returned **403**; anonymous access to the project page itself is not confirmed. The public media and GitHub Pages demo were checked separately. Full video decode, 14 sampled final frames and comparison of local ASR with the supplied script were recorded; no integral human listening review is claimed.

The [official FIGUEIRA wordmark provenance](assets/ACT-III-20261012/BRAND-FIGUEIRA/PROVENANCE.md) accompanies the unchanged brand asset. Older draft media and receipts remain archived locally.
