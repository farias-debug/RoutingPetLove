#!/bin/bash
# ──────────────────────────────────────────────────────────────
# deploy_pipeline_job.sh — Deploy do Cloud Run Job pipeline
#
# Pré-requisitos:
#   - gcloud CLI autenticado
#   - Docker ou Cloud Build habilitado
#   - Secret Manager com tms-user e tms-pass criados
#
# Uso:
#   bash pipeline/deploy_pipeline_job.sh
# ──────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="data-aileron-482822-d0"
REGION="us-central1"
JOB_NAME="pipeline-tms-bq"
IMAGE="gcr.io/${PROJECT_ID}/${JOB_NAME}"
SA_EMAIL="pipeline-tms-bq@${PROJECT_ID}.iam.gserviceaccount.com"

echo "═══════════════════════════════════════════"
echo "  Deploy Cloud Run Job: ${JOB_NAME}"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "═══════════════════════════════════════════"

# ── 1) Build da imagem ──
echo ""
echo "[1/4] Building container image..."
cd "$(dirname "$0")"

gcloud builds submit \
  --project="${PROJECT_ID}" \
  --tag="${IMAGE}" \
  .

# ── 2) Criar/atualizar o Job ──
echo ""
echo "[2/4] Deploying Cloud Run Job..."

# Verificar se job já existe
if gcloud run jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --region="${REGION}" &>/dev/null; then
  echo "  Job já existe — atualizando..."
  gcloud run jobs update "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --image="${IMAGE}" \
    --task-timeout=15m \
    --max-retries=1 \
    --memory=2Gi \
    --cpu=2 \
    --service-account="${SA_EMAIL}" \
    --set-env-vars="TMS_GCS_BUCKET=petlove-tms-data,TMS_GCS_PREFIX=tms-monitoramento,PIPELINE_DAYS_BACK=7,BIGQUERY_PROJECT_ID=${PROJECT_ID},BIGQUERY_DATASET=monitoramento_carga" \
    --update-secrets="TMS_USER=tms-user:latest,TMS_PASS=tms-pass:latest"
else
  echo "  Criando novo job..."
  gcloud run jobs create "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --image="${IMAGE}" \
    --task-timeout=15m \
    --max-retries=1 \
    --memory=2Gi \
    --cpu=2 \
    --service-account="${SA_EMAIL}" \
    --set-env-vars="TMS_GCS_BUCKET=petlove-tms-data,TMS_GCS_PREFIX=tms-monitoramento,PIPELINE_DAYS_BACK=7,BIGQUERY_PROJECT_ID=${PROJECT_ID},BIGQUERY_DATASET=monitoramento_carga" \
    --update-secrets="TMS_USER=tms-user:latest,TMS_PASS=tms-pass:latest"
fi

# ── 3) Configurar Cloud Scheduler ──
echo ""
echo "[3/4] Configuring Cloud Scheduler..."

SCHEDULER_NAME="trigger-pipeline-tms-bq"
SCHEDULE="0 8 * * 1-5"  # Seg-sex 8h BRT (UTC-3 = 11h UTC)

# Verificar se scheduler já existe
if gcloud scheduler jobs describe "${SCHEDULER_NAME}" --project="${PROJECT_ID}" --location="${REGION}" &>/dev/null; then
  echo "  Scheduler já existe — atualizando..."
  gcloud scheduler jobs update http "${SCHEDULER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="America/Sao_Paulo" \
    --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
    --http-method=POST \
    --oauth-service-account-email="${SA_EMAIL}" \
    --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"
else
  echo "  Criando novo scheduler..."
  gcloud scheduler jobs create http "${SCHEDULER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="America/Sao_Paulo" \
    --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
    --http-method=POST \
    --oauth-service-account-email="${SA_EMAIL}" \
    --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform"
fi

echo ""
echo "[4/4] Verificando..."
gcloud run jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format="table(name,status.conditions[0].type,status.conditions[0].status)"
echo ""

echo "═══════════════════════════════════════════"
echo "  ✅ Deploy concluído"
echo ""
echo "  Job:       ${JOB_NAME}"
echo "  Scheduler: ${SCHEDULER_NAME} (${SCHEDULE} BRT)"
echo "  Image:     ${IMAGE}"
echo ""
echo "  Para executar manualmente:"
echo "    gcloud run jobs execute ${JOB_NAME} --project=${PROJECT_ID} --region=${REGION}"
echo ""
echo "  Para ver logs:"
echo "    gcloud logging read 'resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"${JOB_NAME}\"' --project=${PROJECT_ID} --limit=50 --format='table(timestamp,textPayload)'"
echo "═══════════════════════════════════════════"
