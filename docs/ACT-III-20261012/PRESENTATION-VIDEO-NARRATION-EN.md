# PatientKeeper Retorno — submitted English narration R05

Submission was confirmed on October 12, 2026 at 19:27:49 UTC / 16:27:49 Brasília by the LabLab success message: “You have successfully submitted your project for the AMD Developer Hackathon: ACT III event!” The existing Chrome session then displayed the published project with the exact R05 video and R08 PDF. Judging was shown as in progress; no evaluation, award or eligibility result is claimed.

[Submitted project](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/figueira-ai/patientkeeper-retorno) · [Presentation PDF R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/presentation/presentation_nif3ozbuwn7a1lqs7vdgg5vt.pdf) · [Narrated video R05](https://storage.googleapis.com/lablab-video-submissions/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/video/video_yxmp2jbaeshptu64v71cswcn.mp4) · [Delivered cover R08](https://storage.googleapis.com/lablab-static-eu/submissions/rfoyjx7o4t96hjkfomod284i/d1miiuhs58slqur1hhzk7g15/image/image_qwij0iodrs5swlszu3ere2r7.jpg)

The delivered MP4 is **186.271 seconds (3 minutes 6.271 seconds)**, with synthetic English narration supplied by Athos through Envato, synchronized English subtitles and edited captures of the fictional product. It is neither Athos speaking nor a continuous screen recording. The R08 cover composition uses the R02 conceptual AI illustration and the unchanged official FIGUEIRA wordmark. Reading translations are separate from original Portuguese evidence and recorded model answers.

Unauthenticated full-byte HTTPS checks returned **HTTP 200** for the PDF, video and delivered JPEG cover. Their SHA-256 values match the final media receipt: PDF `968b38f3aa74b53240fc72135051b2cbe55343edf43cff166ecf40762052ce70` (4,694,100 bytes), video `ea2cb3b7e82102f22b0b1b155e2abc1c3f6fd046bca1857d2e8ae96887030347` (7,235,091 bytes), and cover `a536d51bb75626d3d49650fa3b7197da01e86f8030001d8cd7991d36217e4c6a` (227,489 bytes). LabLab converted the uploaded PNG to JPEG, so the delivered cover has its own hash.

The project page was verified in the existing Chrome session. A direct unauthenticated HTTP request returned **403**; anonymous access to the project page itself is not confirmed. The public media and GitHub Pages demo were checked separately. Full video decode, 14 sampled final frames and comparison of local ASR with the supplied script were recorded; no integral human listening review is claimed.

## Actual spoken script

The script below has 456 words. Athos supplied five Envato audio files, assembled in order without speech trimming or acceleration. English subtitles retain the intended technical spelling; automatic recognition is not proof of a pronunciation error. This script replaces the earlier R04/Samantha narration as the delivered version; the earlier document and receipts remain archived privately.

An appointment is canceled. A message is recorded. But is the follow-up actually resolved? In a busy clinic, those are different questions. Someone still needs to know what is pending, who owns the next check, and which record supports it.

PatientKeeper Retorno brings those questions into one administrative review flow for reception and coordination. The queue keeps the unresolved task visible. An owner and a clear next step help a person understand where to begin. All eight demonstration cases are fictional, and this presentation uses synthetic narration.

Let’s open case four. The follow-up remains unconfirmed, but the record also contains an explicit preference: no more messages about this rescheduling. The useful next step is to understand that preference, not prepare another contact.

In Review, the person asks an administrative question and inspects the matching source. They select the original excerpt, confirm that they have checked it, and prepare a cited review card. The card preserves the source identifier and exact quotation. It documents the check; it does not send a message, confirm an appointment, or close the pending case. If the context changes, the sources must be checked again.

Now compare case seven. The schedule says the replacement appointment is confirmed, while the queue says it is still pending. The application shows both records and requires human review. It blocks the card instead of choosing the more convenient answer. The disagreement stays visible for the responsible team to resolve.

People can navigate in English, Portuguese, or Spanish. Reviewed reading translations help explain recognized records, while the complete original Portuguese evidence remains available. Recorded model answers are preserved in their original language.

For the AMD pilot, we ran Qwen two point five, one point five billion Instruct on an AMD Radeon Pro W seventy-nine hundred D through PyTorch HIP. Across seven baseline cases, two candidates passed format and exact-reference checks; five were blocked. Two additional diagnostic attempts are archived separately, bringing the total to nine. These are format results, not answer accuracy or semantic approval.

The demo replays that recorded execution. The GPU is off. A result appears only when its full recorded context matches the current sources; cases that require team handoff show the execution record without a model answer.

The queue, ownership, history, and storage began on October fifth, before this event. October twelfth added source review, cited cards, conflict guards, language support, and the AMD pilot and replay.

Our intended value is a clearer handoff: a visible pending task, an accountable next check, and evidence a reviewer can inspect. We still need to measure whether that improves real work. Explore the public demo and repository, inspect the sources, and test where the workflow should stop.

PatientKeeper Retorno. A source. A reviewer. A next step.

## Evidence and interpretation

Seven distinct baseline FP32 cases yielded two candidates accepted by local format and exact-reference checks and five rejected outputs. The assigned-context diagnostic variant and extra structured-prompt attempt are separate, making nine attempts and three format-valid outputs overall. All nine exported records report `semanticApproved=false`. These counts do not measure accuracy, clinical safety, efficiency or benefit.

[Exact exported inputs and results](../../evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/) · [R03 attempt summary](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) · [Separate GPU shutdown receipt](../../evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json) · [October 5 baseline declaration](../../BASE-PREEXISTENTE.md). The meaningful-workload requirement and contest eligibility remain decisions for the judges; submission does not establish an award.

The product captures retain the current reading-translation labels and access to the full original Portuguese records. Reading translations do not rewrite source digests, literal citations, saved receipts or recorded model answers. The AMD panel shows recorded execution, an off GPU and no live inference. Known conflict and clinical handoffs show execution metadata without a model answer.

The 14-scene edited presentation uses actual fictional-interface captures, editorial slides and a labeled conceptual AI illustration. It is not a continuous interaction recording or a patient photograph. The [official FIGUEIRA wordmark provenance](../../assets/ACT-III-20261012/BRAND-FIGUEIRA/PROVENANCE.md) accompanies the unchanged brand asset.
