function criarOuAtualizarPivotsAuxiliares_(ss, cacheBundle, config) {
  const sheet = panelRecreateSheetPreservingPosition_(ss, PANEL_SHEETS.aux);

  if (!PANEL_FEATURES.enableCharts) {
    panelClearManagedSheet_(sheet, { skipArtifactsCleanup: true });
    sheet.hideSheet();
    return {};
  }

  panelClearManagedSheet_(sheet, { skipArtifactsCleanup: true });
  panelSetDefaultColumns_(sheet, [180, 180, 180, 180, 180, 180, 180, 180, 180, 180]);

  const analytics = cacheBundle.analytics;
  const sections = {};
  let nextRow = 1;

  const trendRows = panelSelectTrendRows_(analytics, config.granularidade);
  const defs = [
    { key: 'trend_atual', title: 'Tendencia Atual', headers: trendRows.headers, rows: trendRows.rows },
    { key: 'trend_semanal', title: 'Tendencia Semanal', headers: analytics.serieSemanal.headers, rows: analytics.serieSemanal.rows },
    { key: 'trend_mensal', title: 'Tendencia Mensal', headers: analytics.serieMensal.headers, rows: analytics.serieMensal.rows },
    { key: 'ranking_filial', title: 'Ranking Filial', headers: analytics.rankFilial.headers, rows: analytics.rankFilial.rows.slice(0, PANEL_DEFAULTS.maxRankingRows) },
    { key: 'ranking_transportadora', title: 'Ranking Transportadora', headers: analytics.rankTransportadora.headers, rows: analytics.rankTransportadora.rows.slice(0, PANEL_DEFAULTS.maxRankingRows) },
    { key: 'ranking_tipo_veiculo', title: 'Ranking Tipo Veiculo', headers: analytics.rankTipoVeiculo.headers, rows: analytics.rankTipoVeiculo.rows.slice(0, PANEL_DEFAULTS.maxRankingRows) },
    { key: 'ocupacao', title: 'Ocupacao', headers: analytics.ocupacao.headers, rows: analytics.ocupacao.rows.slice(0, PANEL_DEFAULTS.maxRankingRows) },
    { key: 'custos', title: 'Custos', headers: analytics.custos.headers, rows: analytics.custos.rows.slice(0, PANEL_DEFAULTS.maxRankingRows) },
    { key: 'status_operacional', title: 'Status Operacional', headers: analytics.statusOperacional.headers, rows: analytics.statusOperacional.rows },
    { key: 'excecoes', title: 'Excecoes', headers: analytics.excecoes.headers, rows: analytics.excecoes.rows }
  ];

  defs.forEach(def => {
    sections[def.key] = panelWriteSection_(sheet, nextRow, def.title, def.headers, def.rows, 'aux_' + def.key);
    nextRow = sections[def.key].nextRow;
  });

  sheet.hideSheet();
  return sections;
}

function panelSelectTrendRows_(analytics, granularidade) {
  if (granularidade === 'Dia') return analytics.serieDiaria;
  if (granularidade === 'Mes') return analytics.serieMensal;
  return analytics.serieSemanal;
}

function criarOuAtualizarSlicers_(targetSheet, detailRange) {
  if (!PANEL_FEATURES.enableSlicers) return;
  if (!targetSheet || !detailRange || typeof targetSheet.insertSlicer !== 'function') return;
  if (detailRange.getNumRows() - 1 > PANEL_DEFAULTS.maxSlicerRows) return;

  try {
    panelRemoveChartsAndSlicers_(targetSheet);
  } catch (error) {
    Logger.log('Aviso ao limpar slicers antes de recriar: ' + error.message);
  }

  const anchors = [
    { row: 2, col: 10 },
    { row: 8, col: 10 },
    { row: 14, col: 10 }
  ];

  anchors.forEach(anchor => {
    try {
      targetSheet.insertSlicer(detailRange, anchor.row, anchor.col);
    } catch (error) {
      Logger.log('Aviso ao inserir slicer em ' + targetSheet.getName() + ': ' + error.message);
    }
  });
}
