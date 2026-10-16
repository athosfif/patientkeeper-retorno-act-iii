# Recorded local Evolus application pilot · 16 October 2026

One real PatientKeeper application request completed through Evolus in **8.149 seconds**, returning a pure JSON candidate with two exact synthetic source citations. This is archived evidence of that dated local execution. The public browser demo has no live Evolus backend.

[Download the sanitized receipt](evolus-app-pilot-20261016.json). The receipt contains the complete fictional input, original candidate, context digests, output hashes, controlled execution observations and hashes of retained source receipts. It excludes credentials, external object IDs, private paths, screen captures and raw provider response envelopes.

## What was observed

The operator opened Case 02, submitted the fixed administrative question through the application UI, switched from English to Portuguese while the workflow was pending, then explicitly checked the same result. The app displayed the candidate below without another submission:

> There is a cancellation of a return without replacement, and the pending item was created without an assigned responsible person.

Its citations preserve the original Portuguese excerpts:

- `SIM02-CANCELAMENTO`: `Ha um cancelamento de retorno sem reposicao.`
- `SIM02-HANDOFF`: `A pendencia foi criada sem responsavel e sem proxima acao registrada.`

The candidate required human review. The saved administrative state had the same SHA-256 before and after the request. The runner saved no review card and performed no patient contact, assignment, appointment change or case closure. No outer Markdown fence was removed from this successful output.

The configured Evolus agent alias was `own/gemma-4-31b-it`, using a tested AMD Token Factory connection with no fallback model. The workflow response itself does not return the underlying model identity; its conservative model/AMD identity flags remain false. The attached read-only source library was verified separately. Both complete source excerpts were also present in the request; there is no independent library-read tool trace in this receipt.

## Boundaries and closure

This was the second of two authorized workflow executions. The first portal test returned exact citations inside Markdown framing and was rejected by the strict raw application contract. The successful application run used pure JSON and is recorded separately. Each execution reported zero Evolus credits and no pending credit entries; this is a dated provider observation, not a promise of future free usage or zero AMD resource consumption. Internal provider attempts and tool calls are not bounded by the local HTTP counter.

The temporary server was stopped and the workflow paused after the pilot. No further executions remain authorized by that pilot allowance. Running the source normally leaves Evolus disabled. Reusing this historical receipt never submits a workflow or answers another question.

This one-case observation is separate from the five AMD Token Factory Gemma attempts recorded on 14 October and the earlier Qwen archive. Exact schema and literal citations do not establish semantic approval, clinical accuracy, measured time savings, general prompt-injection resistance, award eligibility or a judging result. The doctor consultation episode, ASR and clinical protocol were outside this Evolus pilot.

The source package contains the local integration contract and offline commands in `integration/evolus-pilot/README.md`.
