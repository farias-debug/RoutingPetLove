import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ENTRY_URL = "https://petlove.tmslog.com.br/index.aspx?url=Adm_Monitoramento_cargasAtivas.aspx";
const MONITOR_URL = "https://petlove.tmslog.com.br/Adm_Monitoramento_cargasAtivas.aspx";
const DEFAULT_DEST_DIR =
  "C:\\Users\\lucas.batista\\Documents\\Projetos\\Dashboard\\data\\Relatorio_Monitoramento_Carga";

const SEL_USER = [
  "#email",
  "input[name='usuario']",
  "input[name='email']",
  "input[type='email']",
  "input[placeholder*='Login']",
  "input[placeholder*='E-mail']",
];

const SEL_PASS = [
  "#password",
  "input[name='senha']",
  "input[type='password']",
];

const SEL_ENTER = [
  "button:has-text('Entrar')",
  "input[value='Entrar']",
  "button[type='submit']",
];

const SEL_DATA_INICIO = [
  "input[name='dataini']",
  "#dataini",
  "xpath=(//label[contains(normalize-space(.), 'Data de Carregamento')]/following::input[1])[1]",
  "input[name='data_inicio']",
  "input[id*='data_inicio']",
  "input[id*='DataInicial']",
];

const SEL_DATA_FIM = [
  "input[name='datafim']",
  "#datafim",
  "xpath=(//label[contains(normalize-space(.), 'Até')]/following::input[1])[1]",
  "xpath=(//label[contains(normalize-space(.), 'Ate')]/following::input[1])[1]",
  "input[name='data_fim']",
  "input[id*='data_fim']",
  "input[id*='DataFinal']",
];

const SEL_PESQUISAR = [
  "button:has-text('Pesquisar')",
  "a:has-text('Pesquisar')",
  "input[value='Pesquisar']",
];

const SEL_BOTAO_DOWNLOAD = [
  "#spinnerd",
  "button:has-text('Download')",
  "a:has-text('Download')",
  "input[value='Download']",
];

const SEL_TOGGLE_PAINEL = [
  "#iconform",
  "[onclick*='liberarform']",
  "xpath=(//input[contains(@placeholder,'Pesquisar')]/following::button[1])[1]",
  "xpath=(//h4[contains(normalize-space(.),'Monitoramento de Rotas')]/following::button[1])[1]",
  "xpath=(//h4[contains(normalize-space(.),'Monitoramento de Rotas')]/following::a[1])[1]",
  "button:has(i.fe-download)",
  "a:has(i.fe-download)",
  "button:has(i.mdi-download)",
  "a:has(i.mdi-download)",
  "i.fe-download",
  "i.mdi-download",
];

function printHelp() {
  const msg = `
Uso:
  node extrair_relatorio_tms.mjs [opcoes]

Fluxo:
  1) Abre ${ENTRY_URL}
  2) Clica em "Entrar" (se tela de login aparecer)
  3) Abre Monitoramento de Rotas
  4) Preenche Data inicial = hoje e Data final = hoje + N dias
  5) Clica em "Pesquisar"
  6) Clica no toggle (quando necessario)
  7) Clica em "Download"
  8) Salva CSV com timestamp no destino final

Opcoes:
  --days-ahead <int>      Dias para data final (padrao: 15)
  --start YYYY-MM-DD      Sobrescreve data inicial
  --end YYYY-MM-DD        Sobrescreve data final
  --dest-dir <path>       Destino final do CSV
  --timeout-ms <int>      Timeout de operacoes (padrao: 120000)
  --headed                Abre browser visivel
  --dry-run               Executa ate "Pesquisar", sem download
  --help                  Mostra esta ajuda

Credenciais:
  TMS_USER / TMS_PASS (variaveis de ambiente)
`;
  process.stdout.write(msg);
}

function parseArgs(argv) {
  const out = {
    daysAhead: 15,
    start: "",
    end: "",
    destDir: DEFAULT_DEST_DIR,
    timeoutMs: 120000,
    headed: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--headed") out.headed = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--days-ahead") out.daysAhead = Number(argv[++i]);
    else if (a === "--start") out.start = argv[++i];
    else if (a === "--end") out.end = argv[++i];
    else if (a === "--dest-dir") out.destDir = argv[++i];
    else if (a === "--timeout-ms") out.timeoutMs = Number(argv[++i]);
    else throw new Error(`Argumento nao reconhecido: ${a}`);
  }

  return out;
}

function assertIsoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} invalido: use YYYY-MM-DD`);
  }
}

function toIsoDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
}

function toBrDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function timestampTag() {
  const dt = new Date();
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function firstVisible(page, selectors, timeoutMs = 5000) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      await loc.waitFor({ state: "visible", timeout: timeoutMs });
      return { selector: sel, locator: loc };
    } catch {
      // tenta o proximo seletor
    }
  }
  return null;
}

async function clickFirst(page, selectors, timeoutMs = 5000, force = false) {
  const found = await firstVisible(page, selectors, timeoutMs);
  if (!found) {
    throw new Error(`Nao encontrou elemento clicavel. Selectors=${selectors.join(" || ")}`);
  }
  await found.locator.click({ force });
  return found.selector;
}

async function fillFirst(page, selectors, value, timeoutMs = 5000) {
  const found = await firstVisible(page, selectors, timeoutMs);
  if (!found) {
    throw new Error(`Nao encontrou campo para preencher. Selectors=${selectors.join(" || ")}`);
  }
  await found.locator.click({ force: true });
  await found.locator.fill("");
  await found.locator.type(value, { delay: 20 });
  await found.locator.dispatchEvent("input").catch(() => {});
  await found.locator.dispatchEvent("change").catch(() => {});
  return found.selector;
}

async function fillDateSmart(page, selectors, isoValue, brValue, timeoutMs = 5000) {
  const found = await firstVisible(page, selectors, timeoutMs);
  if (!found) {
    throw new Error(`Nao encontrou campo de data. Selectors=${selectors.join(" || ")}`);
  }

  const inputType = ((await found.locator.getAttribute("type")) || "").toLowerCase();
  await found.locator.click({ force: true });
  await found.locator.fill("");

  if (inputType === "date") {
    await found.locator.fill(isoValue);
  } else {
    await found.locator.type(brValue, { delay: 20 });
  }

  await found.locator.dispatchEvent("input").catch(() => {});
  await found.locator.dispatchEvent("change").catch(() => {});
  return found.selector;
}

async function maybeLogin(page, user, pass) {
  const loginField = await firstVisible(page, SEL_USER, 4000);
  if (!loginField) {
    return false;
  }

  await fillFirst(page, SEL_USER, user, 8000);
  await fillFirst(page, SEL_PASS, pass, 8000);
  await clickFirst(page, SEL_ENTER, 8000, true);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(2000);
  return true;
}

async function ensurePainelAberto(page) {
  const inicioField = await firstVisible(page, SEL_DATA_INICIO, 3000);
  if (inicioField) {
    return;
  }

  await clickFirst(page, SEL_TOGGLE_PAINEL, 8000, true);
  await page.waitForTimeout(1200);
}

async function tentarExpandirViaJs(page) {
  await page.evaluate(() => {
    const iconForm = document.querySelector("#iconform");
    const iconCarga = document.querySelector("#iconcargaform");
    if (typeof window.liberarform === "function") {
      window.liberarform();
    }
    if (iconForm) {
      iconForm.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      try {
        iconForm.click();
      } catch {
        // noop
      }
    }
    if (iconCarga) {
      iconCarga.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      try {
        iconCarga.click();
      } catch {
        // noop
      }
    }
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const user = process.env.TMS_USER ?? "";
  const pass = process.env.TMS_PASS ?? "";
  if (!user || !pass) {
    throw new Error("Defina TMS_USER e TMS_PASS nas variaveis de ambiente.");
  }

  const todayIso = toIsoDate(new Date());
  const startIso = args.start || todayIso;
  const endIso = args.end || addDays(todayIso, args.daysAhead);
  assertIsoDate(startIso, "start");
  assertIsoDate(endIso, "end");

  const startBr = toBrDate(startIso);
  const endBr = toBrDate(endIso);

  const destDir = path.resolve(process.cwd(), args.destDir);
  const runScreensDir = path.resolve(process.cwd(), "downloads");
  await ensureDir(destDir);
  await ensureDir(runScreensDir);

  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(args.timeoutMs);

  let savedPath = "";

  try {
    await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
    await maybeLogin(page, user, pass);

    await page.goto(MONITOR_URL, { waitUntil: "domcontentloaded" });
    await maybeLogin(page, user, pass);
    await page.waitForTimeout(2000);

    await ensurePainelAberto(page);
    await fillDateSmart(page, SEL_DATA_INICIO, startIso, startBr, 12000);
    await fillDateSmart(page, SEL_DATA_FIM, endIso, endBr, 12000);
    await clickFirst(page, SEL_PESQUISAR, 12000, true);
    await page.waitForTimeout(3500);

    if (args.dryRun) {
      const shot = path.join(runScreensDir, `dry_run_monitoramento_${timestampTag()}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            mode: "dry-run",
            screenshot: shot,
            periodo: { inicio: startIso, fim: endIso },
            url: page.url(),
          },
          null,
          2
        ) + "\n"
      );
      return;
    }

    let botaoDownload = await firstVisible(page, SEL_BOTAO_DOWNLOAD, 15000);
    if (!botaoDownload) {
      try {
        await clickFirst(page, SEL_TOGGLE_PAINEL, 8000, true);
      } catch {
        await tentarExpandirViaJs(page);
      }
      await page.waitForTimeout(2000);
      botaoDownload = await firstVisible(page, SEL_BOTAO_DOWNLOAD, 12000);
    }

    if (!botaoDownload) {
      await tentarExpandirViaJs(page);
      await page.waitForTimeout(2000);
      botaoDownload = await firstVisible(page, SEL_BOTAO_DOWNLOAD, 12000);
    }

    if (!botaoDownload) {
      throw new Error("Botao Download nao encontrado apos pesquisa.");
    }

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: args.timeoutMs }),
      botaoDownload.locator.click({ force: true }),
    ]);

    const finalName = `Relatorio_Monitoramento_Carga_${timestampTag()}.csv`;
    savedPath = path.join(destDir, finalName);
    await download.saveAs(savedPath);

    const okShot = path.join(runScreensDir, `ok_monitoramento_${timestampTag()}.png`);
    await page.screenshot({ path: okShot, fullPage: true });

    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          file: savedPath,
          screenshot: okShot,
          periodo: { inicio: startIso, fim: endIso },
          url: page.url(),
        },
        null,
        2
      ) + "\n"
    );
  } catch (err) {
    const errShot = path.join(runScreensDir, `erro_monitoramento_${timestampTag()}.png`);
    const errHtml = path.join(runScreensDir, `erro_monitoramento_${timestampTag()}.html`);
    try {
      await page.screenshot({ path: errShot, fullPage: true });
    } catch {
      // ignora falha secundaria de screenshot
    }
    try {
      const html = await page.content();
      await fs.writeFile(errHtml, html, "utf-8");
    } catch {
      // ignora falha secundaria de dump de html
    }
    throw new Error(
      `${err.message}${savedPath ? ` | arquivo_parcial=${savedPath}` : ""} | screenshot=${errShot} | html=${errHtml}`
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  process.stderr.write(`ERRO: ${err.message}\n`);
  process.exit(1);
});
