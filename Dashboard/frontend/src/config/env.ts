/**
 * Configuração de ambiente para o dashboard.
 * Variáveis VITE_* vêm do .env (Vite injeta em build-time).
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const APP_ENV = import.meta.env.VITE_APP_ENV || "local";

/**
 * API habilitada quando VITE_API_ENABLED=true ou quando há URL configurada.
 * Mocks habilitados apenas se VITE_ENABLE_MOCKS=true e API desabilitada.
 */
export const API_ENABLED = API_BASE_URL.length > 0 || import.meta.env.VITE_API_ENABLED === "true";
export const MOCKS_ENABLED = !API_ENABLED && import.meta.env.VITE_ENABLE_MOCKS === "true";

export const API_TIMEOUT_MS = 20_000;
