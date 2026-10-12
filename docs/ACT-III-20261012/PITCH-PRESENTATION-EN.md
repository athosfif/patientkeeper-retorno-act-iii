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

The public repository contains source code, reproducible fictional inputs and exported AMD evidence. The working demo is published on GitHub Pages. Final submission is tracked separately from public access.

Thank you.

## Recording updates and sources

Slide 5 uses the exported input/output, hardware/runtime, model revision, dtype, timing and validation records. Distinguish format validation from semantic review and useful integrated AMD behavior. Replay integration is visible in the R03 case 04 and case 07 captures. Slide 6 identifies the publicly verified demo at https://athosfif.github.io/patientkeeper-retorno-act-iii/. The public repository is https://github.com/athosfif/patientkeeper-retorno-act-iii. If something remains incomplete, keep the limitation audible and visible.

Product evidence: R02 build (preserved in the private local archive), R02 browser checks (preserved in the private local archive), prior AMD pilot (preserved in the private local archive), [exported FP32 attempts](../../evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/) and [baseline disclosure](../../BASE-PREEXISTENTE.md). The nine exported result files all report `semanticApproved=false`.

Rules: [ACT III official page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii), [submission guidelines](https://lablab.ai/ai-articles/hackathon-guidelines) and [general guide](https://lablab.ai/guide/ai-hackathons). Meaningful AMD use must be part of the product shown to judges. A prerecorded output or schema-valid JSON alone does not establish completed eligibility.

## Final release media

Use the [R07 PDF](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_s8ti4ljdnamb6r2irwpyf4g9.pdf) and [R04 edited video](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_txz5067gbk15l9axy434dkbh.mp4). The 263.1-second video uses disclosed macOS Samantha narration and captured fictional product screens; this human rehearsal script does not imply that Athos recorded its voice. Both artifacts were saved in the LabLab draft and have accessible public URLs; that is distinct from final submission.

The current demo also supplies reviewed EN/ES reading translations of recognized source records, with the unchanged Portuguese original accessible. These display translations are distinct from literal citations, digests and saved receipts. Recorded model answers and reasons remain in their original language, without translation. The edited video retains the earlier source captures.
