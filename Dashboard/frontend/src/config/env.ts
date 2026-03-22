/**
 * Configuração de ambiente para o dashboard.
 * Variáveis VITE_* vêm do .env (Vite injeta em build-time).
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const APP_ENV = import.meta.env.VITE_APP_ENV || "local";

/**
 * Mocks habilitados apenas se VITE_ENABLE_MOCKS=true E API não configurada.
 * Com API configurada, mocks ficam sempre desligados.
 */
export const API_ENABLED = API_BASE_URL.length > 0;
export const MOCKS_ENABLED = !API_ENABLED && import.meta.env.VITE_ENABLE_MOCKS === "true";

export const API_TIMEOUT_MS = 20_000;
