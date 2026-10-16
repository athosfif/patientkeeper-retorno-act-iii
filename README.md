# PatientKeeper Retorno · R14 delivery

A source. A responsible doctor. A next step.

![PatientKeeper Retorno · FIGUEIRA desk-calendar cover](docs/ACT-III-20261014/COVER-R10.png)

PatientKeeper Retorno is a fictional clinic-workflow prototype developed by FIGUEIRA for AMD Developer Hackathon: ACT III. It combines a return queue with a doctor workspace for an illustrative bunion and bunionette surgery episode. A person records responsibility, the next administrative action and its due date, reviews exact sources and messages, and records a simulated response before closing the episode. The conceptual cover is AI artwork with the official FIGUEIRA wordmark; it is not evidence of a real patient or appointment.

**Current delivery: R14 application and presentation, R10 video and cover R10.** GitHub source and the static demo are published. The existing LabLab submission was updated and its public page reloaded; the R14 PDF and R10 video matched the final local bytes and SHA-256 hashes. R10 preserves the same images and subtitles, with Athos's human narration enhanced through Adobe Podcast. Earlier [R13/R08 materials](docs/ACT-III-20261014/RELEASE-R13.md) and the R09 video remain as history. Public delivery, selected tracks, eligibility and judging are separate states.

[Public demo endpoint](https://athosfif.github.io/patientkeeper-retorno-act-iii/) · [Source repository](https://github.com/athosfif/patientkeeper-retorno-act-iii) · [Existing LabLab project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno)

[Presentation PDF R14 · 9 pages](docs/ACT-III-20261016/PRESENTATION-EN-R14.pdf) · [Editable presentation R14](docs/ACT-III-20261016/PRESENTATION-EN-R14.pptx) · [Cover R10](docs/ACT-III-20261014/COVER-R10.png) · [Material origins and limits](docs/ACT-III-20261016/RELEASE-R14.md)

[Edited video R10 · 4 min 25.6 s](docs/ACT-III-20261016/VIDEO-EN-R10.mp4) · [English subtitles · unchanged R09 reference](docs/ACT-III-20261016/SUBTITLES-EN-R09.srt) · [Human narration transcript](docs/ACT-III-20261016/NARRATION-EN-R09.txt) · [Delivery status and audio provenance](docs/ACT-III-20261016/FINAL-DELIVERY-R14.json)

[Video R10 confirmed on LabLab](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_tqs87vete0xtswed7wcvg75w.mp4) · [PDF R14 confirmed on LabLab](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_htwtdh5lgnqwr82y5hqhauzm.pdf). Both public files matched the local exports. The implementation remains at `2ba09aa58d1b4a7661636e881645c42d4f9e89b9`; this audio-only update changes no application or Pages code.

Video R10 uses **Athos's human narration**, recorded through WhatsApp and cleaned with the actual Adobe Podcast Enhance Speech v2 web export. Loudness normalization followed enhancement; there were no speech cuts, speed changes or additional noise reduction. Its H.264 video stream is identical to R09, retaining all 54 reference-aligned English subtitle cues. A full decode passed; complete human listening is not certified. The [previous R09 video](docs/ACT-III-20261016/VIDEO-EN-R09.mp4) remains as history. Raw recordings, enhanced source audio and intermediate renders are excluded from the public package.

**Illustrative scenario, not measured:** 6 records/day × (15 user-reported manual documentation minutes − 10 assumed assisted minutes) = 30 minutes/day, only if that assisted total is achieved. The 90-minute reported manual workload is a planning baseline, not an independently timed study. The assumed ten minutes include preparation, doctor review, corrections and overhead; overlapping ASR and note work are not counted twice. No clinical outcome or measured product benefit is established.

## Try the workflow

1. Open **Doctor workspace → Journey**. Inspect the fictional doctor, phase, next action and administrative due date. Surgical care instructions remain pending; the surgery label is not a clinical indication.
2. Open **Contacts**. Record the contact preference, review the administrative source, prepare a message, and review its exact text. The contact button records a simulation. A refusal blocks contact; changing the source or message invalidates its earlier review.
3. Record a fictional response and the next administrative step. Final closure requires an explicit human resolution. A prepared message or absent reply is not a completed contact.
4. Open **Consultation**. The public demo accepts a manual fictional transcript. Select literal segments, prepare an extractive note, inspect its citations and record a simulated review. It is not a Gemma-generated clinical note or a signed medical record.
5. In the **return queue**, open Review for Case 04 to inspect the fixed October 14 Gemma replay. Its exact archived question and complete source context must still match. Case 01 preserves its human-handoff restriction and recorded metadata; Case 06 preserves a timeout without an answer; Case 07 demonstrates a conflicting-record handoff.
6. Open **Recorded Evolus pilot · 16 October 2026** near the page footer to download the separate local application receipt and its limitations. This archive cannot answer a new question or start a workflow.
7. Explore EN/PT/ES, light/dark appearance and the fictional doctor calendar. The calendar is read-only and separate from the doctor episode; it does not schedule a real appointment or calculate a clinical follow-up interval.

The doctor operates the new workspace; a secretary is not a required operator. Older return-queue fixtures retain their original fictional administrative assignees. No patient messages, real appointments or external medical records are changed. Browser progress belongs to that visitor only; clearing site data erases it. Portuguese original sources remain unchanged, with separate reading translations. Recorded model answers retain their original language.

## What runs where

| Component | Behavior |
|---|---|
| Public static demo | Browser-local fictional queue and doctor episode, source review, human simulation, recorded Qwen/Gemma panels and a separate dated Evolus receipt download. No live model backend, transcription or external contact. |
| Local Node server | The same synthetic workflows with bounded local persistence. Direct model, Evolus and voice services are disabled by default. |
| Optional local Evolus | Fixed Case 02 administrative question, current revision and source/input bindings, bounded submissions and explicit result checks. Credentials stay in the server process. Results require review and do not save progress. |
| Local voice | Existing faster-whisper ASR, CPU/int8, PT/EN, at most 5 MiB and 120 seconds. A separate local runtime/model snapshot and fictional-content confirmation are required. |
| Consultation note | Exact extraction from selected transcript segments with segment references and simulated review. No diagnosis, prescription or clinical summary is inferred. |
| WhatsApp | Prepared/reviewed messages, simulated contact and explicitly simulated replies. No message is sent. |
| Clinical protocol | Pending. Educational e-books do not supply an individualized surgical-care protocol. No medication, fasting, dressing, weight-bearing or clinical schedule is invented. |

Amplimed, live WhatsApp and signed medical records are not connected. This prototype is not a clinic-production deployment or an efficacy study.

## Recorded local Evolus application run · October 16

One explicitly authorized application request completed through Evolus in **8.149 seconds**, returning pure JSON with two exact current synthetic citations. The operator changed EN to PT while the result was pending, recovered the same local session and explicitly checked its result. No repeated submission occurred. The saved administrative state had the same SHA-256 before and after the run; no review card, contact, assignment, appointment change or closure was performed.

The Evolus agent was configured as `own/gemma-4-31b-it` through a saved and tested AMD Token Factory connection, with no fallback model. Its attached read-only simple-memory source matched the local fixture bytes. Both complete excerpts were also present in the input; the receipt does not establish an independent library-read tool trace. The execution response does not return its underlying model identity or hardware, so conservative model/AMD verification flags remain false in the runtime receipt.

This was the second of two authorized workflow executions. The first portal test returned exact citations inside Markdown framing and failed the strict raw application contract. The later successful application output used pure JSON; no outer fence was removed. Each execution reported zero Evolus credits and no pending credit entries. Those are dated provider observations, not promises of future free usage or zero AMD resource consumption. Local HTTP limits do not bound internal provider attempts or tool calls.

The temporary server was stopped and the workflow paused. No further executions remain authorized by that pilot allowance. The optional local API validates exact request shapes, current context and deadlines, reserves submissions without refunds/retries, and restores only an explicit result button for a valid pending session. Its optional single-JSON-fence transport adaptation preserves the interior and applies the unchanged candidate validator. It does not translate or repair an answer.

[Sanitized execution receipt](docs/evolus-app-pilot-20261016.json) · [Evidence and limitations](docs/evolus-app-pilot-20261016.md) · [Local integration contract](integration/evolus-pilot/README.md)

This one-case observation is separate from the October 14 Gemma and October 12 Qwen attempts. It does not establish semantic approval, clinical accuracy, general prompt-injection resistance, measured savings or prize eligibility. The doctor consultation episode, voice and clinical protocol were outside this Evolus pilot.

## Earlier AMD and Gemma evidence

On October 14, five fictional administrative requests were attempted through AMD Token Factory. Four returned outputs passed the closed candidate format and exact-reference checks: **three affirmative candidates and one abstention**. The fifth timed out after **15,004 ms** and retained no answer. There were no automatic retries or automatic administrative actions.

| Attempt | Result | Recorded duration |
|---|---|---:|
| 01 · Cancellation recorded | Candidate | 10,234 ms |
| 02 · Essential source missing | Abstention | 11,209 ms |
| 03 · Historical/current policy | Timeout; no retained answer | 15,004 ms |
| 04 · Instruction embedded in an untrusted source | Candidate, still requiring review | 10,248 ms |
| 05 · Contact preference through the local product API | Candidate | 13,703 ms |

Requested identifier: `Gemma-4-31B-IT`. The official usage observation linked it to `self-dploy/Gemma-4-31B-IT`. The first original response identifier was not retained and remains null. This is service-routing evidence, not independent inspection of physical hardware, model weights or a checkpoint revision.

Retained per-attempt usage totals **2,956 tokens across four outputs**. The separate provider dashboard displayed `3.796` total tokens, `0.0001 pts` cost and `0.9999 pts` remaining at `2026-10-14T21:54:12.418Z`. The dashboard reported zero errors; the local timeout remains a distinct failed attempt. No currency conversion or inferred timeout usage is made.

[Sanitized October 14 archive](docs/recorded-gemma-runs.json) · [Replay contract and limits](docs/recorded-gemma-integration.md)

The replay verifies the immutable original, exact question, complete source texts and historical flags, current revision receipts, source digest, literal citations and human-handoff conditions. It cannot answer a new question or save a card, message, appointment or closure. All five calls concern `SIM-RET`, not the `SIM-CARE` doctor episode, voice, clinical protocol or note.

The separate October 12 Qwen2.5-1.5B-Instruct pilot ran on an AMD Radeon Pro W7900D through PyTorch HIP. Two of seven baseline cases passed format checks; three of all nine attempts passed when the separate assigned-context and extra-prompt attempts are included. GPU shutdown was recorded separately. Qwen and Gemma statistics must not be merged into an accuracy or controlled benchmark claim.

Replay alone does not establish compliance with event workload requirements. The public project page confirms the selected tracks **Health and Wellbeing** and **Evolus Business Agents on AMD**. Track selection does not establish award eligibility or a judging result; those remain unconfirmed. [Official ACT III event page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii).

## Run from source

Use Node.js 24; the server uses built-in modules. From the repository root, the default local run needs no provider key:

```sh
RETORNO_EVOLUS_ENABLED=0 RETORNO_MODEL_ENABLED=0 RETORNO_VOICE_ENABLED=0 RETORNO_PORT=8769 node app/server.mjs
```

Open `http://127.0.0.1:8769/`. Fictional progress is created under `app/data/`, outside the public package. The server retains loopback Host/Origin checks. Enabling a provider requires separate authorization, current quota and matching source bindings; a restart does not grant another execution allowance.

To build and validate the static variant from the same repository root:

```sh
node scripts/build-public-demo.mjs
node --test --test-concurrency=1 app/tests/*.test.mjs public-demo/tests/*.test.mjs integration/evolus-pilot/runtime-pilot.test.mjs
python3 -m http.server 8771 --bind 127.0.0.1 --directory public-demo
```

Open `http://127.0.0.1:8771/`. Opening the HTML file directly does not provide the required origin or APIs. The tracked browser adapter, individually allowlisted Qwen build inputs and sanitized Gemma/Evolus documents are required build inputs; no private receipt, account capture, key or launcher is needed.

The current offline suite passed **370 tests, with zero failures or skipped tests**, using serial concurrency. It includes local loopback HTTP tests and fake provider observations; it makes no real model/provider call or ASR execution. A clean copy containing only positive-allowlisted source inputs reproduced the 33 generated files exactly; a second build was byte-identical. Automated tests, real provider execution, container checks, media QA and public delivery verification are separate evidence.

For optional local ASR, supply Python with faster-whisper and PyAV and an already available local model snapshot. Explicit configuration uses `RETORNO_VOICE_ENABLED`, `RETORNO_VOICE_PYTHON`, `RETORNO_VOICE_MODEL_DIR`, `RETORNO_VOICE_MODEL_ID` and `RETORNO_VOICE_MODEL_REVISION`. Recorded synthetic PT/EN checks used `Systran/faster-whisper-small` at revision `536b0662742c02347bc0e980a01041f333bce120`, CPU/int8. A clean clone contains no weights or machine configuration; missing configuration reports unavailable. No microphone capture is required.

## Local container validation

The [container package](integration/container-pilot/README.md) keeps the app on loopback and includes the four optional Evolus modules at their correct paths. Direct model, Evolus and voice remain disabled. The [sanitized runtime receipt](integration/container-pilot/VALIDATION-20261016.json) records a Linux/arm64 Docker Desktop build, 35 matching runtime input hashes, 23 static asset routes and 16 passing HTTP/security checks. It used network mode `none`, with no host port published. Native Linux host networking and amd64 execution remain untested. No model or Evolus call was made from Docker; successful app execution on the host does not establish provider execution inside the container.

## Origin and licenses

The earlier PatientKeeper was published on September 26, before ACT III. This Retorno application was prepared independently; its October 5 `ADMIN-R01` queue, assignment, history, local persistence and synthetic fixtures are **pre-event scaffolding**, not event-built AI. The earlier PatientKeeper engine/UI and Academy OCR/RAG engine were not copied into that independent preparation. Prior learning and the shared product name are disclosed.

October 12 work added source review, cited receipts, conflict and stale-context guards, multilingual navigation, model contracts, bounded optional transport, the real Qwen AMD pilot, replay, theme and calendar. October 14 added five Gemma attempts, service-identity binding, JSON-object adaptation with local validation, immutable replay, the doctor episode and local ASR/extractive notes. October 16 added the optional local Evolus transport, actual application execution, sanitized recorded proof, container validation and the new human-narrated media. Reuse disclosure does not imply individual eligibility approval.

Own code is [MIT licensed](LICENSE). The retained Qwen model license is Apache-2.0. Model weights are not distributed. Third-party engines, model/provider terms, typefaces, brand artwork and historical third-party narration retain their own terms; the code license does not relicense them. No Gemma 4 license or unrestricted output-use permission is asserted here. Complete educational PDFs, individual medical protocols, raw narration, font binaries and machine-specific ASR configuration are excluded.

## Publication boundary and history

Source and GitHub Pages are separate packages. [PUBLIC-ALLOWLIST.json](PUBLIC-ALLOWLIST.json) names every permitted source, evidence and media file. Only those exact files belong in the source publication; no directory is copied recursively. Optional Evolus requires `preparation.mjs`, `rest-client.mjs`, `runtime-pilot.mjs` and `http-api.mjs` under `integration/evolus-pilot/`, plus their named tests and documentation. Keys, source recordings, launchers, raw provider envelopes and private account observations are excluded.

The static builder returns **33 files**. Deploy only those returned filenames at the `gh-pages` root, plus a separate `.nojekyll` marker: 34 files total. Its Evolus status is disabled and query/poll fail closed. The two dated Evolus downloads do not create a live backend. Server modules, Python, tests, media, local progress and private evidence do not belong in Pages. GitHub Pages does not enforce the Netlify-style `_headers` file.

The exact prior public deliveries remain documented in [R12/R07](docs/ACT-III-20261014/RELEASE-R12.md) and [R13/R08](docs/ACT-III-20261014/RELEASE-R13.md). Their receipts retain the previously verified submission URLs and hashes. The [R14 receipt](docs/ACT-III-20261016/FINAL-DELIVERY-R14.json) records the confirmed R10 video and R14 PDF, with the earlier R09 delivery retained as history. Public file readback confirms delivery, not award eligibility or a judging result.
