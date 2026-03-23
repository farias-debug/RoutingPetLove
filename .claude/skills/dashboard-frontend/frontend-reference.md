# Referencia do Frontend do Dashboard

## Escopo

- Pasta principal: Dashboard/frontend/
- Stack: React 18, Vite 5, TypeScript 5, shadcn/ui, Tailwind CSS, Recharts, React Query, Zod

## Rotas principais

- / e /cockpit-operacional: cockpit principal
- /resumo-executivo: KPIs resumidos
- /planejado-realizado: aderencia de pedidos, volume, peso e km
- /custos: custos e eficiencia
- /frota: ocupacao e capacidade
- /tempo-sla: SLA e entregas
- /aderencia: radar e performance filial
- /transportadores: share e performance de transportadores
- /motoristas: jornada e produtividade
- /alertas: investigacao operacional

## Padroes tecnicos

- Hooks de dados: src/hooks/useApiData.ts
- Filtros globais: src/hooks/useGlobalFilters.ts
- Cliente API: src/services/api/client.ts
- Schemas: src/services/api/schemas.ts
- Mocks: src/services/api/mockAdapter.ts

## Checklist rapido

- Confirmar loading, erro e estado vazio
- Confirmar comportamento mobile
- Confirmar formatacao de moeda, percentual, volume e datas
- Confirmar se o componente usa hook e schema corretos
- Confirmar se o grafico usa container responsivo
- Confirmar se a mudanca nao quebrou searchParams ou cache do React Query

## Fontes de verdade

- API: Dashboard/api/
- Documentacao de dashboard e pipeline: Dashboard/docs/
