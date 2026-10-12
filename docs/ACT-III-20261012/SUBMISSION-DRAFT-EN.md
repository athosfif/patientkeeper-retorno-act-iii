# PatientKeeper Retorno — R03 submission copy

**Copy checked against the confirmed submission.** October 12, 2026. The original prepared-copy JSON remains an immutable preparation snapshot, not a receipt. A separate final LabLab success observation confirmed the submitted fields and delivered R05/R08 media at 19:27:49 UTC.

## Title

PatientKeeper Retorno

Length: 21 characters; observed limit 5–50.

## Short description

An administrative review prototype for canceled follow-ups: current source records, explicit responsibility and cited human review, with transparent recorded AMD inference and visible failures.

Length: 193 characters; observed limit 50–255.

## Long description

PatientKeeper Retorno helps clinic reception and coordination keep a canceled follow-up visible until its next administrative step is checked. Eight fictional cases show ownership, contact preference, pending appointments, historical rules and conflicting records. It does not diagnose, recommend treatment, send messages or change real appointments.

The reviewer asks an administrative question, examines current literal excerpts and explicitly selects checked sources for a cited card. Known conflicts and clinical questions require human handoff. Stale sources cannot be reused silently, and preparing a card does not close the task.

On October 12, Qwen2.5-1.5B-Instruct ran in float32 on an AMD Radeon Pro W7900D through PyTorch HIP. Seven baseline cases produced two format-valid candidates and five rejected outputs. Including an assigned-context variant and an extra prompt attempt, three of nine outputs passed format checks. This is not semantic or clinical approval.

The recorded AMD panel binds a fixed question and its complete source context to the current case. It identifies replay, shows failures and confirms the GPU is off; it performs no live inference.

The October 5 administrative scaffold is disclosed. October 12 work adds source review, receipts, languages, model contracts and recorded inference. English is the default, with Portuguese and Spanish navigation. We aim to clarify administrative handoffs; business gains remain unmeasured.

Length: 1466 characters; 209 words. Observed limits: 600–2,000 characters and at least 100 words. Counts exclude headings and this annotation.

## Form choices and proof

- Participation: **Online**.
- Main challenge: **Health and Wellbeing**; confirm the exact option in the form.
- Technologies: JavaScript, Node.js, HTML/CSS; real pilot used Qwen, PyTorch HIP and AMD Radeon Pro W7900D. Do not tag vLLM, Evolus or Google as implemented technologies.
- Own code: MIT. Exact Qwen checkpoint: Apache-2.0, revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`.

[Exact source copy](SUBMISSION-COPY-R03.json) · [Nine-attempt summary](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) · [Shutdown receipt](../../evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json). Format-valid citations remain candidates for semantic review; no formal approval is claimed. An assigned-context variant is not a replacement for a rejected baseline case.

## Delivery states

| Field | Current documented state |
|---|---|
| Repository | Public source pushed: https://github.com/athosfif/patientkeeper-retorno-act-iii . Initial code commit 05391ea; documentation/cover synchronization has a separate final Git receipt. |
| Demo | Published at https://athosfif.github.io/patientkeeper-retorno-act-iii/ . UI loaded with eight cases/languages/footer; 18/18 public files matched gh-pages f1b4d91 by HTTPS/SHA-256 at 18:42:56 UTC on October 12. No live AMD service. |
| Cover | R08 composition with R02 conceptual AI illustration persisted after reload. Delivered JPEG returned HTTP 200 with matching full bytes. |
| Video and slides | R05 MP4: 186.271 seconds; Envato synthetic narration supplied by Athos. PDF R08. Both persisted in LabLab and matched final uploaded bytes. |
| Submission | Official success message observed at 19:27:49 UTC. [Published project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) displayed the exact R05/R08 media in the existing Chrome session. Direct anonymous HTTP access returned 403. |

## Rules and remaining checks

The [official ACT III page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii) requires meaningful AMD use integrated into the working product. The evidence proves real GPU generation and the replay code binds actual inputs to the current case. It does not establish that replay alone satisfies this award condition. Google and Evolus are optional and were not activated.

The pre-event [October 5 scaffold](../../BASE-PREEXISTENTE.md) is declared. The new model contract, review flow and replay were added on October 12. No user study, quantified savings or clinical validation has been completed.

The [general submission guide](https://lablab.ai/ai-articles/hackathon-guidelines) and the kickoff describe a presentation of at most five minutes, a public repository and accessible demo. Final media persisted after reload and the official success state was observed; uploads alone were not treated as submission.

The coordinator observed a deadline conflict: October 18 at 07:00 Brasília in the main authenticated schedule, versus 12:00 Brasília in earlier /live evidence. Keep October 17 evening as the internal preparation target; it is not an official deadline. [Requirements](REQUISITOS-E-EVIDENCIAS.md) · [Release plan](RELEASE-PLAN.md).

## Submitted final media

Submission was confirmed on October 12, 2026 at 19:27:49 UTC / 16:27:49 Brasília by the LabLab success message: “You have successfully submitted your project for the AMD Developer Hackathon: ACT III event!” The existing Chrome session then displayed the published project with the exact R05 video and R08 PDF. Judging was shown as in progress; no evaluation, award or eligibility result is claimed.

[Submitted project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) · [Presentation PDF R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_nif3ozbuwn7a1lqs7vdgg5vt.pdf) · [Narrated video R05](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_yxmp2jbaeshptu64v71cswcn.mp4) · [Delivered cover R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/image/image_qwij0iodrs5swlszu3ere2r7.jpg)

The delivered MP4 is **186.271 seconds (3 minutes 6.271 seconds)**, with synthetic English narration supplied by Athos through Envato, synchronized English subtitles and edited captures of the fictional product. It is neither Athos speaking nor a continuous screen recording. The R08 cover composition uses the R02 conceptual AI illustration and the unchanged official FIGUEIRA wordmark. Reading translations are separate from original Portuguese evidence and recorded model answers.

Unauthenticated full-byte HTTPS checks returned **HTTP 200** for the PDF, video and delivered JPEG cover. Their SHA-256 values match the final media receipt: PDF `968b38f3aa74b53240fc72135051b2cbe55343edf43cff166ecf40762052ce70` (4,694,100 bytes), video `ea2cb3b7e82102f22b0b1b155e2abc1c3f6fd046bca1857d2e8ae96887030347` (7,235,091 bytes), and cover `a536d51bb75626d3d49650fa3b7197da01e86f8030001d8cd7991d36217e4c6a` (227,489 bytes). LabLab converted the uploaded PNG to JPEG, so the delivered cover has its own hash.

The project page was verified in the existing Chrome session. A direct unauthenticated HTTP request returned **403**; anonymous access to the project page itself is not confirmed. The public media and GitHub Pages demo were checked separately. Full video decode, 14 sampled final frames and comparison of local ASR with the supplied script were recorded; no integral human listening review is claimed.

The current demo adds reviewed EN/ES reading translations of recognized full source literals. Original Portuguese evidence remains accessible; model answers/reasons, hashes and cited receipts are unchanged.

## Additional information checked against the submitted fields

Demo hosting: GitHub Pages. No login, API key or active GPU is needed. All cases are fictional and changes stay in the visitor’s browser.

Suggested walkthrough: select Case 04, open Review, choose Contact preference and Check sources. Inspect the cited excerpt and the separately labeled recorded AMD panel. Case 07 demonstrates conflicting records and a blocked card. The original Portuguese source and model output remain preserved; reading translations are separate.

The repository includes the pinned model revision, seven baseline inputs, all nine attempts, rejected outputs and a separate GPU shutdown receipt. Two of seven baseline outputs passed format checks; this does not establish semantic accuracy.

The revised video is 3 minutes 6.271 seconds, with synthetic English narration supplied by Athos through Envato and synchronized English subtitles. It is an edited presentation of actual fictional interface captures, not a continuous screen recording. PDF R08 and the revised conceptual AI cover use the official FIGUEIRA wordmark. October 5 pre-event scaffolding is disclosed; October 12 additions and their evidence are identified.
