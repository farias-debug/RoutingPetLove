# Manifesto de Construcao do Relatorio

Grid de referencia: `1280x720`, 12 colunas, espacamentos `8/16/24`.

## 01 Torre de Controle

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros Operacionais | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| hero_rotas | Hero | 1-2 | 88 | 110 | card | Rotas | Total Rotas | Var D-1 Rotas; Var WoW Rotas |
| hero_pedidos | Hero | 3-4 | 88 | 110 | card | Pedidos | Total Pedidos | Op Media Diaria Pedidos |
| hero_volumes | Hero | 5-6 | 88 | 110 | card | Volumes | Total Volumes | Op Media Diaria Volumes |
| hero_veiculos | Hero | 7-8 | 88 | 110 | card | Veiculos | Veiculos Ativos | Op Rotas Carregadas; Op Rotas Finalizadas |
| hero_alerta | Hero | 9-12 | 88 | 110 | card-alert | Alerta Prioritario | Op Alerta Prioritario | Alerta Operacional; Alerta Nivel; Alerta Cor |
| progress_rotas | Progresso | 1-4 | 222 | 120 | bullet | Progresso Rotas | Op Progresso Rotas (%) | Op Rotas Planejadas; Op Rotas Realizadas |
| progress_pedidos | Progresso | 5-8 | 222 | 120 | bullet | Progresso Pedidos | Op Progresso Pedidos (%) | Op Pedidos Planejados; Op Pedidos Realizados |
| ranking_filiais | Ranking | 9-12 | 222 | 220 | matrix | Filiais Prioritarias | Op Rank Score Filial | Pior Filial SPR Semana; Pior Filial ORH Semana; Pior Filial Entregas Semana |
| weekly_matrix | Tabela | 1-8 | 366 | 300 | matrix | Tabela Semanal por Filial | Total Rotas | Total Pedidos; Total Volumes; SPR Ped Realizado; Pedidos/h Realizado; Op Rank Score Filial |

## 02 Scoreboard SPR e Performance

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros Operacionais | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| hero_spr_ped | Hero | 1-3 | 88 | 116 | kpi-card | SPR Pedidos | KPI SPR Ped Valor | KPI SPR Ped Meta; KPI SPR Ped Delta%; KPI SPR Ped Status Texto |
| hero_spr_vol | Hero | 4-6 | 88 | 116 | kpi-card | SPR Volumes | KPI SPR Vol Valor | KPI SPR Vol Meta; KPI SPR Vol Delta%; KPI SPR Vol Status Texto |
| hero_desvio_spr | Hero | 7-9 | 88 | 116 | kpi-card | Desvio SPR | KPI Desvio SPR Valor | KPI Desvio SPR Meta; KPI Desvio SPR Delta; KPI Desvio SPR Status Texto |
| hero_orh | Hero | 10-12 | 88 | 116 | kpi-card | ORH | KPI ORH Valor | KPI ORH Meta; KPI ORH Delta; KPI ORH Status Texto |
| bar_produtividade | Diagnostico | 1-6 | 228 | 190 | clustered-bar | Produtividade por Filial | Pedidos/h Realizado | Volumes/h Realizado; Peso/h Realizado (kg/h) |
| bar_eficiencia_km | Diagnostico | 7-12 | 228 | 190 | clustered-bar | Eficiencia KM | Pedidos/KM Realizado | Volumes/KM Realizado; Eficiencia KM (%) |
| scoreboard_matrix | Tabela | 1-12 | 442 | 224 | matrix | Scoreboard por Filial | SPR Ped Realizado | SPR Vol Realizado; Pedidos/h Realizado; Volumes/h Realizado; KPI SPR Ped Status Texto; KPI ORH Status Texto |

## 03 Eficiencia SPR e ORH

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros Operacionais | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| hero_gap_spr | Hero | 1-3 | 88 | 116 | card | Gap SPR | Gap SPR vs Meta (pts) | Desvio SPR Ped Plan vs Real (pts) |
| hero_tempo_real | Hero | 4-6 | 88 | 116 | card | Tempo Medio | Tempo Medio Realizado (h) | Meta ORH Tempo (h); Gap ORH vs Meta (h) |
| hero_utilizacao | Hero | 7-9 | 88 | 116 | card | Utilizacao Jornada | Utilizacao Jornada 8h (%) | Ociosidade Jornada 8h (%) |
| hero_orh_status | Hero | 10-12 | 88 | 116 | kpi-card | Status ORH | KPI ORH Valor | KPI ORH Status Texto; KPI ORH Acao |
| driver_spr | Diagnostico | 1-6 | 228 | 190 | variance-bar | Drivers de SPR | SPR Ped Realizado | SPR Ped Planejado; Desvio SPR Ped Plan vs Real (pts) |
| driver_orh | Diagnostico | 7-12 | 228 | 190 | column | Jornada e Overtime | % Rotas Overtime (>8h) | % Rotas Curtas (<4h); Potencial Consolidacao (rotas) |
| efficiency_matrix | Tabela | 1-12 | 442 | 224 | matrix | Matriz de Eficiencia por Filial | SPR Ped Realizado | Tempo Medio Realizado (h); Utilizacao Jornada 8h (%); Pedidos/h Realizado; Desvio Pedidos/KM |

## 04 Capacidade e Mix

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros Operacionais | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| hero_ocupacao_composta | Hero | 1-3 | 88 | 116 | card | Ocupacao Composta | Ocupacao Composta (%) | Status Capacidade Texto; Acao Capacidade |
| hero_ocupacao_filial | Hero | 4-6 | 88 | 116 | card | Ocupacao Filial | Ocupacao Filial Composta (%) | Status Capacidade Filial Texto; Acao Capacidade Filial |
| hero_gap_semana | Hero | 7-9 | 88 | 116 | card | Gap Volumes Semana | Gap Capacidade Volumes Semana | Gap Capacidade Pedidos Semana; Gap Capacidade Veiculos Semana |
| hero_tipo_critico | Hero | 10-12 | 88 | 116 | card-alert | Tipo Critico | Tipo Veiculo Critico Ocupacao | Status Capacidade Cor |
| bar_tipo_ocupacao | Diagnostico | 1-6 | 228 | 190 | clustered-bar | Ocupacao por Tipo | Ocupacao Volumes Tipo (%) | Ocupacao Pedidos Tipo (%) |
| bar_filial_ocupacao | Diagnostico | 7-12 | 228 | 190 | clustered-bar | Ocupacao por Filial | Ocupacao Filial Composta (%) | Ocupacao Filial Volumes (%); Ocupacao Filial Pedidos (%) |
| capacity_matrix | Tabela | 1-12 | 442 | 224 | matrix | Capacidade Semanal por Filial | Ocupacao Filial Composta (%) | Gap Capacidade Volumes Semana; Gap Capacidade Pedidos Semana; Status Capacidade Filial Texto; Acao Capacidade Filial |

## 05 Plano vs Real

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros Operacionais | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| hero_aderencia_ped | Hero | 1-3 | 88 | 116 | card | Aderencia Pedidos | Aderencia Pedidos (%) | Desvio Absoluto Pedidos |
| hero_aderencia_vol | Hero | 4-6 | 88 | 116 | card | Aderencia Volumes | Aderencia Volumes (%) | Desvio Absoluto Volumes |
| hero_aderencia_km | Hero | 7-9 | 88 | 116 | card | Aderencia KM | Aderencia KM (%) | Desvio Absoluto KM |
| hero_match | Hero | 10-12 | 88 | 116 | card | Match Mesmo Dia | % Match Mesmo Dia | % Match D+/-1; % Match Fora Janela |
| variance_aderencia | Diagnostico | 1-6 | 228 | 190 | variance-bar | Gaps por Eixo | Desvio Absoluto Pedidos | Desvio Absoluto Volumes; Desvio Absoluto KM; Desvio Absoluto Tempo |
| reconciliacao_status | Diagnostico | 7-12 | 228 | 190 | clustered-bar | Cobertura e Match | Cobertura Rotas (%) | % Match Mesmo Dia; % Sem Planejado |
| planreal_matrix | Tabela | 1-12 | 442 | 224 | matrix | Plano vs Real por Filial | Aderencia Pedidos (%) | Aderencia Volumes (%); Aderencia KM (%); Cobertura Rotas (%); % Match Mesmo Dia |

## 90 Investigacao

| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |
|---|---|---|---|---|---|---|---|---|
| filters_bar | Filtros | 1-12 | 0 | 64 | slicer-row | Filtros de Drill | dim_calendario[Data] | dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo] |
| investigation_table | Tabela | 1-12 | 88 | 578 | matrix | Linhas Operacionais | TblExp Delta Pedidos Plan x Real | TblExp Delta Volumes Plan x Real; TblExp Delta KM Plan x Real; TblExp SPR Delta Ped Linha; TblExp SPR Delta Vol Linha |

