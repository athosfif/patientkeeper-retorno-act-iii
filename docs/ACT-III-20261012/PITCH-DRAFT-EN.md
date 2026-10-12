**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# PatientKeeper Retorno — English pitch rehearsal draft

**CURRENT DRAFT — NOT THE FINAL ELIGIBLE DEMO.** Updated for ACT-III-R02 on October 12, 2026. This is a spoken script, not a recording. Separate AMD execution is documented below; useful integration is not yet demonstrated. It must be revised after the product, evidence and public access change.

Target: **about 4 minutes 30 seconds**, allowing up to five minutes. Timing assumes a rehearsed pace and quick prepared interactions; measure the actual take and shorten it if needed. Do not speed up source reading to fit. The stage directions are not spoken.

## 0:00–0:30 · The problem

*Screen direction: Show the queue, with no private notifications visible.*

A follow-up appointment is canceled. The cancellation is recorded, but the next administrative step can still be unclear. Who owns the task? Which record is current? Has someone checked that a new appointment is actually confirmed? PatientKeeper Retorno is a prototype for clinic reception and coordination. It keeps that unfinished work visible and connects it to its sources, a review and a next step. Every case in this demonstration is fictional.

## 0:30–1:10 · Open one pending case

*Screen direction: Open a prepared fictional case and show its owner, pending action and records.*

We begin with one pending case. The queue shows its administrative status, owner and next action. We are not ranking staff members or making a clinical assessment. We open the source-review flow and ask what remains pending after the cancellation. The current local lookup searches words in the active records. It displays literal excerpts with source identifiers. This is extractive lookup, not a language-model answer. An empty result means the lookup did not find a sufficient match; it does not prove the information is absent.

## 1:10–1:55 · Sources become a reviewed card

*Screen direction: Read the relevant source; select it, confirm the review and prepare a card. Reopen the saved review.*

Here is the original excerpt beside the question. The person checks whether it supports the administrative task, selects the relevant source and explicitly confirms the review. The product then prepares a card containing those literal excerpts. It saves a separate receipt, so the card can be reopened after a reload. Creating this card does not send a message, change the appointment or close the case. If the underlying source changes, an old review cannot silently become a current card. The person must return to the current records.

## 1:55–2:40 · Show where the product stops

*Screen direction: Open the known-conflict case; show both sources and the absence of a save action. Briefly show historical sources.*

Now consider a case whose administrative status already records a disagreement between the appointment record and the queue. Both current sources remain visible. The product does not choose which one is true: it blocks card creation and hands the case back to the team. Historical sources are kept separately, so an old policy is not presented as the current one. Recognized clinical questions also require a human handoff. These are scoped controls, not a complete clinical classifier or automatic detection of every possible contradiction.

## 2:40–3:25 · Explain the technology and origin honestly

*Screen direction: Show origin, adapter state and the separate pilot receipt. Label its output as rejected; do not use a success badge or portray it as an app response.*

The administrative base was prepared on October fifth, before this event. Our October twelfth work adds source review, receipts, conflict blocking, language selection and an optional model transport. We also ran a separate Qwen pilot on an AMD Radeon Pro W7900D with one fictional case. Generation took about thirty-one seconds and returned exclamation marks. Validation rejected the output, so no usable candidate was accepted and we stopped the batch. The cloud session was then confirmed off. The app has no configured endpoint and has not performed inference. We have evidence of an AMD attempt; useful AMD integration remains pending.

## 3:25–4:05 · Business value and evaluation

*Screen direction: Show the planned comparison, clearly labeled as not yet measured.*

Our business-value hypothesis is specific: reception may spend less time finding the right record, while coordination can see what needs review before the next handoff. We have not measured that gain. Our evaluation plan compares the same task manually and in the product using reserved fictional cases. We will record task time, administrative correctness, citation support, appropriate handoffs and failures. Faster completion only matters if the quality is preserved. These measures would evaluate the administrative process, not clinical outcomes or the performance of individual workers.

## 4:05–4:30 · Close on the product

*Screen direction: Return to the card or the cover. End without a claim of completed eligibility or a prize.*

The distinctive idea is the connection between information and responsibility: a source, a reviewer and a next step. Navigation now offers English, Portuguese and Spanish, while source quotations remain literal in Portuguese. Chrome checks covered keyboard navigation, saved cards and 320, 390 and 768-pixel layouts without horizontal overflow. Useful AMD integration, measured value and public judge access are still pending in this rehearsal draft. PatientKeeper Retorno is focused on one useful administrative journey, with a clear place for people to review and take over.

## Separate AMD pilot evidence

The authorized session was requested on October 12 at **13:41:45 Brasília** and observed officially **OFF at 14:01:13** by the coordinator. Later shutdown UI evidence (preserved in the private local archive). The worker does not verify cloud shutdown, so its own `cloudShutdownVerified:false` flag is not a contradiction of that later UI observation.

Model: **Qwen/Qwen2.5-1.5B-Instruct**, revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, float16. Hardware: **AMD Radeon Pro W7900D**. One SIM-RET-02 generation: **30.687 seconds**, **654 input / 1,024 output tokens**, exclamation-mark output, **zero accepted candidates**, no semantic approval. Environment (preserved in the private local archive) · Result (preserved in the private local archive) · Worker receipt (preserved in the private local archive).

The current local suite records 131/131 passes (preserved in the private local archive); controlled local tests do not establish real model quality or clinical benefit. The app has no configured model endpoint and has not run inference. Public GitHub, public demo, final video, slides and submission are still pending.

## Timing and final-version gate

Spoken copy: **586 words**, excluding headings and directions. At approximately 130.2 words per minute this is 4:30 of speech; interactions add time. Rehearse and trim wording or allow a shorter spoken take before recording, while preserving the source/origin and current-state disclosures. This file makes no claim that a timed rehearsal has occurred.

The event judges technology application, presentation, business value and originality. AMD must power a meaningful part of the actual product shown. This script therefore separates the failed-output AMD pilot from useful AMD integration. It does not substitute prior Academy work, a contract or a configured transport as proof. [Official ACT III page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii). The video limit is five minutes in the [official submission guide](https://lablab.ai/ai-articles/hackathon-guidelines).

Before final recording:

- Replace pending integration statements only after a useful AMD-powered function is demonstrated and evidenced. Preserve the failed-output pilot as a separate result.
- If real model outputs are used, show an output with supporting sources and a genuine failure/handoff example; do not present simulated output as execution.
- Measure any claimed gain and state the sample size, task, method and limitation. If unmeasured, retain the hypothesis wording.
- Finish the R02 PT/EN/ES navigation, keyboard and responsive checks. The selector is implemented; do not imply a completed user study or full accessibility conformity.
- Add the verified public demo/repository URLs to the closing slide, without exposing secrets or private records.
- Declare **ADMIN-R01-20261005** as prior work and the ACT III changes as new work. Source: [baseline declaration](../../BASE-PREEXISTENTE.md) and local build receipt (preserved in the private local archive).
- Export the final video and slides, inspect every external link and retain the submission receipt. A pitch draft or localhost demo is not submission.

The literal source quotations and reviewed-card receipt are demonstration evidence; the UI confirmation does not authenticate a professional reviewer’s identity. All cases are fictional. No clinical outcome, real patient use, performance saving, prize eligibility or completed AMD requirement is claimed by this draft.
