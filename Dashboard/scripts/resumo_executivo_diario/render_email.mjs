import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultOutDir,
  ensureDir,
  parseArgs,
  readJson,
  writeText,
} from "./shared.mjs";

const TONE_STYLES = {
  success: {
    bg: "#E9F8EE",
    text: "#1F7A43",
    border: "#B7E3C4",
  },
  warning: {
    bg: "#FFF4E5",
    text: "#9A5B00",
    border: "#FFD199",
  },
  danger: {
    bg: "#FDEBEC",
    text: "#B42318",
    border: "#F7B7B5",
  },
  neutral: {
    bg: "#F3F5F8",
    text: "#475467",
    border: "#D7DDE5",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function renderMetricGrid(items, columns = 2, compact = false) {
  const cellWidth = `${Math.floor(100 / columns)}%`;

  return chunk(items, columns)
    .map((row) => `
      <tr>
        ${row.map((item) => {
          const tone = TONE_STYLES[item.status] || TONE_STYLES.neutral;

          return `
            <td width="${cellWidth}" style="padding:8px; vertical-align:top;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${tone.border}; border-radius:${compact ? 18 : 20}px; background:${tone.bg};">
                <tr>
                  <td style="padding:${compact ? "16px" : "18px"};">
                    <div style="font-size:11px; line-height:16px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:${tone.text}; opacity:0.88;">${escapeHtml(item.label)}</div>
                    <div style="margin-top:10px; font-size:${compact ? "24px" : "28px"}; line-height:${compact ? "28px" : "32px"}; font-weight:900; color:#101828;">${escapeHtml(item.value)}</div>
                    ${item.deltaText ? `<div style="margin-top:10px; display:inline-block; padding:6px 10px; border-radius:999px; background:#FFFFFF; color:${tone.text}; font-size:11px; line-height:16px; font-weight:700;">${escapeHtml(item.deltaText)}</div>` : ""}
                    ${item.detail ? `<div style="margin-top:10px; font-size:12px; line-height:18px; color:#344054;">${escapeHtml(item.detail)}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          `;
        }).join("")}
        ${Array.from({ length: Math.max(0, columns - row.length) }).map(() => `<td width="${cellWidth}" style="padding:8px;"></td>`).join("")}
      </tr>
    `)
    .join("");
}

function renderRiskChips(items) {
  return items
    .map((item) => {
      const tone = TONE_STYLES[item.tone] || TONE_STYLES.neutral;
      return `
        <span style="display:inline-block; margin:0 8px 8px 0; padding:8px 12px; border-radius:999px; border:1px solid ${tone.border}; background:${tone.bg}; color:${tone.text}; font-size:12px; font-weight:800;">
          ${escapeHtml(item.label)}: ${escapeHtml(item.value)}
        </span>
      `;
    })
    .join("");
}

function renderLeaderboardRows(items) {
  if (!items?.length) {
    return `
      <tr>
        <td style="padding:16px 0; font-size:13px; line-height:20px; color:#667085;">
          Sem filiais suficientes para compor este ranking.
        </td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const tone = TONE_STYLES[item.tone] || TONE_STYLES.neutral;

      return `
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #EAECF0; vertical-align:top;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="44" style="vertical-align:top;">
                  <div style="width:32px; height:32px; border-radius:999px; background:${tone.bg}; border:1px solid ${tone.border}; color:${tone.text}; font-size:14px; line-height:32px; text-align:center; font-weight:800;">
                    ${escapeHtml(item.rank)}
                  </div>
                </td>
                <td style="vertical-align:top;">
                  <div style="font-size:14px; line-height:20px; font-weight:800; color:#101828;">${escapeHtml(item.filial)}</div>
                  <div style="margin-top:4px; font-size:12px; line-height:18px; color:#475467;">${escapeHtml(item.detail)}</div>
                  <div style="margin-top:2px; font-size:12px; line-height:18px; color:#667085;">${escapeHtml(item.supportingText)}</div>
                </td>
                <td width="84" style="vertical-align:top; text-align:right;">
                  <div style="font-size:22px; line-height:26px; font-weight:900; color:#101828;">${escapeHtml(item.value)}</div>
                  <div style="margin-top:4px; font-size:11px; line-height:16px; font-weight:800; text-transform:uppercase; color:${tone.text};">SPR</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderLeaderboard(payload) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding-right:8px; vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #CDEAD7; border-radius:20px; background:#F6FCF8;">
            <tr>
              <td style="padding:18px 18px 8px;">
                <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#1F7A43;">Melhores SPRs</div>
                <div style="margin-top:6px; font-size:13px; line-height:20px; color:#475467;">Filiais com maior densidade de volumes por rota.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${renderLeaderboardRows(payload.sprLeaderboard.best)}
                </table>
              </td>
            </tr>
          </table>
        </td>
        <td width="50%" style="padding-left:8px; vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #F2C9C7; border-radius:20px; background:#FFF7F7;">
            <tr>
              <td style="padding:18px 18px 8px;">
                <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#B42318;">Piores SPRs</div>
                <div style="margin-top:6px; font-size:13px; line-height:20px; color:#475467;">Filiais com menor densidade de volumes por rota.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${renderLeaderboardRows(payload.sprLeaderboard.worst)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailHtml(payload) {
  const northStarGrid = renderMetricGrid(payload.northStarKpis, 2, false);
  const routeGrid = renderMetricGrid(payload.routeSnapshot, 3, true);
  const riskChips = renderRiskChips(payload.riskChips);

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(payload.email.subject)}</title>
  </head>
  <body style="margin:0; padding:0; background:#EEF2F6; font-family:Arial, Helvetica, sans-serif; color:#101828;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHtml(payload.email.preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg, #E8EEF5 0%, #EEF2F6 100%);">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; background:#FFFFFF; border-radius:28px; overflow:hidden; border:1px solid #DCE3EA; box-shadow:0 20px 48px rgba(15, 36, 56, 0.08);">
            <tr>
              <td style="padding:28px 28px 18px; background:radial-gradient(circle at top right, rgba(247, 144, 9, 0.36), transparent 28%), linear-gradient(135deg, #10273D 0%, #124C63 52%, #16776F 100%); color:#FFFFFF;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top;">
                      <div style="font-size:12px; line-height:18px; letter-spacing:0.12em; text-transform:uppercase; font-weight:800; opacity:0.72;">Petlove | Monitoramento Logistico</div>
                      <div style="margin-top:12px; font-size:34px; line-height:38px; font-weight:900;">${escapeHtml(payload.title)}</div>
                      <div style="margin-top:8px; font-size:15px; line-height:22px; opacity:0.88;">${escapeHtml(payload.subtitle)}</div>
                      <div style="margin-top:14px; max-width:520px; font-size:15px; line-height:23px; opacity:0.9;">${escapeHtml(payload.email.intro)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:18px;">
                      <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.18); font-size:12px; line-height:18px; font-weight:800;">
                        ${escapeHtml(payload.email.comparisonLabel || "")}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px 6px;">
                <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#667085;">Pulso executivo</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  ${northStarGrid}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 20px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #DCE7F4; border-radius:24px; background:linear-gradient(180deg, #F8FBFF 0%, #F3F8FC 100%);">
                  <tr>
                    <td style="padding:18px 20px 10px;">
                      <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#475467;">Leitura operacional</div>
                      <div style="margin-top:6px; font-size:14px; line-height:22px; color:#344054;">Quantidade de rotas planejadas, em transito e concluidas contra o ultimo dia comparavel.</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 12px 12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        ${routeGrid}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 0;">
                <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#667085;">Radar de risco</div>
                <div style="margin-top:12px;">${riskChips}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0;">
                <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#667085;">${escapeHtml(payload.sprLeaderboard.title)}</div>
                <div style="margin-top:6px; font-size:14px; line-height:22px; color:#475467;">${escapeHtml(payload.sprLeaderboard.subtitle)}</div>
                <div style="margin-top:14px;">
                  ${renderLeaderboard(payload)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D6E6E7; border-radius:22px; background:linear-gradient(135deg, #F9FCFD 0%, #EFF7F7 100%);">
                  <tr>
                    <td style="padding:20px 20px 18px;">
                      <div style="font-size:12px; line-height:18px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#667085;">${escapeHtml(payload.focusOfDay.title)}</div>
                      <div style="margin-top:8px; font-size:26px; line-height:30px; font-weight:900; color:#101828;">${escapeHtml(payload.focusOfDay.entity)}</div>
                      <div style="margin-top:10px; font-size:14px; line-height:22px; color:#344054;">${escapeHtml(payload.focusOfDay.reason)}</div>
                      ${payload.focusOfDay.impact ? `<div style="margin-top:8px; font-size:13px; line-height:20px; color:#475467;">${escapeHtml(payload.focusOfDay.impact)}</div>` : ""}
                      <div style="margin-top:14px; padding:12px 14px; border-radius:16px; background:#FFFFFF; border:1px solid #D8E7E8; font-size:13px; line-height:20px; font-weight:800; color:#0F2438;">
                        Acao sugerida: ${escapeHtml(payload.focusOfDay.action)}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 12px;">
                <a href="${escapeHtml(payload.cta.url)}" style="display:inline-block; padding:15px 20px; border-radius:14px; background:#0F2438; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:800;">
                  ${escapeHtml(payload.cta.label)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px; font-size:12px; line-height:18px; color:#667085;">
                ${escapeHtml(payload.email.footerNote || "")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export function renderEmailText(payload) {
  const lines = [
    payload.title,
    payload.subtitle,
    payload.email.comparisonLabel || "",
    "",
    payload.email.intro,
    "",
    "North star:",
    ...payload.northStarKpis.map((item) => `- ${item.label}: ${item.value}${item.deltaText ? ` | ${item.deltaText}` : ""}${item.detail ? ` | ${item.detail}` : ""}`),
    "",
    "Leitura operacional:",
    ...payload.routeSnapshot.map((item) => `- ${item.label}: ${item.value}${item.deltaText ? ` | ${item.deltaText}` : ""}${item.detail ? ` | ${item.detail}` : ""}`),
    "",
    "Radar de risco:",
    ...payload.riskChips.map((item) => `- ${item.label}: ${item.value}`),
    "",
    "Top 3 melhores SPRs:",
    ...payload.sprLeaderboard.best.map((item) => `- #${item.rank} ${item.filial}: ${item.value} | ${item.detail} | ${item.supportingText}`),
    "",
    "Top 3 piores SPRs:",
    ...payload.sprLeaderboard.worst.map((item) => `- #${item.rank} ${item.filial}: ${item.value} | ${item.detail} | ${item.supportingText}`),
    "",
    `${payload.focusOfDay.title}: ${payload.focusOfDay.entity}`,
    payload.focusOfDay.reason,
    payload.focusOfDay.impact ? payload.focusOfDay.impact : "",
    `Acao sugerida: ${payload.focusOfDay.action}`,
    "",
    `${payload.cta.label}: ${payload.cta.url}`,
  ].filter(Boolean);

  if (payload.email.footerNote) {
    lines.push("", payload.email.footerNote);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = args.input
    ? path.resolve(args.input)
    : args._[0]
      ? path.resolve(args._[0])
      : path.resolve(process.cwd(), "docs", "resumo_executivo_diario", "email_payload_exemplo.json");

  const payload = await readJson(inputFile);
  const outDir = args.outdir ? path.resolve(args.outdir) : defaultOutDir;
  await ensureDir(outDir);

  const htmlFile = path.join(outDir, "resumo_executivo_diario.html");
  const textFile = path.join(outDir, "resumo_executivo_diario.txt");

  await writeText(htmlFile, renderEmailHtml(payload));
  await writeText(textFile, renderEmailText(payload));

  console.log(`HTML gerado em ${htmlFile}`);
  console.log(`Texto gerado em ${textFile}`);
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
