const PANEL_SHEETS = Object.freeze({
  gerencial: 'PAINEL_GERENCIAL',
  operacional: 'PAINEL_OPERACIONAL',
  drilldown: 'DRILLDOWN_ANALITICO',
  config: '_CONFIG_PAINEL',
  cache: '_CACHE_PAINEL',
  aux: '_AUX_PIVOTS',
  listas: '_LISTAS_VALIDACAO',
  log: '_LOG_MONITORAMENTO'
});

const PANEL_SOURCE_SHEETS = Object.freeze({
  base: 'VW_Base_Execucao',
  diario: 'Resumo_Semana_Filial_Diario',
  ocupacao: 'Resumo_Ocupacao_Veic_Transp',
  matrizLegado: 'Resumo_Semana_Filial_Matriz'
});

const PANEL_SUPPORT_SOURCE_SHEETS = Object.freeze({
  resumoFilial: 'Resumo_Filial',
  drillRotas: 'drill_rotas',
  alertasRotas: 'alertas_rotas',
  kpiResumoDiario: 'kpi_resumo_diario',
  kpiFilialDia: 'kpi_filial_dia',
  kpiTransportadorDia: 'kpi_transportador_dia',
  kpiCardLatest: 'kpi_card_latest',
  metasGlobais: 'metas_globais',
  dimFilialTratada: 'dim_filial_tratada'
});

const PANEL_SOURCE_CONTRACT = Object.freeze({
  core: Object.freeze({
    base: PANEL_SOURCE_SHEETS.base,
    diario: PANEL_SOURCE_SHEETS.diario,
    ocupacao: PANEL_SOURCE_SHEETS.ocupacao
  }),
  semantic: Object.freeze({
    resumoFilial: PANEL_SUPPORT_SOURCE_SHEETS.resumoFilial,
    alertasRotas: PANEL_SUPPORT_SOURCE_SHEETS.alertasRotas,
    kpiResumoDiario: PANEL_SUPPORT_SOURCE_SHEETS.kpiResumoDiario,
    kpiCardLatest: PANEL_SUPPORT_SOURCE_SHEETS.kpiCardLatest,
    metasGlobais: PANEL_SUPPORT_SOURCE_SHEETS.metasGlobais,
    dimFilialTratada: PANEL_SUPPORT_SOURCE_SHEETS.dimFilialTratada
  }),
  transitional: Object.freeze({
    matrizLegado: PANEL_SOURCE_SHEETS.matrizLegado,
    drillRotas: PANEL_SUPPORT_SOURCE_SHEETS.drillRotas,
    kpiFilialDia: PANEL_SUPPORT_SOURCE_SHEETS.kpiFilialDia,
    kpiTransportadorDia: PANEL_SUPPORT_SOURCE_SHEETS.kpiTransportadorDia
  })
});

const PANEL_TAB_GROUPS = Object.freeze({
  visual: Object.freeze([
    PANEL_SHEETS.gerencial,
    PANEL_SHEETS.operacional,
    PANEL_SHEETS.drilldown
  ]),
  core: Object.freeze([
    PANEL_SOURCE_SHEETS.base,
    PANEL_SOURCE_SHEETS.diario,
    PANEL_SOURCE_SHEETS.matrizLegado,
    PANEL_SOURCE_SHEETS.ocupacao,
    PANEL_SUPPORT_SOURCE_SHEETS.resumoFilial
  ]),
  support: Object.freeze([
    PANEL_SUPPORT_SOURCE_SHEETS.kpiCardLatest,
    PANEL_SUPPORT_SOURCE_SHEETS.kpiResumoDiario,
    PANEL_SUPPORT_SOURCE_SHEETS.alertasRotas,
    PANEL_SUPPORT_SOURCE_SHEETS.kpiFilialDia,
    PANEL_SUPPORT_SOURCE_SHEETS.kpiTransportadorDia,
    PANEL_SUPPORT_SOURCE_SHEETS.metasGlobais,
    PANEL_SUPPORT_SOURCE_SHEETS.dimFilialTratada,
    PANEL_SUPPORT_SOURCE_SHEETS.drillRotas
  ]),
  technical: Object.freeze([
    PANEL_SHEETS.config,
    PANEL_SHEETS.cache,
    PANEL_SHEETS.aux,
    PANEL_SHEETS.listas,
    PANEL_SHEETS.log
  ])
});

const PANEL_TAB_ORDER = Object.freeze(
  PANEL_TAB_GROUPS.visual
    .concat(PANEL_TAB_GROUPS.core)
    .concat(PANEL_TAB_GROUPS.support)
    .concat(PANEL_TAB_GROUPS.technical)
);

const PANEL_TAB_COLORS = Object.freeze({
  visual: '#441A80',
  core: '#2F80ED',
  support: '#F5A623',
  technical: '#D1D5DB'
});

const PANEL_NAMED_RANGES = Object.freeze({
  dataInicial: 'painel_data_inicial',
  dataFinal: 'painel_data_final',
  granularidade: 'painel_granularidade',
  filial: 'painel_filial',
  transportadora: 'painel_transportadora',
  tipoVeiculo: 'painel_tipo_veiculo',
  status: 'painel_status',
  modoComparacao: 'painel_modo_comparacao',
  ultimaAtualizacao: 'painel_ultima_atualizacao',
  listaFilial: 'painel_lista_filial',
  listaTransportadora: 'painel_lista_transportadora',
  listaTipoVeiculo: 'painel_lista_tipo_veiculo',
  listaStatus: 'painel_lista_status',
  listaGranularidade: 'painel_lista_granularidade',
  listaModoComparacao: 'painel_lista_modo_comparacao'
});

const PANEL_DEFAULTS = Object.freeze({
  allValue: 'Todos',
  granularidade: 'Semana',
  modoComparacao: 'Planejado vs Realizado',
  maxRankingRows: 12,
  maxExceptionRows: 30,
  maxCacheDetailRows: 40,
  maxVisibleDetailRows: 80,
  maxFormattedRows: 250,
  maxSlicerRows: 250,
  statusOk: 'OK'
});

const PANEL_FEATURES = Object.freeze({
  enableCharts: false,
  enableSlicers: false,
  persistCacheSheet: false,
  persistSupportSections: false,
  persistFullCacheSections: false,
  preferSemanticAggregates: true,
  preferSemanticKpis: true,
  normalizeCanonicalSourceValues: false,
  refreshValidationInfrastructureOnRebuild: false,
  refreshConfigInfrastructureOnRebuild: false
});

const PANEL_FILTER_OPTIONS = Object.freeze({
  granularidades: ['Dia', 'Semana', 'Mes'],
  modosComparacao: [
    'Planejado vs Realizado',
    'Real vs D-1',
    'Real vs Semana Anterior'
  ]
});

const PANEL_COLORS = Object.freeze({
  primary: '#441A80',
  primary2: '#5B2D8C',
  accent: '#F5A623',
  success: '#4CAF50',
  danger: '#E74C3C',
  info: '#2F80ED',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  text: '#1F2937',
  textSecondary: '#6A7282',
  textMuted: '#A3A8B2'
});

const PANEL_LAYOUT = Object.freeze({
  gerencial: {
    kpiRow: 3,
    kpiCol: 1,
    kpiWidth: 3,
    kpiHeight: 3
  },
  operacional: {
    kpiRow: 3,
    kpiCol: 1,
    kpiWidth: 3,
    kpiHeight: 3
  },
  defaultColumnWidths: [
    150, 140, 130, 130, 120, 120, 120, 120, 120, 120, 120, 120
  ]
});

const PANEL_KPI_DEFS = Object.freeze([
  { key: 'cargasRealizadas', label: 'Cargas Realizadas', format: '0' },
  { key: 'cargasPlanejadas', label: 'Cargas Planejadas', format: '0' },
  { key: 'volumesRealizados', label: 'Volumes Realizados', format: '0' },
  { key: 'volumesPlanejados', label: 'Volumes Planejados', format: '0' },
  { key: 'sprRealizado', label: 'SPR Realizado', format: '0.00' },
  { key: 'sprPlanejado', label: 'SPR Planejado', format: '0.00' },
  { key: 'sprVsMeta', label: 'SPR vs Meta', format: '0.00' },
  { key: 'progressoExecucao', label: 'Progresso Execução', format: '0.00%' },
  { key: 'entregaEfetiva', label: 'Entrega Efetiva', format: '0.00%' },
  { key: 'aderenciaCapacidade', label: 'Aderência Capacidade', format: '0.00%' },
  { key: 'ocupacaoPeso', label: 'Ocupação Peso', format: '0.00%' },
  { key: 'custoMedioCarga', label: 'Custo Médio/Carga', format: 'R$ #,##0.00' }
]);

const PANEL_STATUS_ORDER = Object.freeze([
  'FINALIZADO',
  'EM ROTA',
  'PARCIAL',
  'ROTA ACEITA',
  'ROTEIRIZADO'
]);

function panelManagedSheetNames_() {
  return [
    PANEL_SHEETS.gerencial,
    PANEL_SHEETS.operacional,
    PANEL_SHEETS.drilldown,
    PANEL_SHEETS.config,
    PANEL_SHEETS.cache,
    PANEL_SHEETS.aux,
    PANEL_SHEETS.listas
  ];
}

function panelCoreSourceSheetNames_() {
  return Object.keys(PANEL_SOURCE_CONTRACT.core).map(key => PANEL_SOURCE_CONTRACT.core[key]);
}

function panelSemanticSourceSheetNames_() {
  return Object.keys(PANEL_SOURCE_CONTRACT.semantic).map(key => PANEL_SOURCE_CONTRACT.semantic[key]);
}

function panelTransitionalSourceSheetNames_() {
  return Object.keys(PANEL_SOURCE_CONTRACT.transitional).map(key => PANEL_SOURCE_CONTRACT.transitional[key]);
}

function panelTechnicalSheetNames_() {
  return [
    PANEL_SHEETS.cache,
    PANEL_SHEETS.aux,
    PANEL_SHEETS.listas
  ];
}

function panelIsAllValue_(value) {
  return normalizeText_(value) === normalizeText_(PANEL_DEFAULTS.allValue);
}

function panelHasNamedRanges_(ss, names) {
  return names.every(name => !!panelGetNamedRange_(ss, name));
}

function panelNeedsValidationInfrastructure_(ss) {
  return !panelHasNamedRanges_(ss, [
    PANEL_NAMED_RANGES.listaFilial,
    PANEL_NAMED_RANGES.listaTransportadora,
    PANEL_NAMED_RANGES.listaTipoVeiculo,
    PANEL_NAMED_RANGES.listaStatus,
    PANEL_NAMED_RANGES.listaGranularidade,
    PANEL_NAMED_RANGES.listaModoComparacao
  ]);
}

function panelNeedsConfigInfrastructure_(ss) {
  return !panelHasNamedRanges_(ss, [
    PANEL_NAMED_RANGES.dataInicial,
    PANEL_NAMED_RANGES.dataFinal,
    PANEL_NAMED_RANGES.granularidade,
    PANEL_NAMED_RANGES.filial,
    PANEL_NAMED_RANGES.transportadora,
    PANEL_NAMED_RANGES.tipoVeiculo,
    PANEL_NAMED_RANGES.status,
    PANEL_NAMED_RANGES.modoComparacao,
    PANEL_NAMED_RANGES.ultimaAtualizacao
  ]);
}
