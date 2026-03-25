/**
 * Tipos TypeScript para todos os payloads da API.
 * Alinhados com o contrato de dados (docs/data_contract_frontend.md).
 * Percentuais: fração 0-1 na API (frontend converte para exibição).
 * Moeda: número decimal (frontend formata como R$).
 */

// ─── Metas ─────────────────────────────────────────────────────────
export interface MetaGlobal {
  kpiId: string;
  kpiNome: string;
  meta: number;
  sentido: string;
  unidade: string;
}

// ─── KPI Cards (Resumo Executivo) ──────────────────────────────────
export interface KpiCard {
  kpi: string;
  valor: number;
  meta: number | null;
  delta: number | null;
  status: "OK" | "Atenção" | "Crítico";
  cor: string;
  trendD1: number | null;
  trendWow: number | null;
  valorTexto: string;
  metaTexto: string;
  deltaTexto: string;
  trendD1Texto: string;
  trendWowTexto: string;
  acao: string;
  databaseDt: string;
}

// ─── Tendência Semanal ─────────────────────────────────────────────
export interface TendenciaSemanal {
  anoSemana: string;
  semanaLabel: string;
  semanaInicio: string;
  semanaFim: string;
  rotas: number;
  pedidos: number;
  volumes: number;
  entregas: number;
  insucessos: number;
  entregasEfetivas: number;
  sprPedidos: number;
  sprVolumes: number;
  scoreOperacional: number;
}

export interface CockpitSerieDiaria {
  data: string;
  rotas: number;
  pedidos: number;
  volumes: number;
  entregasEfetivas: number;
  sprPedidos: number;
  sprVolumes: number;
  scoreOperacional: number;
  ocupacaoPeso: number;
  aderenciaVolumes: number | null;
  tempoMedRealizado: number;
  qtdRotasNaoPlanejadas: number;
  qtdRotasSemTempo: number;
  qtdFiliaisCriticasSpr: number;
}

// ─── Filial Performance ────────────────────────────────────────────
export interface FilialPerformance {
  filial: string;
  nomeFilial: string;
  tipoFilial: string;
  regiao?: string | null;
  metaSpr: number;
  metaSprVolumes: number;
  diasCobertos: number;
  rotas: number;
  placasDistintas: number;
  pedidosReal: number;
  pedidosPlan: number | null;
  volumesReal: number;
  volumesPlan: number | null;
  pesoReal: number;
  pesoPlan: number | null;
  entregues: number;
  insucessos: number;
  entregasEfetivas: number;
  sprVolumesReal: number;
  sprPedidosReal: number;
  sprVsMeta: number;
  tempoReal: number;
  tempoPlan: number | null;
  desvioTempoH: number | null;
  desvioTempoPct: number | null;
  kmReal: number;
  kmPlan: number | null;
  progressoPct: number;
  scoreOperacional: number;
  aderenciaPedidos?: number | null;
  aderenciaVolumes?: number | null;
  aderenciaPeso?: number | null;
  aderenciaKm?: number | null;
  aderenciaTempo?: number | null;
}

// ─── Alerta ────────────────────────────────────────────────────────
export interface Alerta {
  data: string;
  filial: string;
  nomeFilial?: string;
  regiao: string | null;
  transportador: string;
  rota: string;
  rotaPlanejada: string | null;
  placa: string;
  motorista: string;
  tipoVeiculo: string;
  status: string;
  statusRota: string;
  cor: string;
  pedidos: number;
  volumes: number;
  peso: number;
  entregues: number;
  insucessos: number;
  kmPlanejado: number;
  kmRealizado: number;
  tempoPlanejado: number;
  tempoRealizado: number;
  entregaEfetivaRota: number;
  ocupacaoPeso: number;
  flagNaoPlanejada: boolean;
  flagSemTempo: boolean;
  flagOvertime: boolean;
  flagMatchCritico: boolean;
  flagEntregaCritica: boolean;
  matchTemporal: string | null;
  prioridade: string;
}

export interface AlertaContagem {
  naoPlanejada: number;
  semTempo: number;
  overtime: number;
  entregaCritica: number;
  matchCritico: number;
  total: number;
}

// ─── Drill Rotas ───────────────────────────────────────────────────
export interface DrillRota {
  data: string;
  filial: string;
  nomeFilial?: string;
  regiao?: string | null;
  transportador: string;
  rota: string;
  placa: string;
  motorista: string;
  tipoVeiculo: string;
  status: string;
  pedidos: number;
  volumes: number;
  peso: number;
  entregas: number;
  insucessos: number;
  kmPlanejado: number;
  kmRealizado: number;
  tempoPlanejado: number;
  tempoRealizado: number;
  entregaEfetiva: number;
  ocupacaoPeso: number;
  aderenciaVolumes?: number | null;
  valorTotalRota?: number | null;
  scoreOperacional: number;
  flagOvertime: boolean;
  flagEntregaCritica: boolean;
  alertaOperacional: string;
}

// ─── Transportador ─────────────────────────────────────────────────
export interface TransportadorResumo {
  transportador: string;
  rotas: number;
  share: number;
  custoMedioCarga: number;
  custoMedioVolume: number;
  custoMedioPedido: number;
  entregasEfetivas: number;
  scoreOperacional: number;
  sprPedidos: number;
  sprVolumes: number;
  pedidos: number;
  volumes: number;
  valorTotal: number;
  status: string;
  statusCor: string;
}

// ─── Frota / Ocupação ──────────────────────────────────────────────
export interface OcupacaoTipoVeiculo {
  tipoVeiculo: string;
  rotas: number;
  placasDistintas: number;
  mediaPedidosRota: number;
  mediaVolumesRota: number;
  mediaPesoRota: number;
  pesoTotalKg: number;
  capacidadePesoTotalKg: number;
  ocupacaoPeso: number;
  sprPorVeiculo: number;
  orh: number;
  custoMedioVolume: number;
}

// ─── Motorista / Jornada ───────────────────────────────────────────
export interface MotoristaJornada {
  data: string;
  filial: string;
  nomeFilial?: string;
  transportador: string;
  motorista: string;
  placa: string | null;
  qtdRotas: number;
  horasJornada: number;
  flagOvertime: boolean;
  entregas: number;
  insucessos: number;
  scoreOperacional: number;
  pedidos: number;
  volumes: number;
}

export interface MotoristaKpis {
  motoristasAtivos: number;
  mediaRotasDia: number;
  jornadaMedia: number;
  qtdOvertime: number;
  dpph: number;
  efetividadeMedia?: number;
  volumesPerMotorista?: number;
}

// ─── KPI Diário Consolidado ────────────────────────────────────────
export interface KpiDiario {
  data: string;
  rotas: number;
  rotasConcluidas: number;
  rotasPlanejadas: number;
  qtdNaoPlanejada: number;
  pedidos: number;
  volumes: number;
  entregas: number;
  insucessos: number;
  veiculosAtivos: number;
  motoristasAtivos: number;
  totalKmRealizado: number;
  totalPesoKg: number;
  sprPedidos: number;
  sprVolumes: number;
  pctEntregasEfetivas: number;
  pctRotasConcluidas: number;
  tempoMedRealizado: number;
  pctUtilizacaoJornada: number;
  pctOciosidadeJornada: number;
  pctRotasOvertime: number;
  pctOcupacaoPedidos: number | null;
  pctOcupacaoVolumes: number | null;
  pctOcupacaoPeso: number | null;
  pctAderPedidos?: number | null;
  pctAderVolumes?: number | null;
  pctAderPeso?: number | null;
  pctAderKm?: number | null;
  pctAderTempo?: number | null;
  pctMatchMesmoDia?: number | null;
  scoreOperacional: number;
  valorPagamentoTotal: number;
  custoMedioCarga: number;
  custoMedioVolume: number;
  custoMedioPedido: number;
  gapOrhVsMeta?: number;
  metaEntregas?: number;
  metaRotasConcluidas?: number;
  metaOcupacaoPeso?: number;
  metaAderenciaVolumes?: number;
  metaOrhTempo?: number;
  dpph?: number | null;
}

// ─── Paginação ─────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// ─── Filtros Globais ───────────────────────────────────────────────
export interface GlobalFilters {
  periodo?: string;
  filial?: string;
  transportador?: string;
  tipoVeiculo?: string;
  status?: string;
  prioridade?: string;
}

export interface FilterOptionItem {
  value: string;
  label: string;
}

export interface FilterOptionsResponse {
  periodos: FilterOptionItem[];
  filiais: FilterOptionItem[];
  transportadores: FilterOptionItem[];
  tiposVeiculo: FilterOptionItem[];
  status: FilterOptionItem[];
  prioridades: FilterOptionItem[];
}

export interface KPIData {
  label: string;
  value: number | string;
  unit?: string;
  meta?: number | null;
  metaLabel?: string;
  metaFormatted?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "success" | "warning" | "danger" | "neutral";
}

// ─── Status UI (mapeamento BQ → UI) ───────────────────────────────
export type StatusBQ = "OK" | "Atenção" | "Crítico";
export type StatusUI = "success" | "warning" | "danger" | "neutral";

export function mapStatusBQtoUI(status: StatusBQ | string): StatusUI {
  switch (status) {
    case "OK": return "success";
    case "Atenção": return "warning";
    case "Crítico": return "danger";
    default: return "neutral";
  }
}

// ─── Status TMS ────────────────────────────────────────────────────
export const STATUS_TMS_LABELS: Record<string, string> = {
  "Finalizado": "Concluída",
  "Parcial": "Parcial",
  "Em Rota": "Em Andamento",
  "Rota aceita": "Rota Aceita",
  "Roteirizado": "Roteirizada",
};

export const STATUS_TMS_COLORS: Record<string, string> = {
  "Finalizado": "bg-success/15 text-success",
  "Parcial": "bg-warning/15 text-warning",
  "Em Rota": "bg-primary/15 text-primary",
  "Rota aceita": "bg-muted text-muted-foreground",
  "Roteirizado": "bg-accent/15 text-accent",
};

// ─── Alert Type ────────────────────────────────────────────────────
export type AlertType = "nao_planejada" | "sem_tempo" | "overtime" | "entrega_critica" | "match_critico";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  nao_planejada: "Não Planejada",
  sem_tempo: "Sem Tempo",
  overtime: "Overtime",
  entrega_critica: "Entrega Crítica",
  match_critico: "Match Crítico",
};

export const ALERT_TYPE_COLORS: Record<AlertType, string> = {
  nao_planejada: "bg-warning/15 text-warning",
  sem_tempo: "bg-muted text-muted-foreground",
  overtime: "bg-destructive/15 text-destructive",
  entrega_critica: "bg-destructive/15 text-destructive",
  match_critico: "bg-warning/15 text-warning",
};

// ─── Priority ──────────────────────────────────────────────────────
export const PRIORITY_COLORS: Record<string, string> = {
  "Alta": "bg-destructive/15 text-destructive",
  "Media": "bg-warning/15 text-warning",
  "Baixa": "bg-muted text-muted-foreground",
  "Normal": "bg-success/15 text-success",
};
