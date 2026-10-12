# PatientKeeper Retorno — six-slide spoken pitch

**Human rehearsal script, October 12, 2026, R03.** Use the six-slide deck with actual screen interaction if Athos records his own version. The delivered edited-video script is separate in PRESENTATION-VIDEO-NARRATION-EN.md. The AMD paragraph reflects exported FP32 evidence and observed replay integration. Public GitHub Pages access has now been checked; actual submission remains a separate state. The text does not claim final submission, semantic approval or answer accuracy.

Target: approximately **4 minutes 30 seconds**, including a short product interaction. Rehearse and measure the actual recording. Speak at a natural pace instead of promising a duration from word count alone.

## Slide 1 — PatientKeeper Retorno

Hello, I’m Athos Felipe from FIGUEIRA AI. PatientKeeper Retorno is an administrative prototype for clinic reception and coordination.

We focus on a canceled follow-up that still needs a next step. The question is practical: who owns that check, and which current record supports the decision?

Our demonstration uses fictional cases. It does not diagnose, prescribe or decide when a patient needs clinical care. A person keeps responsibility for the administrative action and the clinical team keeps responsibility for clinical decisions.

## Slide 2 — The pending follow-up

Here is the queue. A canceled appointment can leave an unresolved task even when somebody has already recorded a contact. We keep that task visible and attach an owner.

The person can inspect the current step, see what remains missing and record the next administrative action. The application keeps history and checks revisions so an older screen does not silently overwrite newer progress.

This screenshot contains demonstration progress. For the recording, I will open the current product and show one fictional case from the queue.

## Slide 3 — Source review and a cited card

In Review, I ask an administrative question about that case. The local lookup shows literal excerpts from the current records. It keeps historical information separate.

I read the excerpt, select it and explicitly confirm its meaning before preparing a card. The card carries the original text and its source identifier. A later context change requires another check.

Preparing this card does not send a message, confirm an appointment or close the case. It gives the reviewer a record of what they checked. The confirmation records an interaction, not an authenticated professional identity.

[Product interaction: select a source, confirm review, prepare or open the saved card. Show the pending case stays open.]

## Slide 4 — Uncertainty and human handoff

The product has to stop at the right places. If clinical timing is missing, the medical team must define it. If the recorded preference blocks contact, reception cannot treat a draft as permission to send.

In case seven, the schedule and queue disagree. We show both current records and block the review card. The interface does not choose a convenient answer.

English, Portuguese and Spanish navigation help people use the same workflow. Original Portuguese quotations remain literal. The current search is lexical, so a free-text question in another language can miss a match. We show that limitation instead of claiming the information is absent.

## Slide 5 — AMD execution

We ran Qwen2.5-1.5B-Instruct on an AMD Radeon Pro W7900D through PyTorch HIP. The first float16 output failed and remains documented.

Across seven distinct baseline cases in FP32, two candidates passed the local format and literal-reference checks, while five were blocked. Two additional diagnostics are also preserved, giving nine attempts in total. The earlier successful assigned-case result used a different progress revision and is kept separate from the baseline.

Format acceptance does not prove an answer is correct. All nine results still require semantic review. The GPU is now off. The interface now labels recorded AMD results, displays their provenance and only replays a result when its full checked context matches. For a case requiring the responsible human team, the replay shows its execution receipt without a model answer. It does not generate or substitute a new response.

## Slide 6 — Origin and intended value

We prepared the administrative queue, ownership, history and storage on October fifth, before the event. Our October twelfth work added source review, separate receipts, conflict blocking, language navigation, guarded model transport and recorded AMD replay. We declare that baseline openly.

Our intended value is a clearer handoff: reception can see the pending issue and inspect the record behind the next check. We still need to measure task time, citation support and handoff quality. We do not claim clinical outcomes or invented savings.

The public repository contains source code, reproducible fictional inputs and exported AMD evidence. The working demo is published on GitHub Pages. Final submission was confirmed separately by the LabLab success UI; judging remains a distinct state.

Thank you.

## Recording updates and sources

Slide 5 uses the exported input/output, hardware/runtime, model revision, dtype, timing and validation records. Distinguish format validation from semantic review and useful integrated AMD behavior. Replay integration is visible in the R03 case 04 and case 07 captures. Slide 6 identifies the publicly verified demo at https://athosfif.github.io/patientkeeper-retorno-act-iii/. The public repository is https://github.com/athosfif/patientkeeper-retorno-act-iii. If something remains incomplete, keep the limitation audible and visible.

Product evidence: R02 build (private historical record), R02 browser checks (private historical record), prior AMD pilot (private historical record), [exported FP32 attempts](../../evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/) and [baseline disclosure](../../BASE-PREEXISTENTE.md). The nine exported result files all report `semanticApproved=false`.

Rules: [ACT III official page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii), [submission guidelines](https://lablab.ai/ai-articles/hackathon-guidelines) and [general guide](https://lablab.ai/guide/ai-hackathons). Meaningful AMD use must be part of the product shown to judges. A prerecorded output or schema-valid JSON alone does not establish completed eligibility.

## Submitted release media

This document is a human rehearsal draft. The actual R05 synthetic narration uses a different 456-word script, recorded in [the final narration document](PRESENTATION-VIDEO-NARRATION-EN.md); it does not imply that Athos recorded the voice.

Submission was confirmed on October 12, 2026 at 19:27:49 UTC / 16:27:49 Brasília by the LabLab success message: “You have successfully submitted your project for the AMD Developer Hackathon: ACT III event!” The existing Chrome session then displayed the published project with the exact R05 video and R08 PDF. Judging was shown as in progress; no evaluation, award or eligibility result is claimed.

[Submitted project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) · [Presentation PDF R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_nif3ozbuwn7a1lqs7vdgg5vt.pdf) · [Narrated video R05](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_yxmp2jbaeshptu64v71cswcn.mp4) · [Delivered cover R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/image/image_qwij0iodrs5swlszu3ere2r7.jpg)

The delivered MP4 is **186.271 seconds (3 minutes 6.271 seconds)**, with synthetic English narration supplied by Athos through Envato, synchronized English subtitles and edited captures of the fictional product. It is neither Athos speaking nor a continuous screen recording. The R08 cover composition uses the R02 conceptual AI illustration and the unchanged official FIGUEIRA wordmark. Reading translations are separate from original Portuguese evidence and recorded model answers.

Unauthenticated full-byte HTTPS checks returned **HTTP 200** for the PDF, video and delivered JPEG cover. Their SHA-256 values match the final media receipt: PDF `968b38f3aa74b53240fc72135051b2cbe55343edf43cff166ecf40762052ce70` (4,694,100 bytes), video `ea2cb3b7e82102f22b0b1b155e2abc1c3f6fd046bca1857d2e8ae96887030347` (7,235,091 bytes), and cover `a536d51bb75626d3d49650fa3b7197da01e86f8030001d8cd7991d36217e4c6a` (227,489 bytes). LabLab converted the uploaded PNG to JPEG, so the delivered cover has its own hash.

The project page was verified in the existing Chrome session. A direct unauthenticated HTTP request returned **403**; anonymous access to the project page itself is not confirmed. The public media and GitHub Pages demo were checked separately. Full video decode, 14 sampled final frames and comparison of local ASR with the supplied script were recorded; no integral human listening review is claimed.
