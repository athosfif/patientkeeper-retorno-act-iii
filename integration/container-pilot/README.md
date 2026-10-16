# PatientKeeper — local container pilot

**Built and executed locally on 16 October 2026.** The Linux/arm64 image passed 16 HTTP and security smoke checks inside Docker Desktop, including 23 static routes. All 35 runtime files matched the source allowlist byte for byte. Model inference, voice and Evolus stayed disabled; no provider was called. The container was stopped and removed after validation. The [public sanitized receipt](VALIDATION-20261016.json) records the result. Full local evidence remains under `evidence/CONTAINER-FINAL-20261016/` in the working project.

The validated mode is **internal container loopback with `--network none`**, without published ports or a browser endpoint on the host. The application binds only `127.0.0.1`; it is not a public backend. The separate interactive target below is Docker Engine on a local Linux machine using host networking; that native Linux networking mode has not been executed here. Windows, amd64 runtime, remote Docker contexts, tunnels and cloud publication were not tested. Do not change the server to `0.0.0.0` or add a proxy to make this package public.

## Verify without Docker or network

From the project root:

```sh
python3 integration/container-pilot/verify_context.py
```

The checker reads only named runtime inputs and this package. It verifies COPY destinations and ignore allowlists, static assets, static and literal dynamic JavaScript imports, the unchanged loopback policy, disabled defaults, and hashes. Computed dynamic imports fail this restricted check and require a reviewed packaging rule. This is source inspection, not a JavaScript or Docker parser, image build or runtime test. It does not contact a provider. `CONTEXT-MANIFEST.json` and `CONTEXT-MANIFEST-20261016-EVOLUS-LOCAL.json` preserve historical pre-build checks. `CONTEXT-MANIFEST-20261016-VALIDATED.json` records the current source context; its scope is static verification, while the separate runtime receipt records the actual execution. Rerun verification after source changes.

The 35 build inputs are explicit. Four named modules retain the destination `integration/evolus-pilot/`: `preparation.mjs`, `rest-client.mjs`, `runtime-pilot.mjs` and `http-api.mjs`. This preserves the server's dynamic import and their relative imports into `app/`; no other integration files are allowed. The only evidence asset is the already sanitized `docs/recorded-gemma-runs.json`, served by the current local application. Source `app/data`, credentials, `.env`, machine configuration, raw pilot evidence, presentation/video/audio, weights, Python/ASR runtime, tests and caches are excluded. The optional voice adapter module is required by the server, but its worker/runtime/weights are intentionally absent; voice remains disabled.

## Reproduce the verified build

The official `node:24-bookworm-slim` base was downloaded and the Dockerfile now pins its verified registry digest, `sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5`. The tested image used Node v24.22.0 on Linux/arm64. The local image is `patientkeeper-retorno:validated-20261016`; it has not been pushed to a registry. A first build on another machine downloads the base image.

```sh
docker context show
docker build --network none --file integration/container-pilot/Dockerfile \
  --tag patientkeeper-retorno:validated-20261016 .
```

Use a local Docker Engine. Keep `Dockerfile.dockerignore` next to its Dockerfile: Docker uses the file-specific ignore rules before sending the context. The observed transferred context was 513.20 kB. Never replace the build command with `COPY .`, use a remote build service, or pass a credential as an image build argument.

## Reproduce the validated isolated smoke check

Use a free resource window. No port is published; the probe connects to the application from inside the same container. The root filesystem is read-only, temporary storage is capped at 16 MiB, and the runtime is capped at 2 CPUs and 256 MiB. Network mode `none` prevents provider connections even if a test regresses.

```sh
docker run --detach --name patientkeeper-container-pilot \
  --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16777216,uid=1000,gid=1000,mode=0700 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --pids-limit 128 --memory 256m --memory-swap 256m --cpus 2 \
  patientkeeper-retorno:validated-20261016
docker exec -i patientkeeper-container-pilot node --input-type=module \
  < integration/container-pilot/smoke_runtime.mjs
docker stop --time 5 patientkeeper-container-pilot
docker rm patientkeeper-container-pilot
```

The probe checks readiness, an unprivileged process, no capabilities, read-only root, writable temporary storage, a loopback-only listener, health, synthetic queue and doctor journey, disabled-provider refusals, Host/Origin and stale-context guards, all declared assets, recorded Gemma replay, protected paths, unchanged administrative state and zero reserved provider calls. It also returns hashes of the 35 runtime files for comparison with the static manifest. The first probe exposed a startup race in the probe itself; a bounded five-second readiness wait corrected it. The initial observation is retained in the evidence folder.

## Optional interactive run on native Linux — networking not tested here

First ensure port 8769 is unused. Then:

```sh
docker run --rm --name patientkeeper-container-pilot \
  --network host \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16777216,uid=1000,gid=1000,mode=0700 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --pids-limit 128 --memory 256m \
  patientkeeper-retorno:validated-20261016
```

Open `http://127.0.0.1:8769/` on that same Linux machine. Use fictional data only. The synthetic progress lives in temporary memory and disappears when the container stops. Host networking shares the host network namespace and has less network isolation; use only a trusted local machine. The existing loopback binding limits inbound reach, but this mode is not an outbound-network sandbox. Do not add `--publish`, Docker socket mounts, host-directory mounts or elevated privileges.

In another terminal, confirm `/api/health`, `/api/model/status`, `/api/voice/status` and `/api/evolus/status`; model, voice and Evolus must report disabled. These routes passed in the isolated validation above. Browser inspection of queue, calendar, doctor workspace and Gemma replay through native Linux host networking still requires a separate check. Confirm that the host listener is loopback-only and a different machine cannot access it; that cross-machine check has not been performed.

```sh
docker stop patientkeeper-container-pilot
```

This stops only the named pilot.

## Optional model configuration — separate authorized pilot

The existing server accepts `RETORNO_MODEL_ENABLED`, `RETORNO_MODEL_ENDPOINT`, `RETORNO_MODEL_NAME`, `RETORNO_MODEL_RESPONSE_FORMAT` and `RETORNO_MODEL_API_KEY`, plus the three budget limits shown in the Dockerfile. A separate pilot requires current quota/cost confirmation. Keep the key in the launching process and forward it by variable name (`--env RETORNO_MODEL_API_KEY`), never by literal value, file COPY or build argument. Docker administrators can inspect a container's environment; this is local server-only configuration, not a production secrets service.

Do not enable it automatically. Restarting the process resets the local request counter; it does not reset provider usage or authorize more requests. The existing transport rejects tool calls and is not an Evolus agent transport. This container does not include an AMD model server or evidence of new AMD/Evolus execution.

The optional Evolus hook uses the separate `RETORNO_EVOLUS_ENABLED`, `RETORNO_EVOLUS_APPLICATION_ID`, `RETORNO_EVOLUS_WORKFLOW_ID`, `RETORNO_EVOLUS_API_KEY`, `RETORNO_EVOLUS_SOURCE_DIGEST` and `RETORNO_EVOLUS_INPUT_DIGEST` configuration. Missing or mismatched bindings keep it disabled or refuse the request. Keep the Evolus application key only in the launching process and forward it by variable name (`--env RETORNO_EVOLUS_API_KEY`); the AMD key belongs in the authorized Evolus connector. No key, provider object ID or verified library binding is supplied in this package.

A future authorized pilot must set its remaining workflow budget explicitly with `RETORNO_EVOLUS_MAX_EXECUTIONS` (1–2) and can set `RETORNO_EVOLUS_DEADLINE_MS` up to 120000. The fixed synthetic scope is case `SIM-RET-02`; query submits once, pending polls are explicit, and the server retains its execution reservations across recreated runners. Restarting the container resets these local counters, without restoring provider quota or authorizing more execution. The optional `RETORNO_EVOLUS_OUTPUT_FRAMING=single_json_fence` adaptation remains off unless selected; it only removes one complete outer JSON fence before the same strict candidate validation, retaining hashes and a removal flag. Packaging does not upload/index a library, configure a connector, activate a workflow or call a model.

## Delivery limit

This package contains a locally built and smoke-tested **local app** with a pinned base digest. The image remains local; registry publication and public live service are separate actions. The recorded host-process Gemma/Evolus pilot does not establish model execution inside this container: no live provider, ASR worker or GPU was enabled in the container validation. Linux host networking is unsuitable for a public live demonstration endpoint. The existing static demo remains separate; this packaging alone does not establish prize eligibility or satisfy all Evolus requirements.

References: [Docker build context and file-specific ignore rules](https://docs.docker.com/build/concepts/context/), [Docker host networking](https://docs.docker.com/engine/network/drivers/host/).
