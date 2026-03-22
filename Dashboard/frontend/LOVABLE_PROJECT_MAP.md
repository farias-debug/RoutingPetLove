# LOVABLE PROJECT MAP - Monitoramento Logistico Last-Mile (Petlove)

> GERADO EM: 2026-03-21 | FONTE: RoutingPetLove/Dashboard/frontend
> LEIA ESTE ARQUIVO INTEIRO antes de fazer qualquer alteracao.

---

## 1. VISAO GERAL

Dashboard de monitoramento logistico last-mile para a Petlove.
Exibe KPIs operacionais, alertas, performance de filiais, transportadores e motoristas.
Dados vem de uma API Cloud Run conectada ao BigQuery.

**Repositorio principal:** github.com/farias-debug/RoutingPetLove
**Este repositorio (git-connect):** Espelho do frontend em Dashboard/frontend/
**Deploy:** Firebase Hosting (projeto data-aileron-482822-d0)

---

## 2. STACK TECNOLOGICA

| Tecnologia | Versao | Uso |
|---|---|---|
| React | 18.3 | Framework UI |
| TypeScript | 5.8 | Tipagem |
| Vite | 5.4 | Build + Dev server (porta 8080) |
| shadcn/ui | latest | Componentes UI (baseados em Radix) |
| Tailwind CSS | 3.4 | Estilos utilitarios |
| Recharts | 2.15 | Graficos |
| @tanstack/react-query | 5.83 | Data fetching + cache |
| Zod | 3.25 | Validacao de schemas |
| react-router-dom | 6.30 | Roteamento |
| lucide-react | 0.462 | Icones |
| Vitest | 3.2 | Testes unitarios |
| Playwright | 1.57 | Testes E2E |

---

## 3. ROTAS E PAGINAS

| Rota | Componente | Descricao |
|---|---|---|
| `/` | CockpitOperacional | Pagina inicial - KPIs executivos, score operacional |
| `/cockpit-operacional` | CockpitOperacional | Alias da home |
| `/resumo-executivo` | Redirect -> `/` | Redirecionamento |
| `/planejado-realizado` | PlanejadoRealizado | Aderencia planejado vs realizado |
| `/custos` | CustosEficiencia | Custos por entrega e eficiencia |
| `/frota` | FrotaCapacidade | Frota, capacidade e ocupacao |
| `/tempo-sla` | TempoSla | Tempo de entrega e SLA |
| `/aderencia` | AderenciaAtendimento | Aderencia multidimensional |
| `/transportadores` | Transportadores | Analise de transportadores |
| `/motoristas` | MotoristasJornada | Jornada de motoristas |
| `/alertas` | InvestigacaoOperacional | Alertas e drill de rotas |
| `*` | NotFound | Pagina 404 |

Todas as paginas sao lazy-loaded e envoltas em DashboardLayout.

---

## 4. ESTRUTURA DE PASTAS

```
src/
  App.tsx                    # Router principal com lazy loading
  App.css                    # Estilos globais do app
  index.css                  # Tailwind base + variaveis CSS (dark theme)
  main.tsx                   # Entry point (React.createRoot)
  vite-env.d.ts              # Tipos do Vite
  config/
    env.ts                   # VITE_API_BASE_URL, MOCKS_ENABLED, API_ENABLED
  types/
    api.ts                   # TODOS os tipos TypeScript (38 interfaces/types)
  services/
    api/
      client.ts              # HTTP client com Zod validation (14 endpoints)
      schemas.ts             # Schemas Zod para validacao de respostas
      mockAdapter.ts         # Mock data para fallback (12 funcoes mock)
  hooks/
    useApiData.ts            # 14 hooks React Query conectados a API
    useGlobalFilters.ts      # Filtros globais via URL searchParams
    use-mobile.tsx           # Breakpoint mobile (768px)
    use-toast.ts             # Sistema de toast notifications
  data/
    mockData.ts              # Dados mock de referencia
  assets/
    petlove-logo.png         # Logo Petlove
  pages/
    CockpitOperacional.tsx   # Cockpit executivo (11 hooks, 9 secoes)
    PlanejadoRealizado.tsx   # Planejado vs Realizado
    CustosEficiencia.tsx     # Custos e eficiencia
    FrotaCapacidade.tsx      # Frota e capacidade
    TempoSla.tsx             # Tempo e SLA
    AderenciaAtendimento.tsx # Aderencia multidimensional
    Transportadores.tsx      # Transportadores
    MotoristasJornada.tsx    # Motoristas e jornada
    InvestigacaoOperacional.tsx # Alertas + drill rotas
    ResumoExecutivo.tsx      # Redirect para cockpit
    Index.tsx                # Redirect para cockpit
    NotFound.tsx             # 404
  components/
    NavLink.tsx              # Link de navegacao ativo
    dashboard/
      DashboardLayout.tsx    # Layout com sidebar + header + filtros
      GlobalFiltersBar.tsx   # Barra de filtros globais
      KPICard.tsx            # Card de KPI com status e trend
      PageHeroAnalitico.tsx  # Hero de pagina com highlights
      PageSectionNav.tsx     # Navegacao por ancoras dentro da pagina
      SectionCard.tsx        # Card de secao com titulo
      StatusChip.tsx         # Badge de status colorido
      TemporalWindowTabs.tsx # Seletor 7d / 14d / 30d / MTD
      LoadingSkeleton.tsx    # Placeholder de carregamento
      ErrorBoundary.tsx      # Boundary de erro React
      EmptyState.tsx         # Estado vazio
    ui/                      # ~50 componentes shadcn/ui (NAO MODIFICAR)
```

---

## 5. ENDPOINTS DA API

Base URL configuravel via VITE_API_BASE_URL. Timeout: 20s. Validacao Zod em todas as respostas.

| Endpoint | Metodo | Params | Retorno |
|---|---|---|---|
| `/api/metas` | GET | - | MetaGlobal[] |
| `/api/filtros/opcoes` | GET | GlobalFilters | FilterOptionsResponse |
| `/api/resumo/cards` | GET | GlobalFilters | KpiCard[] |
| `/api/resumo/tendencia-semanal` | GET | semanas + GlobalFilters | TendenciaSemanal[] |
| `/api/executivo/serie-diaria` | GET | janela + GlobalFilters | CockpitSerieDiaria[] |
| `/api/filiais/performance` | GET | periodo, filial | FilialPerformance[] |
| `/api/alertas` | GET | page, limit, tipo, filial, periodo, transportador, status, prioridade, tipoVeiculo | PaginatedResponse<Alerta> |
| `/api/alertas/contagem` | GET | periodo, filial, transportador | AlertaContagem |
| `/api/drill-rotas` | GET | page, limit, filial, status, transportador, periodo, sort, order, prioridade, tipoVeiculo | PaginatedResponse<DrillRota> |
| `/api/transportadores` | GET | periodo, filial, transportador | TransportadorResumo[] |
| `/api/frota/ocupacao-tipo` | GET | periodo, transportador, tipoVeiculo | OcupacaoTipoVeiculo[] |
| `/api/motoristas` | GET | page, limit, periodo, filial, transportador, overtime | PaginatedResponse<MotoristaJornada> |
| `/api/motoristas/kpis` | GET | periodo, filial, transportador | MotoristaKpis |
| `/api/kpi-diario` | GET | data, periodo, filial, transportador, tipoVeiculo, status | KpiDiario |

---

## 6. HOOKS REACT QUERY

Todos os hooks estao em src/hooks/useApiData.ts. Usam API real quando VITE_API_BASE_URL configurado, senao mock data.

| Hook | Query Key | Endpoint | Tipo Retorno |
|---|---|---|---|
| useMetas() | ["metas"] | /api/metas | MetaGlobal[] |
| useFilterOptions(filters) | ["filtros","opcoes",...] | /api/filtros/opcoes | FilterOptionsResponse |
| useResumoCards(filters) | ["resumo","cards",...] | /api/resumo/cards | KpiCard[] |
| useTendenciaSemanal(semanas, filters) | ["resumo","tendencia-semanal",...] | /api/resumo/tendencia-semanal | TendenciaSemanal[] |
| useCockpitSerieDiaria(janela, filters) | ["executivo","serie-diaria",...] | /api/executivo/serie-diaria | CockpitSerieDiaria[] |
| useFilialPerformance(filters) | ["filiais","performance",...] | /api/filiais/performance | FilialPerformance[] |
| useAlertas(params) | ["alertas",params] | /api/alertas | PaginatedResponse<Alerta> |
| useAlertasContagem(filters) | ["alertas","contagem",...] | /api/alertas/contagem | AlertaContagem |
| useDrillRotas(params) | ["drill-rotas",params] | /api/drill-rotas | PaginatedResponse<DrillRota> |
| useTransportadores(filters) | ["transportadores",...] | /api/transportadores | TransportadorResumo[] |
| useOcupacaoTipoVeiculo(filters) | ["frota","ocupacao-tipo",...] | /api/frota/ocupacao-tipo | OcupacaoTipoVeiculo[] |
| useMotoristas(params) | ["motoristas",params] | /api/motoristas | PaginatedResponse<MotoristaJornada> |
| useMotoristasKpis(filters) | ["motoristas","kpis",...] | /api/motoristas/kpis | MotoristaKpis |
| useKpiDiario(filters) | ["kpi-diario",...] | /api/kpi-diario | KpiDiario |

---

## 7. TIPOS TYPESCRIPT COMPLETOS

### GlobalFilters
```typescript
interface GlobalFilters {
  periodo?: string;       // ex: "2024-03-01"
  filial?: string;        // ex: "SP01"
  transportador?: string; // ex: "TranspX"
  tipoVeiculo?: string;   // ex: "VUC"
  status?: string;        // ex: "Concluída"
  prioridade?: string;    // ex: "Alta"
}
```

### KpiCard (resumo executivo)
```typescript
interface KpiCard {
  kpi: string;
  valor: number;
  meta: number | null;
  delta: number | null;
  status: "OK" | "Atencao" | "Critico";
  cor: string;
  trendD1: number | null;     // variacao dia anterior
  trendWow: number | null;    // variacao semana anterior
  valorTexto: string;
  metaTexto: string;
  deltaTexto: string;
  trendD1Texto: string;
  trendWowTexto: string;
  acao: string;
  databaseDt: string;
}
```

### CockpitSerieDiaria (serie temporal)
```typescript
interface CockpitSerieDiaria {
  data: string;
  rotas: number;
  pedidos: number;
  volumes: number;
  entregasEfetivas: number;
  sprPedidos: number;
  sprVolumes: number;
  scoreOperacional: number;
  ocupacaoComposta: number;
  aderenciaVolumes: number | null;
  tempoMedRealizado: number;
  qtdRotasNaoPlanejadas: number;
  qtdRotasSemTempo: number;
  qtdFiliaisCriticasSpr: number;
}
```

### FilialPerformance (performance por filial)
```typescript
interface FilialPerformance {
  filial: string;
  nomeFilial: string;
  tipoFilial: string;
  metaSpr: number;
  diasCobertos: number;
  rotas: number;
  placasDistintas: number;
  pedidosReal: number;
  pedidosPlan: number;
  volumesReal: number;
  volumesPlan: number;
  pesoReal: number;
  pesoPlan: number;
  entregues: number;
  insucessos: number;
  entregasEfetivas: number;
  sprVolumesReal: number;
  sprPedidosReal: number;
  sprVsMeta: number;
  tempoReal: number;
  tempoPlan: number;
  desvioTempoH: number;
  desvioTempoPct: number;
  kmReal: number;
  kmPlan: number;
  progressoPct: number;
  scoreOperacional: number;
}
```

### Alerta
```typescript
interface Alerta {
  data: string;
  filial: string;
  nomeFilial?: string;
  regiao: string;
  transportador: string;
  rota: string;
  rotaPlanejada: string;
  placa: string;
  motorista: string;
  tipoVeiculo: string;
  status: string;
  statusRota: string;
  cor: string;
  pedidos: number;
  volumes: number;
  peso: number;
  entregues: number;
  insucessos: number;
  kmPlanejado: number;
  kmRealizado: number;
  tempoPlanejado: number;
  tempoRealizado: number;
  entregaEfetivaRota: number;
  ocupacaoComposta: number;
  ocupacaoPeso?: number | null;
  flagNaoPlanejada: boolean;
  flagSemTempo: boolean;
  flagOvertime: boolean;
  flagMatchCritico: boolean;
  flagEntregaCritica: boolean;
  matchTemporal: string;
  prioridade: string;
}
```

### AlertaContagem
```typescript
interface AlertaContagem {
  naoPlanejada: number;
  semTempo: number;
  overtime: number;
  entregaCritica: number;
  matchCritico: number;
  total: number;
}
```

### TransportadorResumo
```typescript
interface TransportadorResumo {
  transportador: string;
  rotas: number;
  share: number;
  custoMedioCarga: number;
  custoMedioVolume: number;
  custoMedioPedido: number;
  entregasEfetivas: number;
  scoreOperacional: number;
  sprPedidos: number;
  sprVolumes: number;
  pedidos: number;
  volumes: number;
  valorTotal: number;
  status: string;
  statusCor: string;
}
```

### OcupacaoTipoVeiculo
```typescript
interface OcupacaoTipoVeiculo {
  tipoVeiculo: string;
  rotas: number;
  placasDistintas: number;
  mediaPedidosRota: number;
  mediaVolumesRota: number;
  mediaPesoRota: number;
  pesoTotalKg: number;
  capacidadePesoTotalKg: number;
  ocupacaoPeso: number;
  sprPorVeiculo: number;
  orh: number;
  custoMedioVolume: number;
}
```

### MotoristaJornada
```typescript
interface MotoristaJornada {
  data: string;
  filial: string;
  nomeFilial?: string;
  transportador: string;
  motorista: string;
  placa: string;
  qtdRotas: number;
  horasJornada: number;
  flagOvertime: boolean;
  entregas: number;
  insucessos: number;
  scoreOperacional: number;
  pedidos: number;
  volumes: number;
}
```

### MotoristaKpis
```typescript
interface MotoristaKpis {
  motoristasAtivos: number;
  mediaRotasDia: number;
  jornadaMedia: number;
  qtdOvertime: number;
  dpph: number;
}
```

### KpiDiario (consolidado diario)
```typescript
interface KpiDiario {
  data: string;
  rotas: number;
  pedidos: number;
  volumes: number;
  entregas: number;
  insucessos: number;
  veiculosAtivos: number;
  motoristasAtivos: number;
  totalKmRealizado: number;
  totalPesoKg: number;
  sprPedidos: number;
  sprVolumes: number;
  pctEntregasEfetivas: number;
  pctRotasConcluidas: number;
  tempoMedRealizado: number;
  pctUtilizacaoJornada: number;
  pctOciosidadeJornada: number;
  pctRotasOvertime: number;
  pctOcupacaoPedidos: number;
  pctOcupacaoVolumes: number;
  pctOcupacaoComposta: number;
  pctOcupacaoPeso?: number | null;
  pctAderPedidos?: number | null;
  pctAderVolumes?: number | null;
  pctAderPeso?: number | null;
  pctAderKm?: number | null;
  pctAderTempo?: number | null;
  pctMatchMesmoDia?: number | null;
  scoreOperacional: number;
  valorPagamentoTotal: number;
  custoMedioCarga: number;
  custoMedioVolume: number;
  custoMedioPedido: number;
  gapOrhVsMeta?: number;
  metaEntregas?: number;
  metaRotasConcluidas?: number;
  metaOcupacaoPeso?: number;
  metaOcupacaoComposta?: number;
  metaAderenciaVolumes?: number;
  metaOrhTempo?: number;
  dpph?: number | null;
}
```

### PaginatedResponse
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
```

### MetaGlobal
```typescript
interface MetaGlobal {
  kpiId: string;
  kpiNome: string;
  meta: number;
  sentido: string;
  unidade: string;
}
```

### TendenciaSemanal
```typescript
interface TendenciaSemanal {
  anoSemana: string;
  semanaLabel: string;
  semanaInicio: string;
  semanaFim: string;
  rotas: number;
  pedidos: number;
  volumes: number;
  entregas: number;
  insucessos: number;
  entregasEfetivas: number;
  sprPedidos: number;
  sprVolumes: number;
  scoreOperacional: number;
}
```

---

## 8. COMPONENTES DASHBOARD (nao-UI)

### DashboardLayout
Layout principal com sidebar lateral fixa, header com titulo da pagina, e GlobalFiltersBar.
Sidebar contem links para todas as 10 rotas com icones Lucide.
Responsivo: sidebar colapsa em mobile.

### GlobalFiltersBar
Barra de filtros que aparece no topo de cada pagina.
Usa useGlobalFilters() para ler/escrever filtros na URL.
Campos: Periodo, Filial, Transportador, Tipo Veiculo, Status, Prioridade.
Botao "Limpar filtros" para resetar.

### KPICard
Card que exibe: valor principal, meta, delta (variacao), trends D1/WoW.
Status: OK (verde), Atencao (amarelo), Critico (vermelho).
Animacao fade-in-up com delay configuravel.

### PageHeroAnalitico
Secao hero no topo de cada pagina com:
- eyebrow text (opcional)
- titulo
- descricao
- highlights (array de {label, value, trend?})

### PageSectionNav
Barra sticky com botoes de ancora para scroll suave entre secoes da pagina.
Cada secao tem id, label e icone.

### TemporalWindowTabs
Seletor de janela temporal: 7d, 14d, 30d, MTD.
Usado nas paginas de tendencia (CockpitOperacional, TempoSla, AderenciaAtendimento).

---

## 9. DETALHAMENTO POR PAGINA

### CockpitOperacional (HOME)
A pagina mais complexa. 11 hooks de dados, 9 secoes:
1. **Visao Geral** - Hero com total rotas/pedidos/volumes + KPI cards
2. **Tendencias** - Graficos de serie temporal (7d/14d/30d/MTD)
3. **Filiais** - Top 3 vs Bottom 3 filiais por score
4. **Transportadores** - Tabela de concentracao (share%, custo, score)
5. **Capacidade** - Mix de veiculos + ocupacao por peso
6. **SLA e Produtividade** - Entregas efetivas, DPPH, overtime
7. **Alertas** - Cards de contagem + lista top 8
8. **Motoristas** - Top 8 por horas + KPIs resumo
9. **Drill Operacional** - 12 rotas criticas com detalhes

### PlanejadoRealizado
Compara planejado vs realizado em 4 dimensoes: pedidos, volumes, peso, km.
Graficos de barras comparativos + tabela de gaps por filial.

### CustosEficiencia
KPIs de custo: valor total, custo/carga, custo/volume, custo/pedido.
Grafico de concentracao por transportador (pie chart).
Ranking de transportadores por eficiencia.

### FrotaCapacidade
Veiculos ativos, ocupacao de peso por tipo de veiculo.
Grafico de mix de frota (distribuicao por tipo).
Tabela detalhada por tipo com rotas, placas, peso, ocupacao.

### TempoSla
Metricas temporais: tempo medio, entregas efetivas %, DPPH.
Janelas temporais 7d/14d/30d/MTD com graficos de tendencia.
Usa useMetas() para comparar com targets.

### AderenciaAtendimento
6 dimensoes de aderencia: pedidos, volumes, peso, km, tempo, match mesmo dia.
Radar chart hexagonal. Graficos de evolucao temporal.
Ranking de filiais por aderencia.

### Transportadores
Concentracao (top 3 vs outros em pie chart).
Ranking por share, custo medio, score operacional.
Tabela completa com todos os campos.

### MotoristasJornada
KPIs: motoristas ativos, media rotas/dia, jornada media, overtime, DPPH.
Lista paginada de motoristas com horas, entregas, score.
Destaque para motoristas em overtime.

### InvestigacaoOperacional
6 cards de contagem de alertas: nao planejada, sem tempo, overtime, entrega critica, match critico.
Fila de alertas paginada (20 por pagina) com todas as flags.
Drill de rotas paginado com sort/order customizaveis.

---

## 10. FILTROS GLOBAIS

Filtros ficam nos searchParams da URL (react-router-dom).
Qualquer mudanca de filtro refaz as queries automaticamente (React Query).

| Filtro | Param URL | Usado em telas |
|---|---|---|
| Periodo | ?periodo= | Todas |
| Filial | ?filial= | Todas |
| Transportador | ?transportador= | Custos, Frota, Motoristas, Alertas |
| Tipo Veiculo | ?tipoVeiculo= | Frota, Alertas |
| Status | ?status= | Alertas, Drill |
| Prioridade | ?prioridade= | Alertas, Drill |

---

## 11. VARIAVEIS DE AMBIENTE

| Variavel | Descricao | Exemplo |
|---|---|---|
| VITE_API_BASE_URL | URL base da API | https://api-monitoramento-xxxx.run.app |
| VITE_APP_ENV | Ambiente | local / staging / production |
| VITE_ENABLE_MOCKS | Ativar mocks | true / false |

Logica: Se VITE_API_BASE_URL existe -> usa API real. Senao -> mock data (se VITE_ENABLE_MOCKS=true).

---

## 12. TEMA E DESIGN

- Dark mode como padrao (classe CSS)
- Font: "Public Sans", Inter, sans-serif
- Cores via variaveis CSS HSL (--primary, --background, --card, etc)
- Status: OK=verde, Atencao=amarelo, Critico=vermelho
- Animacao: fade-in-up em cards e secoes
- Responsivo: mobile breakpoint 768px, sidebar colapsa
- Container max: 1400px centralizado

---

## 13. REGRAS PARA ALTERACOES

1. **NAO modificar** arquivos em src/components/ui/ (sao gerados pelo shadcn/ui)
2. **Manter** todas as interfaces TypeScript em src/types/api.ts
3. **Manter** todos os hooks em src/hooks/useApiData.ts
4. **Usar** componentes dashboard/ existentes (KPICard, SectionCard, PageHeroAnalitico, etc)
5. **Preservar** o padrao de lazy loading nas rotas (App.tsx)
6. **Preservar** o DashboardLayout em todas as paginas
7. **Novos endpoints** devem ter schema Zod em schemas.ts + mock em mockAdapter.ts
8. **Filtros** devem usar useGlobalFilters() (URL searchParams)
9. **Graficos** usar Recharts
10. **Icones** usar lucide-react
11. Sempre usar import alias @/ (resolve para src/)

---

## 14. ESTADO ATUAL E PENDENCIAS

### Concluido
- 10 paginas funcionais com dados reais + mock fallback
- 14 hooks React Query conectados a 14 endpoints
- Validacao Zod em todas as respostas
- Layout responsivo com sidebar
- Filtros globais funcionando via URL
- Deploy para Firebase configurado

### Pendente (Fases 6-9)
- [ ] Filtros globais UI: dropdown populado com opcoes reais da API (useFilterOptions)
- [ ] Performance: virtualizar tabelas grandes, lazy load de graficos
- [ ] Validacao ponta-a-ponta: comparar dashboard vs BigQuery diretamente
- [ ] Publicacao final: dominio customizado, SEO, PWA

### Problemas Conhecidos
- server.js (backend) usa SQL inline em vez de views v6 BigQuery
- Score Operacional tem 6 formulas divergentes no stack (corrigindo)
- api_alertas_contagem sem filtro temporal no backend

---

## 15. FLUXO DE DADOS

```
URL Params (?periodo=&filial=...)
    |
    v
useGlobalFilters() -- le searchParams
    |
    v
useXxx(filters) -- React Query hook
    |
    v
api.getXxx(params) -- HTTP GET com Zod validation
    |
    v
Cloud Run API (Node.js/Express)
    |
    v
BigQuery views (v4/v5/v6)
    |
    v
Resposta JSON -> Schema Zod -> Hook -> Componente React
```

Se API indisponivel e MOCKS_ENABLED=true:
```
useXxx(filters) -> getMockXxx() -> dados fake -> Componente React
```
