# ──────────────────────────────────────────────────────────────
# Cloud Run Job — Pipeline TMS → Consolidação → BigQuery
#
# Imagem multi-runtime: Node.js 22 (Playwright) + Python 3.12
# Executada via Cloud Scheduler diariamente.
#
# BUILD CONTEXT = Dashboard/ (não pipeline/)
# Usar: gcloud builds submit --config=pipeline/cloudbuild.yaml .
# ──────────────────────────────────────────────────────────────
FROM node:22-bookworm

# Instalar Python 3 + dependências de sistema para Playwright
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
      libcairo2 libasound2 libwayland-client0 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python deps ──
COPY pipeline/requirements.txt ./requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r requirements.txt

# ── Node deps + Playwright browsers ──
COPY pipeline/package.json ./package.json
RUN npm install --omit=dev && \
    npx playwright install chromium

# ── Código do pipeline ──
COPY pipeline/run_pipeline.mjs ./
COPY extraction/ ./extraction/
COPY bigquery/load_raw_to_bq.py ./bigquery/load_raw_to_bq.py

# Diretórios de dados temporários
RUN mkdir -p /app/data/Relatorio_Monitoramento_Carga/_processados \
             /app/data/tab_auxiliar \
             /app/downloads

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

CMD ["node", "run_pipeline.mjs"]
