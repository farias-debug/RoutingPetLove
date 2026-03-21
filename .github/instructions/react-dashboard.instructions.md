---
applyTo:
  - "Dashboard/frontend/**"
---

# Instruções — React Dashboard (Dashboard/frontend/)

## Stack

- React 18.3 + Vite 5.4 + TypeScript 5.8
- shadcn/ui (40+ componentes) + Tailwind CSS 3.4
- Recharts 2.15 (visualizações)
- React Router DOM 6.30 (roteamento)
- TanStack React Query 5.83 (data fetching + cache)
- Zod 3.25 (validação de schemas)
- Package manager: npm
- Dev server: porta 8080
- Deploy: Firebase Hosting (`data-aileron-482822-d0.web.app`)

## Páginas

| Rota | Componente | Domínio |
|------|-----------|--------|
| `/` | CockpitOperacional | Dashboard principal — KPIs, tendências, filiais, alertas |
| `/cockpit-operacional` | CockpitOperacional | Alias do cockpit |
| `/resumo-executivo` | ResumoExecutivo | KPIs resumidos |
| `/planejado-realizado` | PlanejadoRealizado | Aderência: pedidos, volumes, peso, KM |
| `/custos` | CustosEficiencia | Custo por carga por transportador |
| `/frota` | FrotaCapacidade | Ocupação por tipo de veículo |
| `/tempo-sla` | TempoSla | Entregas efetivas, SLA compliance |
| `/aderencia` | AderenciaAtendimento | Radar 6D + performance filial |
| `/transportadores` | Transportadores | Share de transportadores nas rotas |
| `/motoristas` | MotoristasJornada | Motoristas ativos, rotas/dia, HE |
| `/alertas` | InvestigacaoOperacional | Drill-down tipos de alerta |

## Componentes Chave

- `DashboardLayout` — Layout com sidebar colapsável, nav, responsivo (768px)
- `GlobalFiltersBar` — Filtros globais sincronizados via URL (período, filial, etc.)
- `KPICard` — Card com valor, meta, delta, status (OK/Atenção/Crítico), trends D1/WoW
- `TemporalWindowTabs` — Abas para janelas temporais (7d, 14d, 30d, MTD)
- `SectionCard` — Container de seção com título
- `StatusChip` — Badge com cor (success/warning/danger)
- `LoadingSkeleton` — Skeleton de carregamento
- `ErrorBoundary` — Captura erros React

## Camada de Dados

✅ **Conectado à API Cloud Run** em produção (`Dashboard/api/server.js`).
Mock adapter ativo apenas em dev local quando `VITE_API_BASE_URL` vazio.

- API client: `src/services/api/client.ts` (fetch + timeout 20s + retry 2x)
- Validação: `src/services/api/schemas.ts` (Zod schemas)
- Mock fallback: `src/services/api/mockAdapter.ts`
- Hooks: `src/hooks/useApiData.ts` (React Query, staleTime 5min)
- Filtros: `src/hooks/useGlobalFilters.ts` (URL-based via searchParams)

## Variáveis de Ambiente

- `VITE_API_BASE_URL` — URL da API (produção/staging/local)
- `VITE_APP_ENV` — Environment (local, staging, production)
- `VITE_ENABLE_MOCKS` — Força uso de mocks (dev)

## Design System

- Fonte: Public Sans (Google Fonts)
- Logo: Petlove (`/petlove-logo.png`)
- Paleta Petlove: roxo `#441A80`, variantes
- Animações: fade-in escalonado (60ms)
- Mobile-first (breakpoint 768px)

## Convenções de Código

- Componentes: PascalCase, um por arquivo
- Hooks: `use` prefix em `src/hooks/`
- Estilos: Tailwind utility classes, sem CSS modules
- Imports: `@/` alias para `src/`
