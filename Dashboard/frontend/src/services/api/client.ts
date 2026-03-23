/**
 * Cliente HTTP central para a API do dashboard.
 * Quando VITE_API_BASE_URL está configurado, faz requisições reais.
 * Em desenvolvimento local, mocks só podem ser habilitados explicitamente.
 */

import { API_BASE_URL, API_ENABLED, API_TIMEOUT_MS } from "@/config/env";
import type { PaginatedResponse } from "@/types/api";
import { apiSchemas } from "@/services/api/schemas";

class SchemaError extends Error {
  constructor(message: string, public details: unknown) {
    super(message);
    this.name = "SchemaError";
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  if (!API_ENABLED) {
    throw new Error("API_NOT_CONFIGURED");
  }

  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Accept": "application/json",
    },
    signal: controller.signal,
  });
  window.clearTimeout(timeoutId);

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || `HTTP ${response.status}`);
  }

  return response.json();
}

async function requestValidated<T>(
  path: string,
  schema: { parse: (value: unknown) => unknown },
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const payload = await request<unknown>(path, params);
  try {
    return schema.parse(payload) as T;
  } catch (error) {
    console.error("Schema drift detected", { path, error, payload });
    throw new SchemaError(`Resposta inválida para ${path}`, error);
  }
}

// ─── Endpoints ─────────────────────────────────────────────────────

export const api = {
  getMetas: () =>
    requestValidated<import("@/types/api").MetaGlobal[]>("/api/metas", apiSchemas.metas),

  getFilterOptions: (params?: import("@/types/api").GlobalFilters) =>
    requestValidated<import("@/types/api").FilterOptionsResponse>("/api/filtros/opcoes", apiSchemas.filterOptions, params as Record<string, string>),

  getResumoCards: (params?: import("@/types/api").GlobalFilters) =>
    requestValidated<import("@/types/api").KpiCard[]>("/api/resumo/cards", apiSchemas.resumoCards, params as Record<string, string>),

  getTendenciaSemanal: (semanas = 8, params?: import("@/types/api").GlobalFilters) =>
    requestValidated<import("@/types/api").TendenciaSemanal[]>("/api/resumo/tendencia-semanal", apiSchemas.tendenciaSemanal, { semanas, ...params }),

  getCockpitSerieDiaria: (janela = "30d", params?: import("@/types/api").GlobalFilters) =>
    requestValidated<import("@/types/api").CockpitSerieDiaria[]>("/api/executivo/serie-diaria", apiSchemas.cockpitSerieDiaria, { janela, ...params }),

  getFilialPerformance: (params?: { periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string }) =>
    requestValidated<import("@/types/api").FilialPerformance[]>("/api/filiais/performance", apiSchemas.filialPerformance, params),

  getAlertas: (params?: { page?: number; limit?: number; tipo?: string; filial?: string; periodo?: string; transportador?: string; status?: string; prioridade?: string; tipoVeiculo?: string }) =>
    requestValidated<PaginatedResponse<import("@/types/api").Alerta>>("/api/alertas", apiSchemas.alertas, params as Record<string, string | number>),

  getAlertasContagem: (params?: { periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string; prioridade?: string }) =>
    requestValidated<import("@/types/api").AlertaContagem>("/api/alertas/contagem", apiSchemas.alertasContagem, params as Record<string, string>),

  getDrillRotas: (params?: { page?: number; limit?: number; filial?: string; status?: string; transportador?: string; periodo?: string; sort?: string; order?: string; prioridade?: string; tipoVeiculo?: string }) =>
    requestValidated<PaginatedResponse<import("@/types/api").DrillRota>>("/api/drill-rotas", apiSchemas.drillRotas, params as Record<string, string | number>),

  getTransportadores: (params?: { periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string }) =>
    requestValidated<import("@/types/api").TransportadorResumo[]>("/api/transportadores", apiSchemas.transportadores, params as Record<string, string>),

  getOcupacaoTipoVeiculo: (params?: { periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string }) =>
    requestValidated<import("@/types/api").OcupacaoTipoVeiculo[]>("/api/frota/ocupacao-tipo", apiSchemas.ocupacaoTipoVeiculo, params as Record<string, string>),

  getMotoristas: (params?: { page?: number; limit?: number; periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; overtime?: boolean }) =>
    requestValidated<PaginatedResponse<import("@/types/api").MotoristaJornada>>("/api/motoristas", apiSchemas.motoristas, params as Record<string, string | number | boolean>),

  getMotoristasKpis: (params?: { periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string }) =>
    requestValidated<import("@/types/api").MotoristaKpis>("/api/motoristas/kpis", apiSchemas.motoristasKpis, params as Record<string, string>),

  getKpiDiario: (params?: { data?: string; periodo?: string; filial?: string; transportador?: string; tipoVeiculo?: string; status?: string }) =>
    requestValidated<import("@/types/api").KpiDiario>("/api/kpi-diario", apiSchemas.kpiDiario, params as Record<string, string>),
};

export { ApiError, SchemaError };
