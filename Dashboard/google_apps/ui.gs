function abrirSidebarMonitoramento() {
  panelEnsureConfigReady_();

  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Monitoramento')
    .setWidth(340);

  SpreadsheetApp.getUi().showSidebar(html);
}

function panelGetSidebarState_() {
  panelEnsureConfigReady_();

  const ss = panelGetSpreadsheet_();
  const sources = panelLoadSources_();
  const lists = panelBuildValidationLists_(sources);
  const config = panelReadConfig_(ss, sources, lists);

  return {
    config: {
      dataInicial: config.dataInicial ? Utilities.formatDate(config.dataInicial, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      dataFinal: config.dataFinal ? Utilities.formatDate(config.dataFinal, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      granularidade: config.granularidade,
      filial: config.filial,
      transportadora: config.transportadora,
      tipoVeiculo: config.tipoVeiculo,
      status: config.status,
      modoComparacao: config.modoComparacao
    },
    lists: {
      filiais: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaFilial),
      transportadoras: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaTransportadora),
      tiposVeiculo: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaTipoVeiculo),
      statuses: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaStatus),
      granularidades: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaGranularidade),
      modosComparacao: panelReadNamedRangeValues_(ss, PANEL_NAMED_RANGES.listaModoComparacao)
    },
    ultimaAtualizacao: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.ultimaAtualizacao),
    sheets: {
      gerencial: PANEL_SHEETS.gerencial,
      operacional: PANEL_SHEETS.operacional,
      drilldown: PANEL_SHEETS.drilldown
    }
  };
}

function panelSalvarFiltrosSidebar_(payload) {
  panelEnsureConfigReady_();

  const ss = panelGetSpreadsheet_();
  const updates = [
    { name: PANEL_NAMED_RANGES.dataInicial, value: payload.dataInicial ? new Date(payload.dataInicial) : '' },
    { name: PANEL_NAMED_RANGES.dataFinal, value: payload.dataFinal ? new Date(payload.dataFinal) : '' },
    { name: PANEL_NAMED_RANGES.granularidade, value: payload.granularidade || PANEL_DEFAULTS.granularidade },
    { name: PANEL_NAMED_RANGES.filial, value: payload.filial || PANEL_DEFAULTS.allValue },
    { name: PANEL_NAMED_RANGES.transportadora, value: payload.transportadora || PANEL_DEFAULTS.allValue },
    { name: PANEL_NAMED_RANGES.tipoVeiculo, value: payload.tipoVeiculo || PANEL_DEFAULTS.allValue },
    { name: PANEL_NAMED_RANGES.status, value: payload.status || PANEL_DEFAULTS.allValue },
    { name: PANEL_NAMED_RANGES.modoComparacao, value: payload.modoComparacao || PANEL_DEFAULTS.modoComparacao }
  ];

  updates.forEach(item => {
    const namedRange = panelGetNamedRange_(ss, item.name);
    if (!namedRange) return;
    namedRange.getRange().setValue(item.value);
  });

  return reconstruirPaineisMonitoramento();
}

function panelAcaoSidebar_(actionName) {
  if (actionName === 'atualizar_tudo') return atualizarTudoMonitoramento();
  if (actionName === 'reconstruir') return reconstruirPaineisMonitoramento();
  if (actionName === 'resetar') return resetarFiltrosPainel();
  return null;
}

function panelAbrirDrilldownRapido_(payload) {
  panelEnsureConfigReady_();

  const ss = panelGetSpreadsheet_();
  if (payload && payload.tipo === 'filial') {
    const range = panelGetNamedRange_(ss, PANEL_NAMED_RANGES.filial);
    if (range) range.getRange().setValue(payload.valor || PANEL_DEFAULTS.allValue);
  }
  if (payload && payload.tipo === 'transportadora') {
    const range = panelGetNamedRange_(ss, PANEL_NAMED_RANGES.transportadora);
    if (range) range.getRange().setValue(payload.valor || PANEL_DEFAULTS.allValue);
  }
  if (payload && payload.tipo === 'tipo_veiculo') {
    const range = panelGetNamedRange_(ss, PANEL_NAMED_RANGES.tipoVeiculo);
    if (range) range.getRange().setValue(payload.valor || PANEL_DEFAULTS.allValue);
  }
  if (payload && payload.tipo === 'excecoes') {
    const range = panelGetNamedRange_(ss, PANEL_NAMED_RANGES.status);
    if (range) range.getRange().setValue(PANEL_DEFAULTS.allValue);
  }

  reconstruirPaineisMonitoramento();
  ss.setActiveSheet(ss.getSheetByName(PANEL_SHEETS.drilldown));
  return true;
}

function panelIrParaAba_(sheetName) {
  const ss = panelGetSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) ss.setActiveSheet(sheet);
  return true;
}

function panelReadNamedRangeValues_(ss, rangeName) {
  const namedRange = panelGetNamedRange_(ss, rangeName);
  if (!namedRange) return [];
  return namedRange.getRange().getValues().flat().filter(Boolean);
}

function panelEnsureConfigReady_() {
  const ss = panelGetSpreadsheet_();
  if (panelGetNamedRange_(ss, PANEL_NAMED_RANGES.dataInicial)) return;

  const sources = panelLoadSources_();
  const lists = panelBuildValidationLists_(sources);
  criarOuAtualizarListasValidacao_(ss, lists);
  criarOuAtualizarConfigPainel_(ss, sources, lists);
}
