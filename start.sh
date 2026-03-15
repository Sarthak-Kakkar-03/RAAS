#!/bin/sh
set -eu

mkdir -p /app/data/chroma /app/data/raw

/app/.venv/bin/chroma run \
  --host 127.0.0.1 \
  --port "${CHROMA_PORT}" \
  --path "${CHROMA_PERSIST_DIR}" &
CHROMA_PID=$!

/app/.venv/bin/uvicorn api.main:app \
  --host 127.0.0.1 \
  --port "${API_PORT}" &
API_PID=$!

cd /app/raas-frontend
HOSTNAME=0.0.0.0 PORT="${PORT}" node server.js &
FRONTEND_PID=$!

cleanup() {
  kill "${FRONTEND_PID}" "${API_PID}" "${CHROMA_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait "${FRONTEND_PID}"
