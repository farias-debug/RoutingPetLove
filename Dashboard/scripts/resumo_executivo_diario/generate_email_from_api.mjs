import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPayloadFromApi } from "./build_payload_from_api.mjs";
import { renderEmailHtml, renderEmailText } from "./render_email.mjs";
import {
  defaultOutDir,
  ensureDir,
  parseArgs,
  writeJson,
  writeText,
} from "./shared.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.outdir ? path.resolve(args.outdir) : defaultOutDir;
  await ensureDir(outDir);

  const payload = await buildPayloadFromApi({
    baseUrl: args["base-url"] || "http://localhost:3001",
    filters: {
      periodo: args.periodo,
      filial: args.filial,
      transportador: args.transportador,
      tipoVeiculo: args.tipoVeiculo,
      status: args.status,
    },
  });

  const payloadFile = path.join(outDir, "payload.api.json");
  const htmlFile = path.join(outDir, "resumo_executivo_diario.html");
  const textFile = path.join(outDir, "resumo_executivo_diario.txt");

  await writeJson(payloadFile, payload);
  await writeText(htmlFile, renderEmailHtml(payload));
  await writeText(textFile, renderEmailText(payload));

  console.log(`Payload gerado em ${payloadFile}`);
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
