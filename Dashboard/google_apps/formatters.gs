function panelGetSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function panelGetOrCreateSheet_(ss, sheetName) {
  const existing = ss.getSheetByName(sheetName);
  return existing || ss.insertSheet(sheetName);
}

function panelRecreateSheetPreservingPosition_(ss, sheetName) {
  const existing = ss.getSheetByName(sheetName);
  return existing || ss.insertSheet(sheetName);
}

function panelRemoveChartsAndSlicers_(sheet) {
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));

  if (typeof sheet.getSlicers === 'function') {
    try {
      sheet.getSlicers().forEach(slicer => slicer.remove());
    } catch (error) {
      Logger.log('Aviso ao remover slicers de ' + sheet.getName() + ': ' + error.message);
    }
  }
}

function panelClearManagedSheet_(sheet, options) {
  const config = options || {};

  if (!config.skipArtifactsCleanup && (PANEL_FEATURES.enableCharts || PANEL_FEATURES.enableSlicers)) {
    panelRemoveChartsAndSlicers_(sheet);
  }
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  sheet.setHiddenGridlines(true);
  sheet.setTabColor(null);
}

function panelSetDefaultColumns_(sheet, widths) {
  const targetWidths = widths || PANEL_LAYOUT.defaultColumnWidths;
  targetWidths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
}

function panelWriteSheetTitle_(sheet, title, subtitle) {
  sheet.getRange(1, 1, 1, 8).merge();
  sheet.getRange(1, 1).setValue(title)
    .setFontSize(18)
    .setFontWeight('bold')
    .setBackground(PANEL_COLORS.primary)
    .setFontColor(PANEL_COLORS.background)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  sheet.getRange(2, 1, 1, 8).merge();
  sheet.getRange(2, 1).setValue(subtitle || '')
    .setFontSize(10)
    .setFontColor(PANEL_COLORS.textSecondary)
    .setBackground(PANEL_COLORS.surface)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 32);
  sheet.setRowHeight(2, 22);
}

function panelWriteSummaryBanner_(sheet, startRow, label, value) {
  sheet.getRange(startRow, 1, 1, 8).merge();
  sheet.getRange(startRow, 1).setValue(label + ': ' + value)
    .setFontSize(10)
    .setFontColor(PANEL_COLORS.text)
    .setBackground('#F3F4F6')
    .setBorder(true, true, true, true, false, false, PANEL_COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
}

function panelWriteKpiCards_(sheet, startRow, startCol, kpis) {
  let row = startRow;
  let col = startCol;

  kpis.forEach((kpi, index) => {
    const range = sheet.getRange(row, col, 3, 3);
    range.setBackground(PANEL_COLORS.background)
      .setBorder(true, true, true, true, false, false, PANEL_COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

    const titleCell = sheet.getRange(row, col, 1, 3).merge();
    titleCell.setValue(kpi.label)
      .setFontSize(10)
      .setFontWeight('bold')
      .setFontColor(PANEL_COLORS.textSecondary)
      .setBackground(PANEL_COLORS.surface)
      .setHorizontalAlignment('left');

    const valueCell = sheet.getRange(row + 1, col, 1, 3).merge();
    valueCell.setValue(kpi.value)
      .setNumberFormat(kpi.format || '@')
      .setFontSize(16)
      .setFontWeight('bold')
      .setFontColor(kpi.color || PANEL_COLORS.primary)
      .setHorizontalAlignment('left');

    const detailCell = sheet.getRange(row + 2, col, 1, 3).merge();
    detailCell.setValue(kpi.detail || '')
      .setFontSize(9)
      .setFontColor(PANEL_COLORS.textMuted)
      .setHorizontalAlignment('left');

    col += PANEL_LAYOUT.gerencial.kpiWidth;
    if ((index + 1) % 4 === 0) {
      row += PANEL_LAYOUT.gerencial.kpiHeight + 1;
      col = startCol;
    }
  });
}

function panelWriteTableBlock_(sheet, startRow, startCol, title, headers, rows, options) {
  const rowCount = Math.max(rows.length, 1);
  const colCount = headers.length;

  sheet.getRange(startRow, startCol, 1, colCount)
    .setBackground(PANEL_COLORS.primary2)
    .setFontColor(PANEL_COLORS.background)
    .setFontWeight('bold');
  sheet.getRange(startRow, startCol).setValue(title).setHorizontalAlignment('left');

  const headerRange = sheet.getRange(startRow + 1, startCol, 1, colCount);
  headerRange.setValues([headers])
    .setFontWeight('bold')
    .setBackground(PANEL_COLORS.surface)
    .setFontColor(PANEL_COLORS.text);

  const values = rows.length ? rows : [new Array(colCount).fill('Sem dados para os filtros atuais')];
  const valueRange = sheet.getRange(startRow + 2, startCol, values.length, colCount);
  valueRange.setValues(values);

  panelApplyTableFormatting_(sheet, startRow + 1, startCol, headers, values.length);

  if (options && options.freezeHeader) {
    sheet.setFrozenRows(startRow + 1);
  }

  return {
    startRow: startRow,
    headerRow: startRow + 1,
    dataRow: startRow + 2,
    rowCount: values.length,
    colCount: colCount
  };
}

function panelApplyTableFormatting_(sheet, headerRow, startCol, headers, rowCount) {
  if (!rowCount) return;
  const formattedRowCount = Math.min(rowCount, PANEL_DEFAULTS.maxFormattedRows);
  const formatRow = headers.map(panelInferNumberFormat_);
  const formats = Array.from({ length: formattedRowCount }, () => formatRow.slice());

  if (formattedRowCount > 0) {
    sheet.getRange(headerRow + 1, startCol, formattedRowCount, headers.length).setNumberFormats(formats);
  }

  sheet.getRange(headerRow, startCol, formattedRowCount + 1, headers.length)
    .setBorder(true, true, true, true, false, false, PANEL_COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
}

function panelNormalizeHeaderLabel_(header) {
  return normalizeText_(String(header || ''));
}

function panelIsTextualHeader_(normalized) {
  if (/ TEXTO$/.test(normalized)) return true;
  return normalized === 'IDCARGA' ||
    normalized === 'KPI' ||
    normalized === 'ACAO' ||
    normalized === 'PRIORIDADE' ||
    normalized === 'GRUPO' ||
    normalized === 'MEDIDA' ||
    normalized === 'FILIAL' ||
    normalized === 'NOME FILIAL' ||
    normalized === 'TIPO FILIAL' ||
    normalized === 'REGIAO' ||
    normalized === 'TIPO' ||
    normalized === 'TIPO DE VEICULO' ||
    normalized === 'TIPO DE VEICULO PADRAO' ||
    normalized === 'TRANSPORTADOR' ||
    normalized === 'ROTA' ||
    normalized === 'ROTA PLANEJADA' ||
    normalized === 'PLACA' ||
    normalized === 'MOTORISTA' ||
    normalized === 'CPF' ||
    normalized === 'DIA SEMANA' ||
    normalized === 'LABEL SEMANA' ||
    normalized === 'MES NOME' ||
    normalized === 'MES KEY' ||
    normalized === 'MESKEY' ||
    normalized === 'ANOSEMANA' ||
    normalized === 'SEMANA LABEL' ||
    normalized === 'SEMANALABEL' ||
    normalized === 'MATCH TEMPORAL' ||
    normalized === 'STATUS CAPACIDADE' ||
    normalized === 'STATUS CAPACIDADE VISUAL' ||
    normalized === 'SENTIDO' ||
    normalized === 'UNIDADE' ||
    normalized === 'TABELA' ||
    normalized === 'CD ORIGEM' ||
    normalized === 'CODIGO' ||
    normalized === 'FILIAL KEY' ||
    normalized === 'NOME FILIAL KEY' ||
    normalized === 'CODIGO KEY' ||
    /^STATUS(\b| )/.test(normalized) ||
    /^ALERTA/.test(normalized) ||
    / STATUS$/.test(normalized) ||
    / COR$/.test(normalized) ||
    / VISUAL$/.test(normalized);
}

function panelIsDateHeader_(normalized) {
  return normalized === 'DATA' ||
    /^DATA /.test(normalized) ||
    normalized === 'DATABASE' ||
    normalized === 'SEMANA INICIO' ||
    normalized === 'SEMANA FIM' ||
    normalized === 'MES REF';
}

function panelIsPercentHeader_(normalized) {
  if (normalized === 'PROGRESSO EXECUCAO (%)' || normalized === 'PROGRESSO %') return false;

  return normalized.indexOf('%') >= 0 ||
    /\(%\)$/.test(normalized) ||
    normalized === 'ENTREGA EFETIVA' ||
    normalized === 'ENTREGAS EFETIVAS' ||
    normalized === 'OCUPACAO PESO' ||
    normalized === 'MATCH MESMO DIA' ||
    normalized === 'CAPACIDADE UTILIZADA' ||
    normalized === 'META GLOBAL OCUPACAO COMPOSTA' ||
    normalized === 'META ADERENCIA VOLUMES' ||
    normalized === 'CAPACIDADE UTILIZADA VS META' ||
    normalized === 'ADERENCIA VOLUMES VS META' ||
    normalized === 'ENTREGAS EFETIVAS VS META' ||
    normalized === 'ROTAS CONCLUIDAS VS META' ||
    /^OCUPACAO /.test(normalized) ||
    /^ADERENCIA /.test(normalized);
}

function panelIsCurrencyHeader_(normalized) {
  return normalized.indexOf('CUSTO') >= 0 ||
    normalized.indexOf('VALOR PAGAMENTO') >= 0 ||
    normalized === 'VALOR';
}

function panelIsIntegerHeader_(normalized) {
  return normalized === 'ANO' ||
    normalized === 'MESNUMERO' ||
    normalized === 'NUMERO SEMANA' ||
    normalized === 'DIA ORDEM' ||
    normalized === 'POSSUI PLANEJADO' ||
    normalized === 'ROTA CONCLUIDA' ||
    normalized === 'ROTAS' ||
    normalized === 'PEDIDOS' ||
    normalized === 'VOLUMES' ||
    normalized === 'PARADAS' ||
    normalized === 'CLIENTES' ||
    normalized === 'ENTREGUES' ||
    normalized === 'INSUCESSOS' ||
    normalized === 'BAIXAS' ||
    normalized === 'QUANTIDADE PLACAS' ||
    normalized === 'PLACAS DISTINTAS' ||
    normalized === 'TOTAL CARGAS' ||
    normalized === 'TOTAL CARGAS/ROTAS' ||
    normalized === 'TOTAL PLACAS DISTINTAS' ||
    normalized === 'DIAS COBERTOS' ||
    normalized === 'PEDIDOS DA ROTA' ||
    normalized === 'VOLUMES DA ROTA' ||
    normalized === 'PEDIDOS PLANEJADOS' ||
    normalized === 'VOLUMES PLANEJADOS' ||
    normalized === 'ROTAS FINALIZADAS' ||
    normalized === 'ROTAS EM ROTA' ||
    normalized === 'ROTAS PARCIAIS' ||
    normalized === 'ROTAS ROTEIRIZADAS' ||
    normalized === 'FINALIZADAS' ||
    normalized === 'EM ROTA' ||
    normalized === 'PARCIAIS' ||
    normalized === 'ROTEIRIZADAS' ||
    normalized === 'QTD FILIAIS CRITICAS SPR' ||
    normalized === 'QTD FILIAIS ABAIXO META SPR' ||
    /^QTD /.test(normalized);
}

function panelIsDecimalHeader_(normalized) {
  return normalized === 'META' ||
    /^META /.test(normalized) ||
    /^METASPR/.test(normalized) ||
    /^SPR /.test(normalized) ||
    /^ORH/.test(normalized) ||
    /^DPPH/.test(normalized) ||
    /^MEDIA /.test(normalized) ||
    /^TEMPO /.test(normalized) ||
    /^DESVIO /.test(normalized) ||
    /^DELTA /.test(normalized) ||
    /^GAP /.test(normalized) ||
    /^TREND /.test(normalized) ||
    /^VAR D-1 /.test(normalized) ||
    /^KM /.test(normalized) ||
    normalized.indexOf(' KM ') >= 0 ||
    /^PESO/.test(normalized) ||
    /^CAPACIDADE /.test(normalized) ||
    normalized.indexOf('(KG)') >= 0 ||
    normalized === 'DROP SIZE' ||
    normalized === 'HORAS OCIOSAS TOTAIS' ||
    normalized === 'SCORE OPERACIONAL' ||
    normalized === 'SPR VS META' ||
    normalized === 'SPR PEDIDOS VS META' ||
    normalized === 'SPR VOLUMES VS META';
}

function panelInferNumberFormat_(header) {
  const normalized = panelNormalizeHeaderLabel_(header);

  if (panelIsTextualHeader_(normalized)) return '@';
  if (panelIsDateHeader_(normalized)) return 'dd/mm/yyyy';
  if (panelIsPercentHeader_(normalized)) return '0.00%';
  if (panelIsCurrencyHeader_(normalized)) return 'R$ #,##0.00';
  if (panelIsIntegerHeader_(normalized)) return '0';
  if (panelIsDecimalHeader_(normalized)) return '0.00';
  return '@';
}

function panelInferColumnKind_(header) {
  const normalized = panelNormalizeHeaderLabel_(header);

  if (panelIsTextualHeader_(normalized)) return 'text';
  if (panelIsDateHeader_(normalized)) return 'date';
  if (panelIsPercentHeader_(normalized)) return 'percent';
  if (panelIsCurrencyHeader_(normalized)) return 'currency';
  if (panelIsIntegerHeader_(normalized)) return 'integer';
  if (panelIsDecimalHeader_(normalized)) return 'decimal';
  return 'text';
}

function panelParsePercentValue_(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number') return value <= 1 ? value : value / 100;

  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.indexOf('%') >= 0) {
    const numeric = toNumber_(raw.replace('%', ''));
    return numeric / 100;
  }

  const numeric = toNumber_(raw);
  return numeric <= 1 ? numeric : numeric / 100;
}

function panelParseCanonicalValueByKind_(value, kind) {
  if (value === '' || value === null || value === undefined) return '';

  let normalizedValue = value;
  if (typeof normalizedValue === 'string' && normalizedValue.charAt(0) === "'") {
    normalizedValue = normalizedValue.slice(1);
  }

  if (kind === 'text') return normalizedValue;
  if (kind === 'date') return toDate_(normalizedValue) || normalizedValue;
  if (kind === 'percent') return panelParsePercentValue_(normalizedValue);
  if (kind === 'currency' || kind === 'decimal' || kind === 'integer') return toNumber_(normalizedValue);
  return value;
}

function panelNormalizeCanonicalSourceSheetValues_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || !lastCol) return;

  const kinds = headers.map(panelInferColumnKind_);
  if (kinds.every(kind => kind === 'text')) return;

  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();
  let changed = false;

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < kinds.length; colIndex += 1) {
      const kind = kinds[colIndex];
      const currentValue = values[rowIndex][colIndex];
      if (typeof currentValue !== 'string') continue;
      if (!String(currentValue || '').trim()) continue;

      const normalizedValue = panelParseCanonicalValueByKind_(currentValue, kind);
      if (normalizedValue !== currentValue) {
        values[rowIndex][colIndex] = normalizedValue;
        changed = true;
      }
    }
  }

  if (changed) {
    range.setValues(values);
  }
}

function organizarAbasCanonicasMonitoramento() {
  return panelRunMonitoredAction_('Organizar Abas Canonicas', () => {
    const ss = panelGetSpreadsheet_();
    panelEnsureSpreadsheetLocalePtBr_(ss);
    panelApplyCanonicalTabOrganization_(ss);
    panelAllCanonicalSourceSheetNames_().forEach(sheetName => {
      panelFormatCanonicalSourceSheet_(ss, sheetName);
    });
    SpreadsheetApp.flush();
    return { abasFormatadas: panelAllCanonicalSourceSheetNames_().length };
  });
}

function panelApplyCanonicalTabOrganization_(ss) {
  const desiredOrder = PANEL_TAB_ORDER.filter(sheetName => !!ss.getSheetByName(sheetName));

  desiredOrder.forEach((sheetName, index) => {
    const sheet = ss.getSheetByName(sheetName);
    panelMoveSheetToPosition_(ss, sheet, index + 1);
  });

  panelTabNamesForGroup_('visual').forEach(sheetName => {
    panelApplySheetGroupStyle_(ss, sheetName, PANEL_TAB_COLORS.visual, false);
  });
  panelTabNamesForGroup_('core').forEach(sheetName => {
    panelApplySheetGroupStyle_(ss, sheetName, PANEL_TAB_COLORS.core, false);
  });
  panelTabNamesForGroup_('support').forEach(sheetName => {
    panelApplySheetGroupStyle_(ss, sheetName, PANEL_TAB_COLORS.support, false);
  });
  panelTabNamesForGroup_('technical').forEach(sheetName => {
    panelApplySheetGroupStyle_(ss, sheetName, PANEL_TAB_COLORS.technical, true);
  });

  const landingSheet = ss.getSheetByName(PANEL_SHEETS.gerencial) ||
    ss.getSheetByName(PANEL_SHEETS.operacional) ||
    ss.getSheetByName(PANEL_SOURCE_SHEETS.base);
  if (landingSheet) ss.setActiveSheet(landingSheet);
}

function panelTabNamesForGroup_(groupName) {
  const group = PANEL_TAB_GROUPS[groupName];
  return group ? group.slice() : [];
}

function panelMoveSheetToPosition_(ss, sheet, position) {
  if (!sheet) return;

  const wasHidden = typeof sheet.isSheetHidden === 'function' ? sheet.isSheetHidden() : false;
  if (wasHidden) sheet.showSheet();

  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(position);

  if (wasHidden) sheet.hideSheet();
}

function panelApplySheetGroupStyle_(ss, sheetName, color, hideSheet) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  if (color) sheet.setTabColor(color);

  if (hideSheet) {
    if (typeof sheet.isSheetHidden !== 'function' || !sheet.isSheetHidden()) {
      sheet.hideSheet();
    }
    return;
  }

  if (typeof sheet.isSheetHidden === 'function' && sheet.isSheetHidden()) {
    sheet.showSheet();
  }
}

function panelEnsureSpreadsheetLocalePtBr_(ss) {
  try {
    if (typeof ss.getSpreadsheetLocale === 'function' && typeof ss.setSpreadsheetLocale === 'function') {
      const locale = String(ss.getSpreadsheetLocale() || '').toLowerCase();
      if (locale !== 'pt_br') ss.setSpreadsheetLocale('pt_BR');
    }
  } catch (error) {
    Logger.log('Aviso ao aplicar locale pt_BR: ' + error.message);
  }

  try {
    if (typeof ss.getSpreadsheetTimeZone === 'function' && typeof ss.setSpreadsheetTimeZone === 'function') {
      const timeZone = String(ss.getSpreadsheetTimeZone() || '');
      if (timeZone !== 'America/Sao_Paulo') ss.setSpreadsheetTimeZone('America/Sao_Paulo');
    }
  } catch (error) {
    Logger.log('Aviso ao aplicar timezone America/Sao_Paulo: ' + error.message);
  }
}

function panelAllCanonicalSourceSheetNames_() {
  return panelCoreSourceSheetNames_()
    .concat(panelSemanticSourceSheetNames_())
    .concat(panelTransitionalSourceSheetNames_());
}

function panelFormatCanonicalSourceSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (!lastRow || !lastCol) return;

  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  const headers = headerRange.getValues()[0].map(value => String(value || '').trim());

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(0);
  sheet.setHiddenGridlines(false);
  sheet.setTabColor(null);

  headerRange
    .setFontWeight('bold')
    .setBackground(PANEL_COLORS.surface)
    .setFontColor(PANEL_COLORS.text)
    .setWrap(true);

  if (lastRow > 1) {
    if (PANEL_FEATURES.normalizeCanonicalSourceValues) {
      panelNormalizeCanonicalSourceSheetValues_(sheet, headers);
    }

    const filter = sheet.getFilter();
    if (filter) filter.remove();
    sheet.getRange(1, 1, lastRow, lastCol).createFilter();

    headers.forEach((header, index) => {
      sheet
        .getRange(2, index + 1, lastRow - 1, 1)
        .setNumberFormat(panelInferNumberFormat_(header));
    });

    sheet
      .getRange(1, 1, lastRow, lastCol)
      .setBorder(true, true, true, true, false, false, PANEL_COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.autoResizeColumns(1, Math.min(lastCol, 18));
}

function panelSetNamedRange_(ss, name, range) {
  panelDeleteNamedRangeIfExists_(ss, name);
  ss.setNamedRange(name, range);
}

function panelDeleteNamedRangeIfExists_(ss, name) {
  ss.getNamedRanges()
    .filter(namedRange => namedRange.getName() === name)
    .forEach(namedRange => namedRange.remove());
}

function panelGetNamedRange_(ss, name) {
  return ss.getNamedRanges().find(namedRange => namedRange.getName() === name) || null;
}

function panelGetNamedCellValue_(ss, name) {
  const namedRange = panelGetNamedRange_(ss, name);
  return namedRange ? namedRange.getRange().getValue() : '';
}

function panelWriteSection_(sheet, startRow, title, headers, rows, namedRangeName) {
  sheet.getRange(startRow, 1, 1, headers.length).merge();
  sheet.getRange(startRow, 1).setValue(title)
    .setFontWeight('bold')
    .setBackground(PANEL_COLORS.primary)
    .setFontColor(PANEL_COLORS.background);

  sheet.getRange(startRow + 1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground(PANEL_COLORS.surface);

  const outputRows = rows.length ? rows : [new Array(headers.length).fill('')];
  sheet.getRange(startRow + 2, 1, outputRows.length, headers.length).setValues(outputRows);
  panelApplyTableFormatting_(sheet, startRow + 1, 1, headers, outputRows.length);

  const range = sheet.getRange(startRow + 1, 1, outputRows.length + 1, headers.length);
  if (namedRangeName) panelSetNamedRange_(panelGetSpreadsheet_(), namedRangeName, range);

  return {
    nextRow: startRow + outputRows.length + 4,
    range: range,
    dataRowCount: outputRows.length
  };
}

function panelSetConditionalStatusColors_(range, values) {
  const backgrounds = values.map(row => {
    return row.map(value => {
      const text = normalizeText_(value);
      if (text === 'CRITICO') return PANEL_COLORS.danger;
      if (text === 'ATENCAO') return PANEL_COLORS.accent;
      if (text === 'OK') return PANEL_COLORS.success;
      return PANEL_COLORS.background;
    });
  });
  range.setBackgrounds(backgrounds);
}

function panelAutoResizeSafe_(sheet, totalColumns) {
  sheet.autoResizeColumns(1, Math.min(totalColumns || sheet.getLastColumn(), 12));
}
