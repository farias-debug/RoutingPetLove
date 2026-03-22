function criarOuAtualizarPainelGerencial_(ss, cacheBundle, auxSections, config) {
  panelTraceStep_('rebuild_core', 'gerencial_inicio');
  const sheet = panelRecreateSheetPreservingPosition_(ss, PANEL_SHEETS.gerencial);
  panelClearManagedSheet_(sheet);
  panelSetDefaultColumns_(sheet, [180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180]);
  panelWriteSheetTitle_(sheet, 'Painel Gerencial', 'Visao executiva consolidada da operacao logistica.');
  panelWriteSummaryBanner_(sheet, 3, 'Filtro ativo', panelBuildFilterSummary_(config));
  panelTraceStep_('rebuild_core', 'gerencial_layout_ok');

  const kpiCards = panelBuildGerencialKpis_(cacheBundle.analytics);
  panelWriteKpiCards_(sheet, 5, 1, kpiCards);
  panelTraceStep_('rebuild_core', 'gerencial_kpis_ok');

  if (PANEL_FEATURES.enableCharts) {
    panelInsertChartFromNamedRange_(sheet, 'aux_trend_mensal', Charts.ChartType.LINE, 'Tendencia Mensal', 11, 1, {
      legend: { position: 'bottom' },
      series: { 0: { targetAxisIndex: 0 }, 1: { targetAxisIndex: 0 } },
      width: 720,
      height: 260
    });
    panelInsertChartFromNamedRange_(sheet, 'aux_trend_atual', Charts.ChartType.COMBO, 'Planejado vs Realizado', 11, 8, {
      legend: { position: 'bottom' },
      seriesType: 'bars',
      series: { 0: { type: 'bars' }, 1: { type: 'bars' }, 2: { type: 'line' } },
      width: 720,
      height: 260
    });
    panelInsertChartFromNamedRange_(sheet, 'aux_ranking_filial', Charts.ChartType.BAR, 'Ranking de Filiais', 26, 1, { width: 720, height: 260 });
    panelInsertChartFromNamedRange_(sheet, 'aux_ranking_transportadora', Charts.ChartType.BAR, 'Ranking de Transportadoras', 26, 8, { width: 720, height: 260 });
    panelInsertChartFromNamedRange_(sheet, 'aux_ocupacao', Charts.ChartType.COLUMN, 'Ocupacao por Tipo de Veiculo', 41, 1, { width: 720, height: 260 });
    panelInsertChartFromNamedRange_(sheet, 'aux_status_operacional', Charts.ChartType.COLUMN, 'Status Operacional', 41, 8, { width: 720, height: 260 });
  }

  panelWriteTableBlock_(
    sheet,
    56,
    1,
    'Top Filiais',
    cacheBundle.analytics.rankFilial.headers,
    cacheBundle.analytics.rankFilial.rows.slice(0, 8),
    {}
  );
  panelWriteTableBlock_(
    sheet,
    56,
    8,
    'Top Transportadoras',
    cacheBundle.analytics.rankTransportadora.headers,
    cacheBundle.analytics.rankTransportadora.rows.slice(0, 8),
    {}
  );
  panelTraceStep_('rebuild_core', 'gerencial_tables_ok');
}

function criarOuAtualizarPainelOperacional_(ss, cacheBundle, auxSections, config) {
  panelTraceStep_('rebuild_core', 'operacional_inicio');
  const sheet = panelRecreateSheetPreservingPosition_(ss, PANEL_SHEETS.operacional);
  panelClearManagedSheet_(sheet);
  panelSetDefaultColumns_(sheet, [170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170]);
  panelWriteSheetTitle_(sheet, 'Painel Operacional', 'Acompanhamento diario e semanal com foco em execucao e excecoes.');
  panelWriteSummaryBanner_(sheet, 3, 'Filtro ativo', panelBuildFilterSummary_(config) + ' | Granularidade: ' + config.granularidade);
  panelTraceStep_('rebuild_core', 'operacional_layout_ok');

  const kpiCards = panelBuildOperationalKpis_(cacheBundle.analytics);
  panelWriteKpiCards_(sheet, 5, 1, kpiCards);
  panelTraceStep_('rebuild_core', 'operacional_kpis_ok');

  if (PANEL_FEATURES.enableCharts) {
    panelInsertChartFromNamedRange_(sheet, 'aux_trend_atual', Charts.ChartType.COMBO, 'Tendencia Operacional', 11, 1, {
      legend: { position: 'bottom' },
      width: 720,
      height: 260
    });
    panelInsertChartFromNamedRange_(sheet, 'aux_status_operacional', Charts.ChartType.COLUMN, 'Status da Execucao', 11, 8, {
      legend: { position: 'none' },
      width: 720,
      height: 260
    });
    panelInsertChartFromNamedRange_(sheet, 'aux_custos', Charts.ChartType.BAR, 'Eficiencia por Transportadora', 26, 1, {
      width: 720,
      height: 260
    });
    panelInsertChartFromNamedRange_(sheet, 'aux_ocupacao', Charts.ChartType.COLUMN, 'Ocupacao Operacional', 26, 8, {
      width: 720,
      height: 260
    });
  }

  panelWriteTableBlock_(
    sheet,
    41,
    1,
    'Tabela de Excecoes',
    cacheBundle.analytics.excecoes.headers,
    cacheBundle.analytics.excecoes.rows,
    {}
  );
  panelWriteTableBlock_(
    sheet,
    41,
    10,
    'Ranking Operacional',
    cacheBundle.analytics.rankFilial.headers,
    cacheBundle.analytics.rankFilial.rows.slice(0, 10),
    {}
  );
  panelTraceStep_('rebuild_core', 'operacional_tables_ok');
}

function criarOuAtualizarDrilldownAnalitico_(ss, cacheBundle, auxSections, config) {
  panelTraceStep_('rebuild_core', 'drilldown_inicio');
  const sheet = panelRecreateSheetPreservingPosition_(ss, PANEL_SHEETS.drilldown);
  panelClearManagedSheet_(sheet);
  panelSetDefaultColumns_(sheet, [150, 150, 150, 180, 180, 170, 170, 170, 170, 170, 170, 170]);
  panelWriteSheetTitle_(sheet, 'Drilldown Analitico', 'Exploracao guiada com detalhe operacional e fluxos analiticos.');
  panelWriteSummaryBanner_(sheet, 3, 'Contexto', panelBuildFilterSummary_(config));
  panelTraceStep_('rebuild_core', 'drilldown_layout_ok');

  sheet.getRange(5, 1, 3, 8).merge();
  sheet.getRange(5, 1).setValue(
    'Use a Sidebar ou a aba _CONFIG_PAINEL para trocar filtros. Esta aba mostra tres caminhos analiticos e uma tabela detalhada de cargas ja filtrada.'
  ).setWrap(true).setBackground(PANEL_COLORS.surface).setFontColor(PANEL_COLORS.textSecondary);
  panelTraceStep_('rebuild_core', 'drilldown_intro_ok');

  panelWriteTableBlock_(
    sheet,
    9,
    1,
    'Fluxo 1 | Mes > Semana > Dia > Filial',
    cacheBundle.analytics.drillMesSemanaDiaFilial.headers,
    cacheBundle.analytics.drillMesSemanaDiaFilial.rows.slice(0, 15),
    {}
  );
  panelTraceStep_('rebuild_core', 'drilldown_fluxo1_ok');
  panelWriteTableBlock_(
    sheet,
    9,
    10,
    'Fluxo 2 | Filial > Dia > Status',
    cacheBundle.analytics.drillFilialDiaStatus.headers,
    cacheBundle.analytics.drillFilialDiaStatus.rows.slice(0, 15),
    {}
  );
  panelTraceStep_('rebuild_core', 'drilldown_fluxo2_ok');
  panelWriteTableBlock_(
    sheet,
    32,
    1,
    'Fluxo 3 | Transportadora > Tipo > Dia',
    cacheBundle.analytics.drillTransportadoraTipoDia.headers,
    cacheBundle.analytics.drillTransportadoraTipoDia.rows.slice(0, 15),
    {}
  );
  panelTraceStep_('rebuild_core', 'drilldown_fluxo3_ok');

  const detailSection = cacheBundle.analytics.drilldownDetalhe;
  const detailInfoText = detailSection.isTruncated
    ? 'Detalhe limitado para performance: exibindo ' + detailSection.rows.length + ' de ' + detailSection.totalRows + ' linhas filtradas.'
    : 'Detalhe completo das cargas filtradas.';
  sheet.getRange(53, 1, 1, 12).merge();
  sheet.getRange(53, 1)
    .setValue(detailInfoText)
    .setWrap(true)
    .setBackground(PANEL_COLORS.surface)
    .setFontColor(PANEL_COLORS.textSecondary)
    .setFontSize(9);
  panelTraceStep_('rebuild_core', 'drilldown_meta_ok');

  const detailMeta = panelWriteTableBlock_(
    sheet,
    55,
    1,
    'Detalhe de Cargas',
    detailSection.headers,
    detailSection.rows,
    { freezeHeader: true }
  );
  panelTraceStep_('rebuild_core', 'drilldown_detail_table_ok');

  let detailRange = null;
  if (detailMeta.rowCount <= 80) {
    detailRange = sheet.getRange(detailMeta.headerRow, 1, detailMeta.rowCount + 1, detailMeta.colCount);
    if (!sheet.getFilter()) {
      detailRange.createFilter();
    }
    panelTraceStep_('rebuild_core', 'drilldown_filter_ok');
  } else {
    panelTraceStep_('rebuild_core', 'drilldown_filter_skip');
  }
  if (PANEL_FEATURES.enableSlicers && detailRange && detailMeta.rowCount <= PANEL_DEFAULTS.maxSlicerRows) {
    criarOuAtualizarSlicers_(sheet, detailRange);
  }
  panelTraceStep_('rebuild_core', 'drilldown_tables_ok');
}

function panelBuildFilterSummary_(config) {
  return [
    'Periodo ' + Utilities.formatDate(config.dataInicial, Session.getScriptTimeZone(), 'dd/MM/yyyy') + ' a ' + Utilities.formatDate(config.dataFinal, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    'Filial: ' + config.filial,
    'Transportadora: ' + config.transportadora,
    'Tipo: ' + config.tipoVeiculo,
    'Status: ' + config.status
  ].join(' | ');
}

function panelBuildGerencialKpis_(analytics) {
  const kpiMap = panelBuildKpiValueMap_(analytics.kpis.rows);
  return [
    panelCreateCardFromMetric_(kpiMap, 'Cargas Realizadas', '0'),
    panelCreateCardFromMetric_(kpiMap, 'Volumes Realizados', '0'),
    panelCreateCardFromMetric_(kpiMap, 'SPR Realizado', '0.00'),
    panelCreateCardFromMetric_(kpiMap, 'Entrega Efetiva', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Aderencia Capacidade', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Ocupacao Peso', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'SPR vs Meta', '0.00'),
    panelCreateCardFromMetric_(kpiMap, 'Custo Medio/Carga', 'R$ #,##0.00')
  ];
}

function panelBuildOperationalKpis_(analytics) {
  const kpiMap = panelBuildKpiValueMap_(analytics.kpis.rows);
  const statusRows = analytics.statusOperacional.rows;
  const finalizadas = panelFindStatusMetric_(statusRows, 'FINALIZADO');
  const emRota = panelFindStatusMetric_(statusRows, 'EM ROTA');
  const parciais = panelFindStatusMetric_(statusRows, 'PARCIAL');
  const latestTrend = panelGetLatestTrendRow_(analytics);

  return [
    panelCreateCardFromMetric_(kpiMap, 'Progresso Execucao', '0.00%'),
    panelCreateCard_('Finalizadas', finalizadas, '0'),
    panelCreateCard_('Em Rota', emRota, '0'),
    panelCreateCard_('Parciais', parciais, '0'),
    panelCreateCard_('Excecoes Criticas', analytics.excecoes.rows.length, '0'),
    panelCreateCardFromMetric_(kpiMap, 'SPR Planejado', '0.00'),
    panelCreateCard_('Desvio Tempo', latestTrend ? latestTrend[12] : '', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Custo Medio/Carga', 'R$ #,##0.00')
  ];
}

function panelBuildKpiValueMap_(kpiRows) {
  const map = {};
  kpiRows.forEach(row => {
    map[row[0]] = {
      value: row[1],
      detail: row[2] || '',
      format: row[3] || '@',
      color: row[4] || ''
    };
  });
  return map;
}

function panelCreateCardFromMetric_(metricMap, label, fallbackFormat) {
  const metric = metricMap[label] || {};
  return panelCreateCard_(
    label,
    metric.value,
    metric.format || fallbackFormat,
    metric.detail || '',
    metric.color || panelResolveCardColor_(label, metric.value)
  );
}

function panelFindStatusMetric_(statusRows, statusName) {
  const row = statusRows.find(item => normalizeText_(item[0]) === normalizeText_(statusName));
  return row ? row[1] : 0;
}

function panelCreateCard_(label, value, format, detail, color) {
  return {
    label: label,
    value: value,
    detail: detail || '',
    format: format,
    color: color || panelResolveCardColor_(label, value)
  };
}

function panelResolveCardColor_(label, value) {
  const normalized = normalizeText_(label);
  const numeric = toNumber_(value);

  if (normalized.indexOf('EXCECOES') >= 0) return numeric > 0 ? PANEL_COLORS.danger : PANEL_COLORS.success;
  if (normalized.indexOf('ENTREGA') >= 0 || normalized.indexOf('ADERENCIA') >= 0 || normalized.indexOf('OCUPACAO') >= 0 || normalized.indexOf('PROGRESSO') >= 0) {
    if (numeric >= 0.95) return PANEL_COLORS.success;
    if (numeric >= 0.8) return PANEL_COLORS.accent;
    return PANEL_COLORS.danger;
  }
  if (normalized.indexOf('SPR VS META') >= 0) {
    if (numeric >= 0) return PANEL_COLORS.success;
    if (numeric >= -5) return PANEL_COLORS.accent;
    return PANEL_COLORS.danger;
  }
  return PANEL_COLORS.primary;
}

function panelGetLatestTrendRow_(analytics) {
  const series = analytics.serieDiaria.rows.length ? analytics.serieDiaria.rows :
    (analytics.serieSemanal.rows.length ? analytics.serieSemanal.rows : analytics.serieMensal.rows);
  return series.length ? series[series.length - 1] : null;
}

function panelBuildSnapshotMetricMap_(rows) {
  const map = {};

  (rows || []).forEach(row => {
    const key = normalizeText_(row[0]);
    map[key] = {
      label: row[0],
      value: row[1],
      meta: row[2],
      delta: row[3],
      status: row[4] || '',
      color: row[5] ? (String(row[5]).indexOf('#') === 0 ? row[5] : '#' + row[5]) : '',
      trendD1: row[6],
      trendWoW: row[7],
      dataBase: row[8],
      valueText: row[9] || '',
      metaText: row[10] || '',
      deltaText: row[11] || '',
      trendD1Text: row[12] || '',
      trendWoWText: row[13] || '',
      action: row[14] || ''
    };
  });

  return map;
}

function panelResolveSnapshotFormat_(label, snapshot) {
  const normalized = normalizeText_(label);
  const valueText = snapshot && snapshot.valueText ? String(snapshot.valueText) : '';

  if (valueText.indexOf('%') >= 0) return '0.00%';
  if (/ORH|SPR|TEMPO/.test(normalized)) return '0.00';
  if (/QTD|ROTAS|PEDIDOS|EXCECOES/.test(normalized)) return '0';
  return '0.00';
}

function panelCreateCardFromSnapshotMetric_(snapshotMap, label, fallbackColor) {
  const snapshot = snapshotMap[normalizeText_(label)];
  if (!snapshot) return null;

  const detailParts = [];
  if (snapshot.status) detailParts.push(snapshot.status);
  if (snapshot.metaText) detailParts.push('Meta: ' + snapshot.metaText);
  if (snapshot.deltaText) detailParts.push('Delta: ' + snapshot.deltaText);
  if (snapshot.trendD1Text) detailParts.push('D-1: ' + snapshot.trendD1Text);
  if (snapshot.action) detailParts.push(snapshot.action);

  return panelCreateCard_(
    snapshot.label,
    snapshot.value,
    panelResolveSnapshotFormat_(label, snapshot),
    detailParts.join(' | '),
    snapshot.color || fallbackColor || PANEL_COLORS.primary
  );
}

function panelBuildGerencialKpis_(analytics) {
  if (analytics.kpiCardLatest && analytics.kpiCardLatest.rows && analytics.kpiCardLatest.rows.length) {
    const snapshotMap = panelBuildSnapshotMetricMap_(analytics.kpiCardLatest.rows);
    return [
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Qtd Rotas'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Qtd Pedidos'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'SPR Pedidos'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Entregas Efetivas'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Capacidade Utilizada'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Aderencia Volumes'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'ORH'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Qtd Rotas Nao Planejadas')
    ].filter(Boolean);
  }

  const kpiMap = panelBuildKpiValueMap_(analytics.kpis.rows);
  return [
    panelCreateCardFromMetric_(kpiMap, 'Cargas Realizadas', '0'),
    panelCreateCardFromMetric_(kpiMap, 'Volumes Realizados', '0'),
    panelCreateCardFromMetric_(kpiMap, 'SPR Realizado', '0.00'),
    panelCreateCardFromMetric_(kpiMap, 'Entrega Efetiva', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Aderencia Capacidade', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Ocupacao Peso', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'SPR vs Meta', '0.00'),
    panelCreateCardFromMetric_(kpiMap, 'Custo Medio/Carga', 'R$ #,##0.00')
  ];
}

function panelBuildOperationalKpis_(analytics) {
  if (analytics.kpiCardLatest && analytics.kpiCardLatest.rows && analytics.kpiCardLatest.rows.length) {
    const snapshotMap = panelBuildSnapshotMetricMap_(analytics.kpiCardLatest.rows);
    return [
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Qtd Rotas'),
      panelCreateCard_('Excecoes Criticas', analytics.excecoes.rows.length, '0', 'Rotas priorizadas na fila operacional'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Entregas Efetivas'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'ORH'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Capacidade Utilizada'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Aderencia Volumes'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'SPR Pedidos'),
      panelCreateCardFromSnapshotMetric_(snapshotMap, 'Qtd Rotas Nao Planejadas')
    ].filter(Boolean);
  }

  const kpiMap = panelBuildKpiValueMap_(analytics.kpis.rows);
  const statusRows = analytics.statusOperacional.rows;
  const finalizadas = panelFindStatusMetric_(statusRows, 'FINALIZADO');
  const emRota = panelFindStatusMetric_(statusRows, 'EM ROTA');
  const parciais = panelFindStatusMetric_(statusRows, 'PARCIAL');
  const latestTrend = panelGetLatestTrendRow_(analytics);

  return [
    panelCreateCardFromMetric_(kpiMap, 'Progresso Execucao', '0.00%'),
    panelCreateCard_('Finalizadas', finalizadas, '0'),
    panelCreateCard_('Em Rota', emRota, '0'),
    panelCreateCard_('Parciais', parciais, '0'),
    panelCreateCard_('Excecoes Criticas', analytics.excecoes.rows.length, '0'),
    panelCreateCardFromMetric_(kpiMap, 'SPR Planejado', '0.00'),
    panelCreateCard_('Desvio Tempo', latestTrend ? latestTrend[12] : '', '0.00%'),
    panelCreateCardFromMetric_(kpiMap, 'Custo Medio/Carga', 'R$ #,##0.00')
  ];
}

function panelInsertChartFromNamedRange_(targetSheet, rangeName, chartType, title, row, col, options) {
  const namedRange = panelGetNamedRange_(panelGetSpreadsheet_(), rangeName);
  if (!namedRange) return null;
  const range = namedRange.getRange();
  if (range.getNumRows() < 2 || range.getNumColumns() < 2) return null;

  let builder = targetSheet.newChart()
    .setChartType(chartType)
    .addRange(range)
    .setPosition(row, col, 0, 0)
    .setOption('title', title)
    .setOption('backgroundColor', PANEL_COLORS.background)
    .setOption('colors', [PANEL_COLORS.primary, PANEL_COLORS.accent, PANEL_COLORS.success, PANEL_COLORS.info]);

  Object.keys(options || {}).forEach(key => {
    builder = builder.setOption(key, options[key]);
  });

  return targetSheet.insertChart(builder.build());
}
