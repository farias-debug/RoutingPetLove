# Análise Completa da Estrutura de Dados, Medidas e KPIs
## Monitoramento Logístico Last-Mile — Petlove
**Data**: 2026-03-21 | **Versão**: 1.0

---

## Sumário

1. [Diagnóstico da Estrutura Atual](#1-diagnóstico-da-estrutura-atual)
2. [Análise Crítica do Painel e Visões Temáticas](#2-análise-crítica-do-painel-e-visões-temáticas)
3. [Mapeamento do Fluxo de Dados](#3-mapeamento-do-fluxo-de-dados)
4. [Inventário Completo das Medidas](#4-inventário-completo-das-medidas)
5. [Análise Crítica das Medidas](#5-análise-crítica-das-medidas)
6. [Proposta de Reorganização das Medidas](#6-proposta-de-reorganização-das-medidas)
7. [Proposta de Organização da Camada de Dados](#7-proposta-de-organização-da-camada-de-dados)
8. [Plano de Revisão — Priorização por Fases](#8-plano-de-revisão--priorização-por-fases)
9. [Direcionamento para Fase Visual](#9-direcionamento-para-fase-visual)

---

## 1. Diagnóstico da Estrutura Atual

### 1.1 Resumo Executivo do Estado

O projeto está em um nível de maturidade intermediário: o pipeline TMS→CSV→BigQuery funciona, a camada analítica (v4) é sólida na modelagem dimensional, a publicação (v5) entrega dados às Google Sheets e à API (v6), e o frontend React exibe 11 páginas. No entanto, existem problemas estruturais que comprometem a confiabilidade dos números antes mesmo de considerar evolução visual.

### 1.2 Principais Problemas Identificados

| # | Problema | Gravidade | Onde |
|---|---------|-----------|------|
| P1 | **Recalculo massivo de KPIs em 3+ camadas** — As mesmas fórmulas de SPR, entregas efetivas, score, ocupação são recalculadas na fct_execucao, no kpi_resumo_diario, no kpi_filial_dia, no kpi_transportador_dia, na API (server.js) e nos hooks do frontend | Alta | v4, v5, v6, API, frontend |
| P2 | **Score Operacional com fórmula inconsistente entre v5 e v6** — v5 usa `spr_vol` no primeiro argumento; v6 `api_motoristas_jornada` usa `pct_entrega_efetiva` no primeiro argumento e reclassifica os status com limiares improvisados | Alta | v5 vs v6 |
| P3 | **Marts v4 esvaziados prematuramente** — O v4 contém apenas 1 mart real (mart_ops_diario_filial); os outros 3 marts + sem_kpi_cards foram movidos para v5 durante cleanup, mas v5 recalcula tudo a partir da fct_execucao em vez de reutilizar marts | Média | v4, v5 |
| P4 | **Views de publicação com 70-75 colunas** — kpi_resumo_diario tem 75 colunas, kpi_filial_dia tem 70, kpi_transportador_dia tem 71; muito difícil manter, auditar e consumir | Média | v5 |
| P5 | **Métricas temporais (D-1, WoW) computadas em múltiplos lugares** — O v5 calcula LAG para D-1 no SQL; a API também calcula tendências WoW e D-1 no server.js; o frontend calcula delta no hook | Média | v5, API, frontend |
| P6 | **Falta de camada de validação pós-carga** — Não existe validação automatizada que garanta integridade entre raw → stg → fct → marts | Alta | Pipeline |
| P7 | **raw_planejamento e raw_dim_filial não auto-recarregados** — Atualizados manualmente, criando risco de defasagem entre realizado e planejado | Alta | Pipeline |
| P8 | **Ocupação composta com peso igual para 3 dimensões** — fn_ocup_composta faz média simples de ocupação de pedidos, volumes e peso. Em operação real, peso costuma ser o gargalo; média simples pode mascarar saturação | Média | UDF |
| P9 | **Metas fixas sem variação por filial ou período** — dim_metas tem 9 KPIs globais sem particularização. A meta SPR da dim_filial (MetaSPR) não é usada no score operacional global | Média | dim_metas |
| P10 | **11 páginas frontend antes de estabilizar os dados** — O painel React tem 11 rotas, mas hooks usam mock data como fallback e várias métricas dependem de calculados que não estão oficializados | Média | Frontend |

### 1.3 Lacunas Principais

| Lacuna | Impacto |
|--------|---------|
| Sem custo médio na dim_metas (existente desde v4, mas meta=R$500 não validada com negócio) | Custo é exibido mas não há referência confiável de "bom/ruim" |
| Sem unificação de "data de referência" — usa data_planejada, dt_abertura, dt_carregamento em diferentes contextos | Possível divergência em contagens por dia |
| Sem definição oficial de "rota ativa para KPI" — flag_elegivel_kpi existe mas não é usada nos marts/v5 | Rotas em status "Roteirizado" ou "Rota aceita" podem inflar contagens |
| Aderência calculada no nível de rota individual, não validada no nível de filial/dia | Agregação aritmética de aderências individuais ≠ aderência real do pool |
| DPPH (deliveries per person hour) definido como safe_div(pedidos, tempo_oper) — deveria usar entregues em vez de pedidos | Inflação da produtividade |
| Sem distinção clara entre métricas consultivas e métricas de gestão (SLA formal) | Tudo tratado como KPI mesmo quando é apenas referência |

### 1.4 Riscos de Duplicidade de Regra de Negócio

| Regra | Onde está duplicada | Risco |
|-------|-------------------|-------|
| Entregas Efetivas = entregues / (entregues + insucessos) | fct_execucao, kpi_resumo_diario, kpi_filial_dia, kpi_transportador_dia, api_motoristas_jornada, server.js | Divergência se qualquer camada alterar |
| Score Operacional = média de 6 status × 100/6 | fct_execucao (não existe), v5 views (3×), v6 api_motoristas (com variação), server.js cards | server.js e v6 já divergem da definição v5 |
| Custo Médio por Carga = valor_total / rotas | fct_execucao (como custo_por_pedido), v5 kpi_card_latest, API server.js | Custo "por carga" vs "por pedido" — são conceitos diferentes, tratados como iguais |
| Capacidade de Peso = peso / vehicle_weight_capacity | fct_execucao, Resumo_Ocupacao_Veic_Transp, api_ocupacao_tipo_veiculo | Correto e consistente — menor risco |

---

## 2. Análise Crítica do Painel e Visões Temáticas

### 2.1 Estrutura Atual das Páginas

| # | Página | Propósito Declarado | Nível | Dados Consumidos |
|---|--------|-------------------|-------|-----------------|
| 1 | Cockpit Operacional | Visão 360° do dia | Executivo→Tático | Todos os hooks (11 hooks) |
| 2 | Resumo Executivo | Tendências e risco | Executivo | 6 hooks |
| 3 | Planejado × Realizado | Gap analysis | Tático | 2 hooks (kpiDiario, filialPerformance) |
| 4 | Custos e Eficiência | Análise financeira | Tático | 1 hook (transportadores) |
| 5 | Frota e Capacidade | Ocupação da frota | Tático | 2 hooks (ocupação, filialPerformance) |
| 6 | Tempo e SLA | Produtividade e jornada | Tático | 2 hooks (kpiDiario, serieDiaria) |
| 7 | Aderência e Atendimento | Planejado vs real dimensional | Tático | 2 hooks (kpiDiario, filialPerformance) |
| 8 | Transportadores | Performance por parceiro | Operacional | 1 hook (transportadores) |
| 9 | Motoristas e Jornada | Performance por motorista | Operacional | 2 hooks (motoristas, motoristasKpis) |
| 10 | Investigação Operacional | Alertas e drill | Operacional | 3 hooks (alertas, alertasContagem, drillRotas) |

### 2.2 Avaliação Crítica por Página

#### Cockpit Operacional — ⚠️ SOBREPOSIÇÃO SEVERA
- **Problema principal**: É um espelho quase completo do Resumo Executivo, com as mesmas métricas renderizadas em formato diferente. As seções "Visão Geral", "Tendências", "Filiais", "Transportadores" repetem o que já está nas páginas dedicadas.
- **Avaliação**: O cockpit tenta ser tudo ao mesmo tempo — contém KPI cards, série temporal, ranking de filiais, gráfico de alertas, tabela de motoristas e drill operacional numa única página.
- **Recomendação**: O cockpit deve ser uma **síntese focada em 6-8 KPIs + semáforo de saúde + 3 destaques**, não uma página omnibus. As seções detalhadas devem ficar nas páginas temáticas.

#### Resumo Executivo — ⚠️ CONFUSO COM COCKPIT
- **Problema**: Diferencia-se do cockpit apenas pelo layout (4 cards "leitura executiva" + 4 cards "risco"). Na prática, os mesmos hooks são consumidos.
- **Avaliação**: Ou o cockpit ou o resumo executivo deveria ser removido/fundido. Ter ambos com sobreposição de 80% confunde o usuário.
- **Recomendação**: **Fundir cockpit + resumo executivo em uma única página de entrada**, separando em seções: "saúde do dia" (cards) + "tendência" (série) + "destaques" (top 3 alertas).

#### Planejado × Realizado — ✅ BEM DEFINIDA, MAS INCOMPLETA
- **Problema**: Mostra aderência de pedidos, volumes, peso, km — mas **não tem custo planejado vs realizado** (porque não existe custo no planejamento TMS).
- **Avaliação**: A estrutura é correta. Faltam: desvio temporal (planejado em D vs realizado em D+1), aderência por transportador, visão de rotas com maior gap.
- **Recomendação**: Incluir seção "maiores desvios" com drill. Aceitar a limitação de custo planejado.

#### Custos e Eficiência — ⚠️ RASA
- **Problema**: Consome apenas o hook de transportadores. Mostra custo médio por carga, por volume, por pedido — mas **não tem série temporal de custo**, não tem custo por filial, não tem breakdown por componente (carga, rota, parada, km, ajudante).
- **Avaliação**: O extrato TMS traz 6 componentes de custo que não estão sendo explorados.
- **Recomendação**: Adicionar série temporal de custo. Incluir breakdown de custo por componente. Correlacionar custo × produtividade.

#### Frota e Capacidade — ✅ BOA ESTRUTURA
- **Problema**: Métricas de ocupação por tipo de veículo estão corretas. Porém, "capacidade de peso" depende de uma UDF com valores fixos por tipo de veículo — se algum tipo novo aparecer, cai em 0kg.
- **Avaliação**: A mais coerente das páginas temáticas. Poderia ter visão temporal de "evolução da frota ativa".
- **Recomendação**: Manter. Adicionar evolução temporal. Validar capacidades com o negócio.

#### Tempo e SLA — ⚠️ CONCEITO MAL DELIMITADO
- **Problema**: Mistura "SLA" (que seria um compromisso contratual formal) com métricas de tempo operacional genéricas. Não existe SLA formal definido — o que se exibe é tempo médio, overtime, ociosidade.
- **Avaliação**: O nome "SLA" cria expectativa de compromisso contratual. Na realidade, são métricas de **produtividade temporal**.
- **Recomendação**: Renomear para "Tempo e Produtividade". Separar: (a) jornada média, (b) produtividade DPPH, (c) flags de overtime e ociosidade.

#### Aderência e Atendimento — ✅ BOA, MAS RADAR SUPÉRFLUO
- **Problema**: O radar de 6 dimensões (pedidos, volumes, peso, km, tempo, match) é visualmente atraente mas difícil de interpretar operacionalmente. Aderência de peso e km têm pouca relevância prática para gestão diária.
- **Avaliação**: A visão é conceitualmente correta. Porém, "aderência de peso" e "aderência de KM" raramente geram ação operacional — o que importa é aderência de pedidos e volumes.
- **Recomendação**: Priorizar pedidos e volumes. Manter peso e km como informativo. Remover radar como visualização principal.

#### Transportadores — ✅ CORRETA
- **Problema mínimo**: Share, custo, entregas efetivas por parceiro estão bem definidos.
- **Recomendação**: Adicionar comparativo temporal (este mês vs anterior).

#### Motoristas e Jornada — ⚠️ DADOS FRÁGEIS
- **Problema**: A agregação por motorista usa `f.motorista` (campo texto livre do TMS). Não há validação de CPF, não há tratamento de nomes duplicados ou com grafia diferente. Um "JOSÉ SILVA" e "JOSE SILVA" seriam contados como motoristas distintos.
- **Avaliação**: A estrutura da página é boa. Mas a confiabilidade dos dados de motorista é **a mais baixa do projeto**.
- **Recomendação**: Antes de sofisticar a visualização, implementar deduplicação de motoristas por CPF (o campo cpf_motorista existe na stg_monitoramento).

#### Investigação Operacional — ✅ BEM DESENHADA
- **Problema menor**: A tabela de alertas e o drill são as ferramentas mais práticas do painel. Porém, os tipos de alerta (não_planejada, sem_tempo, overtime, entrega_crítica, match_crítico) são derivados de flags booleanas simples — não há severidade composta.
- **Recomendação**: Incluir priorização composta (rota com 3+ flags = prioridade alta).

### 2.3 Sobreposição entre Páginas

```
                 Cockpit  Resumo  P×R  Custos  Frota  Tempo  Ader  Transp  Mot  Invest
KPI Cards          ●        ●     ○      ○      ○      ○     ○      ○      ○     ○
Score Operac.      ●        ●     ○      ○      ○      ○     ○      ○      ●     ○
SPR Ped/Vol        ●        ●     ●      ○      ○      ○     ○      ○      ○     ○
Entregas Efet.     ●        ●     ●      ○      ○      ●     ○      ●      ○     ○
Ocupação           ●        ●     ○      ○      ●      ○     ○      ○      ○     ○
Aderência          ●        ○     ●      ○      ○      ○     ●      ○      ○     ○
Ranking Filiais    ●        ●     ●      ○      ●      ○     ●      ○      ○     ○
Ranking Transp.    ●        ●     ○      ●      ○      ○     ○      ●      ○     ○
Alertas            ●        ●     ○      ○      ○      ○     ○      ○      ○     ●
Série Temporal     ●        ●     ○      ○      ○      ●     ●      ○      ○     ○

● = presente   ○ = ausente
```

**Veredicto**: O Cockpit Operacional e o Resumo Executivo têm ~80% de sobreposição. Ambos tentam mostrar "tudo". É necessário consolidar.

### 2.4 Visões Faltantes

| Visão Ausente | Importância | Justificativa |
|--------------|------------|---------------|
| Evolução mensal / comparativo período | Alta | Não existe visão month-over-month consolidada |
| Custo por componente | Média | 6 componentes de custo ignorados |
| Mapa de calor filial × dia | Baixa | Identificação visual de padrões |
| Indicadores de planejamento (qualidade do plano) | Média | % de rotas planejadas com dados completos, match temporal |
| Visão de anomalias estatísticas | Baixa | Desvios >2σ em SPR, tempo, custo |

---

## 3. Mapeamento do Fluxo de Dados

### 3.1 Diagrama de Fluxo

```
┌──────────────────────────────────────────────────────────────────┐
│                         ORIGEM (TMS)                             │
│  Relatório Monitoramento de Carga → CSV incremental              │
│  Relatório Planejamento → XLSX (manual)                          │
│  Dimensão Filial → XLSX (manual)                                 │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   EXTRAÇÃO E CONSOLIDAÇÃO                        │
│  extrair_relatorio_tms.mjs (Playwright) → CSV incremental        │
│  consolidar_monitoramento.py → Completo.csv (period replacement) │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      RAW (BigQuery)                              │
│  raw_monitoramento (27,628 rows)                                 │
│  raw_planejamento  (23,696 rows)  ← NÃO auto-reload             │
│  raw_dim_filial    (34 rows)      ← NÃO auto-reload             │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  STAGING (BigQuery Views)                         │
│  stg_monitoramento (41 cols) — normaliza texto, tipos, tempo     │
│  stg_planejamento  (12 cols) — normaliza planejamento            │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  DIMENSÕES (BigQuery Views)                       │
│  dim_calendario (25 cols, 2025-2027)                             │
│  dim_filial (11 cols, ~42 rows, com fallback Nao-Unidade)        │
│  dim_veiculo (4 cols, 12 tipos)                                  │
│  dim_status_operacional (5 cols, 5 status)                       │
│  dim_planejamento (bridge, 9 cols)                               │
│  dim_metas (5 cols, 9 KPIs globais)                              │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FATO (BigQuery View)                           │
│  fct_execucao (84 cols, 27,627 rows)                             │
│  Grão: 1 registro por rota/carga                                 │
│  Contém: chaves + dims + medidas brutas + calculados + flags     │
└──────────────┬───────────────────────────────────────────────────┘
               │
          ┌────┴────┐
          │         │
          ▼         ▼
┌─────────────┐  ┌─────────────────────────────────────────────────┐
│   MARTS (1) │  │           PUBLICAÇÃO v5 (13 views)              │
│ mart_ops_   │  │  Recalcula tudo a partir de fct_execucao        │
│ diario_     │  │  kpi_resumo_diario, kpi_filial_dia,             │
│ filial      │  │  kpi_transportador_dia, kpi_card_latest,        │
│             │  │  alertas_rotas, drill_rotas, Resumo_Filial,     │
│             │  │  Resumo_Ocupacao, VW_Base_Execucao,             │
│             │  │  Resumo_Semana_Filial_Diario/Matriz,            │
│             │  │  metas_globais, dim_filial_tratada              │
│             │  └────────────┬────────────────────────────────────┘
│             │               │
└─────────────┘          ┌────┴────┐
                         │         │
                         ▼         ▼
                   ┌──────────┐  ┌────────────────────┐
                   │ Sync BQ  │  │    API v6 (6 views) │
                   │ → Sheets │  │  api_motoristas_    │
                   │ (13 abas)│  │  api_resumo_exec_   │
                   └────┬─────┘  │  api_filial_perf    │
                        │        │  api_transport_      │
                        ▼        │  api_ocupacao_       │
                   ┌──────────┐  │  api_alertas_cont    │
                   │ Apps     │  └────────┬─────────────┘
                   │ Script   │           │
                   │ (3 visual│           ▼
                   │  painéis)│    ┌──────────────┐
                   └──────────┘    │ API server.js │
                                   │ (Express)     │
                                   └───────┬──────┘
                                           │
                                           ▼
                                   ┌──────────────┐
                                   │ Frontend     │
                                   │ React (11pg) │
                                   └──────────────┘
```

### 3.2 Problemas no Fluxo

1. **marts esvaziados**: Apenas 1 mart ativo no v4. As views v5 recalculam direto da fct — perdendo a camada intermediária de agregação que deveria existir.
2. **v5 faz dupla função**: É publicação (Sheets) E fonte de dados (v6 consome v5 em 2 views). Deveria haver separação.
3. **API server.js recalcula**: A API não apenas consulta views — ela reformata, calcula tendências, aplica formatação. Isso deveria estar na camada de dados.
4. **Frontend com lógica de fallback**: Os hooks têm mock como fallback. Dados mockados podem ser exibidos silenciosamente se a API falhar.

### 3.3 Granularidade por Camada

| Camada | Grão | Observação |
|--------|------|-----------|
| fct_execucao | 1 rota (id_carga) | ✅ Correto |
| kpi_resumo_diario | 1 dia (global) | ✅ Correto |
| kpi_filial_dia | 1 dia × filial | ✅ Correto |
| kpi_transportador_dia | 1 dia × transportador | ✅ Correto |
| alertas_rotas | 1 rota (filtrada) | ✅ Correto |
| drill_rotas | 1 rota (completa) | ✅ Correto |
| Resumo_Filial | 1 filial (acumulado) | ⚠️ Sem granularidade temporal |
| Resumo_Ocupacao_Veic_Transp | 1 dia × tipo_veiculo × transportador | ✅ Correto |
| VW_Base_Execucao | 1 rota | ⚠️ Redundante com fct_execucao |
| api_motoristas_jornada | 1 dia × filial × transportador × motorista | ✅ Correto |

---

## 4. Inventário Completo das Medidas

### 4.1 KPIs com Meta (dim_metas) — 9 Indicadores

| # | ID | Nome | Meta | Sentido | Unidade | Fórmula | Camada Ideal | Nível | Criticidade |
|---|-----|------|------|---------|---------|---------|-------------|-------|-------------|
| 1 | spr_pedidos | SPR Pedidos | 42.0 | Maior=Melhor | ped/rota | SUM(qtd_pedidos) / COUNT(DISTINCT id_carga) | Mart agregado | Tático | Alta |
| 2 | spr_volumes | SPR Volumes | 67.0 | Maior=Melhor | vol/rota | SUM(qtd_volumes) / COUNT(DISTINCT id_carga) | Mart agregado | Tático | Alta |
| 3 | orh | ORH Tempo Rota | 7.0 | Alvo=Melhor | horas | SUM(tempo_operacional_h) / COUNT(DISTINCT id_carga) | Mart agregado | Tático | Alta |
| 4 | entregas_efetivas | Entregas Efetivas | 0.98 | Maior=Melhor | % | SUM(entregues) / (SUM(entregues) + SUM(insucessos)) | Mart agregado | Executivo | **Crítica** |
| 5 | rotas_concluidas | Rotas Concluídas | 0.95 | Maior=Melhor | % | COUNTIF(flag_rota_concluida) / COUNT(*) | Mart agregado | Executivo | Alta |
| 6 | ocupacao_composta | Ocupação Composta | 0.85 | Maior=Melhor | % | fn_ocup_composta(ocup_ped, ocup_vol, ocup_peso) | Mart agregado | Tático | Média |
| 7 | aderencia_volumes | Aderência Volumes | 0.90 | Maior=Melhor | % | adherence_ratio(volumes_real, volumes_plan) | Mart agregado | Tático | Alta |
| 8 | custo_por_carga | Custo Médio Carga | 500.0 | Menor=Melhor | R$/carga | SUM(valor_total) / COUNT(DISTINCT id_carga) | Mart agregado | Executivo | **Meta não validada** |
| 9 | dpph | DPPH | 6.0 | Maior=Melhor | ped/h | SUM(qtd_pedidos) / SUM(tempo_operacional_h) | Mart agregado | Tático | **Fórmula incorreta** |

### 4.2 Medidas Brutas (nível rota — fct_execucao)

| # | Campo | Tipo | Origem | Observação |
|---|-------|------|--------|-----------|
| 1 | qtd_pedidos | INT | TMS (Quantidade) | ✅ Confiável |
| 2 | qtd_volumes | INT | TMS (Quantidade Volumes) | ✅ Confiável |
| 3 | peso_kg | FLOAT | TMS (Peso) | ✅ Confiável |
| 4 | paradas | INT | TMS (Paradas) | ✅ Informativo |
| 5 | clientes | INT | TMS (Clientes) | ✅ Informativo |
| 6 | entregues | INT | TMS (Entregues) | ✅ Confiável |
| 7 | insucessos | INT | TMS (Insucessos) | ✅ Confiável — GREATEST(0, valor) |
| 8 | baixas | INT | TMS (baixas) | ⚠️ Informativo — conceito confuso vs entregues |
| 9 | km_planejado | FLOAT | TMS (Km Planejado) | ✅ Confiável |
| 10 | km_realizado | FLOAT | TMS (Km Realizado) | ✅ Confiável |
| 11 | tempo_planejado_h | FLOAT | TMS (Tempo Planejado, parseia HH:MM) | ⚠️ Muitos zeros — campo irregular |
| 12 | tempo_realizado_h | FLOAT | TMS (Tempo Realizado, com correção <1 → ×24h) | ⚠️ A correção `<1 → ×24h` é uma heurística |
| 13 | performance_pct | FLOAT | TMS (Perfomance, parseia %) | ⚠️ Não usado em nenhum KPI — "para que serve?" |

### 4.3 Medidas de Planejamento (bridge)

| # | Campo | Tipo | Origem | Observação |
|---|-------|------|--------|-----------|
| 1 | pedidos_plan | INT | Relatório Planejamento | ✅ Confiável |
| 2 | volumes_plan | INT | Relatório Planejamento | ✅ Confiável |
| 3 | peso_plan_kg | FLOAT | Relatório Planejamento | ✅ Confiável |
| 4 | km_plan | FLOAT | Relatório Planejamento | ⚠️ Nem sempre presente |
| 5 | tempo_plan_h | FLOAT | Relatório Planejamento (TIME → horas decimais) | ⚠️ Pode não coincidir com tempo TMS |
| 6 | possui_planejamento | BOOL | Derivado (pedidos>0 OR volumes>0) | ✅ Correto |

### 4.4 Medidas Financeiras (nível rota)

| # | Campo | Fórmula | Observação |
|---|-------|---------|-----------|
| 1 | valor_carga | TMS direto | ✅ Principal componente |
| 2 | valor_rota | TMS direto | ✅ |
| 3 | valor_parada | TMS direto (SAFE_CAST) | ⚠️ SAFE_CAST sugere dados inconsistentes |
| 4 | valor_remessas | TMS direto | ✅ |
| 5 | valor_km | TMS direto | ✅ |
| 6 | valor_ajudante | TMS direto (SAFE_CAST) | ⚠️ SAFE_CAST sugere dados inconsistentes |
| 7 | valor_total | Soma dos 6 acima | ✅ Correto |

### 4.5 Métricas Calculadas por Rota (22 campos)

| # | Métrica | Fórmula | Camada | Nível | Status |
|---|---------|---------|--------|-------|--------|
| 1 | tempo_operacional_h | tempo_real > 0 ? tempo_real : tempo_plan | fct | Base | ⚠️ Fallback para plano pode distorcer se plano for alto |
| 2 | pct_entrega_efetiva | entregues / (entregues + insucessos) | fct | Rota | ✅ |
| 3 | delta_pedidos | qtd_pedidos - pedidos_plan | fct | Rota | ✅ Se possui_planejamento |
| 4 | delta_volumes | qtd_volumes - volumes_plan | fct | Rota | ✅ Se possui_planejamento |
| 5 | delta_peso_kg | peso_kg - peso_plan_kg | fct | Rota | ✅ Se possui_planejamento |
| 6 | desvio_tempo_h | tempo_real - tempo_plan | fct | Rota | ⚠️ NULL se tempo_plan=0 |
| 7 | desvio_tempo_pct | (tempo_real - tempo_plan) / tempo_plan | fct | Rota | ⚠️ NULL se tempo_plan=0 |
| 8 | desvio_km_pct | (km_real - km_plan) / km_plan | fct | Rota | ✅ |
| 9 | aderencia_pedidos | 1 - ABS(real - plan) / plan | fct | Rota | ✅ |
| 10 | aderencia_volumes | 1 - ABS(real - plan) / plan | fct | Rota | ✅ |
| 11 | aderencia_peso | 1 - ABS(real - plan) / plan | fct | Rota | ✅ |
| 12 | aderencia_km | 1 - ABS(real - plan) / plan | fct | Rota | ✅ |
| 13 | aderencia_tempo | 1 - ABS(real - plan) / plan | fct | Rota | ⚠️ Sensível a tempo_plan=0 |
| 14 | ocup_pedidos | qtd_pedidos / pedidos_plan | fct | Rota | ⚠️ >1 indica realizado > planejado — conceito de "ocupação" é impróprio |
| 15 | ocup_volumes | qtd_volumes / volumes_plan | fct | Rota | ⚠️ Idem |
| 16 | ocup_peso | peso_kg / peso_plan_kg | fct | Rota | ⚠️ Idem — apenas peso vs capacidade do veículo é "ocupação" real |
| 17 | custo_por_pedido | valor_total / qtd_pedidos | fct | Rota | ✅ |
| 18 | custo_por_volume | valor_total / qtd_volumes | fct | Rota | ✅ |
| 19 | custo_por_kg | valor_total / peso_kg | fct | Rota | ✅ |
| 20 | custo_por_km | valor_total / km_realizado | fct | Rota | ✅ |
| 21 | tempo_ocioso_jornada_h | MAX(0, 8 - tempo_operacional) | fct | Rota | ⚠️ Assume jornada = 8h para todos |
| 22 | pct_util_jornada | tempo_operacional / 8.0 | fct | Rota | ⚠️ Idem |

### 4.6 Flags Operacionais (12 campos)

| # | Flag | Regra | Observação |
|---|------|-------|-----------|
| 1 | flag_rota_concluida | status TMS "Finalizado" | ✅ |
| 2 | flag_nao_planejada | NOT possui_planejamento | ✅ |
| 3 | flag_sem_tempo | tempo_plan = 0 AND tempo_real = 0 | ✅ |
| 4 | flag_overtime | tempo_operacional > 8h | ⚠️ 8h fixo — deveria ser parametrizável |
| 5 | flag_entrega_critica | pct_entrega < 0.95 | ✅ |
| 6 | flag_insucesso | insucessos > 0 | ✅ |
| 7 | flag_em_rota | status LIKE '%ROTA%' | ✅ |
| 8 | flag_parcial | status LIKE '%PARCIAL%' | ✅ |
| 9 | flag_roteirizada | status LIKE '%ROTEIRIZ%' | ✅ |
| 10 | flag_registro_valido | id não vazio + data + pedidos ≥ 0 | ✅ |
| 11 | flag_rota_subutilizada | tempo_oper entre 0 e 4h | ✅ |
| 12 | flag_match_critico | sem planejamento OU data > D±1 | ✅ |

### 4.7 Score Operacional — Análise Detalhada

**Definição Central (UDF fn_score_operacional)**:
```
Score = (score(s_spr) + score(s_entregas) + score(s_rotas) + score(s_orh) + score(s_ader) + score(s_ocup)) / 6 × 100
```

Onde `status_score` mapeia: OK→1.0, Atenção→0.5, Crítico→0.0, Saturado→0.25

**Os 6 componentes do Score**:

| Componente | Status via | Meta | Limiares |
|-----------|-----------|------|----------|
| SPR Volumes | status_higher | 67.0 | <60.3=Crítico, <67.0=Atenção, ≥67.0=OK |
| Entregas Efetivas | status_higher | 0.98 | <0.882=Crítico, <0.98=Atenção, ≥0.98=OK |
| Rotas Concluídas | status_higher | 0.95 | <0.855=Crítico, <0.95=Atenção, ≥0.95=OK |
| ORH | status_target_band | 7.0 | |7-val|>2.1=Crítico, >1.0=Atenção, ≤1.0=OK |
| Aderência Volumes | status_higher | 0.90 | <0.81=Crítico, <0.90=Atenção, ≥0.90=OK |
| Ocupação Composta | capacity_status | 0.85 | >1.05=Saturado, <0.70=Crítico, <0.85=Atenção, OK |

**⚠️ INCONSISTÊNCIA ENCONTRADA na v6 (api_motoristas_jornada)**:
```sql
-- v6 usa DIFERENTES argumentos na chamada fn_score_operacional:
-- Arg 1: status_higher(pct_entrega_efetiva, 0.98)  -- deveria ser SPR volumes!
-- Arg 2: status_higher(qtd_pedidos/1, 42.0)         -- SPR pedidos, não entregas!
-- Arg 3: status_higher(pct_entrega_efetiva, 0.95)   -- entregas com meta de rotas!
-- Arg 4: capacity_status(ocup_composta)              -- deveria ser ORH!
-- Arg 5: status_higher(aderencia_volumes, 0.90)      -- correto
-- Arg 6: CASE tempo... OK entre 5-9h                 -- diferente do ORH target_band
```
**Veredicto**: A v6 calcula um score operacional completamente diferente do v5. Os números de motoristas apresentam um score que não é comparável com o score global.

---

## 5. Análise Crítica das Medidas

### 5.1 Medidas que Precisam de Correção Imediata

| Medida | Problema | Ação |
|--------|---------|------|
| **DPPH** | Usa `pedidos` no numerador — deveria usar `entregues` para medir produtividade real | Corrigir fórmula em dim_metas (nome) e em todas as agregações |
| **Score Operacional v6** | Argumentos errados na chamada de fn_score_operacional | Corrigir api_motoristas_jornada para usar mesma ordem que v5 |
| **Ocupação (ocup_pedidos, ocup_volumes)** | Conceito errado — "ocupação" implica capacidade do veículo, mas usa planejado como denominador | Renomear para "desvio_vs_plan" ou separar claramente: ocupação_peso (vs capacidade veículo) vs aderência (vs plano) |
| **Custo por Carga na dim_metas** | Meta de R$500 não validada com negócio | Confirmar com operação e atualizar |

### 5.2 Medidas que Precisam de Confirmação com Negócio

| Medida | Questão |
|--------|---------|
| Meta SPR Pedidos = 42 | É meta global ou média? Varia por filial? |
| Meta SPR Volumes = 67 | Idem |
| Meta ORH = 7h | É limite superior ou valor ideal? As bandas ±1h/±2.1h foram validadas? |
| Meta Entregas Efetivas = 98% | É SLA contratual ou aspiracional? |
| Limiar overtime = 8h | É regra trabalhista (CLT) ou operacional? |
| Limiar subutilização = 4h | De onde veio esse corte? |
| Capacidade peso por veículo | Os valores foram validados com a frota real? |
| Jornada padrão = 8h | Aplica-se a todos os turnos e filiais? |

### 5.3 Medidas Redundantes

| Grupo | Campos | Recomendação |
|-------|--------|-------------|
| Aderência vs Ocupação | aderencia_pedidos + ocup_pedidos medem variações do mesmo par real/plan | Manter aderência. Eliminar as 3 métricas de "ocupação" (pedidos, volumes, peso) que não são sobre capacidade do veículo. Manter apenas ocupação de peso como `ocupacao_peso_veiculo = peso / capacidade_veiculo` |
| Custos unitários (4) | custo_por_pedido, custo_por_volume, custo_por_kg, custo_por_km | Manter os 4 no nível granular. Para KPI cards, usar apenas custo_por_carga (= valor_total/rotas) |
| Tempo operacional | tempo_operacional_h = coalesce(tempo_real, tempo_plan) recalculado em fct E implicitamente em marts | Calcular apenas em fct. Marts devem usar a coluna já existente |
| Status × Cor × Score | Cada status é triplicado: status_texto, status_cor, status_score | Status e cor são apresentação → mover para camada de publicação, não calcular em marts analíticos |

### 5.4 Medidas Provisórias ou Frágeis

| Medida | Fragilidade |
|--------|-----------|
| `performance_pct` | Extraído do TMS como texto com %. Não é usado em nenhum KPI. Sem definição clara. Possivelmente uma métrica interna do TMS sem valor para o dashboard. |
| `baixas` | Coexiste com `entregues`. A diferença entre "baixas" e "entregues" não está documentada. |
| `alerta_tms` / `referencia` | Campos textuais livres do TMS. Nunca consumidos no dashboard. |
| `flag_registro_valido` | Critério muito permissivo (id + data + pedidos≥0). Não filtra registros de teste ou cancelados pelo status. |
| `match_temporal` | Logicamente correto mas quase nunca gera ação. O % de "Mesmo Dia" oscila entre 60-80% dependendo da qualidade do planejamento. |

---

## 6. Proposta de Reorganização das Medidas

### 6.1 Blocos Lógicos

#### BLOCO 1 — Volume e Produção
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Rotas (total) | COUNT(DISTINCT id_carga) | Qualquer | Mart/Pub |
| Pedidos | SUM(qtd_pedidos) | Qualquer | Mart/Pub |
| Volumes | SUM(qtd_volumes) | Qualquer | Mart/Pub |
| Peso (kg) | SUM(peso_kg) | Qualquer | Mart/Pub |
| Entregas | SUM(entregues) | Qualquer | Mart/Pub |
| Insucessos | SUM(insucessos) | Qualquer | Mart/Pub |
| Veículos ativos | COUNT(DISTINCT placa) | Dia/Filial | Mart/Pub |
| Motoristas ativos | COUNT(DISTINCT motorista) | Dia/Filial | Mart/Pub |

#### BLOCO 2 — Planejado × Realizado
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Aderência Pedidos | adherence_ratio(sum_real, sum_plan) | Dia/Filial | Mart |
| Aderência Volumes | adherence_ratio(sum_real, sum_plan) | Dia/Filial | Mart |
| Aderência Peso | adherence_ratio(sum_real, sum_plan) | Dia/Filial | Mart |
| Aderência KM | adherence_ratio(sum_real, sum_plan) | Dia/Filial | Mart |
| Aderência Tempo | adherence_ratio(sum_real, sum_plan) | Dia/Filial | Mart |
| % Match Mesmo Dia | rotas_mesmo_dia / rotas_com_plan | Dia | Mart |
| % Rotas Sem Planejamento | rotas_nao_plan / total_rotas | Dia | Mart |

#### BLOCO 3 — Custo e Eficiência
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Valor Total | SUM(valor_total) | Qualquer | Fct/Mart |
| Custo Médio por Carga | valor_total / rotas | Dia/Filial/Transp | Mart |
| Custo Médio por Pedido | valor_total / pedidos | Dia/Filial/Transp | Mart |
| Custo Médio por Volume | valor_total / volumes | Dia/Filial/Transp | Mart |
| Custo por KM | valor_total / km_realizado | Rota | Fct |
| Breakdown por Componente | valor_carga, valor_rota, etc. | Rota | Fct |

#### BLOCO 4 — Capacidade e Ocupação
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Ocupação Peso (vs veículo) | peso_kg / capacidade_peso_veiculo | Rota | Fct |
| Ocupação Peso Agregada | SUM(peso) / SUM(capacidade) | Dia/Tipo | Mart |
| SPR Pedidos | pedidos / rotas | Dia/Filial | Mart |
| SPR Volumes | volumes / rotas | Dia/Filial | Mart |

> **NOTA**: "Ocupação" de pedidos e volumes em relação ao planejado NÃO é ocupação — é aderência. A verdadeira **ocupação** é apenas a de peso em relação à capacidade física do veículo. Recomenda-se descontinuar `ocup_pedidos` e `ocup_volumes` e usar apenas `aderencia_pedidos` e `aderencia_volumes` nesses contextos.

#### BLOCO 5 — Tempo, Produtividade e SLA
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| ORH (Tempo Médio Rota) | SUM(tempo_oper) / rotas | Dia/Filial | Mart |
| DPPH (Entregas por Hora) | SUM(**entregues**) / SUM(tempo_oper) | Dia/Filial | Mart |
| % Jornada Utilizada | SUM(tempo_oper) / (rotas × 8h) | Dia/Filial | Mart |
| % Ociosidade | 1 - %_jornada_utilizada | Derivado | Pub |
| % Rotas Concluídas | rotas_concluídas / rotas | Dia/Filial | Mart |
| % Rotas Overtime (>8h) | rotas_overtime / rotas | Dia/Filial | Mart |
| % Rotas Curtas (<4h) | rotas_subutilizadas / rotas | Dia/Filial | Mart |

#### BLOCO 6 — Aderência Operacional
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| % Entregas Efetivas | entregues / (entregues + insucessos) | Dia/Filial | Mart |
| Score Operacional | média de 6 status (SPR, entregas, rotas, ORH, aderência, ocupação) × 100/6 | Dia/Filial | Mart |
| Alerta Operacional | Texto descritivo baseado no pior status | Derivado | Pub |

#### BLOCO 7 — Performance por Filial
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Ranking SPR | SPR_filial vs meta | Filial/Dia | Mart |
| Filiais Críticas SPR | COUNTIF(SPR < meta × 0.90) | Dia | Pub |
| Filiais Abaixo Meta SPR | COUNTIF(SPR < meta) | Dia | Pub |
| Progresso (%) | rotas_concluídas / total_rotas | Filial/Dia | Mart |

#### BLOCO 8 — Performance por Transportador
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Share (%) | rotas_transportador / total_rotas | Transportador/Período | Mart |
| Custo Médio | valor_total / rotas | Transportador/Período | Mart |
| Entregas Efetivas | entregues / (entregues + insucessos) | Transportador/Período | Mart |
| Score Operacional | fn_score_operacional | Transportador/Período | Mart |

#### BLOCO 9 — Performance por Motorista
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Rotas por Dia | COUNT(*) | Motorista/Dia | Mart/v6 |
| Jornada (horas) | AVG(tempo_operacional) | Motorista/Dia | Mart/v6 |
| DPPH | entregues / tempo_oper | Motorista/Dia | Mart/v6 |
| Flag Overtime | MAX(flag_overtime) | Motorista/Dia | Mart/v6 |
| Score Operacional | fn_score_operacional (CORRIGIDO) | Motorista/Dia | Mart/v6 |

#### BLOCO 10 — Alertas e Investigação
| Medida | Definição | Nível | Camada |
|--------|----------|-------|--------|
| Total Alertas | SUM de todas as flags | Dia | Pub |
| Contagem por Tipo | COUNTIF(flag_x) | Dia | Pub |
| Prioridade Composta | Soma de flags (0-5) | Rota | Fct → Pub |
| Rotas Críticas | Prioridade ≥ 3 | Filtro | Pub |

---

## 7. Proposta de Organização da Camada de Dados

### 7.1 Estado Atual vs Estado Alvo

```
ESTADO ATUAL:
  fct_execucao (84 cols, 22 calculados redundantes)
       │
       ├──→ mart_ops_diario_filial (único mart)
       │
       └──→ 13 views v5 (recalculam TUDO da fct)
                │
                └──→ 6 views v6 (misturam dados de v5 e fct diretamente)

ESTADO ALVO:
  fct_execucao (simplificado: chaves + dims + medidas brutas + flags)
       │
       ├──→ mart_kpi_diario (agregado global/dia)
       ├──→ mart_kpi_filial_dia (agregado filial/dia)
       ├──→ mart_kpi_transportador_dia (agregado transp/dia)
       ├──→ mart_kpi_motorista_dia (agregado motorista/dia)
       │
       └──→ Views de Publicação (formatação PT-BR, sem recalcular KPIs)
                │
                └──→ API Views (consumo direto dos marts, sem reformatação)
```

### 7.2 Ações de Reorganização

| # | Ação | Descrição | Impacto |
|---|------|----------|---------|
| 1 | **Restaurar marts no v4** | Recriar mart_kpi_diario, mart_kpi_filial_dia, mart_kpi_transportador_dia, mart_kpi_motorista_dia como views da fct_execucao COM as fórmulas de KPI calculadas UMA VEZ | Alto — elimina recalculos |
| 2 | **Simplificar v5 para formatação** | Views v5 devem apenas SELECTar dos marts + renomear colunas + formatar valores. Sem WITH complexos recalculando tudo | Alto — reduz complexidade |
| 3 | **Alinhar v6 com marts** | Views v6 devem consumir marts, não fct_execucao diretamente | Médio — garante consistência |
| 4 | **Remover campos de apresentação do fct_execucao** | Status, cor, score não pertencem à tabela fato. Manter apenas flags. Status/cor calculados nos marts ou publicação | Médio — reduz 84→~65 colunas |
| 5 | **Descontinuar ocup_pedidos e ocup_volumes** | Renomear/remover conceito de "ocupação" quando se trata de aderência ao plano | Baixo — semântica |
| 6 | **Unificar cálculo de tendência (D-1, WoW)** | Calcular LAG uma vez no mart_kpi_diario. API e frontend apenas leem | Médio — elimina divergência |

### 7.3 Naming Convention Proposta

Para eliminar ambiguidade:

| Prefixo | Significado | Exemplo |
|---------|------------|---------|
| `qtd_` | Contagem absoluta | qtd_pedidos, qtd_rotas |
| `pct_` | Percentual (0-1) | pct_entregas_efetivas, pct_rotas_concluidas |
| `spr_` | Stops Per Route | spr_pedidos, spr_volumes |
| `ader_` | Aderência plan vs real | ader_pedidos, ader_volumes |
| `ocup_` | Ocupação de capacidade física | ocup_peso_veiculo (ÚNICO uso correto) |
| `custo_medio_` | Custo unitário | custo_medio_carga, custo_medio_pedido |
| `tempo_` | Duração | tempo_operacional_h, tempo_ocioso_h |
| `gap_` | Desvio real - plan | gap_pedidos, gap_tempo_h |
| `flag_` | Booleano operacional | flag_overtime, flag_nao_planejada |
| `status_` | Classificação textual | status_spr, status_entregas |
| `meta_` | Valor de referência | meta_spr_pedidos, meta_entregas |
| `var_d1_` | Variação vs dia anterior | var_d1_rotas, var_d1_score |

---

## 8. Plano de Revisão — Priorização por Fases

### FASE 1 — Estabilização Crítica (Semana 1)
> **Foco**: Corrigir erros que produzem números incorretos AGORA

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|-----------|
| 1.1 | ~~Corrigir fórmula DPPH~~ ✅ DPPH já usa `entregues` em mart_kpi_diario e server.js | v4, v5, v6, API | **P0** |
| 1.2 | ~~Corrigir fn_score_operacional~~ ✅ Corrigido em server.js (Resumo_Filial arg6, drill-rotas arg3) | pipeline_v6_api.sql | **P0** |
| 1.3 | Validar meta custo_por_carga (R$500) com operação | negócio | **P0** |
| 1.4 | Confirmar com negócio: metas globais vs metas por filial | negócio | **P1** |
| 1.5 | Documentar oficialmente a definição de cada KPI (nome, fórmula, fonte, meta) | docs/ | **P1** |

### FASE 2 — Estrutura Analítica (Semana 2-3)
> **Foco**: Restaurar marts e eliminar recalculos

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|-----------|
| 2.1 | ~~Criar mart_kpi_diario~~ ✅ Existe com 82 colunas, LAG D-1/D-7, score, status | pipeline_v4.sql | **P1** |
| 2.2 | ~~Criar mart_kpi_filial_dia~~ ✅ Existe em pipeline_v4.sql | pipeline_v4.sql | **P1** |
| 2.3 | ~~Criar mart_kpi_transportador_dia~~ ✅ Existe em pipeline_v4.sql | pipeline_v4.sql | **P1** |
| 2.4 | ~~Criar mart_kpi_motorista_dia~~ ✅ Existe em pipeline_v4.sql | pipeline_v4.sql | **P2** |
| 2.5 | Remover ocup_pedidos, ocup_volumes, ocup_peso da fct_execucao. Manter apenas aderência. Criar ocup_peso_veiculo = peso_kg / vehicle_weight_capacity(tipo_veiculo) | pipeline_v4.sql | **P2** |
| 2.6 | Mover colunas de status/cor/score para fora da fct_execucao (se existirem) — calcular apenas nos marts | pipeline_v4.sql | **P2** |
| 2.7 | ~~Adicionar LAG D-1 no mart_kpi_diario~~ ✅ LAG D-1 e D-7 já presentes (16 campos) | pipeline_v4.sql | **P2** |
| 2.8 | Decidir uso de flag_elegivel_kpi: se rotas não finalizadas devem ou não entrar nos KPIs | negócio | **P1** |

### FASE 3 — Simplificar Publicação (Semana 3-4)
> **Foco**: Views v5 referenciam marts em vez de recalcular

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|-----------|
| 3.1 | Reescrever kpi_resumo_diario como SELECT simples do mart_kpi_diario + formatação | pipeline_v5_publicacao.sql | **P1** |
| 3.2 | Reescrever kpi_filial_dia como SELECT do mart_kpi_filial_dia + formatação | pipeline_v5_publicacao.sql | **P1** |
| 3.3 | Reescrever kpi_transportador_dia como SELECT do mart_kpi_transportador_dia | pipeline_v5_publicacao.sql | **P1** |
| 3.4 | Reescrever kpi_card_latest como SELECT do mart_kpi_diario (latest) + formatação | pipeline_v5_publicacao.sql | **P2** |
| 3.5 | Avaliar remoção de VW_Base_Execucao (redundante com fct/drill) ou simplificar | pipeline_v5_publicacao.sql | **P2** |
| 3.6 | Alinhar v6 para consumir marts ou v5, não fct diretamente | pipeline_v6_api.sql | **P2** |
| 3.7 | ~~Remover cálculos de tendência D-1 e WoW do server.js — consumir do mart~~ ✅ 4 endpoints refatorados para consultar fct_execucao com UDFs idênticas aos marts (commit 9a03d83) | api/server.js | **P2** |

### FASE 4 — Validação e Automação (Semana 4-5)
> **Foco**: Garantir confiabilidade contínua

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|-----------|
| 4.1 | ~~Criar script de validação pós-carga~~ ✅ validate_pipeline.py (16 checks) criado | bigquery/validate_pipeline.py | **P1** |
| 4.2 | ~~Automatizar recarga raw_planejamento e raw_dim_filial~~ ✅ daily_pipeline.ps1 agora usa `--table all` | scripts/daily_pipeline.ps1 | **P1** |
| 4.3 | ~~Criar teste de regressão~~ ✅ regression_test.py criado | bigquery/ | **P2** |
| 4.4 | health_check.ps1 deve verificar data mais recente em BQ | scripts/health_check.ps1 | **P2** |
| 4.5 | Documentar dicionário de dados oficial | docs/DICIONARIO_DADOS.md | **P2** |

### FASE 5 — Consolidação Frontend (Semana 5-6)
> **Foco**: Frontend consome dados validados, remove lógica duplicada

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|-----------|
| 5.1 | Fundir Cockpit + Resumo Executivo em uma única página de entrada | frontend/src/pages/ | **P2** |
| 5.2 | ~~Tornar mock explícito com banner de alerta~~ ✅ Banner amber adicionado em DashboardLayout quando API não configurada | frontend/src/hooks/ | **P2** |
| 5.3 | ~~Remover cálculos duplicados do server.js (tendências, formatação)~~ ✅ cards, tendencia-semanal, kpi-diario, serie-diaria agora usam fn_ocup_composta, adherence_ratio, tempo_operacional_h (commit 9a03d83) | api/server.js | **P2** |
| 5.4 | ~~Atualizar types TypeScript~~ ✅ Types já alinhados com API (aderência, ocupação, LAG D-1/WoW, score) | frontend/src/types/ | **P2** |

---

## 9. Direcionamento para Fase Visual

> ⚠️ **As ações abaixo só devem ser executadas DEPOIS das Fases 1-5.**

### 9.1 Estrutura Visual Proposta (após estabilização)

| # | Página | Conteúdo | Mudança vs Atual |
|---|--------|---------|-----------------|
| 1 | **Dashboard** (Home) | 6-8 KPI cards + semáforo saúde + série diária (7d) + 3 destaques | **Fusão** cockpit + resumo executivo |
| 2 | **Planejado × Realizado** | Aderência (pedidos, volumes, peso, km) + maiores gaps + evolução | **Mantida** com mais profundidade |
| 3 | **Custos e Eficiência** | Custo médio + breakdown componentes + custo por filial + série temporal | **Expandida** significativamente |
| 4 | **Frota e Capacidade** | Ocupação peso real + SPR por tipo + evolução frota ativa | **Mantida** |
| 5 | **Tempo e Produtividade** | ORH + DPPH + % jornada + overtime + rotas curtas (renomeada) | **Renomeada** (sem "SLA") |
| 6 | **Aderência Operacional** | Entregas efetivas + score + match temporal + evolução | **Mantida**, radar simplificado |
| 7 | **Transportadores** | Share + custo + score + ranking | **Mantida** |
| 8 | **Motoristas** | Jornada + DPPH + overtime (após dedup por CPF) | **Mantida**, dados corrigidos |
| 9 | **Investigação** | Alertas por tipo + drill + prioridade composta | **Mantida**, com priorização melhorada |

### 9.2 Princípios Visuais

1. **Cada página deve ter no máximo 4 KPI cards no topo** — hoje várias têm 6-8
2. **Cards devem mostrar**: valor, meta (se houver), status (cor), variação D-1
3. **Gráficos**: máximo 2-3 por seção visível, com tooltip rico
4. **Tabelas**: paginação obrigatória com >20 linhas, ordenação por score por padrão
5. **Filtros**: período, filial, transportador — globais no topo, não por página
6. **Sem duplicação**: uma métrica aparece como protagonista em UMA página apenas

### 9.3 Pré-requisitos para Evolução Visual

- [ ] Fases 1-4 concluídas (dados confiáveis)
- [ ] Dicionário de dados documentado
- [ ] Metas validadas com negócio
- [ ] DPPH corrigido
- [ ] Score operacional consistente entre camadas
- [ ] Deduplicação de motoristas por CPF
- [ ] Mock fallback removido ou explícito

---

## Apêndice A — Checklist de Validação por KPI

| KPI | Fórmula OK? | Meta OK? | Consistente entre camadas? | Ação |
|-----|------------|---------|--------------------------|------|
| SPR Pedidos | ✅ | ⚠️ Confirmar | ✅ | Validar meta |
| SPR Volumes | ✅ | ⚠️ Confirmar | ✅ | Validar meta |
| ORH | ✅ | ⚠️ Bandas confirmadas? | ✅ | Validar limiares |
| Entregas Efetivas | ✅ | ⚠️ SLA ou aspiracional? | ✅ | Confirmar natureza |
| Rotas Concluídas | ✅ | ⚠️ Confirmar | ✅ | OK |
| Ocupação Composta | ⚠️ Pesos iguais | ⚠️ Confirmar | ✅ | Avaliar ponderação |
| Aderência Volumes | ✅ | ⚠️ Confirmar | ✅ | OK |
| Custo por Carga | ✅ | ❌ Não validada | ✅ | **Validar meta** |
| DPPH | ❌ Usa pedidos | ⚠️ Confirmar | ❌ | **Corrigir fórmula** |
| Score Operacional | ✅ (v5) | N/A (derivado) | ❌ (v6 diverge) | **Corrigir v6** |

---

## Apêndice B — Glossário de Termos

| Termo | Definição |
|-------|----------|
| SPR | Stops Per Route — pedidos ou volumes divididos pelo número de rotas |
| ORH | Operations per Route Hour — tempo médio por rota (horas) |
| DPPH | Deliveries Per Person Hour — entregas efetivas por hora trabalhada |
| Aderência | Proximidade entre valor realizado e planejado (1.0 = perfeito) |
| Ocupação | Utilização da capacidade física do veículo (peso/capacidade) |
| Ocupação Composta | Média de ocupação de pedidos, volumes e peso (⚠️ conceito controverso) |
| Score Operacional | Índice 0-100 baseado em 6 KPIs classificados como OK/Atenção/Crítico |
| Match Temporal | Classificação de data planejada vs data de execução (Mesmo Dia / D±1 / Fora) |
| Flag Elegível KPI | Indica se a rota tem status suficiente para entrar nos cálculos de KPI |

---

*Documento gerado em 2026-03-21. Deve ser revisado após validação das metas com o negócio.*
