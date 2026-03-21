/**
 * Hook de filtros globais do dashboard — persiste estado na URL (searchParams).
 * Usado por todos os hooks de dados para passar filtros à API.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { GlobalFilters } from "@/types/api";

export function useGlobalFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: GlobalFilters = useMemo(() => ({
    periodo: searchParams.get("periodo") || undefined,
    filial: searchParams.get("filial") || undefined,
    transportador: searchParams.get("transportador") || undefined,
    tipoVeiculo: searchParams.get("tipoVeiculo") || undefined,
    status: searchParams.get("status") || undefined,
    prioridade: searchParams.get("prioridade") || undefined,
  }), [searchParams]);

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setFilter = useCallback(
    (key: keyof GlobalFilters, value: string | undefined) => {
      setParam(key, value);
    },
    [setParam],
  );

  const resetFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["periodo", "filial", "transportador", "tipoVeiculo", "status", "prioridade"].forEach((key) => next.delete(key));
      return next;
    });
  }, [setSearchParams]);

  return { filters, setFilter, setParam, resetFilters, searchParams };
}
