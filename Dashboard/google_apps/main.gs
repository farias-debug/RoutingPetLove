function atualizarTudoMonitoramento() {
  return panelRunMonitoredAction_('Atualizar Tudo', () => {
    atualizarModeloMonitoramento();
    return panelRebuildCore_();
  });
}

function reconstruirPaineisMonitoramento() {
  return panelRunMonitoredAction_('Reconstruir Painéis', () => panelRebuildCore_());
}

function resetarFiltrosPainel() {
  return panelRunMonitoredAction_('Resetar Filtros', () => {
    const ss = panelGetSpreadsheet_();
    const sources = panelLoadSources_();
    const lists = panelBuildValidationLists_(sources);

    criarOuAtualizarListasValidacao_(ss, lists);
    criarOuAtualizarConfigPainel_(ss, sources, lists);
    panelApplyDefaultConfigValues_(ss, lists);

    return panelRebuildCore_(sources, lists);
  });
}

function panelRebuildCore_(loadedSources, loadedLists) {
  const ss = panelGetSpreadsheet_();
  panelTraceStep_('rebuild_core', 'inicio');
  if (typeof panelEnsureSpreadsheetLocalePtBr_ === 'function') {
    panelEnsureSpreadsheetLocalePtBr_(ss);
  }
  panelTraceStep_('rebuild_core', 'locale_ok');
  const sources = loadedSources || panelLoadSources_();
  panelTraceStep_('rebuild_core', 'sources_ok');
  const lists = loadedLists || panelBuildValidationLists_(sources);
  panelTraceStep_('rebuild_core', 'lists_ok');

  const shouldRefreshLists = PANEL_FEATURES.refreshValidationInfrastructureOnRebuild ||
    panelNeedsValidationInfrastructure_(ss);
  if (shouldRefreshLists) {
    panelTraceStep_('rebuild_core', 'refresh_lists_inicio');
    criarOuAtualizarListasValidacao_(ss, lists);
    panelTraceStep_('rebuild_core', 'refresh_lists_ok');
  }

  const shouldRefreshConfig = PANEL_FEATURES.refreshConfigInfrastructureOnRebuild ||
    panelNeedsConfigInfrastructure_(ss);
  if (shouldRefreshConfig) {
    panelTraceStep_('rebuild_core', 'refresh_config_inicio');
    criarOuAtualizarConfigPainel_(ss, sources, lists);
    panelTraceStep_('rebuild_core', 'refresh_config_ok');
  }

  const config = panelReadConfig_(ss, sources, lists);
  panelTraceStep_('rebuild_core', 'config_ok');
  const cacheBundle = criarOuAtualizarCachePainel_(ss, sources, config);
  panelTraceStep_('rebuild_core', 'cache_ok');
  const auxSections = PANEL_FEATURES.enableCharts
    ? criarOuAtualizarPivotsAuxiliares_(ss, cacheBundle, config)
    : {};
  panelTraceStep_('rebuild_core', 'aux_ok');

  criarOuAtualizarPainelGerencial_(ss, cacheBundle, auxSections, config);
  panelTraceStep_('rebuild_core', 'gerencial_ok');
  criarOuAtualizarPainelOperacional_(ss, cacheBundle, auxSections, config);
  panelTraceStep_('rebuild_core', 'operacional_ok');
  criarOuAtualizarDrilldownAnalitico_(ss, cacheBundle, auxSections, config);
  panelTraceStep_('rebuild_core', 'drilldown_ok');

  panelTechnicalSheetNames_().forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) sheet.hideSheet();
  });

  panelUpdateConfigTimestamp_(ss, new Date());
  SpreadsheetApp.flush();
  panelTraceStep_('rebuild_core', 'fim');

  return {
    registrosBase: cacheBundle.filteredBase.length,
    granularidade: config.granularidade,
    filtros: config
  };
}

function panelTraceStep_(actionName, detail) {
  try {
    const now = new Date();
    panelAppendLog_(actionName, 'ETAPA', now, now, detail || '');
  } catch (error) {
    Logger.log('Falha ao registrar etapa "' + actionName + '": ' + error.message);
  }
}

function panelApplyDefaultConfigValues_(ss, lists) {
  const defaults = panelResolveConfigDefaults_({}, lists);
  panelPersistConfigValues_(ss, defaults);
}

function panelPersistConfigValues_(ss, config) {
  const updates = [
    { name: PANEL_NAMED_RANGES.dataInicial, value: config.dataInicial, format: 'dd/mm/yyyy' },
    { name: PANEL_NAMED_RANGES.dataFinal, value: config.dataFinal, format: 'dd/mm/yyyy' },
    { name: PANEL_NAMED_RANGES.granularidade, value: config.granularidade },
    { name: PANEL_NAMED_RANGES.filial, value: config.filial },
    { name: PANEL_NAMED_RANGES.transportadora, value: config.transportadora },
    { name: PANEL_NAMED_RANGES.tipoVeiculo, value: config.tipoVeiculo },
    { name: PANEL_NAMED_RANGES.status, value: config.status },
    { name: PANEL_NAMED_RANGES.modoComparacao, value: config.modoComparacao }
  ];

  updates.forEach(item => {
    const namedRange = panelGetNamedRange_(ss, item.name);
    if (!namedRange) return;
    namedRange.getRange().setValue(item.value);
    if (item.format) namedRange.getRange().setNumberFormat(item.format);
  });
}

function panelRunMonitoredAction_(actionName, fn) {
  const start = new Date();
  try {
    const result = fn();
    panelTryAppendLog_(actionName, 'SUCESSO', start, new Date(), '');
    panelSafeToast_(actionName + ' concluído com sucesso.', 'Monitoramento', 5);
    return result;
  } catch (error) {
    panelTryAppendLog_(actionName, 'ERRO', start, new Date(), error.message);
    panelSafeToast_(actionName + ' falhou: ' + error.message, 'Monitoramento', 10);
    throw error;
  }
}

function panelTryAppendLog_(actionName, status, start, end, detail) {
  try {
    panelAppendLog_(actionName, status, start, end, detail);
  } catch (logError) {
    Logger.log('Falha ao registrar log de "' + actionName + '": ' + logError.message);
  }
}

function panelSafeToast_(message, title, timeoutSeconds) {
  try {
    SpreadsheetApp.getActive().toast(message, title, timeoutSeconds);
  } catch (toastError) {
    Logger.log('Falha ao exibir toast: ' + toastError.message);
  }
}

function panelEnsureLogSheet_() {
  const ss = panelGetSpreadsheet_();
  const sheet = panelGetOrCreateSheet_(ss, PANEL_SHEETS.log);
  if (sheet.getLastRow() === 0 || !sheet.getRange(1, 1).getValue()) {
    sheet.getRange(1, 1, 1, 5).setValues([['Início', 'Fim', 'Duração (s)', 'Ação', 'Status / Erro']]);
    sheet.setFrozenRows(1);
    panelSetDefaultColumns_(sheet, [160, 160, 120, 180, 500]);
  }
  return sheet;
}

function panelAppendLog_(actionName, status, start, end, detail) {
  const sheet = panelEnsureLogSheet_();
  const duration = Math.round((end.getTime() - start.getTime()) / 1000);
  sheet.appendRow([start, end, duration, actionName, status + (detail ? ' | ' + detail : '')]);
  sheet.getRange(sheet.getLastRow(), 1, 1, 2).setNumberFormat('dd/mm/yyyy hh:mm:ss');
}
