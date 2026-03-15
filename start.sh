#!/bin/sh
set -eu

PORT="${PORT:-8080}"
API_PORT="${API_PORT:-8000}"
CHROMA_HOST="${CHROMA_HOST:-127.0.0.1}"
CHROMA_PORT="${CHROMA_PORT:-8001}"
CHROMA_PERSIST_DIR="${CHROMA_PERSIST_DIR:-/app/data/chroma}"

mkdir -p "${CHROMA_PERSIST_DIR}" /app/data/raw

if [ ! -f /app/raas-frontend/server.js ]; then
  echo "Missing Next standalone server at /app/raas-frontend/server.js" >&2
  exit 1
fi

/app/.venv/bin/chroma run \
  --host "${CHROMA_HOST}" \
  --port "${CHROMA_PORT}" \
  --path "${CHROMA_PERSIST_DIR}" &
CHROMA_PID=$!

/app/.venv/bin/uvicorn api.main:app \
  --host 0.0.0.0 \
  --port "${API_PORT}" &
API_PID=$!

cd /app/raas-frontend
echo "Starting frontend on 0.0.0.0:${PORT}" >&2
env HOSTNAME=0.0.0.0 PORT="${PORT}" node ./server.js &
FRONTEND_PID=$!

cleanup() {
  kill "${FRONTEND_PID}" "${API_PID}" "${CHROMA_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait "${FRONTEND_PID}"
