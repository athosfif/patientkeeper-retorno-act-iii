# Local Linux pilot only. Build from the project root with the adjacent
# Dockerfile.dockerignore. No credentials, models, data or media are build inputs.
ARG RETORNO_NODE_IMAGE=node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
FROM ${RETORNO_NODE_IMAGE}
WORKDIR /opt/retorno

COPY ["CASOS-SINTETICOS.json", "LICENSE", "./"]
COPY ["app/ai-contract.mjs", "app/calendar-client.mjs", "app/calendar.mjs", "app/care-journey-client.mjs", "app/care-journey.css", "app/care-journey.mjs", "app/care-store.mjs", "app/client.mjs", "app/engine.mjs", "app/evidence-client.mjs", "app/evidence.mjs", "app/favicon.svg", "app/i18n.mjs", "app/index.html", "app/model-budget.mjs", "app/model-client.mjs", "app/model-transport.mjs", "app/recorded-gemma-client.mjs", "app/recorded-gemma.css", "app/recorded-gemma.mjs", "app/selection-controls.css", "app/server.mjs", "app/source-reading.mjs", "app/source-translations.mjs", "app/styles.css", "app/theme-init.js", "app/theme.mjs", "app/voice-transcription.mjs", "./app/"]
COPY ["docs/recorded-gemma-runs.json", "./docs/"]
COPY ["integration/evolus-pilot/preparation.mjs", "integration/evolus-pilot/rest-client.mjs", "integration/evolus-pilot/runtime-pilot.mjs", "integration/evolus-pilot/http-api.mjs", "./integration/evolus-pilot/"]

ENV NODE_ENV=production \
    RETORNO_PORT=8769 \
    RETORNO_DATA_DIR=/tmp/retorno-data \
    RETORNO_MODEL_ENABLED=0 \
    RETORNO_VOICE_ENABLED=0 \
    RETORNO_EVOLUS_ENABLED=0 \
    RETORNO_MODEL_MAX_REQUESTS=4 \
    RETORNO_MODEL_MAX_REQUEST_BYTES=32768 \
    RETORNO_MODEL_MAX_OUTPUT_TOKENS=1024

USER node
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=2 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:8769/api/health',{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "app/server.mjs"]
