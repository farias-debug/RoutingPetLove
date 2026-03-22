# Mapeamento Técnico da Arquitetura — Monitoramento Logístico Last-Mile

> Gerado em 2026-03-20 | Projeto: Petlove Monitoramento de Cargas

---

## 1. Fluxo Ponta a Ponta

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  TMS Petlove │    │  Extração        │    │  Consolidação        │
│  (Browser)   │───▶│  Playwright (.mjs)│───▶│  Python (.py)        │
└──────────────┘    └──────────────────┘    └──────────┬───────────┘
                                                       │
                                                       ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  Dashboard   │    │  Sync Sheets     │    │  BigQuery            │
│  React       │◀───│  Python (.py)    │◀───│  v4(analítico)       │
│  (route-eye) │    │  → Google Sheets │    │  + v5(publicação)    │
└──────────────┘    └──────────────────┘    └──────────────────────┘
       ▲                     │                         ▲
       │                     ▼                         │
       │            ┌──────────────────┐    ┌──────────────────────┐
       │            │  Apps Script     │    │  Load Raw CSV→BQ     │
       │            │  (main.gs/ui.gs) │    │  Python (.py)        │
       │            └──────────────────┘    └──────────────────────┘
       │                                               ▲
       │                                               │
       │                                    ┌──────────────────────┐
       └────── (futuro: API REST) ─────────│  CSV/XLSX Fontes     │
                                            │  data/ + tab_auxiliar│
                                            └──────────────────────┘
```

## 2. Papel de Cada Script

### Extração
| Script | Papel |
|--------|-------|
| `extraction/extrair_relatorio_tms.mjs` | Playwright automatizado — extrai relatório do TMS via browser |
| `extraction/consolidar_monitoramento.py` | Consolida CSVs brutos em arquivo único padronizado |

### BigQuery — Pipeline
| Script | Papel |
|--------|-------|
| `bigquery/load_raw_to_bq.py` | Carrega CSVs normalizados (BR→padrão) nas raw tables via bq CLI |
| `bigquery/pipeline_v4.sql` | Pipeline analítico: 14 UDFs + 2 staging + 6 dims + 1 fato + 4 marts + 1 semântica |
| `bigquery/pipeline_v5_publicacao.sql` | Camada de publicação: 13 views otimizadas para Google Sheets |
| `bigquery/deploy_v4.py` | Deploy v4 via BigQuery Python API (sequencial) |
| `bigquery/deploy_v5_publicacao.py` | Deploy v5 via BigQuery Python API |

### Sincronização
| Script | Papel |
|--------|-------|
| `bigquery/sync_bq_to_sheets.py` | Lê views v5 → escreve Google Sheets (batch 5k linhas) |
| `google_apps/main.gs` | Apps Script — formatação visual no Sheets |
| `google_apps/ui.gs` | Apps Script — menu customizado no Sheets |

### Orquestração
| Script | Papel |
|--------|-------|
| `scripts/daily_pipeline.ps1` | Orquestrador: consolidar → bq load → sync Sheets → git commit |
| `scripts/health_check.ps1` | Verificação de saúde (parcial) |

### Frontend React
| Script | Papel |
|--------|-------|
| `Dashboard/frontend/` | Dashboard web React 18.3 + Vite 5.4 + TypeScript 5.8 + shadcn/ui |
| `Dashboard/api/server.js` | API Node.js Express no Cloud Run (conecta ao BigQuery) |

## 3. Inventário BigQuery

### Pipeline v4 — Camada Analítica (28 statements)
| Camada | Objetos | Qtd |
|--------|---------|-----|
| UDFs | normalize_text, safe_div, adherence_ratio, status_higher, status_target_band, capacity_status, status_score, status_color, vehicle_type_canonical, vehicle_weight_capacity, vehicle_family, fn_ocup_composta, fn_tempo_ocioso_jornada, fn_score_operacional | 14 |
| Staging | stg_monitoramento (41 cols), stg_planejamento (12 cols) | 2 |
| Dimensões | dim_calendario, dim_filial, dim_veiculo, dim_status_operacional, dim_planejamento, dim_metas | 6 |
| Fato | fct_execucao (84 cols, 27.627 rows) | 1 |
| Marts | mart_ops_diario_filial, mart_ops_kpi_filial, mart_ops_kpi_transportador, mart_ops_kpi_diario | 4 |
| Semântica | sem_kpi_cards | 1 |

### Pipeline v5 — Camada de Publicação (13 views)
| View | Colunas | Rows (deploy) | Fonte Principal |
|------|---------|---------------|-----------------|
| metas_globais | 4 | 9 | dim_metas |
| dim_filial_tratada | 13 | 36 | dim_filial |
| kpi_card_latest | 15 | 9 | sem_kpi_cards |
| kpi_resumo_diario | 75 | 77 | mart_ops_kpi_diario + dim_calendario |
| kpi_filial_dia | 70 | 1.646 | mart_ops_kpi_filial |
| kpi_transportador_dia | 71 | 2.538 | mart_ops_kpi_transportador |
| alertas_rotas | 40 | 17.962 | fct_execucao (filtrado flags) |
| drill_rotas | 39 | 23.731 | fct_execucao + dim_calendario |
| Resumo_Filial | 34 | 28 | fct_execucao agg + dim_filial |
| Resumo_Ocupacao_Veic_Transp | 26 | 1.639 | fct_execucao agg by transportador |
| VW_Base_Execucao | 54 | 27.627 | fct_execucao + dim_filial + dim_calendario |
| Resumo_Semana_Filial_Diario | 33 | 1.646 | mart_ops_diario_filial + dims |
| Resumo_Semana_Filial_Matriz | 15 | 6.825 | fct_execucao pivot by dia |

## 4. Páginas do Frontend React

| Rota | Componente | Mock? | Descrição |
|------|------------|-------|-----------|
| `/` | ResumoExecutivo | ✅ SIM | 6 KPIs + tendência semanal + performance filial + alertas |
| `/planejado-realizado` | PlanejadoRealizado | ✅ SIM | 4 KPIs inline + barras plan vs real pedidos/volumes |
| `/custos` | CustosEficiencia | ✅ SIM | 4 KPIs + custo/carga por transportador + tabela |
| `/frota` | FrotaCapacidade | ✅ SIM | 5 KPIs + ocupação por tipo veículo (inline) |
| `/tempo-sla` | TempoSla | ✅ SIM | 5 KPIs + entregas/semana + SPR/semana |
| `/aderencia` | AderenciaAtendimento | ✅ SIM | 6 KPIs + radar aderência + barras entregas filial |
| `/transportadores` | Transportadores | ✅ SIM | Pie share + ranking tabela |
| `/motoristas` | MotoristasJornada | ✅ SIM | 4 KPIs inline + tabela jornada |
| `/alertas` | InvestigacaoOperacional | ✅ SIM | 6 cards alertas inline + tabela alertas + tabela rotas |

**Resultado: 9/9 páginas usam mock data (100%).**

## 5. Gaps de Integração

### Críticos (P0)
1. **Sem camada de API**: Frontend não tem serviço de acesso a dados; tudo é importação estática de mockData.ts
2. **Sem tipos centralizados**: Interfaces dispersas em mockData.ts, não há types/ dedicada
3. **Nenhum hook de dados**: React Query instalado mas não utilizado para fetch
4. **Timestamp hardcoded**: "Atualizado às 14:32" fixo no header
5. **Filtros inexistentes**: Nenhum filtro global implementado (período/filial/transportador)
6. **Inline data hardcoded**: Ocupação por tipo (FrotaCapacidade), radar (Aderência), KPIs inline (PlanejadoRealizado, Motoristas, Alertas)

### Importantes (P1)
7. **Metas hardcoded em referenceLines**: Meta 95% (TempoSla), Meta 15 (SPR) — devem vir de dim_metas
8. **Labels de mês fixo**: "Março 2026 · Todas as filiais" hardcoded no header
9. **Sem paginação**: Tabelas de alertas e rotas renderizam tudo sem paging
10. **Sem empty/error state**: EmptyState.tsx existe mas não é utilizado
11. **Sem view para motoristas**: BigQuery não tem view agregada por motorista/jornada

### Desejáveis (P2)
12. **Sem skeleton/loading**: Sem indicação de carregamento
13. **Sem persistência de filtros na URL**: Search params não utilizados
14. **Sem validação de schema**: Frontend não valida formato da resposta da API
