# Dicionário de Dados — Pipeline Monitoramento de Cargas

Projeto: `data-aileron-482822-d0` · Dataset: `monitoramento_carga`

---

## Arquitetura em Camadas

```
RAW → STAGING → DIMENSÕES → FATO → MARTS KPI → PUBLICAÇÃO (v5) → API (v6)
```

| Camada | Objetos | Pipeline |
|--------|---------|----------|
| RAW | raw_monitoramento, raw_planejamento, raw_dim_filial | Externo |
| STAGING | stg_monitoramento (41c), stg_planejamento (12c) | v4 |
| DIMENSÕES | dim_calendario, dim_filial, dim_veiculo, dim_transportador, dim_status_operacional, dim_planejamento, dim_metas | v4 |
| FATO | fct_execucao (84 colunas, 1 linha/rota) | v4 |
| MARTS OPERACIONAIS | mart_ops_diario_filial + 8 outros | v4 |
| **MARTS KPI** | **mart_kpi_diario, mart_kpi_filial_dia, mart_kpi_transportador_dia** | **v4** |
| PUBLICAÇÃO | 13 views para Google Sheets | v5 |
| API | 6 views para React frontend | v6 |

---

## UDFs (14 funções)

| UDF | Assinatura | Descrição |
|-----|------------|-----------|
| `safe_div` | (num, den) → FLOAT64 | Divisão segura (NULL se den = 0) |
| `adherence_ratio` | (real, plan) → FLOAT64 | MIN(real/plan, 1.0) |
| `fn_ocup_composta` | (ocup_ped, ocup_vol, ocup_peso) → FLOAT64 | Média ponderada 40/40/20 |
| `capacity_status` | (ocup) → STRING | Ocioso/Subutilizado/Ideal/Saturado/Critico |
| `status_color` | (status) → STRING | Cor hex para cada status |
| `status_higher` | (valor, meta) → STRING | OK/Atencao/Critico (Maior=Melhor) |
| `status_lower` | (valor, meta) → STRING | OK/Atencao/Critico (Menor=Melhor) |
| `status_target_band` | (valor, meta, low, high) → STRING | Status para banda-alvo (ex: ORH) |
| `status_score` | (status) → FLOAT64 | Critico=0, Atencao=0.5, OK=1 |
| `fn_score_operacional` | (s_spr, s_entr, s_rotas, s_orh, s_ader, s_ocup) → FLOAT64 | Score 0-100 ponderado |
| `limpa_nome` | (txt) → STRING | Normaliza texto para chave |
| `flag_rota_concluida` | (entregues, pedidos, baixas, insuc) → BOOL | 80%+ entregas |
| `classifica_match_temporal` | (data_real, data_plan) → STRING | Mesmo Dia/D+1/D+2+ |
| `tempo_em_horas` | (segundos) → FLOAT64 | Converte segundos para horas |

---

## KPIs Principais

| KPI | ID (dim_metas) | Fórmula | Meta | Sentido |
|-----|----------------|---------|------|---------|
| SPR Pedidos | spr_pedidos | pedidos / rotas | 42.0 | Maior=Melhor |
| SPR Volumes | spr_volumes | volumes / rotas | 50.0 | Maior=Melhor |
| Entregas Efetivas | entregas_efetivas | entregas / (entregas + insucessos) | 0.98 | Maior=Melhor |
| Rotas Concluídas | rotas_concluidas | rotas_concl / rotas | 0.90 | Maior=Melhor |
| ORH (tempo médio) | orh | tempo_oper / rotas | 5.0 | Banda-alvo [1.0, 2.1] |
| Ocupação Composta | ocupacao_composta | fn_ocup_composta(ped, vol, peso) | 0.85 | Banda-alvo |
| Aderência Volumes | aderencia_volumes | MIN(vol_real/vol_plan, 1.0) | 0.90 | Maior=Melhor |
| **DPPH** | dpph | **entregas / tempo_oper** | 6.0 | Maior=Melhor |

> **IMPORTANTE**: DPPH usa `entregas` (não pedidos) no numerador. Unidade: `ent/h`.

---

## Score Operacional

Cálculo via `fn_score_operacional(s_spr, s_entregas, s_rotas, s_orh, s_ader, s_ocup)`:

| Componente | Peso | Fonte do status |
|------------|------|-----------------|
| SPR Volumes | 1/6 | status_higher(spr_vol, meta_spr_vol) |
| Entregas Efetivas | 1/6 | status_higher(pct_entregas, meta_entregas) |
| Rotas Concluídas | 1/6 | status_higher(pct_rotas_concl, meta_rotas) |
| ORH | 1/6 | status_target_band(orh, meta_orh, 1.0, 2.1) |
| Aderência Volumes | 1/6 | status_higher(ader_vol, meta_ader_vol) |
| Ocupação | 1/6 | capacity_status(ocup_composta) |

Score = `AVG(status_score(status_i)) * 100` → resultado 0-100

---

## Tabelas por Camada

### fct_execucao (84 colunas)
Central: 1 linha por rota (`id_carga`). Chaves: `data_planejada`, `filial`, `transportador`, `motorista`, `placa`.

### mart_kpi_diario
GROUP BY `data_planejada`. Todos os KPIs calculados + status + score + alerta. Filtro: `tipo_filial = 'Unidade'`.

### mart_kpi_filial_dia
GROUP BY `data, filial, regiao, tipo`. Mesma estrutura de KPIs que mart_kpi_diario. Filtro: `tipo_filial = 'Unidade'`.

### mart_kpi_transportador_dia
GROUP BY `data, transportador`. KPIs + `pct_share` (window function). Filtro: `tipo_filial = 'Unidade'`.

---

## Views de Publicação (v5) — Google Sheets

| # | View | Colunas | Fonte |
|---|------|---------|-------|
| 1 | metas_globais | 4 | dim_metas |
| 2 | dim_filial_tratada | 13 | dim_filial + dim_metas |
| 3 | kpi_resumo_diario | 75 | **mart_kpi_diario** + dim_calendario + filial_agg |
| 4 | kpi_filial_dia | 70 | **mart_kpi_filial_dia** + dim_calendario |
| 5 | kpi_transportador_dia | 71 | **mart_kpi_transportador_dia** + dim_calendario |
| 6 | kpi_card_latest | 15 | fct_execucao + dim_metas |
| 7 | alertas_rotas | 40 | fct_execucao |
| 8 | drill_rotas | 39 | fct_execucao |
| 9 | Resumo_Filial | 34 | fct_execucao |
| 10 | Resumo_Ocupacao_Veic_Transp | 26 | fct_execucao |
| 11 | VW_Base_Execucao | 54 | fct_execucao |
| 12 | Resumo_Semana_Filial_Diario | 33 | fct_execucao |
| 13 | Resumo_Semana_Filial_Matriz | 15 | fct_execucao |

---

## Views API (v6) — React Frontend

| # | View | Fonte |
|---|------|-------|
| 1 | api_motoristas_jornada | fct_execucao + dim_metas |
| 2 | api_resumo_executivo_semanal | kpi_resumo_diario (v5 → mart_kpi_diario) |
| 3 | api_filial_performance | Resumo_Filial + dim_metas |
| 4 | api_transportadores_resumo | kpi_transportador_dia (v5 → mart) + Resumo_Ocupacao_Veic_Transp |
| 5 | api_ocupacao_tipo_veiculo | Resumo_Ocupacao_Veic_Transp |
| 6 | api_alertas_contagem | alertas_rotas |

---

## Deploy

Ordem obrigatória:
1. `python deploy_v4.py` — UDFs + staging + dims + fct + marts
2. `python deploy_v5_publicacao.py` — 13 views publicação
3. `python deploy_v6_api_views.py` — 6 views API
4. `python validate_pipeline.py` — Validação automática
