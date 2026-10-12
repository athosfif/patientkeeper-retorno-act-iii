# PatientKeeper Retorno

A source. A reviewer. A next step.

PatientKeeper Retorno is an administrative prototype for clinic reception and coordination. It keeps a canceled follow-up visible while a person checks current records, assigns responsibility and prepares a cited review card. All eight cases are fictional. It does not diagnose, recommend treatment, contact patients or change real appointments.

**ACT-III-R03-20261012 — release candidate.** The source, the public static demo, media uploads and the LabLab submission have separate receipts. This README describes the implemented code and downloaded AMD evidence; it is not a publication or submission receipt.

## Product workflow

1. Choose a fictional follow-up and inspect its pending step and owner.
2. Open Review. Read current literal excerpts; historical records remain separate.
3. Explicitly select checked sources and confirm before preparing a cited card.
4. Inspect a known conflict or a clinical question: these require human handoff. The card cannot resolve the conflict automatically.
5. Switch EN/PT/ES. English is the initial navigation language; original Portuguese source excerpts remain literal.

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
node --test app/tests/*.test.mjs
```

Open `http://127.0.0.1:8769/`. The server deliberately accepts local access only. Opening the HTML file directly does not supply APIs. A clean source copy creates progress under `app/data/`, which is excluded from Git. Reset the fictional cases to begin a fresh demonstration. Review-card receipts remain separate from administrative progress exports.

The dedicated recorded-run and model-contract checks passed **28/28**; server regression passed **19/19**. The earlier R02 full suite recorded 131/131. Consult the final R03 release receipt for the full-suite count after all agents finish; these local checks do not establish model accuracy, clinical safety, user benefit or contest eligibility.

## Public static demo and GitHub Pages

The public variant is built separately under `public-demo/`. Domain checks, source review and progress storage run in the visitor’s browser; one visitor does not update another visitor’s progress. It performs no external contact or live GPU request. Clearing site data erases that browser’s progress.

```sh
node scripts/build-public-demo.mjs
```

The build requires the exact allowlisted synthetic R03 input/result files and the checked browser adapter. The server application and static output are separate artifacts. Deployment uses the **root of the `gh-pages` branch** on GitHub Pages; it does not deploy `app/` as a working remote API.

[Repository target](https://github.com/athosfif/patientkeeper-retorno-act-iii) · [GitHub Pages target](https://athosfif.github.io/patientkeeper-retorno-act-iii/). The repository was created as Public; file publication, the deployed version and judge access require their own final receipts. No Netlify deployment is claimed.

## Origin, licenses and limits

**ADMIN-R01-20261005 is pre-event scaffolding**: queue, assignment, history and local persistence. October 12 increments add source review, cited receipts, conflict guards, EN/PT/ES navigation, the closed model contract, bounded optional transport, real AMD tests and recorded replay. [Baseline declaration](BASE-PREEXISTENTE.md). Reuse must be disclosed; specific contest eligibility remains a separate determination.

Own code uses [MIT](LICENSE). Qwen is Apache-2.0, with its exact model license retained in the pilot evidence. Model weights, credentials, private cloud URLs, sessions and `app/data/` are excluded. Literal outputs and failures are retained only from fictional input records.

Chrome R02 verified 320/390/768 widths, keyboard navigation, context preservation and saved-card recovery. The published R03 variant needs its own final browser checks. No target-user study, complete WCAG audit, clinical validation or measured operational savings is asserted.

[Requirements and evidence](docs/ACT-III-20261012/REQUISITOS-E-EVIDENCIAS.md) · [Submission copy](docs/ACT-III-20261012/SUBMISSION-DRAFT-EN.md) · [Release plan](docs/ACT-III-20261012/RELEASE-PLAN.md). Public media and an observable LabLab Submission Updated/Submitted state are required before claiming delivery.
