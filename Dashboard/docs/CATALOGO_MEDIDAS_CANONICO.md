# Catalogo de Medidas Canonico

Projeto: Monitoramento Logistico Last-Mile
Data: 2026-03-22
Status: catalogo oficial revisado contra implementacao real em pipeline_v4, pipeline_v5_publicacao, pipeline_v6_api e api/server.js

---

## 1. Objetivo

Este documento define a semantica unica das medidas do projeto com base no estado real hoje implementado.

Ele passa a distinguir explicitamente tres camadas:

- camada canonica de base e marts, governada por base_execucao_canonica e marts canonicos
- camada de publicacao operacional, ainda usada por Google Sheets e partes do ecossistema legado
- camada de compatibilidade transitoria, mantida para nao quebrar consumidores existentes

Toda metrica publicada deve ter:

- nome tecnico principal
- nome visual principal
- formula oficial
- unidade oficial
- grao minimo de calculo
- camada oficial de origem
- regra de fallback quando depender de dim_filial ou planejamento

---

## 2. Principios Canonicos Vigentes

1. A fonte semantica principal do projeto e a view base_execucao_canonica.
2. O grao canonico operacional continua sendo 1 linha por id_carga.
3. KPIs publicados sao calculados via queries.js (agregacao inline sobre base_execucao_canonica).
4. Percentuais publicados pela API continuam em fracao 0-1.
5. O score operacional oficial usa exatamente 6 componentes e nao deve ser recalculado fora da regra central.
6. Comparacoes por filial podem depender de atributos de dim_filial, especialmente meta_spr e capacidade_volume_dia.
7. Quando uma meta por filial nao existir em dim_filial, a comparacao de SPR por filial usa fallback para a meta global de spr_volumes.
8. Views de publicacao podem expor nomes legados e colunas auxiliares, mas nao redefinem a semantica canonica.

---

## 3. Camadas Oficiais de Origem

### 3.1 Base canonica

Objeto principal:

- base_execucao_canonica

Responsabilidade:

- expor medidas atomicas agregaveis
- estabilizar naming tecnico
- concentrar reconciliacao operacional, planejamento, capacidade fisica e flags

### 3.2 Agregacao dinamica (API — substitui marts)

Na arquitetura v7, a camada de marts foi eliminada. A API (queries.js) executa agregacao inline sob demanda.

Objetos de suporte:

- metas_pivot_canonico (view unica de metas pivotadas)

Responsabilidade:

- calcular KPIs oficiais e status via queries.js
- aplicar metas globais via CROSS JOIN com metas_pivot_canonico
- suportar graos: diario, filial, transportador, motorista, tipo veiculo

### 3.3 Publicacao operacional (descontinuada)

Os seguintes objetos foram descontinuados e arquivados na v7:

- kpi_resumo_diario, kpi_filial_dia, kpi_transportador_dia
- Resumo_Filial, Resumo_Semana_Filial_Diario, Resumo_Semana_Filial_Matriz
- dim_filial_tratada

O frontend consome exclusivamente via API REST.

---

## 4. Medidas Atomicas Oficiais

### 4.1 Medidas atomicas da base canonica

| Nome tecnico | Nome visual principal | Unidade | Origem oficial | Observacao |
| --- | --- | --- | --- | --- |
| qtd_rotas_base | Qtd Rotas Base | contagem | base_execucao_canonica | valor atomico fixo 1 por id_carga; agregacao oficial de rotas usa count distinct de id_carga |
| qtd_pedidos | Qtd Pedidos | contagem | base_execucao_canonica | realizado |
| qtd_volumes | Qtd Volumes | contagem | base_execucao_canonica | realizado |
| qtd_entregues | Qtd Entregues | contagem | base_execucao_canonica | realizado |
| qtd_insucessos | Qtd Insucessos | contagem | base_execucao_canonica | realizado |
| qtd_baixas | Qtd Baixas | contagem | base_execucao_canonica | realizado |
| qtd_paradas | Qtd Paradas | contagem | base_execucao_canonica | realizado |
| qtd_clientes | Qtd Clientes | contagem | base_execucao_canonica | realizado |
| peso_real_kg | Peso Real | kg | base_execucao_canonica | realizado |
| km_real | Km Realizado | km | base_execucao_canonica | realizado |
| tempo_operacional_h | Tempo Operacional | horas | base_execucao_canonica | base de ORH e DPPH |
| tempo_real_h | Tempo Real | horas | base_execucao_canonica | mantido na base para compatibilidade e reconciliacoes |
| tempo_plan_h | Tempo Planejado | horas | base_execucao_canonica | planejamento |
| tempo_ocioso_jornada_h | Tempo Ocioso Jornada | horas | base_execucao_canonica | derivada operacional de baixo nivel |
| pct_util_jornada | Utilizacao Jornada | fracao 0-1 | base_execucao_canonica | derivada operacional de baixo nivel |
| pedidos_plan | Pedidos Planejados | contagem | base_execucao_canonica | planejamento |
| volumes_plan | Volumes Planejados | contagem | base_execucao_canonica | planejamento |
| peso_plan_kg | Peso Planejado | kg | base_execucao_canonica | planejamento |
| km_plan | Km Planejado | km | base_execucao_canonica | planejamento |
| valor_total | Valor Total | R$ | base_execucao_canonica | soma financeira consolidada |
| capacidade_peso_kg | Capacidade Peso | kg | base_execucao_canonica | capacidade fisica inferida pelo tipo de veiculo |
| possui_planejamento | Possui Planejamento | booleano | base_execucao_canonica | sinaliza disponibilidade de plano |

### 4.2 Medidas atomicas de dimensao usadas em comparacoes

Estas colunas nao nascem na base canonica, mas sao oficialmente usadas por joins com dim_filial e continuam parte da semantica operacional do projeto.

| Nome tecnico | Nome visual principal | Unidade | Origem oficial | Observacao |
| --- | --- | --- | --- | --- |
| meta_spr_filial | Meta SPR Filial | vol/rota | dim_filial | meta operacional especifica por filial |
| capacidade_volume_dia | Capacidade Volume Dia | volumes/dia | dim_filial | capacidade diaria de volumes da filial |
| regiao | Regiao | texto | dim_filial / base_execucao_canonica | atributo de corte |
| tipo_filial | Tipo Filial | texto | dim_filial / base_execucao_canonica | usado para filtro Unidade |

### 4.3 Flags atomicas oficiais

| Nome tecnico | Nome visual principal | Unidade | Origem oficial | Observacao |
| --- | --- | --- | --- | --- |
| flag_rota_concluida | Rota Concluida | booleano | base_execucao_canonica | base de pct_rotas_concluidas |
| flag_nao_planejada | Rota Nao Planejada | booleano | base_execucao_canonica | excecao operacional |
| flag_sem_tempo | Rota Sem Tempo | booleano | base_execucao_canonica | excecao operacional |
| flag_overtime | Rota Overtime | booleano | base_execucao_canonica | excecao operacional |
| flag_match_mesmo_dia | Match Mesmo Dia | booleano | base_execucao_canonica | reconciliacao temporal |
| flag_match_critico | Match Critico | booleano | base_execucao_canonica | alerta operacional |
| flag_entrega_critica | Entrega Critica | booleano | base_execucao_canonica | alerta operacional |
| flag_rota_subutilizada | Rota Subutilizada | booleano | base_execucao_canonica | excecao operacional |

---

## 5. KPIs Canonicos Oficiais

### 5.1 KPIs globais e multiplos graos

| Nome tecnico | Nome visual principal | Formula oficial | Unidade | Sentido | Grao minimo | Camada oficial |
| --- | --- | --- | --- | --- | --- | --- |
| spr_pedidos | SPR Pedidos | qtd_pedidos / qtd_rotas | ped/rota | maior=melhor | agregacao | queries.js |
| spr_volumes | SPR Volumes | qtd_volumes / qtd_rotas | vol/rota | maior=melhor | agregacao | queries.js |
| pct_entregas_efetivas | Entregas Efetivas | qtd_entregues / (qtd_entregues + qtd_insucessos) | fracao 0-1 | maior=melhor | agregacao | queries.js |
| pct_rotas_concluidas | Rotas Concluidas | qtd_rotas_concluidas / qtd_rotas | fracao 0-1 | maior=melhor | agregacao | queries.js |
| orh | ORH | tempo_operacional_h / qtd_rotas | h/rota | alvo | agregacao | queries.js |
| ader_pedidos | Aderencia Pedidos | min(qtd_pedidos / pedidos_plan, 1.0) quando houver plano | fracao 0-1 | maior=melhor | agregacao com planejamento | queries.js |
| ader_volumes | Aderencia Volumes | min(qtd_volumes / volumes_plan, 1.0) quando houver plano | fracao 0-1 | maior=melhor | agregacao com planejamento | queries.js |
| ader_peso | Aderencia Peso | min(peso_real_kg / peso_plan_kg, 1.0) quando houver plano | fracao 0-1 | maior=melhor | agregacao com planejamento | queries.js |
| ader_km | Aderencia KM | min(km_real / km_plan, 1.0) quando houver plano | fracao 0-1 | maior=melhor | agregacao com planejamento | queries.js |
| ader_tempo | Aderencia Tempo | min(tempo_operacional_h / tempo_plan_h, 1.0) quando houver plano | fracao 0-1 | maior=melhor | agregacao com planejamento | queries.js |
| ocup_peso_veiculo | Capacidade Utilizada | peso_real_kg / capacidade_peso_kg | fracao 0-1 | faixa alvo | base_execucao_canonica + agregacao | queries.js |
| custo_medio_carga | Custo Medio por Carga | valor_total / qtd_rotas | R$/carga | menor=melhor | agregacao | queries.js |
| custo_medio_pedido | Custo Medio por Pedido | valor_total / qtd_pedidos | R$/pedido | menor=melhor | agregacao | queries.js |
| custo_medio_volume | Custo Medio por Volume | valor_total / qtd_volumes | R$/volume | menor=melhor | agregacao | queries.js |
| dpph | DPPH | qtd_entregues / tempo_operacional_h | ent/h | maior=melhor | agregacao | queries.js |
| pct_share | Share | qtd_rotas_entidade / qtd_rotas_total_mesmo_grao | fracao 0-1 | informativo | agregacao transportador | queries.js |
| score_operacional | Score Operacional | avg(status_score(componentes oficiais)) * 100 | 0-100 | maior=melhor | agregacao | queries.js (scoreExpr) |

### 5.2 KPIs oficiais especificos de filial

Estas medidas sao calculadas via filiaisPerformanceQuery em queries.js.

| Nome tecnico | Nome visual principal | Formula oficial | Unidade | Sentido | Grao minimo | Camada oficial |
| --- | --- | --- | --- | --- | --- | --- |
| spr_volumes_vs_meta_filial | SPR Volumes vs Meta Filial | spr_volumes - meta_spr_filial; quando meta_spr_filial for nula, usar spr_volumes - meta_spr_vol global | vol/rota | maior=melhor | agregacao filial | queries.js |
| status_spr_volumes_filial | Status SPR Volumes Filial | status_higher(spr_volumes, coalesce(meta_spr_filial, meta_spr_vol)) | status textual | maior=melhor | agregacao filial | queries.js |

Regra interpretativa obrigatoria:

- meta_spr_filial e uma meta de produtividade de volumes por rota da filial, nao uma meta de pedidos.
- a comparacao oficial por filial usa spr_volumes, nao spr_pedidos.
- a medida ader_capacidade_volume compara volume realizado do dia contra a capacidade diaria de volume da filial em dim_filial; nao mede ocupacao fisica do veiculo.
- ader_capacidade_volume pode ser maior que 1.0; ao contrario das aderencias contra planejamento, ela nao deve ser truncada para 1.0.

**Regra de Fallback para meta_spr_filial:**

Quando meta_spr_filial IS NULL em dim_filial, TODAS as comparacoes de SPR por filial devem usar fallback para meta_spr_vol global (67.0).

**Implementacao obrigatoria:**

- queries.js: usa `meta_spr_ped` de `metas_pivot_canonico`
- Frontend: NAO deve assumir meta especifica, consumir da API

**Validacao operacional:**

- Script validate_pipeline.py alerta quando > 30% filiais sem meta_spr
- Script atualizar_capacidade_volume_dia.sql calcula capacidade quando NULL (media ultimas 3 semanas, P95)

**Tratamento NULL capacidade_volume_dia:**

ader_capacidade_volume retorna NULL quando capacidade_volume_dia nao esta preenchida em dim_filial. Isto NAO deve ser tratado como 0% ou 100%, mas como ausencia de dado de referencia.

### 5.3 Medidas operacionais derivadas e de apoio

| Nome tecnico | Nome visual principal | Formula oficial | Unidade | Camada oficial | Observacao |
| --- | --- | --- | --- | --- | --- |
| gap_orh_vs_meta_h | Gap ORH vs Meta | orh - meta_orh | h/rota | queries.js (kpiDiarioQuery) | calculado em kpiDiarioQuery |
| var_d1_rotas | Var D-1 Rotas | qtd_rotas atual - qtd_rotas D-1 valida | contagem | descontinuado | comparativo temporal (nao implementado na v7) |
| var_d1_pedidos | Var D-1 Pedidos | qtd_pedidos atual - qtd_pedidos D-1 valida | contagem | descontinuado | comparativo temporal (nao implementado na v7) |
| var_d1_spr_ped | Var D-1 SPR Ped | spr_ped atual - spr_ped D-1 valida | ped/rota | descontinuado | comparativo temporal (nao implementado na v7) |
| var_d1_orh | Var D-1 ORH | orh atual - orh D-1 valida | h/rota | descontinuado | comparativo temporal (nao implementado na v7) |
| pct_util_jornada | Pct Utilizacao Jornada 8h | tempo_operacional_h / (qtd_rotas * 8) | fracao 0-1 | queries.js (kpiDiarioQuery) | indicador operacional auxiliar |
| pct_ociosidade_jornada | Pct Ociosidade Jornada 8h | 1 - pct_util_jornada | fracao 0-1 | queries.js (kpiDiarioQuery) | indicador operacional auxiliar |
| horas_ociosas_total | Horas Ociosas Totais | soma de tempo_ocioso_jornada_h | horas | descontinuado | nao implementado na v7 |
| pct_match_mesmo_dia | Pct Match Mesmo Dia | qtd_match_mesmo_dia / qtd_rotas_com_plan | fracao 0-1 | queries.js (kpiDiarioQuery) | reconciliacao temporal |

### 5.4 Medidas auxiliares de aderencia (NAO no score operacional)

Estas medidas NAO fazem parte do score operacional principal. Sao calculadas inline em queries.js para telas de analise.

| Nome tecnico | Nome visual | Formula oficial | Unidade | No Score? | Camada oficial | Observacao |
| --- | --- | --- | --- | --- | --- | --- |
| ader_peso | Aderencia Peso | LEAST(1.0, peso_real_kg / peso_plan_kg) | fracao 0-1 | NAO | queries.js | auxiliar planejamento |
| ader_km | Aderencia KM | LEAST(1.0, km_real / km_plan) | fracao 0-1 | NAO | queries.js | auxiliar planejamento |
| ader_tempo | Aderencia Tempo | LEAST(1.0, tempo_operacional_h / tempo_plan_h) | fracao 0-1 | NAO | queries.js | auxiliar planejamento |

**Decisao arquitetural:**

- NAO fazem parte do score operacional (que usa apenas 6 componentes: spr_volumes, entregas_efetivas, rotas_concluidas, orh, ader_volumes, ocup_peso)
- Frontend pode exibi-las como informacao complementar em telas de analise de planejamento
- ader_pedidos e uma medida oficial (secao 5.1), nao auxiliar

### 5.5 Score por motorista

| Nome tecnico | Formula oficial | Componentes | Camada oficial | Observacao |
| --- | --- | --- | --- | --- |
| score_operacional_motorista | fn_score_operacional(6 comp) | Mesmos 6 componentes do score global | queries.js (motoristasQuery) | Usa scoreExpr() canonico |

**Regra:** Score por motorista usa a MESMA formula do score global (6 componentes obrigatorios), agregado por motorista.

---

## 6. Metas Oficiais Vigentes

### 6.1 Metas globais canonicas

Fonte oficial: dim_metas_canonica e metas_pivot_canonico.

| Nome tecnico | Meta atual | Unidade | Observacao |
| --- | --- | --- | --- |
| spr_pedidos | 42.0 | ped/rota | meta global canonica |
| spr_volumes | 67.0 | vol/rota | meta global canonica |
| orh | 7.0 | horas | alvo em horas por rota |
| pct_entregas_efetivas | 0.98 | fracao | meta global canonica |
| pct_rotas_concluidas | 0.95 | fracao | meta global canonica |
| ocup_peso_veiculo | 0.85 | fracao | faixa alvo operacional |
| ader_volumes | 0.90 | fracao | meta global canonica |
| custo_medio_carga | 500.0 | R$/carga | meta global canonica |
| dpph | 6.0 | ent/h | produtividade minima alvo |

### 6.2 Metas por filial

Fonte oficial: dim_filial.meta_spr.

Regras:

- nao existe hoje uma tabela canonica separada de metas por filial; a referencia implementada esta em dim_filial.
- meta_spr_filial e usada no mart_filial_dia_canonico e em views de publicacao para comparar SPR Volumes da filial.
- quando meta_spr_filial estiver ausente, a comparacao de status de SPR da filial deve usar fallback para a meta global de spr_volumes.
- capacidade_volume_dia nao e meta de score; e referencia operacional de capacidade diaria da filial.

---

## 7. Composicao Oficial do Score Operacional

Componentes obrigatorios:

1. status_spr_volumes
2. status_entregas_efetivas
3. status_rotas_concluidas
4. status_orh
5. status_ader_volumes
6. status_ocup_peso

Regra:

- score_operacional = avg(status_score(componentes)) * 100

Regras adicionais:

- nao trocar spr_volumes por spr_pedidos na composicao principal
- nao substituir ocup_peso_veiculo por ader_peso, ader_capacidade_volume ou ocupacao composta
- nao usar overtime como componente direto do score principal
- o score por filial usa o mesmo conjunto de componentes, mas o status de SPR pode usar meta_spr_filial em vez da meta global de spr_volumes

---

## 8. Naming Harmonizado

### 8.1 Naming tecnico oficial

| Prefixo | Uso oficial |
| --- | --- |
| qtd_ | contagens absolutas |
| pct_ | percentuais em fracao 0-1 |
| spr_ | produtividade por rota |
| ader_ | aderencia a planejamento ou referencia operacional |
| ocup_ | ocupacao de capacidade fisica |
| custo_medio_ | custo unitario medio |
| meta_ | valor de referencia |
| status_ | classificacao textual |
| flag_ | indicador booleano |
| gap_ | diferenca absoluta vs referencia |
| var_d1_ | variacao vs ultima data valida anterior |

### 8.2 Naming visual oficial

| Nome tecnico | Nome visual oficial | Nomes ainda encontrados |
| --- | --- | --- |
| pct_entregas_efetivas | Entregas Efetivas | pct_entrega_efetiva, entrega efetiva |
| pct_rotas_concluidas | Rotas Concluidas | progresso, pct_rotas_concl, progresso pct |
| ader_volumes | Aderencia Volumes | aderencia_volumes, pct ader volumes |
| ader_pedidos | Aderencia Pedidos | aderencia_pedidos |
| ader_capacidade_volume | Aderencia Capacidade Volume | ader_cap_vol_dia, Aderencia Cap Vol Dia |
| ocup_peso_veiculo | Capacidade Utilizada | ocupacao peso, ocupacao composta |
| custo_medio_carga | Custo Medio por Carga | custo_por_carga |
| custo_medio_pedido | Custo Medio por Pedido | custo_por_pedido |
| spr_volumes_vs_meta_filial | SPR Volumes vs Meta Filial | spr_vs_meta, SPR vs Meta |
| meta_spr_filial | Meta SPR Filial | MetaSPR Filial, Meta SPR |

Observacoes:

- ocupacao composta continua aparecendo em views legadas, mas nao e mais a referencia canonica principal.
- o nome visual SPR vs Meta permanece aceito em publicacao, desde que a documentacao deixe claro que se trata de spr_volumes_vs_meta_filial.

---

## 9. Regras de Publicacao e Consumo

1. API publica percentuais em fracao 0-1.
2. Frontend formata valores, mas nao redefine formulas.
3. Views de publicacao podem traduzir nomes, ordenar colunas e carregar atributos de calendario e dim_filial.
4. Score operacional e calculado via scoreExpr() em queries.js — funcao DRY que centraliza a formula.
5. Endpoints e views podem continuar expondo medidas de apoio como gap, variacoes D-1 e colunas auxiliares de status.
6. Comparacoes de capacidade de volume por filial devem usar capacidade_volume_dia da dim_filial, nao capacidade_peso_kg do veiculo.
7. Comparacoes de ocupacao fisica do score devem usar ocup_peso_veiculo, nao ader_capacidade_volume.

---

## 10. Compatibilidade Transitoria

Durante a refatoracao, os seguintes nomes legados continuam podendo existir em SQL, views de publicacao, Apps Script e payloads intermediarios:

- pct_entrega_efetiva
- aderencia_pedidos
- aderencia_volumes
- aderencia_peso
- aderencia_km
- aderencia_tempo
- custo_por_carga
- custo_por_pedido
- custo_por_volume
- ocupacao_composta
- meta_spr
- MetaSPR Filial
- ader_cap_vol_dia
- SPR vs Meta

Regra:

- esses nomes podem permanecer tecnicamente por compatibilidade, mas a referencia semantica passa a ser este catalogo.

Mapeamentos obrigatorios de compatibilidade:

- pct_entrega_efetiva -> pct_entregas_efetivas
- aderencia_volumes -> ader_volumes
- aderencia_pedidos -> ader_pedidos
- ader_cap_vol_dia -> ader_capacidade_volume
- ocupacao_composta -> nao usar como equivalente de ocup_peso_veiculo
- SPR vs Meta -> spr_volumes_vs_meta_filial
- MetaSPR Filial -> meta_spr_filial

---

## 11. Observacoes de Implementacao Real

1. mart_diario_canonico nao carrega meta por filial nem capacidade_volume_dia; essas referencias entram no grao filial.
2. mart_filial_dia_canonico ja incorpora meta_spr_filial e capacidade_volume_dia via join com dim_filial.
3. mart_transportador_dia_canonico usa apenas metas globais.
4. A API atual ainda calcula alguns agregados diretamente de base_execucao_canonica em queries.js, mas respeitando a mesma semantica central.
5. Resumo_Filial e Resumo_Semana_Filial_Diario continuam sendo fontes importantes para consumidores legados e refletem SPR vs Meta e Aderencia Cap Vol Dia.
6. capacidade_volume_dia e um atributo critico de negocio; ausencia dessa coluna em dim_filial impacta comparacoes operacionais por filial.

---

## 12. Artefatos Governados

Este catalogo governa diretamente:

- Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md
- Dashboard/docs/data_contract_frontend.md
- Dashboard/bigquery/pipeline_v4.sql
- Dashboard/bigquery/pipeline_v5_publicacao.sql
- Dashboard/bigquery/pipeline_v6_api.sql
- Dashboard/api/server.js
- Dashboard/api/queries.js

Tambem deve ser considerado referencia para revisoes em:

- dim_filial
- dim_metas_canonica
- metas_pivot_canonico
- mart_diario_canonico
- mart_filial_dia_canonico
- mart_transportador_dia_canonico
