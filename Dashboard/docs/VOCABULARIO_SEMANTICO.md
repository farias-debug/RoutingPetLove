# VOCABULÁRIO SEMÂNTICO — Dashboard Last Mile

> Dicionário canônico de todos os conceitos, medidas e abreviações usados nas camadas SQL → API → Frontend.
> Fonte única de verdade para nomenclatura e significado.

---

## 1. Dimensões

| Conceito          | SQL (base_canonica)      | API (server.js)      | Frontend (schemas.ts) | Descrição                                            |
|-------------------|--------------------------|----------------------|-----------------------|------------------------------------------------------|
| Data de referência | `data_referencia`       | `data`               | `data`                | Data da execução da rota                             |
| Filial            | `filial`                | `filial`             | `filial`              | Nome da filial operacional                           |
| Região            | `regiao`                | `regiao`             | `regiao`              | Região geográfica da filial                          |
| Tipo de filial    | `tipo_filial`           | `tipoFilial`         | `tipoFilial`          | "Unidade" ou "Distribuição"                          |
| Transportador     | `transportador`         | `transportador`      | `transportador`       | Nome da transportadora responsável                   |
| Rota              | `rota`                  | `rota`               | `rota`                | Identificador da rota/carga                          |
| Motorista         | `motorista`             | `motorista`          | `motorista`           | Nome do motorista                                    |
| Motorista Key     | `motorista_key_canonico`| `motorista_key`      | `motoristaKey`        | Chave canônica do motorista (normalizada)            |
| Tipo de veículo   | `tipo_veiculo`          | `tipo_veiculo`       | `tipoVeiculo`         | Tipo canônico do veículo (Van, Toco, etc.)           |
| Placa             | `placa`                 | `placa`              | `placa`               | Placa do veículo                                     |
| Status TMS        | `status_tms`            | `status`             | `status`              | Status operacional no sistema TMS                    |

## 2. Medidas Atômicas (nível rota)

| Conceito          | SQL (base_canonica)      | Unidade     | Descrição                                            |
|-------------------|--------------------------|-------------|------------------------------------------------------|
| ID Carga          | `id_carga`              | string      | Identificador único da carga/rota                    |
| Qtd Pedidos       | `qtd_pedidos`           | int         | Pedidos embarcados na rota                           |
| Qtd Volumes       | `qtd_volumes`           | int         | Volumes movimentados na rota                         |
| Qtd Entregues     | `qtd_entregues`         | int         | Entregas efetivadas                                  |
| Qtd Insucessos    | `qtd_insucessos`        | int         | Tentativas sem sucesso                               |
| Tempo Operacional | `tempo_operacional_h`   | horas       | Tempo real de operação                               |
| Peso Real         | `peso_real_kg`          | kg          | Peso efetivamente embarcado                          |
| KM Realizado      | `km_real`               | km          | Quilometragem percorrida                             |
| Capacidade Peso   | `capacidade_peso_kg`    | kg          | Capacidade de peso do veículo                        |
| Valor Total       | `valor_total`           | R$          | Valor financeiro da carga                            |

## 3. Medidas Planejadas (nível rota)

| Conceito          | SQL (base_canonica)      | Unidade     | Descrição                                            |
|-------------------|--------------------------|-------------|------------------------------------------------------|
| Pedidos Plan      | `pedidos_plan`          | int         | Pedidos planejados                                   |
| Volumes Plan      | `volumes_plan`          | int         | Volumes planejados                                   |
| Peso Plan         | `peso_plan_kg`          | kg          | Peso planejado                                       |
| Tempo Plan        | `tempo_plan_h`          | horas       | Tempo planejado                                      |
| KM Planejado      | `km_plan`               | km          | Quilometragem planejada                              |
| Possui Planejamento| `possui_planejamento`  | boolean     | Flag: rota tem planejamento publicado                |

## 4. Flags de Alerta (nível rota)

| Flag SQL                 | API / Frontend           | Descrição                                            |
|--------------------------|--------------------------|------------------------------------------------------|
| `flag_rota_concluida`    | `rotaConcluida`          | Rota com 100% das entregas realizadas                |
| `flag_nao_planejada`     | `flagNaoPlanejada`       | Rota executada sem planejamento prévio               |
| `flag_overtime`          | `flagOvertime`           | Tempo operacional > limite configurado               |
| `flag_sem_tempo`         | `flagSemTempo`           | Rota sem informação de tempo operacional             |
| `flag_entrega_critica`   | `flagEntregaCritica`     | Taxa de entrega efetiva abaixo do limiar crítico     |
| `flag_match_critico`     | `flagMatchCritico`       | Divergência crítica entre real e planejado           |

## 5. KPIs Derivados (calculados por agregação)

| KPI                    | Fórmula SQL                                                            | Unidade   | Meta Default | Sentido   |
|------------------------|------------------------------------------------------------------------|-----------|-------------|-----------|
| SPR Volumes            | `safe_div(SUM(qtd_volumes), COUNT(DISTINCT id_carga))`                 | vol/rota  | 67          | Maior     |
| SPR Pedidos            | `safe_div(SUM(qtd_pedidos), COUNT(DISTINCT id_carga))`                 | ped/rota  | 42          | Maior     |
| Entregas Efetivas      | `safe_div(SUM(qtd_entregues), SUM(qtd_entregues) + SUM(qtd_insucessos))`| fração 0-1| 0.98       | Maior     |
| Rotas Concluídas       | `safe_div(COUNTIF(flag_rota_concluida), COUNT(DISTINCT id_carga))`     | fração 0-1| 0.95       | Maior     |
| ORH (Tempo Médio)      | `safe_div(SUM(tempo_operacional_h), COUNT(DISTINCT id_carga))`         | horas     | 7.0         | Banda     |
| Aderência Volumes      | `adherence_ratio(SUM(vol_com_plan), SUM(volumes_plan))`                | fração 0-1| 0.90       | Maior     |
| Ocupação Peso          | `safe_div(SUM(peso_kg_com_capac), SUM(capacidade_peso_kg))`           | fração 0-1| 0.85       | Dentro    |
| DPPH                   | `safe_div(SUM(qtd_entregues), SUM(tempo_operacional_h))`              | ent/hora  | 9.57 (derivada: 67/7) | Maior     |
| Score Operacional      | `fn_score_operacional(status_spr, status_entregas, status_rotas, status_orh, status_ader, status_capac)` | 0-100 | — | Maior |

## 6. UDFs de Scoring

| UDF                    | Parâmetros                           | Retorno    | Descrição                                            |
|------------------------|--------------------------------------|------------|------------------------------------------------------|
| `safe_div`             | (numerador, denominador)             | FLOAT64    | Divisão segura (NULL se denominador = 0/NULL)        |
| `adherence_ratio`      | (valor_real, valor_plan)             | FLOAT64    | Razão real/plan, ignora se plan = 0                  |
| `normalize_text`       | (texto)                              | STRING     | Normaliza para lowercase, sem acentos                |
| `status_higher`        | (valor, meta)                        | STRING     | "OK"/"Atenção"/"Crítico" - quanto maior, melhor      |
| `status_target_band`   | (valor, meta, low, high)             | STRING     | Status com banda alvo [meta*low, meta*high]          |
| `capacity_status`      | (ocupacao)                           | STRING     | Status de ocupação de peso do veículo                |
| `fn_score_operacional` | (6 status strings)                   | FLOAT64    | Score 0-100 ponderado dos 6 eixos                    |

## 7. Metas

| `kpi_id` (metas_globais) | KPI                    | `meta_xxx` (metas_pivot_canonico) |
|---------------------------|------------------------|-----------------------------------|
| `spr_pedidos`             | SPR Pedidos            | `meta_spr_ped`                    |
| `spr_volumes`             | SPR Volumes            | `meta_spr_vol`                    |
| `entregas_efetivas`       | Entregas Efetivas      | `meta_entregas`                   |
| `rotas_concluidas`        | Rotas Concluídas       | `meta_rotas`                      |
| `orh`                     | ORH                    | `meta_orh`                        |
| `aderencia_volumes`       | Aderência Volumes      | `meta_ader_vol`                   |
| `ocupacao_composta`       | Ocupação Composta      | `meta_ocup`                       |
| `dpph`                    | DPPH                   | `meta_dpph`                       |

## 8. Convenções de Naming

| Camada     | Padrão         | Exemplo                              |
|------------|----------------|--------------------------------------|
| SQL        | `snake_case`   | `qtd_volumes`, `tempo_operacional_h` |
| API JSON   | `camelCase`    | `sprVolumes`, `tempoMedRealizado`    |
| Frontend   | `camelCase`    | `scoreOperacional`, `entregasEfetivas`|
| UDFs BQ    | `snake_case`   | `safe_div`, `fn_score_operacional`   |
| Tabelas BQ | `snake_case`   | `base_execucao_canonica`             |
| Views BQ   | `snake_case`   | `metas_pivot_canonico`               |

## 9. Semântica — Termos Frequentemente Confundidos

| Termo Errado              | Termo Correto            | Razão                                            |
|---------------------------|--------------------------|--------------------------------------------------|
| "ocupação volumes"        | "aderência volumes"      | `ocup_volumes` mede aderência, não ocupação      |
| "km_real"                 | `km_realizado`           | Alias canônico padronizado                       |
| "tempo_realizado_h_final" | `tempo_operacional_h`    | Nome legado da era Sheets; descontinuado         |
| "pub_metas"               | `metas_globais`          | View legada removida; usar fonte canônica        |
| `m.m_xxx`                 | `m.meta_xxx`             | Alias padronizado após refatoração               |
