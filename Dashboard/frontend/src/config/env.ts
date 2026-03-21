/**
 * Configuração de ambiente para o dashboard.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const APP_ENV = import.meta.env.VITE_APP_ENV || "local";
export const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS === "true";

/**
 * Se true, a API está configurada e os hooks devem buscar dados reais.
 */
export const API_ENABLED = API_BASE_URL.length > 0;

export const API_TIMEOUT_MS = 20_000;
