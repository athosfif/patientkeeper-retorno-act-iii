# Optional local Evolus boundary

Evolus is **disabled by default**. Importing these modules does not perform network requests or start a workflow. The public static adapter always reports Evolus disabled and rejects query/poll requests.

The dated, completed application pilot and its limits are documented in [the sanitized 16 October receipt](../../docs/evolus-app-pilot-20261016.md). No provider object ID or credential is supplied in this package. The two executions authorized for that pilot have already been used; running the source does not grant authorization for more.

## Local contract

`preparation.mjs` projects current sources from the application and binds the case, question, revision, source digest and input digest. `rest-client.mjs` makes bounded HTTPS calls using the official API paths retained in the implementation. `runtime-pilot.mjs` checks those bindings before and after execution, validates the closed candidate schema and produces sanitized evidence. `http-api.mjs` limits the local session and exposes only controlled browser responses.

- `GET /api/evolus/status` reports configuration, fixed scope, remaining local submissions and a recoverable pending local session handle when its context and deadline still match. It exposes no external workflow/execution ID or credential.
- `POST /api/evolus/query` accepts exactly `{caseId, question, expectedRevision}`. The only pilot scope is `SIM-RET-02` and `Qual pendência continua aberta e quem é o responsável?`.
- `POST /api/evolus/poll` accepts exactly `{sessionId, expectedRevision}`. It can only check the corresponding local pending session. It never submits another workflow.

The server requires matching digests for the externally prepared synthetic source snapshot. A query reserves its execution allowance before submission. Errors and timeouts do not refund it or trigger a retry. One initial POST and result GET are followed only by explicit result checks. Expired or stale sessions are retired locally, without claiming remote cancellation. Remounting the UI can restore the explicit result button, not an automatic query or poll.

No result saves a review card, assigns staff, changes progress or appointments, signs a medical record, contacts anyone or closes a case. Schema and exact-source validation require human review and do not establish clinical or semantic approval.

## Server-only configuration

Normal offline startup needs no key:

```sh
RETORNO_EVOLUS_ENABLED=0 RETORNO_MODEL_ENABLED=0 RETORNO_VOICE_ENABLED=0 node app/server.mjs
```

A separately authorized local run must explicitly configure `RETORNO_EVOLUS_ENABLED=1`, `RETORNO_EVOLUS_APPLICATION_ID`, `RETORNO_EVOLUS_WORKFLOW_ID`, `RETORNO_EVOLUS_SOURCE_DIGEST` and `RETORNO_EVOLUS_INPUT_DIGEST`. Missing or invalid configuration keeps the boundary disabled. `RETORNO_EVOLUS_MAX_EXECUTIONS` permits at most two submissions per server instance; `RETORNO_EVOLUS_DEADLINE_MS` permits at most 120000 ms. That software cap is not an authorization to execute or a verified bound on internal provider attempts/tool calls.

Supply `RETORNO_EVOLUS_API_KEY` only to the server process in memory, or use the server's credential getter. Never put a key in browser code, a URL, an environment file, a command argument, a prompt, a receipt or source control. Server startup keeps local loopback Host/Origin checks and the existing mutation queue.

`RETORNO_EVOLUS_OUTPUT_FRAMING` defaults to `strict_json`. The optional `single_json_fence` mode removes only one entire exterior JSON fence after strict JSON parsing fails, then applies the unchanged global candidate schema and exact citation checks. It does not repair, translate or rewrite the body. Sanitized raw/body SHA-256 values and a removal flag are retained. The successful application pilot used pure JSON and removed no fence.

## Offline validation

From the repository root, using Node.js 24:

```sh
node scripts/build-public-demo.mjs
node --test --test-concurrency=1 app/tests/*.test.mjs public-demo/tests/*.test.mjs integration/evolus-pilot/runtime-pilot.test.mjs
```

These tests inject fake HTTP/runtime observations. They exercise stale context, exact IDs/citations, bounded requests/deadlines, explicit pending recovery, immutability, error sanitization, framing adversaries and the static transport's disabled boundary. They do not make a real provider call or prove provider availability or quota.
