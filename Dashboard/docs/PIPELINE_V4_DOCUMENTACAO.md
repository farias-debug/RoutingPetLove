# Pipeline v4 — Documentação de Deploy

> **Projeto**: `data-aileron-482822-d0` | **Dataset**: `monitoramento_carga`
> **Deploy**: 2026-03-19 | **Statements**: 42/42 OK

---

## Inventário Final: 45 Objetos

| Camada | Qtd | Objetos |
|--------|-----|---------|
| RAW | 3 | raw_monitoramento, raw_planejamento, raw_dim_filial |
| UDF | 14 | normalize_text, safe_div, adherence_ratio, status_higher, status_target_band, capacity_status, status_score, status_color, vehicle_type_canonical, vehicle_weight_capacity, vehicle_family, **fn_ocup_composta**, **fn_tempo_ocioso_jornada**, **fn_score_operacional** |
| Staging | 2 | stg_monitoramento (41c), stg_planejamento (12c) |
| Dimensões | 7 | dim_calendario (25c), dim_filial (11c), dim_veiculo (4c), dim_transportador (5c), dim_status_operacional (5c), dim_planejamento (9c), dim_metas (5c) |
| Fato | 1 | fct_execucao (84c) |
| Marts Operações | 8 | mart_ops_diario_filial, mart_ops_semanal, mart_ops_resumo_filial, mart_ops_drill_rotas, mart_ops_alertas, mart_ops_kpi_filial, mart_ops_kpi_transportador, mart_ops_kpi_diario |
| Marts Planejamento | 2 | mart_plan_vs_real, mart_plan_ocupacao_veiculo |
| Marts Financeiro | 1 | mart_fin_diario_filial |
| Marts Produtividade | 2 | mart_prod_filial, mart_prod_motorista |
| Marts Projeção/Tendência | 3 | mart_proj_semanal, mart_proj_diario, mart_tend_filial |
| Semântico | 2 | sem_kpi_cards, sem_resumo_executivo |

## Mudanças vs v3

### Correções Críticas
1. **dim_filial bug**: 8 filiais sem mapeamento agora recebem `tipo='Nao-Unidade'` → 0 NULLs em tipo_filial
2. **km_retorno eliminado**: 100% NULL → removido do stg_monitoramento
3. **Filtro Unidade**: TODOS os marts/sem filtram `WHERE tipo_filial = 'Unidade'` via SQL

### Novos Objetos (7 views + 3 UDFs)
| Objeto | Domínio | Descrição |
|--------|---------|-----------|
| fn_ocup_composta | UDF | Média ponderada pedidos/volumes/peso |
| fn_tempo_ocioso_jornada | UDF | GREATEST(0, 8h - tempo_real) |
| fn_score_operacional | UDF | Score 0-100 baseado em 6 status |
| mart_fin_diario_filial | Financeiro | Breakdown de custos por filial+dia |
| mart_plan_vs_real | Planejamento | Delta + aderência plan vs real |
| mart_proj_semanal | Projeção | 3 semanas completas + tendência |
| mart_proj_diario | Projeção | Médias móveis 7d/21d |
| mart_prod_filial | Produtividade | DPPH, utilização jornada por filial |
| mart_prod_motorista | Produtividade | Ranking individual motoristas |
| sem_resumo_executivo | Semântico | Resumo diário formato BR |

### fct_execucao: 93 → 84 colunas
- **Removidas (14)**: nome_filial, meta_spr, capacidade_volume_dia, km_retorno, spr_pedidos, spr_volumes, ocup_composta, status_spr, status_entrega, status_tempo, status_km, status_rota, alerta_operacional, prioridade
- **Adicionadas (5)**: custo_por_kg, custo_por_km, tempo_ocioso_jornada_h, pct_util_jornada, flag_rota_subutilizada

### Renomeações (11 views v3 → novos nomes v4)
| v3 | v4 |
|----|-----|
| mart_resumo_diario_filial | mart_ops_diario_filial |
| mart_matriz_semanal | mart_ops_semanal |
| mart_resumo_filial | mart_ops_resumo_filial |
| mart_drill_rotas | mart_ops_drill_rotas |
| mart_alertas | mart_ops_alertas |
| mart_kpi_filial_dia | mart_ops_kpi_filial |
| mart_kpi_transportador_dia | mart_ops_kpi_transportador |
| mart_kpi_resumo_diario | mart_ops_kpi_diario |
| mart_ocupacao_veiculo | mart_plan_ocupacao_veiculo |
| mart_kpi_cards | sem_kpi_cards |
| mart_tendencias | mart_tend_filial |

### dim_metas: 7 → 9 KPIs
- **Adicionados**: `custo_por_carga` (R$ 500), `dpph` (6 ped/h)

### dim_calendario: 24 → 25 colunas
- **Adicionada**: `semana_do_mes` (INT64, 1-5)

## Validação

| Check | Resultado |
|-------|-----------|
| Statements deployados | 42/42 OK |
| Views v3 órfãs removidas | 11/11 OK |
| fct_execucao rows | 27,627 |
| fct_execucao cols | 84 |
| Unidade rows | 23,731 |
| Nao-Unidade rows | 1,305 |
| NULL tipo_filial | **0** (bug corrigido) |
| sem_kpi_cards rows | 9 KPIs |
| Novas UDFs testadas | 3/3 OK |

## Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `bigquery/pipeline_v4.sql` | SQL completo (42 statements) |
| `bigquery/deploy_v4.py` | Script de deploy Python |
| `docs/FASE_1_5_DESENHO_ALVO_V4.md` | Arquitetura e decisões |
