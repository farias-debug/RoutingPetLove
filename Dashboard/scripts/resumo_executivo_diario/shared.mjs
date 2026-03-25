import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
export const scriptDir = path.dirname(scriptFile);
export const dashboardRoot = path.resolve(scriptDir, "..", "..");
export const workspaceRoot = path.resolve(dashboardRoot, "..");
export const defaultOutDir = path.resolve(workspaceRoot, "_tmp", "resumo_executivo_diario");

export function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (!name || process.env[name]) continue;
    process.env[name] = value;
  }
}

export async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}

export async function writeJson(filePath, payload) {
  await writeText(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function buildQuery(params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function asNumber(value) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatDateBr(value) {
  if (!value) return "sem data";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatInteger(value) {
  const numeric = asNumber(value);
  if (numeric == null) return "n/d";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDecimal(value, fractionDigits = 1) {
  const numeric = asNumber(value);
  if (numeric == null) return "n/d";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
}

export function formatPercentFraction(value, fractionDigits = 1) {
  const numeric = asNumber(value);
  if (numeric == null) return "n/d";
  return `${formatDecimal(numeric * 100, fractionDigits)}%`;
}

export function formatCurrency(value) {
  const numeric = asNumber(value);
  if (numeric == null) return "n/d";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric).replace(/\u00A0/g, " ");
}

export function scoreTone(score) {
  const numeric = asNumber(score);
  if (numeric == null) return "neutral";
  if (numeric >= 70) return "success";
  if (numeric >= 55) return "warning";
  return "danger";
}

export function deliveryTone(rate) {
  const numeric = asNumber(rate);
  if (numeric == null) return "neutral";
  if (numeric >= 0.95) return "success";
  if (numeric >= 0.92) return "warning";
  return "danger";
}
