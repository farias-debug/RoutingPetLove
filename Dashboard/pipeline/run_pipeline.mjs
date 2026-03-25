/**
 * run_pipeline.mjs — Orquestrador do pipeline Cloud Run Job.
 *
 * Etapas:
 *   0. Baixar tabelas dimensão do GCS → /app/data/tab_auxiliar/
 *   1. Extrair planejamento de rotas (Google Sheets) → planejamento_2026.csv
 *   2. Extrair relatório TMS (Playwright) → CSV incremental
 *   3. Consolidar CSVs incrementais → _Completo.csv
 *   4. Carregar raw tables no BigQuery (load_raw_to_bq.py)
 *
 * Variáveis de ambiente obrigatórias:
 *   TMS_USER, TMS_PASS           — Credenciais TMS Petlove
 *   TMS_GCS_BUCKET               — Bucket GCS para persistência
 *   TMS_GCS_PREFIX               — Prefixo GCS (default: tms-monitoramento)
 *
 * Variáveis opcionais:
 *   PIPELINE_DAYS_BACK           — Dias retroativos (default: 7)
 *   PIPELINE_SKIP_EXTRACT        — "true" para pular extração TMS
 *   PIPELINE_DRY_RUN             — "true" para dry-run
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Storage } from "@google-cloud/storage";

const APP_DIR = "/app";
const DATA_DIR = path.join(APP_DIR, "data");
const TAB_AUX_DIR = path.join(DATA_DIR, "tab_auxiliar");
const INCREMENTAL_DIR = path.join(DATA_DIR, "Relatorio_Monitoramento_Carga");

const GCS_BUCKET = process.env.TMS_GCS_BUCKET || "";
const GCS_PREFIX = (process.env.TMS_GCS_PREFIX || "tms-monitoramento").replace(/^\/|\/$/g, "");
const DAYS_BACK = Number(process.env.PIPELINE_DAYS_BACK || "7");
const SKIP_EXTRACT = process.env.PIPELINE_SKIP_EXTRACT === "true";
const DRY_RUN = process.env.PIPELINE_DRY_RUN === "true";

function log(step, msg) {
  const ts = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace("T", " ");
  console.log(`[${ts}] [${step}] ${msg}`);
}

function run(cmd, opts = {}) {
  log("CMD", cmd);
  execSync(cmd, { stdio: "inherit", cwd: APP_DIR, ...opts });
}

// ── Etapa 0: Baixar tabelas dimensão do GCS ────────────────
async function downloadDimensionTables() {
  if (!GCS_BUCKET) {
    log("0/5", "GCS_BUCKET não configurado — pulando download de dimensões");
    return;
  }

  log("0/5", "Baixando tabelas dimensão do GCS...");
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET);
  const prefix = `${GCS_PREFIX}/dimensoes/`;

  const [files] = await bucket.getFiles({ prefix });
  mkdirSync(TAB_AUX_DIR, { recursive: true });

  let count = 0;
  for (const file of files) {
    const fileName = path.basename(file.name);
    if (!fileName || fileName.startsWith(".")) continue;
    const dest = path.join(TAB_AUX_DIR, fileName);
    await file.download({ destination: dest });
    log("0/5", `  ${fileName} OK`);
    count++;
  }

  log("0/5", `${count} arquivo(s) baixado(s) do GCS`);
}

// ── Etapa 1: Extrair Planejamento do Google Sheets ─────────
function extractPlanejamento() {
  log("1/5", "Extraindo planejamento de rotas (Google Sheets)...");
  run(`python3 extraction/extrair_planejamento.py ${DATA_DIR}`);
  log("1/5", "Extração planejamento concluída");
}

// ── Etapa 2: Extrair TMS ───────────────────────────────────
function extractTms() {
  if (SKIP_EXTRACT) {
    log("2/5", "Extração TMS pulada (PIPELINE_SKIP_EXTRACT=true)");
    return;
  }

  log("2/5", `Extraindo TMS (últimos ${DAYS_BACK} dias)...`);

  const destDir = INCREMENTAL_DIR;
  mkdirSync(destDir, { recursive: true });

  const args = [
    "--days-back", String(DAYS_BACK),
    "--dest-dir", destDir,
    "--timeout-ms", "180000",
  ];

  if (DRY_RUN) args.push("--dry-run");

  run(`node extraction/extrair_relatorio_tms.mjs ${args.join(" ")}`);
  log("2/5", "Extração TMS concluída");
}

// ── Etapa 3: Consolidar CSVs ─────────────────────────────────────
function consolidate() {
  log("3/5", "Consolidando CSVs incrementais...");

  const args = [];
  if (DRY_RUN) args.push("--dry-run");
  if (GCS_BUCKET) {
    args.push("--gcs-bucket", GCS_BUCKET);
    args.push("--gcs-prefix", GCS_PREFIX);
  }

  run(`python3 extraction/consolidar_monitoramento.py ${args.join(" ")}`);
  log("3/5", "Consolidação concluída");
}

// ── Etapa 4: Carregar no BigQuery ──────────────────────────────────
function loadBigQuery() {
  log("4/5", "Carregando dados no BigQuery...");

  const args = ["--table", "all"];
  if (DRY_RUN) args.push("--dry-run");

  run(`python3 bigquery/load_raw_to_bq.py ${args.join(" ")}`);
  log("4/5", "Carga BigQuery concluída — views atualizarão automaticamente");
}

// ── Publicar status do pipeline (GCS) ───────────────────────
async function publishStatus(status, elapsed, error) {
  if (!GCS_BUCKET) return;
  const payload = {
    status,
    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }),
    elapsed_seconds: elapsed,
    days_back: DAYS_BACK,
    error: error || null,
  };
  try {
    const storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(`${GCS_PREFIX}/pipeline_status.json`);
    await file.save(JSON.stringify(payload, null, 2), { contentType: "application/json" });
    log("STATUS", `Status '${status}' publicado em gs://${GCS_BUCKET}/${GCS_PREFIX}/pipeline_status.json`);
  } catch (e) {
    log("STATUS", `Falha ao publicar status: ${e.message}`);
  }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  log("PIPELINE", "═══════════════════════════════════════════════");
  log("PIPELINE", "  Cloud Run Job — Pipeline TMS → BigQuery");
  log("PIPELINE", `  Bucket: gs://${GCS_BUCKET}/${GCS_PREFIX}`);
  log("PIPELINE", `  Days back: ${DAYS_BACK} | Dry-run: ${DRY_RUN}`);
  log("PIPELINE", "═══════════════════════════════════════════════");

  try {
    await downloadDimensionTables();
    extractPlanejamento();
    extractTms();
    consolidate();
    loadBigQuery();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log("PIPELINE", `✅ Pipeline concluído em ${elapsed}s`);
    await publishStatus("success", Number(elapsed), null);
    process.exit(0);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log("PIPELINE", `❌ Pipeline falhou: ${err.message}`);
    console.error(err);
    await publishStatus("failed", Number(elapsed), err.message);
    process.exit(1);
  }
}

main();
