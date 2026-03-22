/**
 * bq_sync.gs — Sincroniza todas as 13 views de publicação do BigQuery
 * para abas do Google Sheets.
 *
 * Pré-requisito: Ativar o serviço avançado "BigQuery API" (v2) no editor
 *   Apps Script → Serviços → BigQuery API → Adicionar.
 *
 * Uso:
 *   - Menu "Monitoramento" → "Sincronizar BigQuery"
 *   - Ou executar diretamente: sincronizarBigQuery()
 *   - Para agendar: criar trigger de tempo em sincronizarBigQuery()
 */

const BQ_PROJECT_ID = 'data-aileron-482822-d0';
const BQ_DATASET    = 'monitoramento_carga';

/**
 * Mapa view → nome da aba no Sheets.
 * Ordem define a sequência de sync (menor primeiro para feedback rápido).
 */
const BQ_VIEW_SHEET_MAP = [
  { view: 'metas_globais',              sheet: 'metas_globais' },
  { view: 'dim_filial_tratada',         sheet: 'dim_filial_tratada' },
  { view: 'kpi_card_latest',            sheet: 'kpi_card_latest' },
  { view: 'kpi_resumo_diario',          sheet: 'kpi_resumo_diario' },
  { view: 'kpi_filial_dia',             sheet: 'kpi_filial_dia' },
  { view: 'kpi_transportador_dia',      sheet: 'kpi_transportador_dia' },
  { view: 'alertas_rotas',              sheet: 'alertas_rotas' },
  { view: 'drill_rotas',                sheet: 'drill_rotas' },
  { view: 'Resumo_Filial',              sheet: 'Resumo_Filial' },
  { view: 'Resumo_Ocupacao_Veic_Transp', sheet: 'Resumo_Ocupacao_Veic_Transp' },
  { view: 'VW_Base_Execucao',           sheet: 'VW_Base_Execucao' },
  { view: 'Resumo_Semana_Filial_Diario', sheet: 'Resumo_Semana_Filial_Diario' },
  { view: 'Resumo_Semana_Filial_Matriz', sheet: 'Resumo_Semana_Filial_Matriz' }
];

// ---------- Menu ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Monitoramento')
    .addItem('Sincronizar BigQuery', 'sincronizarBigQuery')
    .addItem('Sincronizar BigQuery (view única)…', 'sincronizarViewUnica')
    .addSeparator()
    .addItem('Reconstruir Painéis', 'reconstruirPaineisMonitoramento')
    .addItem('Atualizar Tudo (BQ + Painéis)', 'atualizarTudoComBQ')
    .addToUi();
}

// ---------- Entrypoints ----------

/**
 * Sincroniza TODAS as 13 views do BQ → abas do Sheets.
 */
function sincronizarBigQuery() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const start = new Date();

  ss.toast('Iniciando sincronização de ' + BQ_VIEW_SHEET_MAP.length + ' views…', 'BigQuery Sync', -1);

  const results = [];
  for (const entry of BQ_VIEW_SHEET_MAP) {
    try {
      const count = syncOneView_(ss, entry.view, entry.sheet);
      results.push({ view: entry.view, rows: count, ok: true });
      ss.toast(entry.sheet + ': ' + count + ' linhas', 'BigQuery Sync', 3);
    } catch (e) {
      results.push({ view: entry.view, rows: 0, ok: false, error: e.message });
      Logger.log('ERRO em ' + entry.view + ': ' + e.message);
    }
  }

  const elapsed = Math.round((new Date() - start) / 1000);
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;

  const summary = okCount + '/' + BQ_VIEW_SHEET_MAP.length + ' views sincronizadas em ' + elapsed + 's'
    + (failCount > 0 ? ' (' + failCount + ' falhas)' : '');

  ss.toast(summary, 'BigQuery Sync', 10);
  Logger.log('=== BQ SYNC RESULT ===');
  results.forEach(r => {
    Logger.log((r.ok ? 'OK' : 'FAIL') + ' | ' + r.view + ' | ' + r.rows + ' rows' + (r.error ? ' | ' + r.error : ''));
  });

  logSync_(ss, start, new Date(), summary);
  return results;
}

/**
 * Sincroniza UMA view escolhida pelo usuário via prompt.
 */
function sincronizarViewUnica() {
  const ui = SpreadsheetApp.getUi();
  const names = BQ_VIEW_SHEET_MAP.map((e, i) => (i + 1) + '. ' + e.view).join('\n');
  const resp = ui.prompt('Sincronizar View', 'Escolha o número:\n' + names, ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const idx = parseInt(resp.getResponseText(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= BQ_VIEW_SHEET_MAP.length) {
    ui.alert('Número inválido.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entry = BQ_VIEW_SHEET_MAP[idx];
  ss.toast('Sincronizando ' + entry.view + '…', 'BigQuery Sync', -1);

  try {
    const count = syncOneView_(ss, entry.view, entry.sheet);
    ss.toast(entry.sheet + ': ' + count + ' linhas', 'BigQuery Sync', 5);
  } catch (e) {
    ss.toast('Erro: ' + e.message, 'BigQuery Sync', 10);
  }
}

/**
 * Pipeline completo: BQ sync + reconstruir painéis.
 */
function atualizarTudoComBQ() {
  sincronizarBigQuery();
  if (typeof reconstruirPaineisMonitoramento === 'function') {
    reconstruirPaineisMonitoramento();
  }
}

// ---------- Core sync ----------

/**
 * Executa a query da view no BigQuery e grava resultado na aba do Sheets.
 * @param {Spreadsheet} ss
 * @param {string} viewName - nome da view no BQ
 * @param {string} sheetName - nome da aba destino
 * @returns {number} quantidade de linhas de dados gravadas
 */
function syncOneView_(ss, viewName, sheetName) {
  const fqn = '`' + BQ_PROJECT_ID + '.' + BQ_DATASET + '.' + viewName + '`';
  const sql = 'SELECT * FROM ' + fqn;

  const { headers, rows } = runBQQuery_(sql);

  const sheet = getOrCreateSheet_(ss, sheetName);
  sheet.clear();

  if (headers.length === 0) {
    sheet.getRange(1, 1).setValue('(sem dados)');
    return 0;
  }

  // Headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Data (em batches de 10k para evitar timeout)
  if (rows.length > 0) {
    const BATCH = 10000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, Math.min(i + BATCH, rows.length));
      sheet.getRange(2 + i, 1, batch.length, headers.length).setValues(batch);
    }
  }

  // Freeze header row
  sheet.setFrozenRows(1);

  // Auto-format header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#F3F4F6');

  return rows.length;
}

// ---------- BigQuery helpers ----------

/**
 * Executa uma query no BigQuery e retorna { headers, rows }.
 * Lida com paginação automática (pageToken).
 */
function runBQQuery_(sql) {
  const request = {
    query: sql,
    useLegacySql: false,
    maxResults: 10000
  };

  let queryResults = BigQuery.Jobs.query(request, BQ_PROJECT_ID);
  const jobId = queryResults.jobReference.jobId;

  // Aguardar conclusão se necessário
  let sleepMs = 500;
  while (!queryResults.jobComplete) {
    Utilities.sleep(sleepMs);
    sleepMs = Math.min(sleepMs * 2, 5000);
    queryResults = BigQuery.Jobs.getQueryResults(BQ_PROJECT_ID, jobId, { maxResults: 10000 });
  }

  // Headers do schema
  const schema = queryResults.schema;
  if (!schema || !schema.fields) {
    return { headers: [], rows: [] };
  }
  const headers = schema.fields.map(f => f.name);

  // Coletar todas as páginas de rows
  const allRows = [];
  let page = queryResults;

  while (true) {
    if (page.rows) {
      for (const row of page.rows) {
        allRows.push(row.f.map((cell, idx) => castCell_(cell.v, schema.fields[idx])));
      }
    }
    if (!page.pageToken) break;
    page = BigQuery.Jobs.getQueryResults(BQ_PROJECT_ID, jobId, {
      pageToken: page.pageToken,
      maxResults: 10000
    });
  }

  return { headers, rows: allRows };
}

/**
 * Converte o valor retornado pelo BigQuery para tipo nativo do Sheets.
 */
function castCell_(value, field) {
  if (value === null || value === undefined) return '';

  switch (field.type) {
    case 'INTEGER':
    case 'INT64':
      return parseInt(value, 10);

    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
    case 'BIGNUMERIC':
      return parseFloat(value);

    case 'BOOLEAN':
    case 'BOOL':
      return value === 'true' || value === true;

    case 'DATE':
      // BQ retorna 'YYYY-MM-DD'
      return new Date(value + 'T00:00:00');

    case 'DATETIME':
    case 'TIMESTAMP':
      return new Date(value.replace(' ', 'T'));

    default:
      return value;
  }
}

// ---------- Sheet helpers ----------

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function logSync_(ss, start, end, detail) {
  try {
    let logSheet = ss.getSheetByName('_LOG_MONITORAMENTO');
    if (!logSheet) {
      logSheet = ss.insertSheet('_LOG_MONITORAMENTO');
      logSheet.getRange(1, 1, 1, 5).setValues([['Início', 'Fim', 'Duração (s)', 'Ação', 'Status / Erro']]);
      logSheet.setFrozenRows(1);
    }
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    logSheet.appendRow([start, end, duration, 'BQ Sync', 'SUCESSO | ' + detail]);
    logSheet.getRange(logSheet.getLastRow(), 1, 1, 2).setNumberFormat('dd/mm/yyyy hh:mm:ss');
  } catch (e) {
    Logger.log('Falha ao registrar log: ' + e.message);
  }
}
