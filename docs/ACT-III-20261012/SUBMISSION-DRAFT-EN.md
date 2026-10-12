# PatientKeeper Retorno — R03 submission copy

**Prepared exact copy, not a submission receipt.** October 12, 2026. The copy reflects original AMD records and the implemented recorded-run panel. Final judge access, media and the actual platform fields must be verified before sending.

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
| Cover | Local cover candidate exists. Verify accepted file type and uploaded preview. |
| Video and slides | Final ≤5-minute demonstration and PDF must match the delivered version and be checked after export/upload. |
| Submission | Not confirmed by this document. Saved draft, pasted fields or upload do not prove submission. |

## Rules and remaining checks

The [official ACT III page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii) requires meaningful AMD use integrated into the working product. The evidence proves real GPU generation and the replay code binds actual inputs to the current case. It does not establish that replay alone satisfies this award condition. Google and Evolus are optional and were not activated.

The pre-event [October 5 scaffold](../../BASE-PREEXISTENTE.md) is declared. The new model contract, review flow and replay were added on October 12. No user study, quantified savings or clinical validation has been completed.

The [general submission guide](https://lablab.ai/ai-articles/hackathon-guidelines) and the kickoff describe a presentation of at most five minutes, a public repository and accessible demo. Confirm the real Steps 2/3 and 3/3 for final accepted media formats.

The coordinator observed a deadline conflict: October 18 at 07:00 Brasília in the main authenticated schedule, versus 12:00 Brasília in earlier /live evidence. Keep October 17 evening as the internal preparation target; it is not an official deadline. [Requirements](REQUISITOS-E-EVIDENCIAS.md) · [Release plan](RELEASE-PLAN.md).

## Uploaded final media, saved draft

[Presentation PDF R07](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_s8ti4ljdnamb6r2irwpyf4g9.pdf) · [Narrated video R04](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_txz5067gbk15l9axy434dkbh.mp4). LabLab displayed both saved files on October 12 at 18:28:42 UTC; the public media links returned HTTP 200 to unauthenticated HEAD requests. The video is 263.1 seconds. These observations confirm uploaded media and saved draft state, not final submission.

The current demo adds reviewed EN/ES reading translations of recognized full source literals. Original Portuguese evidence remains accessible; model answers/reasons, hashes and cited receipts are unchanged.
