/**
 * React Query hooks para consumo de dados do dashboard.
 * Quando API_ENABLED=true, fazem fetch da API real.
 * Mocks locais só são usados se VITE_ENABLE_MOCKS=true.
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API_ENABLED, MOCKS_ENABLED } from "@/config/env";
import { api } from "@/services/api/client";
import * as mock from "@/services/api/mockAdapter";
import type { GlobalFilters } from "@/types/api";

// ─── Helper ────────────────────────────────────────────────────────

/**
 * Cria um hook React Query que usa API real por padrão.
 * Mock só entra quando explicitamente habilitado no ambiente local.
 */
function useDashboardQuery<T>(
  key: unknown[],
  apiFn: () => Promise<T>,
  mockFn: () => T,
  options?: { enabled?: boolean },
) {
  const queryFn = API_ENABLED
    ? apiFn
    : MOCKS_ENABLED
      ? () => Promise.resolve(mockFn())
      : () => Promise.reject(new Error("API_NOT_CONFIGURED"));

  return useQuery<T>({
    queryKey: key,
    queryFn,
    staleTime: API_ENABLED ? 5 * 60_000 : MOCKS_ENABLED ? Infinity : 0,
    placeholderData: keepPreviousData,
    retry: API_ENABLED ? 2 : 0,
    ...options,
  });
}

// ─── Hooks ─────────────────────────────────────────────────────────

export function useMetas() {
  return useDashboardQuery(["metas"], api.getMetas, mock.getMockMetas);
}

export function useFilterOptions(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["filtros", "opcoes", filters?.periodo, filters?.filial, filters?.transportador, filters?.tipoVeiculo, filters?.status, filters?.prioridade],
    () => api.getFilterOptions(filters),
    () => ({
      periodos: [],
      filiais: [],
      transportadores: [],
      tiposVeiculo: [],
      status: [],
      prioridades: [],
    }),
  );
}

export function useResumoCards(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["resumo", "cards", filters?.periodo, filters?.filial, filters?.transportador, filters?.tipoVeiculo, filters?.status],
    () => api.getResumoCards(filters),
    mock.getMockResumoCards,
  );
}

export function useTendenciaSemanal(semanas = 8, filters?: GlobalFilters) {
  return useDashboardQuery(
    ["resumo", "tendencia-semanal", semanas, filters?.periodo, filters?.filial, filters?.transportador, filters?.tipoVeiculo, filters?.status],
    () => api.getTendenciaSemanal(semanas, filters),
    mock.getMockTendenciaSemanal,
  );
}

export function useCockpitSerieDiaria(janela = "30d", filters?: GlobalFilters) {
  return useDashboardQuery(
    ["executivo", "serie-diaria", janela, filters?.periodo, filters?.filial, filters?.transportador, filters?.tipoVeiculo, filters?.status],
    () => api.getCockpitSerieDiaria(janela, filters),
    () => [],
  );
}

export function useFilialPerformance(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["filiais", "performance", filters?.periodo, filters?.filial],
    () => api.getFilialPerformance({ periodo: filters?.periodo, filial: filters?.filial }),
    mock.getMockFilialPerformance,
  );
}

export function useAlertas(params?: { page?: number; limit?: number; tipo?: string; filial?: string; periodo?: string; transportador?: string; status?: string; prioridade?: string; tipoVeiculo?: string }) {
  return useDashboardQuery(
    ["alertas", params],
    () => api.getAlertas(params),
    () => mock.getMockAlertas(params?.page, params?.limit),
  );
}

export function useAlertasContagem(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["alertas", "contagem", filters?.periodo, filters?.filial, filters?.transportador],
    () => api.getAlertasContagem({ periodo: filters?.periodo, filial: filters?.filial, transportador: filters?.transportador }),
    mock.getMockAlertasContagem,
  );
}

export function useDrillRotas(params?: { page?: number; limit?: number; filial?: string; status?: string; transportador?: string; periodo?: string; sort?: string; order?: string; prioridade?: string; tipoVeiculo?: string }) {
  return useDashboardQuery(
    ["drill-rotas", params],
    () => api.getDrillRotas(params),
    () => mock.getMockDrillRotas(params?.page, params?.limit),
  );
}

export function useTransportadores(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["transportadores", filters?.periodo, filters?.filial, filters?.transportador],
    () => api.getTransportadores({ periodo: filters?.periodo, filial: filters?.filial, transportador: filters?.transportador }),
    mock.getMockTransportadores,
  );
}

export function useOcupacaoTipoVeiculo(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["frota", "ocupacao-tipo", filters?.periodo, filters?.transportador, filters?.tipoVeiculo],
    () => api.getOcupacaoTipoVeiculo({ periodo: filters?.periodo, transportador: filters?.transportador, tipoVeiculo: filters?.tipoVeiculo }),
    mock.getMockOcupacaoTipoVeiculo,
  );
}

export function useMotoristas(params?: { page?: number; limit?: number; periodo?: string; filial?: string; transportador?: string; overtime?: boolean }) {
  return useDashboardQuery(
    ["motoristas", params],
    () => api.getMotoristas(params),
    () => mock.getMockMotoristas(params?.page, params?.limit),
  );
}

export function useMotoristasKpis(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["motoristas", "kpis", filters?.periodo, filters?.filial, filters?.transportador],
    () => api.getMotoristasKpis({ periodo: filters?.periodo, filial: filters?.filial, transportador: filters?.transportador }),
    mock.getMockMotoristasKpis,
  );
}

export function useKpiDiario(filters?: GlobalFilters) {
  return useDashboardQuery(
    ["kpi-diario", filters?.periodo, filters?.filial, filters?.transportador, filters?.tipoVeiculo, filters?.status],
    () => api.getKpiDiario({ periodo: filters?.periodo, filial: filters?.filial, transportador: filters?.transportador, tipoVeiculo: filters?.tipoVeiculo, status: filters?.status }),
    mock.getMockKpiDiario,
  );
}
