/**
 * Mock data adapter — fornece dados de fallback quando VITE_API_BASE_URL não está configurado.
 * Transforma o formato mockData.ts legado para o formato da API (types/api.ts).
 * Usado APENAS em desenvolvimento. Em produção, os dados vêm da API real.
 */

import type {
  KpiCard, TendenciaSemanal, FilialPerformance, Alerta, AlertaContagem,
  DrillRota, TransportadorResumo, OcupacaoTipoVeiculo, MotoristaJornada,
  MotoristaKpis, KpiDiario, MetaGlobal, PaginatedResponse,
} from "@/types/api";

// ─── Metas (dim_metas) ────────────────────────────────────────────
export function getMockMetas(): MetaGlobal[] {
  return [
    { kpiId: "spr_pedidos", kpiNome: "SPR Pedidos", meta: 42.0, sentido: "Maior=Melhor", unidade: "ped/rota" },
    { kpiId: "spr_volumes", kpiNome: "SPR Volumes", meta: 67.0, sentido: "Maior=Melhor", unidade: "vol/rota" },
    { kpiId: "orh", kpiNome: "ORH Tempo Rota", meta: 7.0, sentido: "Alvo=Melhor", unidade: "horas" },
    { kpiId: "entregas_efetivas", kpiNome: "Entregas Efetivas", meta: 0.98, sentido: "Maior=Melhor", unidade: "%" },
    { kpiId: "rotas_concluidas", kpiNome: "Rotas Concluidas", meta: 0.95, sentido: "Maior=Melhor", unidade: "%" },
    { kpiId: "ocupacao_composta", kpiNome: "Ocupacao Composta", meta: 0.85, sentido: "Maior=Melhor", unidade: "%" },
    { kpiId: "aderencia_volumes", kpiNome: "Aderencia Volumes", meta: 0.90, sentido: "Maior=Melhor", unidade: "%" },
    { kpiId: "custo_por_carga", kpiNome: "Custo Medio Carga", meta: 500.0, sentido: "Menor=Melhor", unidade: "R$/carga" },
    { kpiId: "dpph", kpiNome: "DPPH", meta: 6.0, sentido: "Maior=Melhor", unidade: "ped/h" },
  ];
}

// ─── KPI Cards (Resumo Executivo) ─────────────────────────────────
export function getMockResumoCards(): KpiCard[] {
  return [
    { kpi: "Total Rotas", valor: 1247, meta: null, delta: null, status: "OK", cor: "#12B76A", trendD1: 3.2, trendWow: 1.5, valorTexto: "1.247 rotas", metaTexto: "", deltaTexto: "", trendD1Texto: "+3,2%", trendWowTexto: "+1,5%", acao: "", databaseDt: "2026-03-19" },
    { kpi: "SPR Pedidos", valor: 14.8, meta: 42.0, delta: -27.2, status: "Crítico", cor: "#F04438", trendD1: 0, trendWow: 0, valorTexto: "14,8 ped/rota", metaTexto: "Meta: 42,0", deltaTexto: "-27,2", trendD1Texto: "=", trendWowTexto: "=", acao: "Revisar rotas com baixo volume", databaseDt: "2026-03-19" },
    { kpi: "SPR Volumes", valor: 34.4, meta: 67.0, delta: -32.6, status: "Crítico", cor: "#F04438", trendD1: -1.4, trendWow: -0.8, valorTexto: "34,4 vol/rota", metaTexto: "Meta: 67,0", deltaTexto: "-32,6", trendD1Texto: "-1,4%", trendWowTexto: "-0,8%", acao: "Consolidar rotas", databaseDt: "2026-03-19" },
    { kpi: "Entregas Efetivas", valor: 0.947, meta: 0.98, delta: -0.033, status: "Atenção", cor: "#F79009", trendD1: -0.3, trendWow: 0.1, valorTexto: "94,7%", metaTexto: "Meta: 98,0%", deltaTexto: "-3,3pp", trendD1Texto: "-0,3pp", trendWowTexto: "+0,1pp", acao: "Investigar insucessos", databaseDt: "2026-03-19" },
    { kpi: "Rotas Concluidas", valor: 0.921, meta: 0.95, delta: -0.029, status: "Atenção", cor: "#F79009", trendD1: -0.8, trendWow: -0.5, valorTexto: "92,1%", metaTexto: "Meta: 95,0%", deltaTexto: "-2,9pp", trendD1Texto: "-0,8pp", trendWowTexto: "-0,5pp", acao: "Acompanhar rotas pendentes", databaseDt: "2026-03-19" },
    { kpi: "Score Diario", valor: 87.3, meta: null, delta: null, status: "OK", cor: "#12B76A", trendD1: 2.1, trendWow: 1.8, valorTexto: "87,3 pts", metaTexto: "", deltaTexto: "", trendD1Texto: "+2,1", trendWowTexto: "+1,8", acao: "", databaseDt: "2026-03-19" },
    { kpi: "Ocupacao Composta", valor: 0.784, meta: 0.85, delta: -0.066, status: "Atenção", cor: "#F79009", trendD1: 1.2, trendWow: 0.5, valorTexto: "78,4%", metaTexto: "Meta: 85,0%", deltaTexto: "-6,6pp", trendD1Texto: "+1,2pp", trendWowTexto: "+0,5pp", acao: "Revisar ocupação", databaseDt: "2026-03-19" },
    { kpi: "DPPH", valor: 5.2, meta: 6.0, delta: -0.8, status: "Atenção", cor: "#F79009", trendD1: 0.3, trendWow: 0.1, valorTexto: "5,2 ped/h", metaTexto: "Meta: 6,0", deltaTexto: "-0,8", trendD1Texto: "+0,3", trendWowTexto: "+0,1", acao: "Otimizar produtividade", databaseDt: "2026-03-19" },
  ];
}

// ─── Tendência Semanal ────────────────────────────────────────────
export function getMockTendenciaSemanal(): TendenciaSemanal[] {
  return [
    { anoSemana: "2026-W09", semanaLabel: "S09", semanaInicio: "2026-02-23", semanaFim: "2026-03-01", rotas: 310, pedidos: 4520, volumes: 10500, entregas: 4256, insucessos: 264, entregasEfetivas: 0.942, sprPedidos: 14.6, sprVolumes: 33.9, scoreOperacional: 85.1 },
    { anoSemana: "2026-W10", semanaLabel: "S10", semanaInicio: "2026-03-02", semanaFim: "2026-03-08", rotas: 325, pedidos: 4680, volumes: 10900, entregas: 4451, insucessos: 229, entregasEfetivas: 0.951, sprPedidos: 14.4, sprVolumes: 33.5, scoreOperacional: 87.2 },
    { anoSemana: "2026-W11", semanaLabel: "S11", semanaInicio: "2026-03-09", semanaFim: "2026-03-15", rotas: 298, pedidos: 4380, volumes: 10200, entregas: 4108, insucessos: 272, entregasEfetivas: 0.938, sprPedidos: 14.7, sprVolumes: 34.2, scoreOperacional: 84.5 },
    { anoSemana: "2026-W12", semanaLabel: "S12", semanaInicio: "2026-03-16", semanaFim: "2026-03-20", rotas: 314, pedidos: 4852, volumes: 11300, entregas: 4595, insucessos: 257, entregasEfetivas: 0.947, sprPedidos: 15.4, sprVolumes: 36.0, scoreOperacional: 87.3 },
  ];
}

// ─── Filial Performance ───────────────────────────────────────────
export function getMockFilialPerformance(): FilialPerformance[] {
  return [
    { filial: "SP Capital", nomeFilial: "São Paulo Capital", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 342, placasDistintas: 85, pedidosReal: 5120, pedidosPlan: 5200, volumesReal: 11840, volumesPlan: 12100, pesoReal: 24500, pesoPlan: 25000, entregues: 4925, insucessos: 195, entregasEfetivas: 0.962, sprVolumesReal: 34.6, sprPedidosReal: 15.0, sprVsMeta: -27.0, tempoReal: 6.8, tempoPlan: 7.0, desvioTempoH: -0.2, desvioTempoPct: -0.03, kmReal: 78.5, kmPlan: 80.0, progressoPct: 0.95, scoreOperacional: 91.4 },
    { filial: "RJ Metro", nomeFilial: "Rio de Janeiro Metro", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 218, placasDistintas: 54, pedidosReal: 3240, pedidosPlan: 3400, volumesReal: 7420, volumesPlan: 7800, pesoReal: 15800, pesoPlan: 16500, entregues: 3039, insucessos: 201, entregasEfetivas: 0.938, sprVolumesReal: 34.0, sprPedidosReal: 14.9, sprVsMeta: -27.1, tempoReal: 7.2, tempoPlan: 7.0, desvioTempoH: 0.2, desvioTempoPct: 0.03, kmReal: 92.3, kmPlan: 88.0, progressoPct: 0.90, scoreOperacional: 86.7 },
    { filial: "BH", nomeFilial: "Belo Horizonte", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 156, placasDistintas: 39, pedidosReal: 2380, pedidosPlan: 2500, volumesReal: 5480, volumesPlan: 5600, pesoReal: 11200, pesoPlan: 11800, entregues: 2264, insucessos: 116, entregasEfetivas: 0.951, sprVolumesReal: 35.1, sprPedidosReal: 15.3, sprVsMeta: -26.7, tempoReal: 6.5, tempoPlan: 7.0, desvioTempoH: -0.5, desvioTempoPct: -0.07, kmReal: 65.2, kmPlan: 68.0, progressoPct: 0.93, scoreOperacional: 89.2 },
    { filial: "Curitiba", nomeFilial: "Curitiba", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 134, placasDistintas: 33, pedidosReal: 1920, pedidosPlan: 2000, volumesReal: 4380, volumesPlan: 4500, pesoReal: 9100, pesoPlan: 9500, entregues: 1812, insucessos: 108, entregasEfetivas: 0.944, sprVolumesReal: 32.7, sprPedidosReal: 14.3, sprVsMeta: -27.7, tempoReal: 6.9, tempoPlan: 7.0, desvioTempoH: -0.1, desvioTempoPct: -0.01, kmReal: 71.8, kmPlan: 72.0, progressoPct: 0.92, scoreOperacional: 88.1 },
    { filial: "POA", nomeFilial: "Porto Alegre", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 112, placasDistintas: 28, pedidosReal: 1680, pedidosPlan: 1800, volumesReal: 3870, volumesPlan: 4100, pesoReal: 7800, pesoPlan: 8200, entregues: 1558, insucessos: 122, entregasEfetivas: 0.927, sprVolumesReal: 34.6, sprPedidosReal: 15.0, sprVsMeta: -27.0, tempoReal: 7.1, tempoPlan: 7.0, desvioTempoH: 0.1, desvioTempoPct: 0.01, kmReal: 85.1, kmPlan: 82.0, progressoPct: 0.88, scoreOperacional: 84.3 },
    { filial: "Campinas", nomeFilial: "Campinas", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 98, placasDistintas: 24, pedidosReal: 1450, pedidosPlan: 1500, volumesReal: 3350, volumesPlan: 3400, pesoReal: 6900, pesoPlan: 7100, entregues: 1408, insucessos: 42, entregasEfetivas: 0.971, sprVolumesReal: 34.2, sprPedidosReal: 14.8, sprVsMeta: -27.2, tempoReal: 6.3, tempoPlan: 7.0, desvioTempoH: -0.7, desvioTempoPct: -0.10, kmReal: 58.4, kmPlan: 62.0, progressoPct: 0.96, scoreOperacional: 92.8 },
    { filial: "Salvador", nomeFilial: "Salvador", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 87, placasDistintas: 22, pedidosReal: 1312, pedidosPlan: 1400, volumesReal: 3020, volumesPlan: 3200, pesoReal: 6200, pesoPlan: 6600, entregues: 1199, insucessos: 113, entregasEfetivas: 0.914, sprVolumesReal: 34.7, sprPedidosReal: 15.1, sprVsMeta: -26.9, tempoReal: 7.4, tempoPlan: 7.0, desvioTempoH: 0.4, desvioTempoPct: 0.06, kmReal: 95.2, kmPlan: 90.0, progressoPct: 0.85, scoreOperacional: 82.5 },
    { filial: "Recife", nomeFilial: "Recife", tipoFilial: "Unidade", metaSpr: 42, diasCobertos: 20, rotas: 100, placasDistintas: 25, pedidosReal: 1330, pedidosPlan: 1400, volumesReal: 3050, volumesPlan: 3200, pesoReal: 6300, pesoPlan: 6700, entregues: 1240, insucessos: 90, entregasEfetivas: 0.932, sprVolumesReal: 30.5, sprPedidosReal: 13.3, sprVsMeta: -28.7, tempoReal: 7.0, tempoPlan: 7.0, desvioTempoH: 0, desvioTempoPct: 0, kmReal: 88.7, kmPlan: 87.0, progressoPct: 0.89, scoreOperacional: 85.9 },
  ];
}

// ─── Transportadores ──────────────────────────────────────────────
export function getMockTransportadores(): TransportadorResumo[] {
  return [
    { transportador: "Rapido Translog", rotas: 287, share: 0.23, custoMedioCarga: 2150, custoMedioVolume: 66.4, custoMedioPedido: 154.5, entregasEfetivas: 0.961, scoreOperacional: 91.2, sprPedidos: 15.2, sprVolumes: 35.1, pedidos: 4364, volumes: 10076, valorTotal: 617050, status: "OK", statusCor: "green" },
    { transportador: "Expresso Sul", rotas: 214, share: 0.172, custoMedioCarga: 2340, custoMedioVolume: 72.1, custoMedioPedido: 168.2, entregasEfetivas: 0.943, scoreOperacional: 87.8, sprPedidos: 14.8, sprVolumes: 34.2, pedidos: 3167, volumes: 7319, valorTotal: 500760, status: "Atenção", statusCor: "yellow" },
    { transportador: "Carga Segura", rotas: 198, share: 0.159, custoMedioCarga: 2180, custoMedioVolume: 67.2, custoMedioPedido: 156.8, entregasEfetivas: 0.957, scoreOperacional: 90.1, sprPedidos: 15.0, sprVolumes: 34.7, pedidos: 2970, volumes: 6871, valorTotal: 431640, status: "OK", statusCor: "green" },
    { transportador: "Norte Log", rotas: 167, share: 0.134, custoMedioCarga: 2520, custoMedioVolume: 77.7, custoMedioPedido: 181.3, entregasEfetivas: 0.924, scoreOperacional: 84.6, sprPedidos: 14.2, sprVolumes: 32.8, pedidos: 2371, volumes: 5478, valorTotal: 420840, status: "Crítico", statusCor: "red" },
    { transportador: "TransBrasil", rotas: 145, share: 0.116, custoMedioCarga: 2410, custoMedioVolume: 74.3, custoMedioPedido: 173.4, entregasEfetivas: 0.938, scoreOperacional: 86.3, sprPedidos: 14.5, sprVolumes: 33.5, pedidos: 2103, volumes: 4858, valorTotal: 349450, status: "Atenção", statusCor: "yellow" },
    { transportador: "Via Rápida", rotas: 126, share: 0.101, custoMedioCarga: 2290, custoMedioVolume: 70.6, custoMedioPedido: 164.8, entregasEfetivas: 0.949, scoreOperacional: 88.5, sprPedidos: 14.9, sprVolumes: 34.4, pedidos: 1877, volumes: 4334, valorTotal: 288540, status: "OK", statusCor: "green" },
    { transportador: "Outros", rotas: 110, share: 0.088, custoMedioCarga: 2680, custoMedioVolume: 82.6, custoMedioPedido: 192.8, entregasEfetivas: 0.912, scoreOperacional: 82.1, sprPedidos: 13.8, sprVolumes: 31.9, pedidos: 1518, volumes: 3509, valorTotal: 294800, status: "Crítico", statusCor: "red" },
  ];
}

// ─── Alertas ──────────────────────────────────────────────────────
export function getMockAlertas(page = 1, limit = 50): PaginatedResponse<Alerta> {
  const all: Alerta[] = [
    { data: "2026-03-19", filial: "SP Capital", regiao: "Sudeste", transportador: "Expresso Sul", rota: "RT-4521", rotaPlanejada: "RP-4521", placa: "ABC-1234", motorista: "Carlos Mendes", tipoVeiculo: "VUC", status: "Em Rota", statusRota: "Overtime", cor: "#F04438", pedidos: 18, volumes: 42, peso: 1240, entregues: 15, insucessos: 2, kmPlanejado: 80, kmRealizado: 87.3, tempoPlanejado: 6.0, tempoRealizado: 8.23, entregaEfetivaRota: 0.882, ocupacaoPeso: 0.821, flagNaoPlanejada: false, flagSemTempo: false, flagOvertime: true, flagMatchCritico: false, flagEntregaCritica: false, matchTemporal: "Mesmo Dia", prioridade: "Alta" },
    { data: "2026-03-19", filial: "RJ Metro", regiao: "Sudeste", transportador: "Norte Log", rota: "RT-3287", rotaPlanejada: "RP-3287", placa: "DEF-5678", motorista: "Roberto Alves", tipoVeiculo: "Toco", status: "Em Rota", statusRota: "Entrega Crítica", cor: "#F04438", pedidos: 24, volumes: 58, peso: 2180, entregues: 18, insucessos: 4, kmPlanejado: 100, kmRealizado: 112.7, tempoPlanejado: 7.0, tempoRealizado: 5.33, entregaEfetivaRota: 0.818, ocupacaoPeso: 0.763, flagNaoPlanejada: false, flagSemTempo: false, flagOvertime: false, flagMatchCritico: false, flagEntregaCritica: true, matchTemporal: "Mesmo Dia", prioridade: "Alta" },
    { data: "2026-03-20", filial: "BH", regiao: "Sudeste", transportador: "Carga Segura", rota: "RT-1892", rotaPlanejada: "", placa: "GHI-9012", motorista: "Ana Paula Silva", tipoVeiculo: "3/4", status: "Finalizado", statusRota: "Não Planejada", cor: "#F79009", pedidos: 12, volumes: 28, peso: 860, entregues: 12, insucessos: 0, kmPlanejado: 0, kmRealizado: 54.2, tempoPlanejado: 0, tempoRealizado: 4.08, entregaEfetivaRota: 1.0, ocupacaoPeso: 0.912, flagNaoPlanejada: true, flagSemTempo: false, flagOvertime: false, flagMatchCritico: false, flagEntregaCritica: false, matchTemporal: "Sem Planejado", prioridade: "Media" },
    { data: "2026-03-20", filial: "Curitiba", regiao: "Sul", transportador: "Rapido Translog", rota: "RT-5643", rotaPlanejada: "RP-5643", placa: "JKL-3456", motorista: "Marcos Lima", tipoVeiculo: "VUC", status: "Finalizado", statusRota: "Sem Tempo", cor: "#98A2B3", pedidos: 16, volumes: 38, peso: 1120, entregues: 15, insucessos: 1, kmPlanejado: 70, kmRealizado: 72.8, tempoPlanejado: 6.5, tempoRealizado: 0, entregaEfetivaRota: 0.9375, ocupacaoPeso: 0.847, flagNaoPlanejada: false, flagSemTempo: true, flagOvertime: false, flagMatchCritico: false, flagEntregaCritica: false, matchTemporal: "Mesmo Dia", prioridade: "Baixa" },
    { data: "2026-03-20", filial: "POA", regiao: "Sul", transportador: "Via Rápida", rota: "RT-2198", rotaPlanejada: "RP-2198", placa: "MNO-7890", motorista: "Fernanda Costa", tipoVeiculo: "Toco", status: "Em Rota", statusRota: "Overtime", cor: "#F04438", pedidos: 22, volumes: 51, peso: 1890, entregues: 14, insucessos: 1, kmPlanejado: 85, kmRealizado: 95.1, tempoPlanejado: 6.5, tempoRealizado: 4.58, entregaEfetivaRota: 0.933, ocupacaoPeso: 0.795, flagNaoPlanejada: false, flagSemTempo: false, flagOvertime: true, flagMatchCritico: false, flagEntregaCritica: false, matchTemporal: "Mesmo Dia", prioridade: "Alta" },
    { data: "2026-03-19", filial: "Salvador", regiao: "Nordeste", transportador: "TransBrasil", rota: "RT-7821", rotaPlanejada: "RP-7821", placa: "PQR-1234", motorista: "João Pereira", tipoVeiculo: "3/4", status: "Roteirizado", statusRota: "Match Crítico", cor: "#F79009", pedidos: 8, volumes: 19, peso: 580, entregues: 0, insucessos: 0, kmPlanejado: 45, kmRealizado: 0, tempoPlanejado: 5.0, tempoRealizado: 0, entregaEfetivaRota: 0, ocupacaoPeso: 0, flagNaoPlanejada: false, flagSemTempo: false, flagOvertime: false, flagMatchCritico: true, flagEntregaCritica: false, matchTemporal: "Fora D+/-1", prioridade: "Media" },
  ];
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);
  return { data: slice, total: all.length, page, pages: Math.ceil(all.length / limit) };
}

export function getMockAlertasContagem(): AlertaContagem {
  return { naoPlanejada: 12, semTempo: 8, overtime: 47, entregaCritica: 15, matchCritico: 9, total: 91 };
}

// ─── Drill Rotas ──────────────────────────────────────────────────
export function getMockDrillRotas(page = 1, limit = 50): PaginatedResponse<DrillRota> {
  const all: DrillRota[] = [
    { data: "2026-03-19", filial: "SP Capital", nomeFilial: "SP Capital", regiao: "Sudeste", transportador: "Expresso Sul", rota: "RT-4521", placa: "ABC-1234", motorista: "Carlos Mendes", tipoVeiculo: "VUC", status: "Em Rota", pedidos: 18, volumes: 42, peso: 1240, entregas: 15, insucessos: 2, kmPlanejado: 80, kmRealizado: 87.3, tempoPlanejado: 6.0, tempoRealizado: 6.42, entregaEfetiva: 0.882, ocupacaoPeso: 0.821, aderenciaVolumes: 0.884, valorTotalRota: 2340, scoreOperacional: 72.4, flagOvertime: true, flagEntregaCritica: false, alertaOperacional: "Overtime" },
    { data: "2026-03-19", filial: "RJ Metro", nomeFilial: "RJ Metro", regiao: "Sudeste", transportador: "Norte Log", rota: "RT-3287", placa: "DEF-5678", motorista: "Roberto Alves", tipoVeiculo: "Toco", status: "Em Rota", pedidos: 24, volumes: 58, peso: 2180, entregas: 18, insucessos: 4, kmPlanejado: 100, kmRealizado: 112.7, tempoPlanejado: 7.0, tempoRealizado: 5.33, entregaEfetiva: 0.818, ocupacaoPeso: 0.763, aderenciaVolumes: 0.821, valorTotalRota: 2520, scoreOperacional: 68.9, flagOvertime: false, flagEntregaCritica: true, alertaOperacional: "Entrega Crítica" },
    { data: "2026-03-20", filial: "BH", nomeFilial: "Belo Horizonte", regiao: "Sudeste", transportador: "Carga Segura", rota: "RT-1892", placa: "GHI-9012", motorista: "Ana Paula Silva", tipoVeiculo: "3/4", status: "Finalizado", pedidos: 12, volumes: 28, peso: 860, entregas: 12, insucessos: 0, kmPlanejado: 55, kmRealizado: 54.2, tempoPlanejado: 4.5, tempoRealizado: 4.08, entregaEfetiva: 1.0, ocupacaoPeso: 0.912, aderenciaVolumes: 0.963, valorTotalRota: 1850, scoreOperacional: 94.7, flagOvertime: false, flagEntregaCritica: false, alertaOperacional: "" },
    { data: "2026-03-20", filial: "Curitiba", nomeFilial: "Curitiba", regiao: "Sul", transportador: "Rapido Translog", rota: "RT-5643", placa: "JKL-3456", motorista: "Marcos Lima", tipoVeiculo: "VUC", status: "Finalizado", pedidos: 16, volumes: 38, peso: 1120, entregas: 15, insucessos: 1, kmPlanejado: 70, kmRealizado: 72.8, tempoPlanejado: 6.5, tempoRealizado: 4.97, entregaEfetiva: 0.9375, ocupacaoPeso: 0.847, aderenciaVolumes: 0.918, valorTotalRota: 2150, scoreOperacional: 88.3, flagOvertime: false, flagEntregaCritica: false, alertaOperacional: "" },
    { data: "2026-03-20", filial: "POA", nomeFilial: "Porto Alegre", regiao: "Sul", transportador: "Via Rápida", rota: "RT-2198", placa: "MNO-7890", motorista: "Fernanda Costa", tipoVeiculo: "Toco", status: "Em Rota", pedidos: 22, volumes: 51, peso: 1890, entregas: 14, insucessos: 1, kmPlanejado: 85, kmRealizado: 95.1, tempoPlanejado: 6.5, tempoRealizado: 4.58, entregaEfetiva: 0.933, ocupacaoPeso: 0.795, aderenciaVolumes: 0.857, valorTotalRota: 2290, scoreOperacional: 81.2, flagOvertime: false, flagEntregaCritica: false, alertaOperacional: "" },
    { data: "2026-03-19", filial: "Salvador", nomeFilial: "Salvador", regiao: "Nordeste", transportador: "TransBrasil", rota: "RT-7821", placa: "PQR-1234", motorista: "João Pereira", tipoVeiculo: "3/4", status: "Roteirizado", pedidos: 8, volumes: 19, peso: 580, entregas: 0, insucessos: 0, kmPlanejado: 45, kmRealizado: 0, tempoPlanejado: 5.0, tempoRealizado: 0, entregaEfetiva: 0, ocupacaoPeso: 0, aderenciaVolumes: 0, valorTotalRota: 2410, scoreOperacional: 0, flagOvertime: false, flagEntregaCritica: false, alertaOperacional: "" },
  ];
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);
  return { data: slice, total: all.length, page, pages: Math.ceil(all.length / limit) };
}

// ─── Ocupação por Tipo de Veículo ─────────────────────────────────
export function getMockOcupacaoTipoVeiculo(): OcupacaoTipoVeiculo[] {
  return [
    { tipoVeiculo: "VUC", rotas: 420, placasDistintas: 105, mediaPedidosRota: 16.2, mediaVolumesRota: 37.8, mediaPesoRota: 1120, pesoTotalKg: 470400, capacidadePesoTotalKg: 1470000, ocupacaoPeso: 0.320, sprPorVeiculo: 16.2, orh: 6.8, custoMedioVolume: 66.4 },
    { tipoVeiculo: "3/4", rotas: 210, placasDistintas: 52, mediaPedidosRota: 14.5, mediaVolumesRota: 33.8, mediaPesoRota: 1800, pesoTotalKg: 378000, capacidadePesoTotalKg: 840000, ocupacaoPeso: 0.450, sprPorVeiculo: 14.5, orh: 7.1, custoMedioVolume: 72.1 },
    { tipoVeiculo: "Toco", rotas: 180, placasDistintas: 45, mediaPedidosRota: 22.4, mediaVolumesRota: 52.1, mediaPesoRota: 3200, pesoTotalKg: 576000, capacidadePesoTotalKg: 1080000, ocupacaoPeso: 0.533, sprPorVeiculo: 22.4, orh: 7.5, custoMedioVolume: 58.2 },
    { tipoVeiculo: "Truck", rotas: 85, placasDistintas: 21, mediaPedidosRota: 28.6, mediaVolumesRota: 66.7, mediaPesoRota: 5400, pesoTotalKg: 459000, capacidadePesoTotalKg: 850000, ocupacaoPeso: 0.540, sprPorVeiculo: 28.6, orh: 7.8, custoMedioVolume: 52.8 },
    { tipoVeiculo: "Carreta", rotas: 42, placasDistintas: 10, mediaPedidosRota: 35.2, mediaVolumesRota: 82.1, mediaPesoRota: 12000, pesoTotalKg: 504000, capacidadePesoTotalKg: 840000, ocupacaoPeso: 0.600, sprPorVeiculo: 35.2, orh: 8.2, custoMedioVolume: 48.5 },
  ];
}

// ─── Motoristas ───────────────────────────────────────────────────
export function getMockMotoristas(page = 1, limit = 50): PaginatedResponse<MotoristaJornada> {
  const all: MotoristaJornada[] = [
    { data: "2026-03-20", filial: "SP Capital", transportador: "Expresso Sul", motorista: "Carlos Mendes", placa: "ABC-1234", qtdRotas: 3, horasJornada: 10.5, flagOvertime: true, entregas: 42, insucessos: 3, scoreOperacional: 78.4, pedidos: 54, volumes: 126 },
    { data: "2026-03-20", filial: "RJ Metro", transportador: "Norte Log", motorista: "Roberto Alves", placa: "DEF-5678", qtdRotas: 2, horasJornada: 8.2, flagOvertime: false, entregas: 36, insucessos: 4, scoreOperacional: 72.1, pedidos: 48, volumes: 112 },
    { data: "2026-03-20", filial: "BH", transportador: "Carga Segura", motorista: "Ana Paula Silva", placa: "GHI-9012", qtdRotas: 2, horasJornada: 7.4, flagOvertime: false, entregas: 28, insucessos: 0, scoreOperacional: 96.2, pedidos: 24, volumes: 56 },
    { data: "2026-03-20", filial: "Curitiba", transportador: "Rapido Translog", motorista: "Marcos Lima", placa: "JKL-3456", qtdRotas: 2, horasJornada: 9.1, flagOvertime: true, entregas: 31, insucessos: 1, scoreOperacional: 89.7, pedidos: 32, volumes: 76 },
    { data: "2026-03-20", filial: "POA", transportador: "Via Rápida", motorista: "Fernanda Costa", placa: "MNO-7890", qtdRotas: 2, horasJornada: 7.8, flagOvertime: false, entregas: 33, insucessos: 1, scoreOperacional: 85.3, pedidos: 44, volumes: 102 },
    { data: "2026-03-20", filial: "Salvador", transportador: "TransBrasil", motorista: "João Pereira", placa: "PQR-1234", qtdRotas: 1, horasJornada: 3.2, flagOvertime: false, entregas: 0, insucessos: 0, scoreOperacional: 0, pedidos: 8, volumes: 19 },
  ];
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);
  return { data: slice, total: all.length, page, pages: Math.ceil(all.length / limit) };
}

export function getMockMotoristasKpis(): MotoristaKpis {
  return { motoristasAtivos: 298, mediaRotasDia: 2.1, jornadaMedia: 7.7, qtdOvertime: 47, dpph: 4.3 };
}

// ─── KPI Diário ───────────────────────────────────────────────────
export function getMockKpiDiario(): KpiDiario {
  return {
    data: "2026-03-19",
    rotas: 1247, pedidos: 18432, volumes: 42871, entregas: 17459, insucessos: 973,
    veiculosAtivos: 312, motoristasAtivos: 298, totalKmRealizado: 98450, totalPesoKg: 5430000,
    sprPedidos: 14.8, sprVolumes: 34.4, pctEntregasEfetivas: 0.947, pctRotasConcluidas: 0.921,
    tempoMedRealizado: 4.38, pctUtilizacaoJornada: 0.876, pctOciosidadeJornada: 0.124,
    pctRotasOvertime: 0.038, pctOcupacaoPedidos: 0.842, pctOcupacaoVolumes: 0.726,
    pctOcupacaoComposta: 0.784, pctAderPedidos: 0.912, pctAderVolumes: 0.887,
    pctAderPeso: 0.931, pctAderKm: 0.864, pctAderTempo: 0.849, pctMatchMesmoDia: 0.763,
    scoreOperacional: 87.3, valorPagamentoTotal: 2847320, custoMedioCarga: 2283,
    custoMedioVolume: 66.4, custoMedioPedido: 154.5,
  };
}
