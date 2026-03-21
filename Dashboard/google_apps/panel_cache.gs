function panelLoadSources_() {
  const ss = panelGetSpreadsheet_();
  const baseSheet = ss.getSheetByName(PANEL_SOURCE_SHEETS.base);
  const diarioSheet = ss.getSheetByName(PANEL_SOURCE_SHEETS.diario);
  const ocupacaoSheet = ss.getSheetByName(PANEL_SOURCE_SHEETS.ocupacao);

  if (!baseSheet || !diarioSheet || !ocupacaoSheet) {
    throw new Error('As abas canônicas principais não foram encontradas. Publique VW_Base_Execucao, Resumo_Semana_Filial_Diario e Resumo_Ocupacao_Veic_Transp antes de reconstruir os painéis.');
  }

  return {
    base: panelLoadSheetObjects_(baseSheet),
    diario: panelLoadSheetObjects_(diarioSheet),
    ocupacao: panelLoadSheetObjects_(ocupacaoSheet),
    support: panelLoadSupportSources_(ss)
  };
}

function panelLoadSupportSources_(ss) {
  return {
    resumoFilial: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.resumoFilial),
    drillRotas: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.drillRotas),
    alertasRotas: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.alertasRotas),
    kpiResumoDiario: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.kpiResumoDiario),
    kpiFilialDia: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.kpiFilialDia),
    kpiTransportadorDia: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.kpiTransportadorDia),
    kpiCardLatest: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.kpiCardLatest),
    metasGlobais: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.metasGlobais),
    dimFilialTratada: panelLoadOptionalSheetObjects_(ss, PANEL_SUPPORT_SOURCE_SHEETS.dimFilialTratada)
  };
}

function panelLoadOptionalSheetObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  return sheet ? panelLoadSheetObjects_(sheet) : [];
}

function panelLoadSheetObjects_(sheet) {
  return getObjectsFromSheet_(sheet);
}

function panelNormalizeCanonicalObjectRows_(rows) {
  if (!rows || !rows.length) return [];

  const headers = Object.keys(rows[0]);
  const kindMap = {};
  headers.forEach(header => {
    kindMap[header] = panelInferColumnKind_(header);
  });

  return rows.map(row => {
    const normalized = {};
    headers.forEach(header => {
      const kind = kindMap[header];
      const value = row[header];
      normalized[header] = kind === 'text'
        ? value
        : panelParseCanonicalValueByKind_(value, kind);
    });
    return normalized;
  });
}

function panelBuildValidationLists_(sources) {
  const filiais = panelResolveFilialList_(sources);
  const fallbackFiliais = [];
  const transportadoras = [];
  const tipos = [];
  const statuses = [];
  let minDate = null;
  let maxDate = null;

  sources.base.forEach(row => {
    const date = startOfDay_(row['Data Planejada']);
    if (date) {
      minDate = !minDate || date < minDate ? date : minDate;
      maxDate = !maxDate || date > maxDate ? date : maxDate;
    }

    if (!filiais.length) {
      if (row['Nome Filial']) fallbackFiliais.push(String(row['Nome Filial']).trim());
      else if (row['Filial']) fallbackFiliais.push(String(row['Filial']).trim());
    }
    if (row['Transportador']) transportadoras.push(String(row['Transportador']).trim());
    if (row['Tipo de Veiculo Padrao']) tipos.push(String(row['Tipo de Veiculo Padrao']).trim());
    if (row['Status']) statuses.push(String(row['Status']).trim());
  });

  return {
    minDate: minDate,
    maxDate: maxDate,
    filiais: panelBuildFilterList_(filiais.length ? filiais : fallbackFiliais),
    transportadoras: panelBuildFilterList_(transportadoras),
    tiposVeiculo: panelBuildFilterList_(tipos),
    statuses: panelBuildFilterList_(statuses),
    granularidades: PANEL_FILTER_OPTIONS.granularidades.slice(),
    modosComparacao: PANEL_FILTER_OPTIONS.modosComparacao.slice()
  };
}

function panelResolveFilialList_(sources) {
  const supportRows = sources.support && sources.support.dimFilialTratada
    ? sources.support.dimFilialTratada
    : [];

  if (!supportRows.length) return [];

  return supportRows.map(row => row['Nome Filial'] || row['Filial']).filter(Boolean);
}

function panelBuildFilterList_(values) {
  const uniques = [...new Set(values.filter(Boolean).map(value => String(value).trim()))];
  uniques.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [PANEL_DEFAULTS.allValue].concat(uniques);
}

function criarOuAtualizarListasValidacao_(ss, lists) {
  const sheet = panelGetOrCreateSheet_(ss, PANEL_SHEETS.listas);
  panelClearManagedSheet_(sheet, { skipArtifactsCleanup: true });
  panelSetDefaultColumns_(sheet, [220, 220, 220, 220, 180, 220]);

  const columns = [
    { header: 'Filial', values: lists.filiais, rangeName: PANEL_NAMED_RANGES.listaFilial },
    { header: 'Transportadora', values: lists.transportadoras, rangeName: PANEL_NAMED_RANGES.listaTransportadora },
    { header: 'Tipo Veiculo', values: lists.tiposVeiculo, rangeName: PANEL_NAMED_RANGES.listaTipoVeiculo },
    { header: 'Status', values: lists.statuses, rangeName: PANEL_NAMED_RANGES.listaStatus },
    { header: 'Granularidade', values: lists.granularidades, rangeName: PANEL_NAMED_RANGES.listaGranularidade },
    { header: 'Modo Comparacao', values: lists.modosComparacao, rangeName: PANEL_NAMED_RANGES.listaModoComparacao }
  ];

  columns.forEach((column, index) => {
    sheet.getRange(1, index + 1).setValue(column.header).setFontWeight('bold').setBackground(PANEL_COLORS.surface);
    const rows = column.values.map(value => [value]);
    sheet.getRange(2, index + 1, rows.length, 1).setValues(rows);
    panelSetNamedRange_(ss, column.rangeName, sheet.getRange(2, index + 1, rows.length, 1));
  });

  sheet.hideSheet();
}

function panelCaptureCurrentConfigState_(ss) {
  return {
    dataInicial: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.dataInicial),
    dataFinal: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.dataFinal),
    granularidade: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.granularidade),
    filial: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.filial),
    transportadora: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.transportadora),
    tipoVeiculo: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.tipoVeiculo),
    status: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.status),
    modoComparacao: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.modoComparacao),
    ultimaAtualizacao: panelGetNamedCellValue_(ss, PANEL_NAMED_RANGES.ultimaAtualizacao)
  };
}

function criarOuAtualizarConfigPainel_(ss, sources, lists) {
  const currentState = panelCaptureCurrentConfigState_(ss);
  const sheet = panelGetOrCreateSheet_(ss, PANEL_SHEETS.config);
  const defaults = panelResolveConfigDefaults_(currentState, lists);

  panelClearManagedSheet_(sheet, { skipArtifactsCleanup: true });
  panelSetDefaultColumns_(sheet, [190, 190, 360]);
  panelWriteSheetTitle_(sheet, 'Configuração do Painel', 'Parâmetros autoritativos para a reconstrução visual do painel.');

  const rows = [
    ['Parâmetro', 'Valor', 'Descrição'],
    ['Data inicial', defaults.dataInicial, 'Limite inferior do painel.'],
    ['Data final', defaults.dataFinal, 'Limite superior do painel.'],
    ['Granularidade', defaults.granularidade, 'Controla séries e rankings da visão operacional.'],
    ['Filial', defaults.filial, 'Filtro global por filial.'],
    ['Transportadora', defaults.transportadora, 'Filtro global por transportadora.'],
    ['Tipo de veículo', defaults.tipoVeiculo, 'Filtro global por tipo de veículo.'],
    ['Status', defaults.status, 'Filtro global por status operacional.'],
    ['Modo de comparação', defaults.modoComparacao, 'Contexto comparativo principal do painel.'],
    ['Última atualização', defaults.ultimaAtualizacao || '', 'Timestamp da última execução completa do painel.']
  ];

  sheet.getRange(4, 1, rows.length, 3).setValues(rows);
  sheet.getRange(4, 1, 1, 3).setFontWeight('bold').setBackground(PANEL_COLORS.surface);
  sheet.setFrozenRows(4);

  sheet.getRange(5, 2, 2, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(13, 2).setNumberFormat('dd/mm/yyyy hh:mm');

  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.dataInicial, sheet.getRange(5, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.dataFinal, sheet.getRange(6, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.granularidade, sheet.getRange(7, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.filial, sheet.getRange(8, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.transportadora, sheet.getRange(9, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.tipoVeiculo, sheet.getRange(10, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.status, sheet.getRange(11, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.modoComparacao, sheet.getRange(12, 2));
  panelSetNamedRange_(ss, PANEL_NAMED_RANGES.ultimaAtualizacao, sheet.getRange(13, 2));

  panelApplyConfigValidations_(sheet, ss, lists);
}

function panelResolveConfigDefaults_(currentState, lists) {
  const bounds = {
    minDate: lists.minDate || new Date(),
    maxDate: lists.maxDate || new Date()
  };

  return {
    dataInicial: panelResolveDateConfigValue_(currentState.dataInicial, bounds.minDate, bounds.maxDate, bounds.minDate),
    dataFinal: panelResolveDateConfigValue_(currentState.dataFinal, bounds.minDate, bounds.maxDate, bounds.maxDate),
    granularidade: panelResolveOption_(currentState.granularidade, lists.granularidades, PANEL_DEFAULTS.granularidade),
    filial: panelResolveOption_(currentState.filial, lists.filiais, PANEL_DEFAULTS.allValue),
    transportadora: panelResolveOption_(currentState.transportadora, lists.transportadoras, PANEL_DEFAULTS.allValue),
    tipoVeiculo: panelResolveOption_(currentState.tipoVeiculo, lists.tiposVeiculo, PANEL_DEFAULTS.allValue),
    status: panelResolveOption_(currentState.status, lists.statuses, PANEL_DEFAULTS.allValue),
    modoComparacao: panelResolveOption_(currentState.modoComparacao, lists.modosComparacao, PANEL_DEFAULTS.modoComparacao),
    ultimaAtualizacao: currentState.ultimaAtualizacao || ''
  };
}

function panelResolveDateConfigValue_(rawValue, minDate, maxDate, fallback) {
  const date = startOfDay_(rawValue);
  if (!date) return fallback;
  if (date < minDate) return minDate;
  if (date > maxDate) return maxDate;
  return date;
}

function panelResolveOption_(rawValue, options, fallback) {
  const value = String(rawValue || '').trim();
  return options.indexOf(value) >= 0 ? value : fallback;
}

function panelConfigStateDiffers_(currentState, config) {
  const currentInitial = startOfDay_(currentState.dataInicial);
  const currentFinal = startOfDay_(currentState.dataFinal);

  return !currentInitial ||
    !currentFinal ||
    dateKey_(currentInitial) !== dateKey_(config.dataInicial) ||
    dateKey_(currentFinal) !== dateKey_(config.dataFinal) ||
    String(currentState.granularidade || '') !== String(config.granularidade || '') ||
    String(currentState.filial || '') !== String(config.filial || '') ||
    String(currentState.transportadora || '') !== String(config.transportadora || '') ||
    String(currentState.tipoVeiculo || '') !== String(config.tipoVeiculo || '') ||
    String(currentState.status || '') !== String(config.status || '') ||
    String(currentState.modoComparacao || '') !== String(config.modoComparacao || '');
}

function panelApplyConfigValidations_(sheet, ss, lists) {
  sheet.getRange(5, 2).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireDateBetween(lists.minDate || new Date(), lists.maxDate || new Date())
      .setAllowInvalid(false)
      .build()
  );
  sheet.getRange(6, 2).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireDateBetween(lists.minDate || new Date(), lists.maxDate || new Date())
      .setAllowInvalid(false)
      .build()
  );

  [
    { row: 7, rangeName: PANEL_NAMED_RANGES.listaGranularidade },
    { row: 8, rangeName: PANEL_NAMED_RANGES.listaFilial },
    { row: 9, rangeName: PANEL_NAMED_RANGES.listaTransportadora },
    { row: 10, rangeName: PANEL_NAMED_RANGES.listaTipoVeiculo },
    { row: 11, rangeName: PANEL_NAMED_RANGES.listaStatus },
    { row: 12, rangeName: PANEL_NAMED_RANGES.listaModoComparacao }
  ].forEach(item => {
    const range = panelGetNamedRange_(ss, item.rangeName);
    if (!range) return;
    sheet.getRange(item.row, 2).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(range.getRange(), true)
        .setAllowInvalid(false)
        .build()
    );
  });
}

function panelReadConfig_(ss, sources, lists) {
  const currentState = panelCaptureCurrentConfigState_(ss);
  const defaults = panelResolveConfigDefaults_(currentState, lists);
  const shouldResetToDefaults = isBlank_(currentState.ultimaAtualizacao);
  const config = {
    dataInicial: shouldResetToDefaults
      ? defaults.dataInicial
      : panelResolveDateConfigValue_(currentState.dataInicial, lists.minDate || defaults.dataInicial, lists.maxDate || defaults.dataFinal, defaults.dataInicial),
    dataFinal: shouldResetToDefaults
      ? defaults.dataFinal
      : panelResolveDateConfigValue_(currentState.dataFinal, lists.minDate || defaults.dataInicial, lists.maxDate || defaults.dataFinal, defaults.dataFinal),
    granularidade: shouldResetToDefaults
      ? defaults.granularidade
      : panelResolveOption_(currentState.granularidade, lists.granularidades, defaults.granularidade),
    filial: shouldResetToDefaults
      ? defaults.filial
      : panelResolveOption_(currentState.filial, lists.filiais, defaults.filial),
    transportadora: shouldResetToDefaults
      ? defaults.transportadora
      : panelResolveOption_(currentState.transportadora, lists.transportadoras, defaults.transportadora),
    tipoVeiculo: shouldResetToDefaults
      ? defaults.tipoVeiculo
      : panelResolveOption_(currentState.tipoVeiculo, lists.tiposVeiculo, defaults.tipoVeiculo),
    status: shouldResetToDefaults
      ? defaults.status
      : panelResolveOption_(currentState.status, lists.statuses, defaults.status),
    modoComparacao: shouldResetToDefaults
      ? defaults.modoComparacao
      : panelResolveOption_(currentState.modoComparacao, lists.modosComparacao, defaults.modoComparacao),
    ultimaAtualizacao: currentState.ultimaAtualizacao
  };

  if (config.dataInicial > config.dataFinal) {
    const temp = config.dataInicial;
    config.dataInicial = config.dataFinal;
    config.dataFinal = temp;
  }

  if (shouldResetToDefaults || panelConfigStateDiffers_(currentState, config)) {
    panelPersistConfigValues_(ss, config);
  }

  return config;
}

function panelUpdateConfigTimestamp_(ss, dateValue) {
  const namedRange = panelGetNamedRange_(ss, PANEL_NAMED_RANGES.ultimaAtualizacao);
  if (!namedRange) return;
  namedRange.getRange().setValue(dateValue).setNumberFormat('dd/mm/yyyy hh:mm');
}

function criarOuAtualizarCachePainel_(ss, sources, config) {
  panelTraceStep_('rebuild_cache', 'inicio');
  const semanticContext = panelBuildSemanticContext_(config, sources);
  const canUseSemanticPipeline = panelCanUseSemanticPipeline_(config, sources, semanticContext);

  let filteredBase = [];
  if (canUseSemanticPipeline) {
    panelTraceStep_('rebuild_cache', 'semantic_pipeline');
  } else {
    panelTraceStep_('rebuild_cache', 'base_pipeline');
    const normalizedBase = sources.base.map(panelNormalizeBaseRecord_).filter(record => record && record.data);
    panelTraceStep_('rebuild_cache', 'normalized_base_' + normalizedBase.length);
    filteredBase = normalizedBase.filter(record => panelMatchesFilters_(record, config));
    panelTraceStep_('rebuild_cache', 'filtered_base_' + filteredBase.length);
  }

  const analytics = panelBuildAnalytics_(filteredBase, config, sources, semanticContext);
  panelTraceStep_('rebuild_cache', 'analytics_ok');

  if (!PANEL_FEATURES.persistCacheSheet) {
    panelTraceStep_('rebuild_cache', 'sheet_skip');
    panelTraceStep_('rebuild_cache', 'fim');
    return {
      analytics: analytics,
      sections: {},
      filteredBase: filteredBase
    };
  }

  const cacheSheet = panelRecreateSheetPreservingPosition_(ss, PANEL_SHEETS.cache);
  panelTraceStep_('rebuild_cache', 'sheet_recriada');
  panelClearManagedSheet_(cacheSheet, { skipArtifactsCleanup: true });
  panelTraceStep_('rebuild_cache', 'sheet_limpa');
  panelSetDefaultColumns_(cacheSheet, [180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180]);
  panelTraceStep_('rebuild_cache', 'colunas_ok');

  let nextRow = 1;
  const sections = {};
  const sectionDefs = panelBuildCacheSectionDefs_(analytics);
  panelTraceStep_('rebuild_cache', 'sections_' + sectionDefs.length);

  sectionDefs.forEach(section => {
    sections[section.key] = panelWriteSection_(
      cacheSheet,
      nextRow,
      section.title,
      section.headers,
      section.rows,
      'cache_' + section.key
    );
    nextRow = sections[section.key].nextRow;
  });
  panelTraceStep_('rebuild_cache', 'sections_written');

  cacheSheet.hideSheet();
  panelTraceStep_('rebuild_cache', 'fim');
  return {
    analytics: analytics,
    sections: sections,
    filteredBase: filteredBase
  };
}

function panelBuildCacheSectionDefs_(analytics) {
  const baseSections = [
    { key: 'metadata', title: 'Metadata', headers: analytics.metadata.headers, rows: analytics.metadata.rows },
    { key: 'semantic_support_status', title: 'Uso de Suporte Semantico', headers: analytics.semanticSupportStatus.headers, rows: analytics.semanticSupportStatus.rows },
    { key: 'kpis', title: 'KPIs', headers: analytics.kpis.headers, rows: analytics.kpis.rows }
  ];

  if (!PANEL_FEATURES.persistFullCacheSections) {
    return baseSections;
  }

  return baseSections.concat([
    { key: 'serie_diaria', title: 'Série Diária', headers: analytics.serieDiaria.headers, rows: analytics.serieDiaria.rows },
    { key: 'serie_semanal', title: 'Série Semanal', headers: analytics.serieSemanal.headers, rows: analytics.serieSemanal.rows },
    { key: 'serie_mensal', title: 'Série Mensal', headers: analytics.serieMensal.headers, rows: analytics.serieMensal.rows },
    { key: 'rank_filial', title: 'Ranking Filial', headers: analytics.rankFilial.headers, rows: analytics.rankFilial.rows },
    { key: 'rank_transportadora', title: 'Ranking Transportadora', headers: analytics.rankTransportadora.headers, rows: analytics.rankTransportadora.rows },
    { key: 'rank_tipo_veiculo', title: 'Ranking Tipo Veículo', headers: analytics.rankTipoVeiculo.headers, rows: analytics.rankTipoVeiculo.rows },
    { key: 'ocupacao', title: 'Ocupação', headers: analytics.ocupacao.headers, rows: analytics.ocupacao.rows },
    { key: 'custos', title: 'Custos', headers: analytics.custos.headers, rows: analytics.custos.rows },
    { key: 'status_operacional', title: 'Status Operacional', headers: analytics.statusOperacional.headers, rows: analytics.statusOperacional.rows },
    { key: 'excecoes', title: 'Exceções', headers: analytics.excecoes.headers, rows: analytics.excecoes.rows },
    { key: 'drill_msd_filial', title: 'Drill Mês > Semana > Dia > Filial', headers: analytics.drillMesSemanaDiaFilial.headers, rows: analytics.drillMesSemanaDiaFilial.rows },
    { key: 'drill_filial_status', title: 'Drill Filial > Dia > Status', headers: analytics.drillFilialDiaStatus.headers, rows: analytics.drillFilialDiaStatus.rows },
    { key: 'drill_transp_tipo_dia', title: 'Drill Transportadora > Tipo > Dia', headers: analytics.drillTransportadoraTipoDia.headers, rows: analytics.drillTransportadoraTipoDia.rows },
    { key: 'drilldown_detalhe', title: 'Drilldown Detalhe', headers: analytics.drilldownCacheDetail.headers, rows: analytics.drilldownCacheDetail.rows },
    { key: 'daily_source_support', title: 'Fonte Diário (suporte)', headers: analytics.dailySourceSupport.headers, rows: analytics.dailySourceSupport.rows },
    { key: 'ocupacao_source_support', title: 'Fonte Ocupação (suporte)', headers: analytics.ocupacaoSourceSupport.headers, rows: analytics.ocupacaoSourceSupport.rows }
  ]);
}

function panelNormalizeBaseRecord_(row) {
  const data = startOfDay_(row['Data Planejada']);
  if (!data) return null;

  const semanaInicio = startOfDay_(row['Semana Inicio']) || weekStart_(data);
  const mesRef = startOfDay_(row['Mes Ref']) || monthStart_(data);
  const status = String(row['Status'] || '').trim();
  const tipoVeiculo = String(row['Tipo de Veiculo Padrao'] || '').trim() || 'Tipo nao selecionado';
  const capacidadePesoUnitKg = getVehicleWeightCapacity_(tipoVeiculo);
  const entregaEfetiva = safeDivideBlank_(toNumber_(row['Entregues']), toNumber_(row['Entregues']) + toNumber_(row['Insucessos Clean']));

  return {
    idCarga: String(row['IdCarga'] || '').trim(),
    data: data,
    semanaInicio: semanaInicio,
    mesRef: mesRef,
    mesLabel: Utilities.formatDate(mesRef, Session.getScriptTimeZone(), 'MM/yyyy'),
    filial: String(row['Filial'] || '').trim(),
    nomeFilial: String(row['Nome Filial'] || row['Filial'] || '').trim(),
    transportadora: String(row['Transportador'] || 'Nao Informado').trim() || 'Nao Informado',
    tipoVeiculo: tipoVeiculo,
    status: status,
    alerta: String(row['Alerta Operacional'] || '').trim(),
    rota: String(row['Rota'] || '').trim(),
    motorista: String(row['Motorista'] || '').trim(),
    placa: String(row['Placa'] || '').trim(),
    volumesRealizados: toNumber_(row['Volumes da Rota']),
    volumesPlanejados: toNumber_(row['Volumes Planejados']),
    pedidosRealizados: toNumber_(row['Pedidos da Rota']),
    pedidosPlanejados: toNumber_(row['Pedidos Planejados']),
    pesoRealizadoKg: toNumber_(row['Peso Realizado (kg)']),
    pesoPlanejadoKg: toNumber_(row['Peso Planejado (kg)']),
    tempoRealizadoH: toNumber_(row['Tempo Realizado (h)']),
    tempoPlanejadoH: toNumber_(row['Tempo Planejado (h)']),
    valorPagamentoCarga: toNumber_(row['Valor Pagamento Carga']),
    kmRealizado: toNumber_(row['KM Realizado']),
    kmPlanejado: toNumber_(row['KM Planejado']),
    entregaEfetiva: entregaEfetiva,
    metaSpr: toNumber_(row['MetaSPR Filial']),
    capacidadeVolumeDia: toNumber_(row['Capacidade Volume Dia']),
    possuiPlanejado: toNumber_(row['Possui Planejado']) > 0,
    progressoExecucaoNorm: panelGetExecutionProgressNormalized_(status),
    desvioTempoPct: safeDivideBlank_(toNumber_(row['Tempo Realizado (h)']) - toNumber_(row['Tempo Planejado (h)']), toNumber_(row['Tempo Planejado (h)'])),
    sprRealizado: toNumber_(row['SPR Volumes']),
    capacidadePesoUnitKg: capacidadePesoUnitKg,
    ocupacaoPesoPctRota: capacidadePesoUnitKg ? safeDivideBlank_(toNumber_(row['Peso Realizado (kg)']), capacidadePesoUnitKg) : '',
    criticoScore: panelBuildCriticalScore_(row, entregaEfetiva)
  };
}

function panelBuildCriticalScore_(row, entregaEfetiva) {
  const alerta = normalizeText_(row['Alerta Operacional']);
  const status = normalizeText_(row['Status']);
  const possuiPlanejado = toNumber_(row['Possui Planejado']) > 0;
  const desvioTempoPct = safeDivideBlank_(toNumber_(row['Tempo Realizado (h)']) - toNumber_(row['Tempo Planejado (h)']), toNumber_(row['Tempo Planejado (h)']));

  if (!possuiPlanejado) return 100;
  if (alerta.indexOf('CRIT') >= 0) return 95;
  if (normalizeText_(row['Status SPR']) === 'CRITICO') return 90;
  if (normalizeText_(row['Status Tempo']) === 'CRITICO') return 85;
  if (normalizeText_(row['Status Entrega']) === 'CRITICO') return 80;
  if (!isBlank_(entregaEfetiva) && entregaEfetiva < 0.9) return 75;
  if (!isBlank_(desvioTempoPct) && desvioTempoPct > 0.1) return 70;
  if (status.indexOf('EM ROTA') >= 0 || status.indexOf('PARCIAL') >= 0) return 65;
  if (alerta && alerta !== PANEL_DEFAULTS.statusOk) return 60;
  return 10;
}

function panelMatchesFilters_(record, config) {
  if (!record || !record.data) return false;
  if (record.data < config.dataInicial || record.data > config.dataFinal) return false;

  if (!panelIsAllValue_(config.filial)) {
    const normalizedFilter = normalizeText_(config.filial);
    if (normalizeText_(record.nomeFilial) !== normalizedFilter && normalizeText_(record.filial) !== normalizedFilter) {
      return false;
    }
  }

  if (!panelIsAllValue_(config.transportadora) && normalizeText_(record.transportadora) !== normalizeText_(config.transportadora)) {
    return false;
  }

  if (!panelIsAllValue_(config.tipoVeiculo) && normalizeText_(record.tipoVeiculo) !== normalizeText_(config.tipoVeiculo)) {
    return false;
  }

  if (!panelIsAllValue_(config.status) && normalizeText_(record.status) !== normalizeText_(config.status)) {
    return false;
  }

  return true;
}

function panelGetExecutionProgressNormalized_(status) {
  const key = normalizeText_(status);
  if (!key) return 0;
  if (key.indexOf('FINALIZADO') >= 0) return 1;
  if (key.indexOf('EM ROTA') >= 0) return 0.75;
  if (key.indexOf('PARCIAL') >= 0) return 0.5;
  if (key.indexOf('ROTA ACEITA') >= 0) return 0.25;
  if (key.indexOf('ROTEIRIZADO') >= 0) return 0;
  return 0;
}

function panelBuildAnalytics_(records, config, sources) {
  const semanticContext = panelBuildSemanticContext_(config, sources);
  const overall = panelBuildAggregateFromRecords_(records);
  const serieDiaria = panelBuildPeriodSeries_(records, 'Dia');
  const serieSemanal = panelBuildPeriodSeries_(records, 'Semana');
  const serieMensal = panelBuildPeriodSeries_(records, 'Mes');
  const drilldownSections = panelBuildDrilldownDetailSections_(records);

  return {
    metadata: panelBuildMetadataSection_(records, config, overall, semanticContext),
    semanticSupportStatus: panelBuildSemanticSupportStatusSection_(semanticContext),
    kpis: panelBuildKpiSection_(overall),
    serieDiaria: panelBuildSeriesSection_(serieDiaria),
    serieSemanal: panelBuildSeriesSection_(serieSemanal),
    serieMensal: panelBuildSeriesSection_(serieMensal),
    rankFilial: semanticContext.useResumoFilial
      ? panelBuildResumoFilialSection_(sources.support.resumoFilial, config)
      : panelBuildRankingSection_(records, 'nomeFilial', 'Filial'),
    rankTransportadora: panelBuildRankingSection_(records, 'transportadora', 'Transportadora'),
    rankTipoVeiculo: panelBuildRankingSection_(records, 'tipoVeiculo', 'Tipo de Veículo'),
    ocupacao: panelBuildOccupancySection_(records),
    custos: panelBuildCostSection_(records),
    statusOperacional: panelBuildStatusSection_(records),
    excecoes: semanticContext.useAlertasRotas
      ? panelBuildExceptionsFromAlertasSection_(sources.support.alertasRotas, config)
      : panelBuildExceptionsSection_(records),
    drillMesSemanaDiaFilial: panelBuildDrillMonthWeekDayFilialSection_(records),
    drillFilialDiaStatus: panelBuildDrillFilialDayStatusSection_(records),
    drillTransportadoraTipoDia: panelBuildDrillTransportadoraTipoDiaSection_(records),
    drilldownDetalhe: drilldownSections.visible,
    drilldownCacheDetail: drilldownSections.cache,
    dailySourceSupport: panelBuildDailySupportSection_(sources.diario, config),
    ocupacaoSourceSupport: panelBuildOcupacaoSupportSection_(sources.ocupacao, config)
  };
}

function panelBuildKpiCardLatestSection_(rows, semanticContext) {
  return {
    headers: ['KPI', 'Valor', 'Meta', 'Delta', 'Status', 'Cor', 'Trend D-1', 'Trend WoW', 'DataBase', 'Valor Texto', 'Meta Texto', 'Delta Texto', 'Trend D-1 Texto', 'Trend WoW Texto', 'Acao'],
    rows: semanticContext.useKpiCardLatest ? (rows || []).map(row => ([
      row['KPI'] || '',
      toNumber_(row['Valor']),
      toNumber_(row['Meta']),
      toNumber_(row['Delta']),
      row['Status'] || '',
      row['Cor'] || '',
      toNumber_(row['Trend D-1']),
      toNumber_(row['Trend WoW']),
      row['DataBase'] || '',
      row['Valor Texto'] || '',
      row['Meta Texto'] || '',
      row['Delta Texto'] || '',
      row['Trend D-1 Texto'] || '',
      row['Trend WoW Texto'] || '',
      row['Acao'] || ''
    ])) : []
  };
}

function panelBuildFilialRankingFromKpiFilialDay_(rows) {
  const groups = new Map();

  rows.forEach(row => {
    const key = String(row['Filial'] || '').trim() || 'Nao Informado';
    if (!groups.has(key)) {
      groups.set(key, {
        filial: key,
        dias: new Set(),
        cargas: 0,
        volumesReal: 0,
        volumesPlan: 0,
        entregas: 0,
        insucessos: 0,
        progressoPonderado: 0,
        desvioTempoPonderado: 0,
        metaSprVolumes: 0,
        metaSprCount: 0
      });
    }

    const group = groups.get(key);
    const cargas = toNumber_(row['Qtd Rotas']);
    const volumesReal = toNumber_(row['Qtd Volumes']);
    const aderVolumes = toNumber_(row['% Ader Volumes']);
    const volumesPlan = aderVolumes > 0 ? safeDivideBlank_(volumesReal, aderVolumes) : 0;

    group.dias.add(dateKey_(row['Data']));
    group.cargas += cargas;
    group.volumesReal += volumesReal;
    group.volumesPlan += toNumber_(volumesPlan);
    group.entregas += toNumber_(row['Qtd Entregas']);
    group.insucessos += toNumber_(row['Qtd Insucessos']);
    group.progressoPonderado += toNumber_(row['% Rotas Concluidas']) * cargas;
    group.desvioTempoPonderado += (toNumber_(row['% Ader Tempo']) - 1) * cargas;

    if (!isBlank_(row['Meta SPR Volumes'])) {
      group.metaSprVolumes += toNumber_(row['Meta SPR Volumes']);
      group.metaSprCount += 1;
    }
  });

  return {
    headers: [
      'Filial', 'Cargas Realizadas', 'Volumes Realizados', 'Volumes Planejados',
      'Delta Volumes', 'SPR Realizado', 'Entrega Efetiva', 'Progresso Execucao (%)',
      'Desvio Tempo (%)', 'Meta SPR', 'Dias Cobertos'
    ],
    rows: [...groups.values()]
      .map(group => {
        const sprReal = safeDivideBlank_(group.volumesReal, group.cargas);
        const entregaEfetiva = safeDivideBlank_(group.entregas, group.entregas + group.insucessos);
        const progresso = safeDivideBlank_(group.progressoPonderado, group.cargas);
        const desvioTempoPct = safeDivideBlank_(group.desvioTempoPonderado, group.cargas);
        const metaSpr = safeDivideBlank_(group.metaSprVolumes, group.metaSprCount);

        return [
          group.filial,
          group.cargas,
          group.volumesReal,
          round_(group.volumesPlan, 2),
          round_(group.volumesReal - group.volumesPlan, 2),
          sprReal,
          entregaEfetiva,
          progresso,
          desvioTempoPct,
          metaSpr,
          group.dias.size
        ];
      })
      .sort((a, b) => (b[2] || 0) - (a[2] || 0) || String(a[0]).localeCompare(String(b[0]), 'pt-BR'))
  };
}

function panelBuildTransportadoraRankingFromKpiTransportadorDia_(rows, ocupacaoRows) {
  const costMap = new Map();

  (ocupacaoRows || []).forEach(row => {
    const key = String(row['Transportador'] || '').trim() || 'Nao Informado';
    if (!costMap.has(key)) {
      costMap.set(key, { pagamento: 0, cargas: 0 });
    }
    const item = costMap.get(key);
    item.pagamento += toNumber_(row['Valor Pagamento Carga Total']);
    item.cargas += toNumber_(row['Rotas']);
  });

  return {
    headers: [
      'Transportadora', 'Cargas Realizadas', 'Volumes Realizados', 'Volumes Planejados',
      'Delta Volumes', 'SPR Realizado', 'Entrega Efetiva', 'Progresso Execucao (%)',
      'Desvio Tempo (%)', 'Custo Medio/Carga', 'Alertas Criticos'
    ],
    rows: rows
      .map(row => {
        const cargas = toNumber_(row['Qtd Rotas']);
        const volumesReal = toNumber_(row['Qtd Volumes']);
        const volumesPlan = toNumber_(row['% Ader Volumes']) > 0
          ? safeDivideBlank_(volumesReal, toNumber_(row['% Ader Volumes']))
          : '';
        const transportador = String(row['Transportador'] || '').trim() || 'Nao Informado';
        const costInfo = costMap.get(transportador) || { pagamento: 0, cargas: 0 };

        return [
          transportador,
          cargas,
          volumesReal,
          volumesPlan,
          isBlank_(volumesPlan) ? '' : volumesReal - volumesPlan,
          safeDivideBlank_(volumesReal, cargas),
          toNumber_(row['% Entregas Efetivas']),
          toNumber_(row['% Rotas Concluidas']),
          toNumber_(row['% Ader Tempo']) ? toNumber_(row['% Ader Tempo']) - 1 : '',
          safeDivideBlank_(costInfo.pagamento, costInfo.cargas),
          0
        ];
      })
      .sort((a, b) => (b[2] || 0) - (a[2] || 0) || String(a[0]).localeCompare(String(b[0]), 'pt-BR'))
  };
}

function panelBuildTipoVeiculoRankingFromOcupacaoRows_(rows) {
  const groups = new Map();

  rows.forEach(row => {
    const key = String(row['Tipo de Veiculo'] || '').trim() || 'Tipo nao selecionado';
    if (!groups.has(key)) {
      groups.set(key, {
        tipo: key,
        rotas: 0,
        volumes: 0,
        peso: 0,
        capacidade: 0,
        pagamento: 0
      });
    }
    const group = groups.get(key);
    group.rotas += toNumber_(row['Rotas']);
    group.volumes += toNumber_(row['Volumes']);
    group.peso += toNumber_(row['Peso Total (kg)']);
    group.capacidade += toNumber_(row['Capacidade Peso Total (kg)']);
    group.pagamento += toNumber_(row['Valor Pagamento Carga Total']);
  });

  return {
    headers: [
      'Tipo de Veiculo', 'Cargas Realizadas', 'Volumes Realizados', 'Volumes Planejados',
      'Delta Volumes', 'SPR Realizado', 'Entrega Efetiva', 'Progresso Execucao (%)',
      'Desvio Tempo (%)', 'Custo Medio/Carga', 'Alertas Criticos'
    ],
    rows: [...groups.values()]
      .map(group => ([
        group.tipo,
        group.rotas,
        group.volumes,
        '',
        '',
        safeDivideBlank_(group.volumes, group.rotas),
        '',
        '',
        '',
        safeDivideBlank_(group.pagamento, group.rotas),
        ''
      ]))
      .sort((a, b) => (b[2] || 0) - (a[2] || 0))
  };
}

function panelBuildOccupancySectionFromOcupacaoRows_(rows) {
  return {
    headers: [
      'Transportadora', 'Tipo de Veiculo', 'Rotas', 'Peso Realizado (kg)',
      'Capacidade Peso Total (kg)', 'Ocupacao Peso (%)', 'SPR Realizado', 'Custo Medio/Carga'
    ],
    rows: (rows || [])
      .map(row => ([
        row['Transportador'] || '',
        row['Tipo de Veiculo'] || '',
        toNumber_(row['Rotas']),
        toNumber_(row['Peso Total (kg)']),
        toNumber_(row['Capacidade Peso Total (kg)']),
        toNumber_(row['Ocupacao Peso (%)']),
        toNumber_(row['SPR por Veiculo']),
        toNumber_(row['Custo Medio/Carga'])
      ]))
      .sort((a, b) => (b[5] || 0) - (a[5] || 0))
  };
}

function panelBuildCostSectionFromOcupacaoRows_(rows) {
  const groups = new Map();

  (rows || []).forEach(row => {
    const key = String(row['Transportador'] || '').trim() || 'Nao Informado';
    if (!groups.has(key)) {
      groups.set(key, {
        transportador: key,
        pagamento: 0,
        rotas: 0,
        volumes: 0,
        pedidos: 0
      });
    }
    const group = groups.get(key);
    group.pagamento += toNumber_(row['Valor Pagamento Carga Total']);
    group.rotas += toNumber_(row['Rotas']);
    group.volumes += toNumber_(row['Volumes']);
    group.pedidos += toNumber_(row['Pedidos']);
  });

  return {
    headers: [
      'Transportadora', 'Valor Pagamento Total', 'Custo Medio/Carga',
      'Custo Medio/Volume', 'Custo Medio/Pedido', 'Cargas', 'Volumes', 'Pedidos'
    ],
    rows: [...groups.values()]
      .map(group => ([
        group.transportador,
        group.pagamento,
        safeDivideBlank_(group.pagamento, group.rotas),
        safeDivideBlank_(group.pagamento, group.volumes),
        safeDivideBlank_(group.pagamento, group.pedidos),
        group.rotas,
        group.volumes,
        group.pedidos
      ]))
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
  };
}

function panelBuildStatusSectionFromDrillRows_(rows) {
  const groups = new Map();
  PANEL_STATUS_ORDER.forEach(status => groups.set(status, []));

  (rows || []).forEach(row => {
    const key = panelResolveStatusBucket_(row['Status']);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return {
    headers: ['Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execucao (%)', 'Entrega Efetiva'],
    rows: [...groups.entries()].map(entry => {
      const status = entry[0];
      const statusRows = entry[1];
      const cargas = statusRows.length;
      const volumes = statusRows.reduce((sum, row) => sum + toNumber_(row['Volumes da Rota']), 0);
      const peso = statusRows.reduce((sum, row) => sum + toNumber_(row['Peso (kg)']), 0);
      const progresso = cargas
        ? safeDivideBlank_(statusRows.reduce((sum, row) => sum + panelGetExecutionProgressNormalized_(row['Status']), 0), cargas)
        : '';
      const entregas = statusRows.reduce((sum, row) => sum + toNumber_(row['Entregues']), 0);
      const insucessos = statusRows.reduce((sum, row) => sum + toNumber_(row['Insucessos']), 0);

      return [status, cargas, volumes, peso, progresso, safeDivideBlank_(entregas, entregas + insucessos)];
    })
  };
}

function panelBuildDrillMonthWeekDayFilialFromKpiFilialDay_(rows) {
  return {
    headers: ['Mes', 'Semana', 'Data', 'Filial', 'Cargas', 'Volumes', 'SPR Realizado', 'Entrega Efetiva'],
    rows: (rows || [])
      .map(row => ([
        row['MesNome'] || '',
        row['SemanaLabel'] || '',
        row['Data'] || '',
        row['Filial'] || '',
        toNumber_(row['Qtd Rotas']),
        toNumber_(row['Qtd Volumes']),
        toNumber_(row['SPR Vol Realizado']),
        toNumber_(row['% Entregas Efetivas'])
      ]))
      .sort((a, b) => {
        const dateA = toDate_(a[2]);
        const dateB = toDate_(b[2]);
        return (dateA ? dateA.getTime() : 0) - (dateB ? dateB.getTime() : 0);
      })
  };
}

function panelBuildDrillFilialDayStatusFromDrillRows_(rows) {
  const groups = new Map();

  (rows || []).forEach(row => {
    const key = [
      row['Filial'] || '',
      dateKey_(row['Data']),
      panelResolveStatusBucket_(row['Status'])
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return {
    headers: ['Filial', 'Data', 'Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execucao (%)'],
    rows: [...groups.values()].map(group => {
      const sample = group[0];
      const cargas = group.length;
      return [
        sample['Filial'] || '',
        sample['Data'] || '',
        panelResolveStatusBucket_(sample['Status']),
        cargas,
        group.reduce((sum, row) => sum + toNumber_(row['Volumes da Rota']), 0),
        group.reduce((sum, row) => sum + toNumber_(row['Peso (kg)']), 0),
        safeDivideBlank_(group.reduce((sum, row) => sum + panelGetExecutionProgressNormalized_(row['Status']), 0), cargas)
      ];
    })
  };
}

function panelBuildDrillTransportadoraTipoDiaFromOcupacaoRows_(rows) {
  return {
    headers: ['Transportadora', 'Tipo de Veiculo', 'Data', 'Rotas', 'Volumes', 'Ocupacao Peso (%)', 'Custo Medio/Carga'],
    rows: (rows || [])
      .map(row => ([
        row['Transportador'] || '',
        row['Tipo de Veiculo'] || '',
        row['Data'] || '',
        toNumber_(row['Rotas']),
        toNumber_(row['Volumes']),
        toNumber_(row['Ocupacao Peso (%)']),
        toNumber_(row['Custo Medio/Carga'])
      ]))
      .sort((a, b) =>
        String(a[0]).localeCompare(String(b[0]), 'pt-BR') ||
        String(a[1]).localeCompare(String(b[1]), 'pt-BR') ||
        ((toDate_(a[2]) ? toDate_(a[2]).getTime() : 0) - (toDate_(b[2]) ? toDate_(b[2]).getTime() : 0))
      )
  };
}

function panelBuildSemanticContext_(config, sources) {
  const support = sources.support || {};
  const availableSupport = Object.keys(support).filter(key => support[key] && support[key].length);
  const baseBounds = panelResolveSourceDateBounds_(sources.base || []);
  const hasDimensionFilters =
    !panelIsAllValue_(config.transportadora) ||
    !panelIsAllValue_(config.tipoVeiculo) ||
    !panelIsAllValue_(config.status);
  const isFullPeriod = !!baseBounds.minDate && !!baseBounds.maxDate &&
    dateKey_(config.dataInicial) === dateKey_(baseBounds.minDate) &&
    dateKey_(config.dataFinal) === dateKey_(baseBounds.maxDate);

  return {
    availableSupport: availableSupport,
    availableSupportCount: availableSupport.length,
    useResumoFilial: !!(support.resumoFilial && support.resumoFilial.length && !hasDimensionFilters && isFullPeriod),
    useAlertasRotas: !!(support.alertasRotas && support.alertasRotas.length),
    baseBounds: baseBounds
  };
}

function panelResolveSourceDateBounds_(rows) {
  let minDate = null;
  let maxDate = null;

  rows.forEach(row => {
    const date = startOfDay_(row['Data Planejada'] || row['Data']);
    if (!date) return;
    minDate = !minDate || date < minDate ? date : minDate;
    maxDate = !maxDate || date > maxDate ? date : maxDate;
  });

  return {
    minDate: minDate,
    maxDate: maxDate
  };
}

function panelBuildSemanticSupportStatusSection_(semanticContext) {
  return {
    headers: ['Item', 'Valor'],
    rows: [
      ['Suportes disponiveis', semanticContext.availableSupport.join(', ') || 'Nenhum'],
      ['Resumo Filial ativo', semanticContext.useResumoFilial ? 'Sim' : 'Nao'],
      ['Alertas Rotas ativo', semanticContext.useAlertasRotas ? 'Sim' : 'Nao'],
      ['Periodo minimo base', semanticContext.baseBounds.minDate || ''],
      ['Periodo maximo base', semanticContext.baseBounds.maxDate || '']
    ]
  };
}

function panelBuildMetadataSection_(records, config, overall, semanticContext) {
  const recordCount = records.length || semanticContext.filteredRecordCount || 0;
  return {
    headers: ['Chave', 'Valor'],
    rows: [
      ['Data inicial', config.dataInicial || ''],
      ['Data final', config.dataFinal || ''],
      ['Granularidade', config.granularidade],
      ['Filial', config.filial],
      ['Transportadora', config.transportadora],
      ['Tipo de veículo', config.tipoVeiculo],
      ['Status', config.status],
      ['Modo comparação', config.modoComparacao],
      ['Pipeline ativo', semanticContext.activePipeline || 'base'],
      ['Linhas filtradas de referencia', recordCount],
      ['Cargas filtradas', overall.cargasRealizadas],
      ['Abas de suporte disponiveis', semanticContext.availableSupportCount],
      ['Ranking Filial via', semanticContext.useResumoFilial ? 'Resumo_Filial' : 'VW_Base_Execucao'],
      ['Excecoes via', semanticContext.useAlertasRotas ? 'alertas_rotas' : 'VW_Base_Execucao']
    ]
  };
}

function panelBuildKpiSection_(aggregate) {
  return {
    headers: ['Indicador', 'Valor', 'Detalhe', 'Formato'],
    rows: [
      ['Cargas Realizadas', aggregate.cargasRealizadas, 'Rotas dentro dos filtros', '0'],
      ['Cargas Planejadas', aggregate.cargasPlanejadas, 'Rotas com planejamento', '0'],
      ['Volumes Realizados', aggregate.volumesRealizados, 'Volume total realizado', '0'],
      ['Volumes Planejados', aggregate.volumesPlanejados, 'Volume total planejado', '0'],
      ['SPR Realizado', aggregate.sprRealizado, 'Volumes por carga', '0.00'],
      ['SPR Planejado', aggregate.sprPlanejado, 'Planejado por carga', '0.00'],
      ['SPR vs Meta', aggregate.sprVsMeta, 'Diferença do alvo ponderado', '0.00'],
      ['Progresso Execução', aggregate.progressoExecucao, 'Escala normalizada 0-1', '0.00%'],
      ['Entrega Efetiva', aggregate.entregaEfetiva, 'Entregues / (Entregues + Insucessos)', '0.00%'],
      ['Aderência Capacidade', aggregate.aderenciaCapacidade, 'Volumes / capacidade do período', '0.00%'],
      ['Ocupação Peso', aggregate.ocupacaoPeso, 'Peso / capacidade por rota', '0.00%'],
      ['Custo Médio/Carga', aggregate.custoMedioCarga, 'Pagamento médio por carga', 'R$ #,##0.00']
    ]
  };
}

function panelBuildSeriesSection_(rows) {
  return {
    headers: [
      'Período', 'Label', 'Cargas Realizadas', 'Cargas Planejadas',
      'Volumes Realizados', 'Volumes Planejados',
      'Peso Realizado (kg)', 'Peso Planejado (kg)',
      'SPR Realizado', 'SPR Planejado', 'SPR vs Meta',
      'Entrega Efetiva', 'Desvio Tempo (%)',
      'Aderência Capacidade (%)', 'Progresso Execução (%)',
      'Ocupação (%)', 'Custo Médio/Carga'
    ],
    rows: rows.map(row => ([
      row.periodStart || '',
      row.label || '',
      row.cargasRealizadas,
      row.cargasPlanejadas,
      row.volumesRealizados,
      row.volumesPlanejados,
      row.pesoRealizadoKg,
      row.pesoPlanejadoKg,
      row.sprRealizado,
      row.sprPlanejado,
      row.sprVsMeta,
      row.entregaEfetiva,
      row.desvioTempoPct,
      row.aderenciaCapacidade,
      row.progressoExecucao,
      row.ocupacaoPeso,
      row.custoMedioCarga
    ]))
  };
}

function panelBuildRankingSection_(records, dimensionKey, headerLabel) {
  const groups = new Map();
  records.forEach(record => {
    const label = record[dimensionKey] || 'Nao Informado';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const label = entry[0];
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      label,
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.volumesPlanejados,
      aggregate.volumesRealizados - aggregate.volumesPlanejados,
      aggregate.sprRealizado,
      aggregate.entregaEfetiva,
      aggregate.progressoExecucao,
      aggregate.desvioTempoPct,
      aggregate.custoMedioCarga,
      aggregate.alertasCriticos
    ];
  });

  rows.sort((a, b) => {
    if (b[2] !== a[2]) return b[2] - a[2];
    return String(a[0]).localeCompare(String(b[0]), 'pt-BR');
  });

  return {
    headers: [
      headerLabel,
      'Cargas Realizadas',
      'Volumes Realizados',
      'Volumes Planejados',
      'Delta Volumes',
      'SPR Realizado',
      'Entrega Efetiva',
      'Progresso Execução (%)',
      'Desvio Tempo (%)',
      'Custo Médio/Carga',
      'Alertas Críticos'
    ],
    rows: rows
  };
}

function panelBuildResumoFilialSection_(rows, config) {
  const filteredRows = rows.filter(row => {
    if (panelIsAllValue_(config.filial)) return true;
    const normalizedFilter = normalizeText_(config.filial);
    return normalizeText_(row['Nome Filial']) === normalizedFilter ||
      normalizeText_(row['Filial']) === normalizedFilter;
  });

  const ordered = filteredRows
    .slice()
    .sort((a, b) => toNumber_(b['Volumes Real']) - toNumber_(a['Volumes Real']));

  return {
    headers: [
      'Filial',
      'Cargas Realizadas',
      'Volumes Realizados',
      'Volumes Planejados',
      'Delta Volumes',
      'SPR Realizado',
      'Entrega Efetiva',
      'Progresso Execucao (%)',
      'Desvio Tempo (%)',
      'Meta SPR',
      'Dias Cobertos'
    ],
    rows: ordered.map(row => ([
      row['Nome Filial'] || row['Filial'] || '',
      toNumber_(row['Total Cargas']),
      toNumber_(row['Volumes Real']),
      toNumber_(row['Volumes Plan']),
      toNumber_(row['Delta Volumes']),
      toNumber_(row['SPR Vol Real']),
      toNumber_(row['Entrega Efetiva']),
      panelNormalizeLegacyProgress_(row['Progresso %']),
      toNumber_(row['Desvio %']),
      toNumber_(row['Meta SPR']),
      toNumber_(row['Dias Cobertos'])
    ]))
  };
}

function panelBuildOccupancySection_(records) {
  const groups = new Map();
  records.forEach(record => {
    const key = [record.transportadora, record.tipoVeiculo].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const sample = entry[1][0];
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      sample.transportadora,
      sample.tipoVeiculo,
      aggregate.cargasRealizadas,
      aggregate.pesoRealizadoKg,
      aggregate.capacidadePesoTotalKg,
      aggregate.ocupacaoPeso,
      aggregate.sprRealizado,
      aggregate.custoMedioCarga
    ];
  });

  rows.sort((a, b) => (b[5] || 0) - (a[5] || 0));

  return {
    headers: [
      'Transportadora',
      'Tipo de Veículo',
      'Rotas',
      'Peso Realizado (kg)',
      'Capacidade Peso Total (kg)',
      'Ocupação Peso (%)',
      'SPR Realizado',
      'Custo Médio/Carga'
    ],
    rows: rows
  };
}

function panelBuildCostSection_(records) {
  const groups = new Map();
  records.forEach(record => {
    const key = record.transportadora || 'Nao Informado';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      entry[0],
      aggregate.valorPagamentoTotal,
      aggregate.custoMedioCarga,
      aggregate.custoMedioVolume,
      aggregate.custoMedioPedido,
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.pedidosRealizados
    ];
  });

  rows.sort((a, b) => (b[1] || 0) - (a[1] || 0));

  return {
    headers: [
      'Transportadora',
      'Valor Pagamento Total',
      'Custo Médio/Carga',
      'Custo Médio/Volume',
      'Custo Médio/Pedido',
      'Cargas',
      'Volumes',
      'Pedidos'
    ],
    rows: rows
  };
}

function panelBuildStatusSection_(records) {
  const groups = new Map();

  PANEL_STATUS_ORDER.forEach(status => groups.set(status, []));
  records.forEach(record => {
    const key = panelResolveStatusBucket_(record.status);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      entry[0],
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.pesoRealizadoKg,
      aggregate.progressoExecucao,
      aggregate.entregaEfetiva
    ];
  });

  return {
    headers: ['Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execução (%)', 'Entrega Efetiva'],
    rows: rows
  };
}

function panelResolveStatusBucket_(status) {
  const normalized = normalizeText_(status);
  if (normalized.indexOf('FINALIZADO') >= 0) return 'FINALIZADO';
  if (normalized.indexOf('EM ROTA') >= 0) return 'EM ROTA';
  if (normalized.indexOf('PARCIAL') >= 0) return 'PARCIAL';
  if (normalized.indexOf('ROTA ACEITA') >= 0) return 'ROTA ACEITA';
  if (normalized.indexOf('ROTEIRIZADO') >= 0) return 'ROTEIRIZADO';
  return status || 'OUTROS';
}

function panelBuildExceptionsFromAlertasSection_(rows, config) {
  const filteredRows = rows
    .filter(row => {
      const date = startOfDay_(row['Data']);
      if (!date) return false;
      if (date < config.dataInicial || date > config.dataFinal) return false;

      if (!panelIsAllValue_(config.filial)) {
        const normalizedFilter = normalizeText_(config.filial);
        if (normalizeText_(row['Filial']) !== normalizedFilter) return false;
      }

      if (!panelIsAllValue_(config.transportadora) && normalizeText_(row['Transportador']) !== normalizeText_(config.transportadora)) {
        return false;
      }

      if (!panelIsAllValue_(config.tipoVeiculo) && normalizeText_(row['Tipo de Veiculo Padrao']) !== normalizeText_(config.tipoVeiculo)) {
        return false;
      }

      if (!panelIsAllValue_(config.status) && normalizeText_(row['Status']) !== normalizeText_(config.status)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => toNumber_(b['Prioridade']) - toNumber_(a['Prioridade']) || toDate_(b['Data']).getTime() - toDate_(a['Data']).getTime())
    .slice(0, PANEL_DEFAULTS.maxExceptionRows);

  return {
    headers: [
      'Data',
      'Filial',
      'Transportadora',
      'Tipo de Veiculo',
      'Status',
      'Status Rota',
      'Rota',
      'Rota Planejada',
      'Placa',
      'Motorista',
      'Pedidos da Rota',
      'Volumes da Rota',
      'Entrega Efetiva',
      'Tempo Realizado (h)',
      'Match Temporal',
      'Prioridade'
    ],
    rows: filteredRows.map(row => ([
      row['Data'] || '',
      row['Filial'] || '',
      row['Transportador'] || '',
      row['Tipo de Veiculo Padrao'] || '',
      row['Status'] || '',
      row['Status Rota'] || '',
      row['Rota'] || '',
      row['Rota Planejada'] || '',
      row['Placa'] || '',
      row['Motorista'] || '',
      toNumber_(row['Pedidos da Rota']),
      toNumber_(row['Volumes da Rota']),
      toNumber_(row['Entrega Efetiva Rota']),
      toNumber_(row['Tempo Realizado (h)']),
      row['Match Temporal'] || '',
      toNumber_(row['Prioridade'])
    ]))
  };
}

function panelBuildExceptionsSection_(records) {
  const rows = records
    .filter(record => record.criticoScore >= 60)
    .sort((a, b) => b.criticoScore - a.criticoScore || b.data.getTime() - a.data.getTime())
    .slice(0, PANEL_DEFAULTS.maxExceptionRows)
    .map(record => ([
      record.data,
      record.nomeFilial,
      record.transportadora,
      record.tipoVeiculo,
      record.status,
      record.idCarga,
      record.volumesRealizados,
      record.volumesPlanejados,
      record.sprRealizado,
      record.metaSpr,
      record.entregaEfetiva,
      record.desvioTempoPct,
      record.valorPagamentoCarga,
      record.alerta || 'Monitorar'
    ]));

  return {
    headers: [
      'Data',
      'Filial',
      'Transportadora',
      'Tipo de Veículo',
      'Status',
      'IdCarga',
      'Volumes Realizados',
      'Volumes Planejados',
      'SPR Realizado',
      'Meta SPR',
      'Entrega Efetiva',
      'Desvio Tempo (%)',
      'Valor Pagamento Carga',
      'Alerta Operacional'
    ],
    rows: rows
  };
}

function panelBuildDrillMonthWeekDayFilialSection_(records) {
  const groups = new Map();
  records.forEach(record => {
    const key = [record.mesLabel, buildWeekLabel_(record.semanaInicio), dateKey_(record.data), record.nomeFilial].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const sample = entry[1][0];
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      sample.mesLabel,
      buildWeekLabel_(sample.semanaInicio),
      sample.data,
      sample.nomeFilial,
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.sprRealizado,
      aggregate.entregaEfetiva
    ];
  });

  rows.sort((a, b) => toDate_(a[2]).getTime() - toDate_(b[2]).getTime());

  return {
    headers: ['Mês', 'Semana', 'Data', 'Filial', 'Cargas', 'Volumes', 'SPR Realizado', 'Entrega Efetiva'],
    rows: rows
  };
}

function panelBuildDrillFilialDayStatusSection_(records) {
  const groups = new Map();
  records.forEach(record => {
    const key = [record.nomeFilial, dateKey_(record.data), panelResolveStatusBucket_(record.status)].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const sample = entry[1][0];
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      sample.nomeFilial,
      sample.data,
      panelResolveStatusBucket_(sample.status),
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.pesoRealizadoKg,
      aggregate.progressoExecucao
    ];
  });

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR') || toDate_(a[1]).getTime() - toDate_(b[1]).getTime());

  return {
    headers: ['Filial', 'Data', 'Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execução (%)'],
    rows: rows
  };
}

function panelBuildDrillTransportadoraTipoDiaSection_(records) {
  const groups = new Map();
  records.forEach(record => {
    const key = [record.transportadora, record.tipoVeiculo, dateKey_(record.data)].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  const rows = [...groups.entries()].map(entry => {
    const sample = entry[1][0];
    const aggregate = panelBuildAggregateFromRecords_(entry[1]);
    return [
      sample.transportadora,
      sample.tipoVeiculo,
      sample.data,
      aggregate.cargasRealizadas,
      aggregate.volumesRealizados,
      aggregate.ocupacaoPeso,
      aggregate.custoMedioCarga
    ];
  });

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR') || String(a[1]).localeCompare(String(b[1]), 'pt-BR') || toDate_(a[2]).getTime() - toDate_(b[2]).getTime());

  return {
    headers: ['Transportadora', 'Tipo de Veículo', 'Data', 'Rotas', 'Volumes', 'Ocupação Peso (%)', 'Custo Médio/Carga'],
    rows: rows
  };
}

function panelBuildDrilldownDetailSection_(records) {
  return panelBuildDrilldownDetailSections_(records).visible;
}

function panelBuildDrilldownDetailSections_(records) {
  const allRows = panelBuildDrilldownDetailRows_(records);

  return {
    visible: {
      headers: panelGetDrilldownDetailHeaders_(),
      rows: allRows.slice(0, PANEL_DEFAULTS.maxVisibleDetailRows),
      totalRows: allRows.length,
      isTruncated: allRows.length > PANEL_DEFAULTS.maxVisibleDetailRows
    },
    cache: {
      headers: panelGetDrilldownDetailHeaders_(),
      rows: allRows.slice(0, PANEL_DEFAULTS.maxCacheDetailRows),
      totalRows: allRows.length,
      isTruncated: allRows.length > PANEL_DEFAULTS.maxCacheDetailRows
    }
  };
}

function panelGetDrilldownDetailHeaders_() {
  return [
    'Data', 'MÃªs', 'Semana', 'Filial', 'Transportadora', 'Tipo de VeÃ­culo', 'Status',
    'IdCarga', 'Rota', 'Motorista', 'Placa', 'Volumes Realizados', 'Volumes Planejados',
    'Peso Realizado (kg)', 'Peso Planejado (kg)', 'SPR Realizado', 'Meta SPR',
    'Entrega Efetiva', 'Tempo Realizado (h)', 'Tempo Planejado (h)', 'Desvio Tempo (%)',
    'Valor Pagamento Carga', 'Alerta Operacional'
  ];
}

function panelBuildDrilldownDetailRows_(records) {
  return records
    .slice()
    .sort((a, b) => {
      if (b.criticoScore !== a.criticoScore) return b.criticoScore - a.criticoScore;
      return b.data.getTime() - a.data.getTime();
    })
    .map(record => ([
      record.data,
      record.mesLabel,
      buildWeekLabel_(record.semanaInicio),
      record.nomeFilial,
      record.transportadora,
      record.tipoVeiculo,
      record.status,
      record.idCarga,
      record.rota,
      record.motorista,
      record.placa,
      record.volumesRealizados,
      record.volumesPlanejados,
      record.pesoRealizadoKg,
      record.pesoPlanejadoKg,
      record.sprRealizado,
      record.metaSpr,
      record.entregaEfetiva,
      record.tempoRealizadoH,
      record.tempoPlanejadoH,
      record.desvioTempoPct,
      record.valorPagamentoCarga,
      record.alerta
    ]));
}

function panelBuildDrilldownDetailSectionLegacy_(records) {
  return {
    headers: [
      'Data', 'Mês', 'Semana', 'Filial', 'Transportadora', 'Tipo de Veículo', 'Status',
      'IdCarga', 'Rota', 'Motorista', 'Placa', 'Volumes Realizados', 'Volumes Planejados',
      'Peso Realizado (kg)', 'Peso Planejado (kg)', 'SPR Realizado', 'Meta SPR',
      'Entrega Efetiva', 'Tempo Realizado (h)', 'Tempo Planejado (h)', 'Desvio Tempo (%)',
      'Valor Pagamento Carga', 'Alerta Operacional'
    ],
    rows: records.map(record => ([
      record.data,
      record.mesLabel,
      buildWeekLabel_(record.semanaInicio),
      record.nomeFilial,
      record.transportadora,
      record.tipoVeiculo,
      record.status,
      record.idCarga,
      record.rota,
      record.motorista,
      record.placa,
      record.volumesRealizados,
      record.volumesPlanejados,
      record.pesoRealizadoKg,
      record.pesoPlanejadoKg,
      record.sprRealizado,
      record.metaSpr,
      record.entregaEfetiva,
      record.tempoRealizadoH,
      record.tempoPlanejadoH,
      record.desvioTempoPct,
      record.valorPagamentoCarga,
      record.alerta
    ]))
  };
}

function panelBuildDailySupportSection_(rows, config) {
  const filtered = rows.filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date) return false;
    if (date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.filial)) {
      const normalizedFilter = normalizeText_(config.filial);
      const label = String(row['Nome Filial'] || row['Filial'] || '').trim();
      if (normalizeText_(label) !== normalizedFilter && normalizeText_(row['Filial']) !== normalizedFilter) return false;
    }
    return true;
  });

  return {
    headers: ['Data', 'Filial', 'Volumes Planejados', 'Volumes Realizados', 'SPR Planejado', 'SPR Realizado', 'Aderência Cap Vol Dia (%)', 'Progresso Execução (%)'],
    rows: filtered.slice(0, 200).map(row => ([
      row['Data'] || '',
      row['Nome Filial'] || row['Filial'] || '',
      toNumber_(row['Volumes Planejados']),
      toNumber_(row['Volumes Realizados']),
      toNumber_(row['SPR Volumes Planejado']),
      toNumber_(row['SPR Volumes Realizado']),
      toNumber_(row['Aderencia Cap Vol Dia (%)']),
      panelNormalizeLegacyProgress_(row['Progresso Execucao (%)'])
    ]))
  };
}

function panelBuildOcupacaoSupportSection_(rows, config) {
  const filtered = rows.filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date) return false;
    if (date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.transportadora) && normalizeText_(row['Transportador']) !== normalizeText_(config.transportadora)) return false;
    if (!panelIsAllValue_(config.tipoVeiculo) && normalizeText_(row['Tipo de Veiculo']) !== normalizeText_(config.tipoVeiculo)) return false;
    return true;
  });

  return {
    headers: ['Data', 'Transportadora', 'Tipo de Veículo', 'Rotas', 'Peso Total (kg)', 'Ocupação Peso (%)', 'Custo Médio/Carga'],
    rows: filtered.slice(0, 200).map(row => ([
      row['Data'] || '',
      row['Transportador'] || '',
      row['Tipo de Veiculo'] || '',
      toNumber_(row['Rotas']),
      toNumber_(row['Peso Total (kg)']),
      toNumber_(row['Ocupacao Peso (%)']),
      toNumber_(row['Custo Medio/Carga'])
    ]))
  };
}

function panelNormalizeLegacyProgress_(value) {
  const numeric = toNumber_(value);
  return numeric > 1 ? numeric / 100 : numeric;
}

function panelBuildPeriodSeries_(records, grain) {
  const groups = new Map();
  records.forEach(record => {
    const key = panelResolvePeriodKey_(record, grain);
    if (!groups.has(key)) {
      groups.set(key, {
        label: panelResolvePeriodLabel_(record, grain),
        periodStart: panelResolvePeriodStart_(record, grain),
        records: []
      });
    }
    groups.get(key).records.push(record);
  });

  return [...groups.values()]
    .map(group => {
      const aggregate = panelBuildAggregateFromRecords_(group.records);
      aggregate.label = group.label;
      aggregate.periodStart = group.periodStart;
      return aggregate;
    })
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
}

function panelResolvePeriodKey_(record, grain) {
  if (grain === 'Dia') return dateKey_(record.data);
  if (grain === 'Semana') return dateKey_(record.semanaInicio);
  return monthKey_(record.mesRef);
}

function panelResolvePeriodStart_(record, grain) {
  if (grain === 'Dia') return record.data;
  if (grain === 'Semana') return record.semanaInicio;
  return record.mesRef;
}

function panelResolvePeriodLabel_(record, grain) {
  if (grain === 'Dia') return Utilities.formatDate(record.data, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  if (grain === 'Semana') return buildWeekLabel_(record.semanaInicio);
  return record.mesLabel;
}

function panelBuildAggregateFromRecords_(records) {
  const aggregate = {
    routeSet: new Set(),
    plannedRouteSet: new Set(),
    totalCapacityVolume: 0,
    capacityKeys: new Set(),
    cargasRealizadas: 0,
    cargasPlanejadas: 0,
    volumesRealizados: 0,
    volumesPlanejados: 0,
    pedidosRealizados: 0,
    pedidosPlanejados: 0,
    pesoRealizadoKg: 0,
    pesoPlanejadoKg: 0,
    tempoRealizadoH: 0,
    tempoPlanejadoH: 0,
    valorPagamentoTotal: 0,
    kmRealizado: 0,
    kmPlanejado: 0,
    progressSum: 0,
    metaSprSum: 0,
    metaSprCount: 0,
    capacidadePesoTotalKg: 0,
    entreguesWeightedNumerator: 0,
    entreguesWeightedDenominator: 0,
    alertasCriticos: 0
  };

  records.forEach(record => {
    const routeKey = [record.idCarga, record.filial].join('|');
    if (routeKey && !aggregate.routeSet.has(routeKey)) aggregate.routeSet.add(routeKey);
    if (record.possuiPlanejado && routeKey && !aggregate.plannedRouteSet.has(routeKey)) aggregate.plannedRouteSet.add(routeKey);

    aggregate.volumesRealizados += record.volumesRealizados;
    aggregate.volumesPlanejados += record.volumesPlanejados;
    aggregate.pedidosRealizados += record.pedidosRealizados;
    aggregate.pedidosPlanejados += record.pedidosPlanejados;
    aggregate.pesoRealizadoKg += record.pesoRealizadoKg;
    aggregate.pesoPlanejadoKg += record.pesoPlanejadoKg;
    aggregate.tempoRealizadoH += record.tempoRealizadoH;
    aggregate.tempoPlanejadoH += record.tempoPlanejadoH;
    aggregate.valorPagamentoTotal += record.valorPagamentoCarga;
    aggregate.kmRealizado += record.kmRealizado;
    aggregate.kmPlanejado += record.kmPlanejado;
    aggregate.progressSum += record.progressoExecucaoNorm;

    if (record.metaSpr > 0) {
      aggregate.metaSprSum += record.metaSpr;
      aggregate.metaSprCount += 1;
    }

    if (record.capacidadePesoUnitKg) aggregate.capacidadePesoTotalKg += record.capacidadePesoUnitKg;

    const capacityKey = [record.nomeFilial, dateKey_(record.data)].join('|');
    if (record.capacidadeVolumeDia > 0 && !aggregate.capacityKeys.has(capacityKey)) {
      aggregate.capacityKeys.add(capacityKey);
      aggregate.totalCapacityVolume += record.capacidadeVolumeDia;
    }

    if (!isBlank_(record.entregaEfetiva)) {
      aggregate.entreguesWeightedNumerator += toNumber_(record.entregaEfetiva) * record.volumesRealizados;
      aggregate.entreguesWeightedDenominator += record.volumesRealizados;
    }

    if (record.criticoScore >= 60) aggregate.alertasCriticos += 1;
  });

  aggregate.cargasRealizadas = aggregate.routeSet.size;
  aggregate.cargasPlanejadas = aggregate.plannedRouteSet.size;
  aggregate.sprRealizado = safeDivideBlank_(aggregate.volumesRealizados, aggregate.cargasRealizadas);
  aggregate.sprPlanejado = safeDivideBlank_(aggregate.volumesPlanejados, aggregate.cargasPlanejadas);
  aggregate.metaSprMedia = safeDivideBlank_(aggregate.metaSprSum, aggregate.metaSprCount);
  aggregate.sprVsMeta = isBlank_(aggregate.sprRealizado) || isBlank_(aggregate.metaSprMedia) ? '' : aggregate.sprRealizado - aggregate.metaSprMedia;
  aggregate.progressoExecucao = safeDivideBlank_(aggregate.progressSum, aggregate.cargasRealizadas);
  aggregate.desvioTempoPct = safeDivideBlank_(aggregate.tempoRealizadoH - aggregate.tempoPlanejadoH, aggregate.tempoPlanejadoH);
  aggregate.entregaEfetiva = safeDivideBlank_(aggregate.entreguesWeightedNumerator, aggregate.entreguesWeightedDenominator);
  aggregate.aderenciaCapacidade = safeDivideBlank_(aggregate.volumesRealizados, aggregate.totalCapacityVolume);
  aggregate.ocupacaoPeso = safeDivideBlank_(aggregate.pesoRealizadoKg, aggregate.capacidadePesoTotalKg);
  aggregate.custoMedioCarga = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.cargasRealizadas);
  aggregate.custoMedioVolume = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.volumesRealizados);
  aggregate.custoMedioPedido = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.pedidosRealizados);
  aggregate.orhTempoReal = safeDivideBlank_(aggregate.tempoRealizadoH, aggregate.cargasRealizadas);
  aggregate.orhTempoPlan = safeDivideBlank_(aggregate.tempoPlanejadoH, aggregate.cargasPlanejadas);
  aggregate.dpphReal = safeDivideBlank_(aggregate.volumesRealizados, aggregate.tempoRealizadoH);
  aggregate.dpphPlan = safeDivideBlank_(aggregate.volumesPlanejados, aggregate.tempoPlanejadoH);

  return aggregate;
}

// Canonical support overrides
function panelBuildSemanticContext_(config, sources) {
  const support = sources.support || {};
  const availableSupport = Object.keys(support).filter(key => support[key] && support[key].length);
  const baseBounds = panelResolveSourceDateBoundsFromSources_(sources);
  const noTransportTypeStatus =
    panelIsAllValue_(config.transportadora) &&
    panelIsAllValue_(config.tipoVeiculo) &&
    panelIsAllValue_(config.status);
  const noDimensionFilters = noTransportTypeStatus && panelIsAllValue_(config.filial);
  const isFullPeriod = !!baseBounds.minDate && !!baseBounds.maxDate &&
    dateKey_(config.dataInicial) === dateKey_(baseBounds.minDate) &&
    dateKey_(config.dataFinal) === dateKey_(baseBounds.maxDate);

  return {
    availableSupport: availableSupport,
    availableSupportCount: availableSupport.length,
    useResumoFilial: !!(support.resumoFilial && support.resumoFilial.length && noTransportTypeStatus && isFullPeriod),
    useAlertasRotas: !!(support.alertasRotas && support.alertasRotas.length),
    useKpiResumoDiario: !!(support.kpiResumoDiario && support.kpiResumoDiario.length && noDimensionFilters),
    useKpiFilialDia: !!(support.kpiFilialDia && support.kpiFilialDia.length && noTransportTypeStatus),
    useKpiTransportadorDia: !!(support.kpiTransportadorDia && support.kpiTransportadorDia.length &&
      panelIsAllValue_(config.filial) && panelIsAllValue_(config.tipoVeiculo) && panelIsAllValue_(config.status)),
    useKpiCardLatest: !!(support.kpiCardLatest && support.kpiCardLatest.length && noDimensionFilters && isFullPeriod),
    useOcupacaoSupport: !!((sources.ocupacao || []).length && panelIsAllValue_(config.filial) && panelIsAllValue_(config.status)),
    useDrillRotas: !!(support.drillRotas && support.drillRotas.length),
    baseBounds: baseBounds,
    isFullPeriod: isFullPeriod,
    activePipeline: 'base',
    filteredRecordCount: 0
  };
}

function panelResolveSourceDateBoundsFromSources_(sources) {
  const candidates = [
    sources && sources.support ? sources.support.kpiResumoDiario : [],
    sources ? sources.diario : [],
    sources && sources.support ? sources.support.drillRotas : [],
    sources ? sources.base : []
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const rows = candidates[index] || [];
    if (!rows.length) continue;
    const bounds = panelResolveSourceDateBounds_(rows);
    if (bounds.minDate && bounds.maxDate) return bounds;
  }

  return {
    minDate: null,
    maxDate: null
  };
}

function panelCanUseSemanticPipeline_(config, sources, semanticContext) {
  return !!(
    semanticContext.useKpiResumoDiario &&
    semanticContext.useKpiFilialDia &&
    semanticContext.useKpiTransportadorDia &&
    semanticContext.useAlertasRotas &&
    semanticContext.useDrillRotas &&
    semanticContext.useOcupacaoSupport &&
    panelIsAllValue_(config.filial) &&
    panelIsAllValue_(config.transportadora) &&
    panelIsAllValue_(config.tipoVeiculo) &&
    panelIsAllValue_(config.status)
  );
}

function panelFilterKpiResumoDiarioRows_(rows, config) {
  return (rows || []).filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date) return false;
    return date >= config.dataInicial && date <= config.dataFinal;
  });
}

function panelResolveVolumesPlanejadosFromSummaryRow_(row) {
  const volumesReal = toNumber_(row['Qtd Volumes']);
  const aderVolumes = toNumber_(row['% Ader Volumes']);
  return aderVolumes > 0 ? safeDivideBlank_(volumesReal, aderVolumes) : '';
}

function panelResolvePedidosPlanejadosFromSummaryRow_(row) {
  const pedidosReal = toNumber_(row['Qtd Pedidos']);
  const aderPedidos = toNumber_(row['% Ader Pedidos']);
  return aderPedidos > 0 ? safeDivideBlank_(pedidosReal, aderPedidos) : '';
}

function panelResolvePesoPlanejadoFromSummaryRow_(row) {
  const pesoReal = toNumber_(row['Total Peso (kg)']);
  const aderPeso = toNumber_(row['% Ader Peso']);
  return aderPeso > 0 ? safeDivideBlank_(pesoReal, aderPeso) : '';
}

function panelResolveTempoPlanejadoTotalFromSummaryRow_(row, cargas) {
  const tempoRealTotal = toNumber_(row['Tempo Med Realizado (h)']) * cargas;
  const aderTempo = toNumber_(row['% Ader Tempo']);
  return aderTempo > 0 ? safeDivideBlank_(tempoRealTotal, aderTempo) : '';
}

function panelResolveCapacidadeVolumeFromSummaryRow_(row) {
  const volumesReal = toNumber_(row['Qtd Volumes']);
  const ocupacaoComposta = toNumber_(row['% Ocupacao Composta']);
  return ocupacaoComposta > 0 ? safeDivideBlank_(volumesReal, ocupacaoComposta) : '';
}

function panelBuildAggregateFromResumoDiarioRows_(rows, ocupacaoRows) {
  const aggregate = {
    cargasRealizadas: 0,
    cargasPlanejadas: 0,
    volumesRealizados: 0,
    volumesPlanejados: 0,
    pedidosRealizados: 0,
    pedidosPlanejados: 0,
    pesoRealizadoKg: 0,
    pesoPlanejadoKg: 0,
    tempoRealizadoH: 0,
    tempoPlanejadoH: 0,
    valorPagamentoTotal: 0,
    kmRealizado: 0,
    kmPlanejado: 0,
    progressSum: 0,
    metaSprSum: 0,
    metaSprCount: 0,
    totalCapacityVolume: 0,
    capacidadePesoTotalKg: 0,
    entreguesWeightedNumerator: 0,
    entreguesWeightedDenominator: 0,
    alertasCriticos: 0
  };

  (rows || []).forEach(row => {
    const cargas = toNumber_(row['Qtd Rotas']);
    const pedidosReal = toNumber_(row['Qtd Pedidos']);
    const volumesReal = toNumber_(row['Qtd Volumes']);
    const volumesPlan = toNumber_(panelResolveVolumesPlanejadosFromSummaryRow_(row));
    const pedidosPlan = toNumber_(panelResolvePedidosPlanejadosFromSummaryRow_(row));
    const pesoReal = toNumber_(row['Total Peso (kg)']);
    const pesoPlan = toNumber_(panelResolvePesoPlanejadoFromSummaryRow_(row));
    const tempoRealTotal = toNumber_(row['Tempo Med Realizado (h)']) * cargas;
    const tempoPlanTotal = toNumber_(panelResolveTempoPlanejadoTotalFromSummaryRow_(row, cargas));
    const metaSprVolumes = toNumber_(row['Meta SPR Volumes']);
    const capacidadeVolume = toNumber_(panelResolveCapacidadeVolumeFromSummaryRow_(row));
    const entregas = toNumber_(row['Qtd Entregas']);
    const insucessos = toNumber_(row['Qtd Insucessos']);

    aggregate.cargasRealizadas += cargas;
    aggregate.cargasPlanejadas += metaSprVolumes > 0 ? toNumber_(safeDivideBlank_(volumesPlan, metaSprVolumes)) : 0;
    aggregate.volumesRealizados += volumesReal;
    aggregate.volumesPlanejados += volumesPlan;
    aggregate.pedidosRealizados += pedidosReal;
    aggregate.pedidosPlanejados += pedidosPlan;
    aggregate.pesoRealizadoKg += pesoReal;
    aggregate.pesoPlanejadoKg += pesoPlan;
    aggregate.tempoRealizadoH += tempoRealTotal;
    aggregate.tempoPlanejadoH += tempoPlanTotal;
    aggregate.kmRealizado += toNumber_(row['Total KM Realizado']);
    aggregate.kmPlanejado += toNumber_(row['% Ader KM']) > 0
      ? toNumber_(safeDivideBlank_(toNumber_(row['Total KM Realizado']), toNumber_(row['% Ader KM'])))
      : 0;
    aggregate.progressSum += panelNormalizeLegacyProgress_(row['% Rotas Concluidas']) * cargas;
    aggregate.totalCapacityVolume += capacidadeVolume;
    aggregate.entreguesWeightedNumerator += entregas;
    aggregate.entreguesWeightedDenominator += (entregas + insucessos);

    if (metaSprVolumes > 0) {
      aggregate.metaSprSum += metaSprVolumes;
      aggregate.metaSprCount += 1;
    }
  });

  (ocupacaoRows || []).forEach(row => {
    aggregate.valorPagamentoTotal += toNumber_(row['Valor Pagamento Carga Total']);
    aggregate.capacidadePesoTotalKg += toNumber_(row['Capacidade Peso Total (kg)']);
  });

  aggregate.sprRealizado = safeDivideBlank_(aggregate.volumesRealizados, aggregate.cargasRealizadas);
  aggregate.sprPlanejado = safeDivideBlank_(aggregate.volumesPlanejados, aggregate.cargasPlanejadas);
  aggregate.metaSprMedia = safeDivideBlank_(aggregate.metaSprSum, aggregate.metaSprCount);
  aggregate.sprVsMeta = isBlank_(aggregate.sprRealizado) || isBlank_(aggregate.metaSprMedia)
    ? ''
    : aggregate.sprRealizado - aggregate.metaSprMedia;
  aggregate.progressoExecucao = safeDivideBlank_(aggregate.progressSum, aggregate.cargasRealizadas);
  aggregate.desvioTempoPct = safeDivideBlank_(aggregate.tempoRealizadoH - aggregate.tempoPlanejadoH, aggregate.tempoPlanejadoH);
  aggregate.entregaEfetiva = safeDivideBlank_(aggregate.entreguesWeightedNumerator, aggregate.entreguesWeightedDenominator);
  aggregate.aderenciaCapacidade = safeDivideBlank_(aggregate.volumesRealizados, aggregate.totalCapacityVolume);
  aggregate.ocupacaoPeso = safeDivideBlank_(
    (ocupacaoRows || []).reduce((sum, row) => sum + toNumber_(row['Peso Total (kg)']), 0),
    aggregate.capacidadePesoTotalKg
  );
  aggregate.custoMedioCarga = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.cargasRealizadas);
  aggregate.custoMedioVolume = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.volumesRealizados);
  aggregate.custoMedioPedido = safeDivideBlank_(aggregate.valorPagamentoTotal, aggregate.pedidosRealizados);
  aggregate.orhTempoReal = safeDivideBlank_(aggregate.tempoRealizadoH, aggregate.cargasRealizadas);
  aggregate.orhTempoPlan = safeDivideBlank_(aggregate.tempoPlanejadoH, aggregate.cargasPlanejadas);
  aggregate.dpphReal = safeDivideBlank_(aggregate.volumesRealizados, aggregate.tempoRealizadoH);
  aggregate.dpphPlan = safeDivideBlank_(aggregate.volumesPlanejados, aggregate.tempoPlanejadoH);

  return aggregate;
}

function panelResolveSemanticPeriodKey_(row, grain) {
  const date = startOfDay_(row['Data']);
  if (!date) return '';
  if (grain === 'Dia') return dateKey_(date);
  if (grain === 'Semana') return dateKey_(startOfDay_(row['SemanaInicio']) || weekStart_(date));
  return monthKey_(date);
}

function panelResolveSemanticPeriodStart_(row, grain) {
  const date = startOfDay_(row['Data']);
  if (!date) return null;
  if (grain === 'Dia') return date;
  if (grain === 'Semana') return startOfDay_(row['SemanaInicio']) || weekStart_(date);
  return monthStart_(date);
}

function panelResolveSemanticPeriodLabel_(row, grain) {
  const date = startOfDay_(row['Data']);
  if (!date) return '';
  if (grain === 'Dia') return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  if (grain === 'Semana') return row['SemanaLabel'] || ('Sem ' + formatDate_(weekStart_(date)) + ' a ' + formatDate_(endOfWeek_(weekStart_(date))));
  return row['MesNome'] || Utilities.formatDate(monthStart_(date), Session.getScriptTimeZone(), 'MM/yyyy');
}

function panelBuildPeriodSeriesFromResumoDiario_(rows, grain, ocupacaoRows) {
  const groups = new Map();

  (rows || []).forEach(row => {
    const key = panelResolveSemanticPeriodKey_(row, grain);
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, {
        label: panelResolveSemanticPeriodLabel_(row, grain),
        periodStart: panelResolveSemanticPeriodStart_(row, grain),
        rows: []
      });
    }
    groups.get(key).rows.push(row);
  });

  return [...groups.values()]
    .map(group => {
      const groupOcupacaoRows = (ocupacaoRows || []).filter(row => {
        const date = startOfDay_(row['Data']);
        if (!date || !group.periodStart) return false;
        if (grain === 'Dia') return dateKey_(date) === dateKey_(group.periodStart);
        if (grain === 'Semana') return dateKey_(weekStart_(date)) === dateKey_(group.periodStart);
        return monthKey_(date) === monthKey_(group.periodStart);
      });
      const aggregate = panelBuildAggregateFromResumoDiarioRows_(group.rows, groupOcupacaoRows);
      aggregate.label = group.label;
      aggregate.periodStart = group.periodStart;
      return aggregate;
    })
    .sort((a, b) => (a.periodStart ? a.periodStart.getTime() : 0) - (b.periodStart ? b.periodStart.getTime() : 0));
}

function panelBuildDrilldownDetailSectionsFromDrillRows_(rows) {
  const allRows = (rows || [])
    .slice()
    .sort((a, b) => {
      const priorityDiff = toNumber_(b['Prioridade']) - toNumber_(a['Prioridade']);
      if (priorityDiff !== 0) return priorityDiff;
      const dateA = toDate_(a['Data']);
      const dateB = toDate_(b['Data']);
      return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
    })
    .map(row => {
      const tempoPlan = toNumber_(row['Tempo Planejado (h)']);
      const tempoReal = toNumber_(row['Tempo Realizado (h)']);
      const alertParts = [];
      if (toNumber_(row['Flag Nao Planejada']) > 0) alertParts.push('Nao planejada');
      if (toNumber_(row['Flag Match Critico']) > 0) alertParts.push('Match critico');
      if (toNumber_(row['Flag Entrega Critica']) > 0) alertParts.push('Entrega critica');
      if (toNumber_(row['Flag Overtime']) > 0) alertParts.push('Overtime');
      if (toNumber_(row['Flag Sem Tempo']) > 0) alertParts.push('Sem tempo');

      return [
        row['Data'] || '',
        row['MesKey'] || '',
        row['AnoSemana'] || '',
        row['Filial'] || '',
        row['Transportador'] || '',
        row['Tipo de Veiculo Padrao'] || '',
        row['Status'] || '',
        '',
        row['Rota'] || '',
        row['Motorista'] || '',
        row['Placa'] || '',
        toNumber_(row['Volumes da Rota']),
        '',
        toNumber_(row['Peso (kg)']),
        '',
        toNumber_(row['Volumes da Rota']),
        '',
        panelParsePercentValue_(row['Entrega Efetiva Rota']),
        tempoReal,
        tempoPlan,
        tempoPlan > 0 ? safeDivideBlank_(tempoReal - tempoPlan, tempoPlan) : '',
        '',
        alertParts.join(' | ') || row['Status Rota'] || ''
      ];
    });

  return {
    visible: {
      headers: panelGetDrilldownDetailHeaders_(),
      rows: allRows.slice(0, PANEL_DEFAULTS.maxVisibleDetailRows),
      totalRows: allRows.length,
      isTruncated: allRows.length > PANEL_DEFAULTS.maxVisibleDetailRows
    },
    cache: {
      headers: panelGetDrilldownDetailHeaders_(),
      rows: allRows.slice(0, PANEL_DEFAULTS.maxCacheDetailRows),
      totalRows: allRows.length,
      isTruncated: allRows.length > PANEL_DEFAULTS.maxCacheDetailRows
    }
  };
}

function panelFilterKpiFilialDiaRows_(rows, config) {
  return (rows || []).filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date || date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.filial)) {
      const filterValue = normalizeText_(config.filial);
      if (normalizeText_(row['Filial']) !== filterValue) return false;
    }
    return true;
  });
}

function panelFilterKpiTransportadorRows_(rows, config) {
  return (rows || []).filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date || date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.transportadora) &&
      normalizeText_(row['Transportador']) !== normalizeText_(config.transportadora)) {
      return false;
    }
    return true;
  });
}

function panelFilterOcupacaoRowsForSemantic_(rows, config) {
  return (rows || []).filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date || date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.transportadora) &&
      normalizeText_(row['Transportador']) !== normalizeText_(config.transportadora)) {
      return false;
    }
    if (!panelIsAllValue_(config.tipoVeiculo) &&
      normalizeText_(row['Tipo de Veiculo']) !== normalizeText_(config.tipoVeiculo)) {
      return false;
    }
    return true;
  });
}

function panelFilterDrillRowsForSemantic_(rows, config) {
  return (rows || []).filter(row => {
    const date = startOfDay_(row['Data']);
    if (!date || date < config.dataInicial || date > config.dataFinal) return false;
    if (!panelIsAllValue_(config.filial) && normalizeText_(row['Filial']) !== normalizeText_(config.filial)) return false;
    if (!panelIsAllValue_(config.transportadora) &&
      normalizeText_(row['Transportador']) !== normalizeText_(config.transportadora)) {
      return false;
    }
    if (!panelIsAllValue_(config.tipoVeiculo) &&
      normalizeText_(row['Tipo de Veiculo Padrao']) !== normalizeText_(config.tipoVeiculo)) {
      return false;
    }
    if (!panelIsAllValue_(config.status) && normalizeText_(row['Status']) !== normalizeText_(config.status)) return false;
    return true;
  });
}

function panelPrepareSemanticDrillContext_(rows) {
  const statusGroups = new Map();
  const filialDayStatusGroups = new Map();
  const statusOrder = PANEL_STATUS_ORDER.slice();
  statusOrder.forEach(status => {
    statusGroups.set(status, {
      status: status,
      cargas: 0,
      volumes: 0,
      peso: 0,
      progressoSum: 0,
      entregues: 0,
      insucessos: 0
    });
  });

  const sortedRows = (rows || []).slice().sort((a, b) => {
    const dateA = toDate_(a['Data']);
    const dateB = toDate_(b['Data']);
    return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
  });

  sortedRows.forEach(row => {
    const statusBucket = panelResolveStatusBucket_(row['Status']);
    const statusGroup = statusGroups.get(statusBucket) || {
      status: statusBucket,
      cargas: 0,
      volumes: 0,
      peso: 0,
      progressoSum: 0,
      entregues: 0,
      insucessos: 0
    };
    statusGroup.cargas += 1;
    statusGroup.volumes += toNumber_(row['Volumes da Rota']);
    statusGroup.peso += toNumber_(row['Peso (kg)']);
    statusGroup.progressoSum += panelGetExecutionProgressNormalized_(row['Status']);
    statusGroup.entregues += toNumber_(row['Entregues']);
    statusGroup.insucessos += toNumber_(row['Insucessos']);
    statusGroups.set(statusBucket, statusGroup);

    const filialDayStatusKey = [
      String(row['Filial'] || '').trim() || 'Nao Informado',
      dateKey_(row['Data']),
      statusBucket
    ].join('|');
    if (!filialDayStatusGroups.has(filialDayStatusKey)) {
      filialDayStatusGroups.set(filialDayStatusKey, {
        filial: row['Filial'] || '',
        data: row['Data'] || '',
        status: statusBucket,
        cargas: 0,
        volumes: 0,
        peso: 0,
        progressoSum: 0
      });
    }
    const filialDayStatusGroup = filialDayStatusGroups.get(filialDayStatusKey);
    filialDayStatusGroup.cargas += 1;
    filialDayStatusGroup.volumes += toNumber_(row['Volumes da Rota']);
    filialDayStatusGroup.peso += toNumber_(row['Peso (kg)']);
    filialDayStatusGroup.progressoSum += panelGetExecutionProgressNormalized_(row['Status']);
  });

  const detailHeaders = panelGetDrilldownDetailHeaders_();
  const detailVisibleRows = sortedRows.slice(0, PANEL_DEFAULTS.maxVisibleDetailRows).map(panelBuildSemanticDrillDetailRow_);
  const detailCacheRows = sortedRows.slice(0, PANEL_DEFAULTS.maxCacheDetailRows).map(panelBuildSemanticDrillDetailRow_);

  return {
    statusSection: {
      headers: ['Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execucao (%)', 'Entrega Efetiva'],
      rows: [...statusGroups.values()].map(group => ([
        group.status,
        group.cargas,
        group.volumes,
        group.peso,
        group.cargas ? safeDivideBlank_(group.progressoSum, group.cargas) : '',
        safeDivideBlank_(group.entregues, group.entregues + group.insucessos)
      ]))
    },
    filialDayStatusSection: {
      headers: ['Filial', 'Data', 'Status', 'Cargas', 'Volumes', 'Peso Realizado (kg)', 'Progresso Execucao (%)'],
      rows: [...filialDayStatusGroups.values()].map(group => ([
        group.filial,
        group.data,
        group.status,
        group.cargas,
        group.volumes,
        group.peso,
        group.cargas ? safeDivideBlank_(group.progressoSum, group.cargas) : ''
      ]))
    },
    detailSections: {
      visible: {
        headers: detailHeaders,
        rows: detailVisibleRows,
        totalRows: sortedRows.length,
        isTruncated: sortedRows.length > PANEL_DEFAULTS.maxVisibleDetailRows
      },
      cache: {
        headers: detailHeaders,
        rows: detailCacheRows,
        totalRows: sortedRows.length,
        isTruncated: sortedRows.length > PANEL_DEFAULTS.maxCacheDetailRows
      }
    }
  };
}

function panelBuildSemanticDrillDetailRow_(row) {
  const tempoPlan = toNumber_(row['Tempo Planejado (h)']);
  const tempoReal = toNumber_(row['Tempo Realizado (h)']);
  const alertParts = [];
  if (toNumber_(row['Flag Nao Planejada']) > 0) alertParts.push('Nao planejada');
  if (toNumber_(row['Flag Match Critico']) > 0) alertParts.push('Match critico');
  if (toNumber_(row['Flag Entrega Critica']) > 0) alertParts.push('Entrega critica');
  if (toNumber_(row['Flag Overtime']) > 0) alertParts.push('Overtime');
  if (toNumber_(row['Flag Sem Tempo']) > 0) alertParts.push('Sem tempo');

  return [
    row['Data'] || '',
    row['MesKey'] || '',
    row['AnoSemana'] || '',
    row['Filial'] || '',
    row['Transportador'] || '',
    row['Tipo de Veiculo Padrao'] || '',
    row['Status'] || '',
    '',
    row['Rota'] || '',
    row['Motorista'] || '',
    row['Placa'] || '',
    toNumber_(row['Volumes da Rota']),
    '',
    toNumber_(row['Peso (kg)']),
    '',
    toNumber_(row['Volumes da Rota']),
    '',
    panelParsePercentValue_(row['Entrega Efetiva Rota']),
    tempoReal,
    tempoPlan,
    tempoPlan > 0 ? safeDivideBlank_(tempoReal - tempoPlan, tempoPlan) : '',
    '',
    alertParts.join(' | ') || row['Status Rota'] || ''
  ];
}

function panelBuildAlertCountMap_(rows, dimensionField) {
  const map = new Map();
  (rows || []).forEach(row => {
    const key = String(row[dimensionField] || '').trim() || 'Nao Informado';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function panelBuildAnalytics_(records, config, sources, semanticContextOverride) {
  const semanticContext = semanticContextOverride || panelBuildSemanticContext_(config, sources);
  const canUseSemanticPipeline = panelCanUseSemanticPipeline_(config, sources, semanticContext);
  const filteredResumoDiarioRows = semanticContext.useKpiResumoDiario
    ? panelFilterKpiResumoDiarioRows_(sources.support.kpiResumoDiario, config)
    : [];
  const filteredKpiFilialRows = semanticContext.useKpiFilialDia
    ? panelFilterKpiFilialDiaRows_(sources.support.kpiFilialDia, config)
    : [];
  const filteredKpiTransportadorRows = semanticContext.useKpiTransportadorDia
    ? panelFilterKpiTransportadorRows_(sources.support.kpiTransportadorDia, config)
    : [];
  const filteredOcupacaoRows = semanticContext.useOcupacaoSupport
    ? panelFilterOcupacaoRowsForSemantic_(sources.ocupacao, config)
    : [];
  const filteredDrillRows = semanticContext.useDrillRotas
    ? panelFilterDrillRowsForSemantic_(sources.support.drillRotas, config)
    : [];
  const drillContext = filteredDrillRows.length
    ? panelPrepareSemanticDrillContext_(filteredDrillRows)
    : null;
  const overall = canUseSemanticPipeline
    ? panelBuildAggregateFromResumoDiarioRows_(filteredResumoDiarioRows, filteredOcupacaoRows)
    : panelBuildAggregateFromRecords_(records);
  const serieDiaria = canUseSemanticPipeline
    ? panelBuildPeriodSeriesFromResumoDiario_(filteredResumoDiarioRows, 'Dia', filteredOcupacaoRows)
    : panelBuildPeriodSeries_(records, 'Dia');
  const serieSemanal = canUseSemanticPipeline
    ? panelBuildPeriodSeriesFromResumoDiario_(filteredResumoDiarioRows, 'Semana', filteredOcupacaoRows)
    : panelBuildPeriodSeries_(records, 'Semana');
  const serieMensal = canUseSemanticPipeline
    ? panelBuildPeriodSeriesFromResumoDiario_(filteredResumoDiarioRows, 'Mes', filteredOcupacaoRows)
    : panelBuildPeriodSeries_(records, 'Mes');
  const drilldownSections = canUseSemanticPipeline && drillContext
    ? drillContext.detailSections
    : panelBuildDrilldownDetailSections_(records);

  semanticContext.activePipeline = canUseSemanticPipeline ? 'semantic_global' : 'base';
  semanticContext.filteredRecordCount = canUseSemanticPipeline
    ? Math.max(filteredDrillRows.length, filteredResumoDiarioRows.length)
    : records.length;

  return {
    metadata: panelBuildMetadataSection_(records, config, overall, semanticContext),
    semanticSupportStatus: panelBuildSemanticSupportStatusSection_(semanticContext),
    kpis: panelBuildKpiSection_(overall),
    kpiCardLatest: panelBuildKpiCardLatestSection_(sources.support.kpiCardLatest, semanticContext),
    serieDiaria: panelBuildSeriesSection_(serieDiaria),
    serieSemanal: panelBuildSeriesSection_(serieSemanal),
    serieMensal: panelBuildSeriesSection_(serieMensal),
    rankFilial: semanticContext.useResumoFilial
      ? panelBuildResumoFilialSection_(sources.support.resumoFilial, config)
      : (filteredKpiFilialRows.length
        ? panelBuildFilialRankingFromKpiFilialDay_(filteredKpiFilialRows)
        : panelBuildRankingSection_(records, 'nomeFilial', 'Filial')),
    rankTransportadora: filteredKpiTransportadorRows.length
      ? panelBuildTransportadoraRankingFromKpiTransportadorDia_(filteredKpiTransportadorRows, filteredOcupacaoRows)
      : panelBuildRankingSection_(records, 'transportadora', 'Transportadora'),
    rankTipoVeiculo: filteredOcupacaoRows.length
      ? panelBuildTipoVeiculoRankingFromOcupacaoRows_(filteredOcupacaoRows)
      : panelBuildRankingSection_(records, 'tipoVeiculo', 'Tipo de Veiculo'),
    ocupacao: filteredOcupacaoRows.length
      ? panelBuildOccupancySectionFromOcupacaoRows_(filteredOcupacaoRows)
      : panelBuildOccupancySection_(records),
    custos: filteredOcupacaoRows.length
      ? panelBuildCostSectionFromOcupacaoRows_(filteredOcupacaoRows)
      : panelBuildCostSection_(records),
    statusOperacional: drillContext
      ? drillContext.statusSection
      : panelBuildStatusSection_(records),
    excecoes: semanticContext.useAlertasRotas
      ? panelBuildExceptionsFromAlertasSection_(sources.support.alertasRotas, config)
      : panelBuildExceptionsSection_(records),
    drillMesSemanaDiaFilial: filteredKpiFilialRows.length
      ? panelBuildDrillMonthWeekDayFilialFromKpiFilialDay_(filteredKpiFilialRows)
      : panelBuildDrillMonthWeekDayFilialSection_(records),
    drillFilialDiaStatus: drillContext
      ? drillContext.filialDayStatusSection
      : panelBuildDrillFilialDayStatusSection_(records),
    drillTransportadoraTipoDia: filteredOcupacaoRows.length
      ? panelBuildDrillTransportadoraTipoDiaFromOcupacaoRows_(filteredOcupacaoRows)
      : panelBuildDrillTransportadoraTipoDiaSection_(records),
    drilldownDetalhe: drilldownSections.visible,
    drilldownCacheDetail: drilldownSections.cache,
    dailySourceSupport: panelBuildDailySupportSection_(sources.diario, config),
    ocupacaoSourceSupport: panelBuildOcupacaoSupportSection_(sources.ocupacao, config)
  };
}
