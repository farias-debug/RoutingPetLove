# Frontend — Dashboard Monitoramento Logístico

React 18 + TypeScript + Vite + shadcn/ui + Recharts + React Query.

## Setup

```bash
npm install
npm run dev     # http://localhost:8080

# Em paralelo, suba a API local na porta padronizada
cd ../api
node server.js   # http://localhost:3001
```

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_API_BASE_URL` | URL da API Cloud Run (ex: `https://dashboard-logistico-api-....run.app`) |
| `VITE_ENABLE_MOCKS` | `true` para dados mock quando API indisponível |

## Páginas

| Rota | Página |
|------|--------|
| `/` | Cockpit Operacional (principal) |
| `/planejado-realizado` | Aderência Planejado vs Realizado |
| `/custos` | Custos e Eficiência |
| `/frota` | Frota e Capacidade |
| `/tempo-sla` | Tempo e SLA |
| `/aderencia` | Aderência Multidimensional |
| `/transportadores` | Performance Transportadores |
| `/motoristas` | Jornada Motoristas |
| `/alertas` | Investigação Operacional |

## Build

```bash
npm run build   # Gera dist/
```

Deploy via Firebase Hosting (`firebase deploy --only hosting`).
