FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/raas-frontend

COPY raas-frontend/package.json raas-frontend/package-lock.json ./
RUN npm ci

COPY raas-frontend ./
ENV NEXT_PUBLIC_RAAS_API_BASE_URL=/api
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV API_PORT=8000
ENV CHROMA_HOST=127.0.0.1
ENV CHROMA_PORT=8001
ENV CHROMA_PERSIST_DIR=/app/data/chroma

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates libgcc-s1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir uv==0.4.30

COPY pyproject.toml README.md ./
COPY api ./api
RUN uv sync --no-dev

COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node

COPY --from=frontend-builder /app/raas-frontend/.next/standalone ./raas-frontend
COPY --from=frontend-builder /app/raas-frontend/.next/static ./raas-frontend/.next/static
COPY --from=frontend-builder /app/raas-frontend/public ./raas-frontend/public

COPY start.sh /app/start.sh

RUN mkdir -p /app/data \
    && chmod +x /app/start.sh

EXPOSE 8080

CMD ["/app/start.sh"]
