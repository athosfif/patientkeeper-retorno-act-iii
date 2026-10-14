# Recorded Gemma replay · 2026-10-14

The sanitized fixture is [recorded-gemma-runs.json](recorded-gemma-runs.json). It preserves all five archived input contexts and original candidate objects, including the missing-source abstention and a timeout with `candidate: null`. It contains no credentials, raw request/response envelopes, provider account identifiers, private filesystem paths, or estimated billing calculations. Inputs are fictional.

Public wiring, owned by the parent application:

```js
import { mountRecordedGemmaPanel } from './recorded-gemma-client.mjs';
const panel = mountRecordedGemmaPanel(container, {
  item, revision, request, language, onStale,
});
await panel.ready;
panel.setLanguage('pt'); // Presentation only; no new reads or inference.
await panel.refresh({ item: nextItem, revision: nextRevision });
panel.destroy();
```

Include `app/recorded-gemma.css`. Copy the fixture to `/gemma-runs.json` in the public build. The `request` adapter must serve this fixed asset and the existing read-only `/api/ai/context` and `/api/evidence/query` routes. Those two current-source reads receive the exact archived question, case ID and displayed `expectedRevision`. No model-query, action, review-card or contact endpoint is used.

Selection is explicit: original attempt 01 for `SIM-RET-01`, product API attempt 05 for `SIM-RET-04`, and timeout attempt 03 for `SIM-RET-06`. Attempts 02 and 04 are distinct missing-source/adversarial inputs; they contribute to the full five-attempt audit rather than replacing the selected baseline. All five original objects remain in the fixture.

The module checks a pinned SHA-256 of canonical fixture JSON and each selected record, the complete current positive input, both current API revisions, the source digest, literal citations and the human-handoff gate. A changed answer that still passes the candidate schema is also rejected because the original evidence is immutable. SHA values of the original input artifacts, result artifacts, execution receipts, aggregate, source-support audit, identity observation and quota observation are preserved. These hashes identify evidence; they are not provider signatures or physical-hardware attestations.

The count is **five attempts: three affirmative candidates, one abstention, one timeout without retained answer**. Four received outputs passed format checks. Original per-attempt token usage totals 2,956 across the four received outputs; the timeout has no recovered individual usage. The separate official dashboard snapshot is kept literally (`3.796` total tokens displayed, `0.0001 pts` cost, `0.9999 pts` remaining), with its source and observation time. No conversion to USD or inferred timeout answer is made.

Requested identifier: `Gemma-4-31B-IT`. Official used identifier: `self-dploy/Gemma-4-31B-IT`. The original first response identifier was not retained and is shown as such. Official usage subsequently linked the two names. No claim is made about inspected weights, checkpoint revision or independently verified physical GPU hardware.

The five calls belong to the `SIM-RET` queue. They do not prove Gemma inference for the `SIM-CARE` doctor journey, audio, protocol or note. Local voice uses faster-whisper on CPU; the consultation note remains a literal extraction. The Qwen panel is a separate implementation and is not replaced by this module. No controlled Qwen/Gemma benchmark, clinical validation or business benefit is established.

Validation: `node --check app/recorded-gemma-client.mjs` and `node --test app/tests/recorded-gemma.test.mjs` passed (16 tests). Browser layout and final public wiring require the parent application's own QA. No existing protected fixture, server, builder, public demo, release or media file was changed by this module's implementation.

No model weights are distributed. The exact Gemma 4 provider/partner and output-use terms still require the parent task's primary-source license review before final publication; this document does not assign a model license or assert prize eligibility.
