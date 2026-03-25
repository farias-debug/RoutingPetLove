import path from "node:path";
import { fileURLToPath } from "node:url";

import nodemailer from "nodemailer";

import { buildPayloadFromApi } from "./build_payload_from_api.mjs";
import { renderEmailHtml, renderEmailText } from "./render_email.mjs";
import { dashboardRoot, defaultOutDir, ensureDir, loadEnvFile, parseArgs, readJson, writeText } from "./shared.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

function boolFromEnv(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

async function resolvePayload(args) {
  const inputFile = args.input || args._[0];

  if (inputFile) {
    return readJson(path.resolve(inputFile));
  }

  return buildPayloadFromApi({
    baseUrl: args["base-url"] || "http://localhost:3001",
    filters: {
      periodo: args.periodo,
      filial: args.filial,
      transportador: args.transportador,
      tipoVeiculo: args.tipoVeiculo,
      status: args.status,
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFile = args.env ? path.resolve(args.env) : path.join(dashboardRoot, ".env.report");

  try {
    await loadEnvFile(envFile);
  } catch {
    // O arquivo local e opcional; se nao existir, seguimos com process.env.
  }

  const payload = await resolvePayload(args);
  const outDir = args.outdir ? path.resolve(args.outdir) : defaultOutDir;
  await ensureDir(outDir);

  const html = renderEmailHtml(payload);
  const text = renderEmailText(payload);
  const htmlFile = path.join(outDir, "resumo_executivo_diario.email.html");
  const textFile = path.join(outDir, "resumo_executivo_diario.email.txt");

  await writeText(htmlFile, html);
  await writeText(textFile, text);

  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: boolFromEnv(process.env.SMTP_SECURE, false),
    auth: {
      user: requiredEnv("SMTP_USER"),
      pass: requiredEnv("SMTP_PASS"),
    },
  });

  const from = process.env.REPORT_EMAIL_FROM || requiredEnv("SMTP_USER");
  const to = args.to || process.env.REPORT_EMAIL_TO || "lucas.batista@petlove.com.br";

  const info = await transporter.sendMail({
    from,
    to,
    subject: payload.email.subject,
    html,
    text,
  });

  console.log(`E-mail enviado para ${to}`);
  console.log(`Message ID: ${info.messageId}`);
  console.log(`HTML salvo em ${htmlFile}`);
  console.log(`Texto salvo em ${textFile}`);
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
