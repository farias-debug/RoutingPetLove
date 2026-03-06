# Organizacao Completa das Measures

Fonte: `_Medidas.tmdl` do PBIP canonico, via inventario atual.

## Resumo

| Indicador | Qtd |
|---|---|
| Measures mapeadas | 456 |
| manter_base_canonica | 180 |
| manter_semantica_kpi | 70 |
| manter_operacional | 55 |
| congelar_legado | 45 |
| manter_curto_prazo_consolidar_alias | 45 |
| legado_substituir_gradualmente | 30 |
| manter_investigacao | 23 |
| manter_oculto | 8 |

## Dominios

| Dominio | Qtd |
|---|---|
| Frota e Capacidade | 52 |
| Apresentacao | 45 |
| Operacional Semanal | 45 |
| Temporal | 38 |
| Torre de Controle | 31 |
| Operacional Diario | 25 |
| Investigacao | 23 |
| Alertas e Rankings | 18 |
| Entrega | 17 |
| Produtividade | 16 |
| Execucao e Volume | 15 |
| SPR e Densidade | 15 |
| ORH e Jornada | 14 |
| SPR Pedidos | 14 |
| SPR Volumes | 14 |
| ORH | 14 |
| Desvio SPR | 14 |
| Plano vs Real | 11 |
| Reconciliacao | 8 |
| Metas | 8 |
| Backoffice | 8 |
| Operacional Mensal | 6 |
| Legado KPI | 5 |

## Estrutura Canonica Recomendada

| Pasta canonica | Qtd |
|---|---|
| 08. Base\08. Frota e Capacidade | 52 |
| 90. Legado\01. HTML | 45 |
| 10. Operacional\03. Semanal Alias | 45 |
| 08. Base\06. Temporal | 38 |
| 10. Operacional\02. Torre de Controle | 31 |
| 91. Legado\01. Diario Alias | 25 |
| 11. Investigacao\01. Linha Operacional | 23 |
| 10. Operacional\01. Alertas e Rankings | 18 |
| 08. Base\05. Produtividade | 16 |
| 08. Base\01. Execucao e Volume | 15 |
| 08. Base\02. SPR e Densidade | 15 |
| 08. Base\03. ORH e Jornada | 14 |
| 09. KPI Semantico\01. SPR Pedidos | 14 |
| 09. KPI Semantico\02. SPR Volumes | 14 |
| 09. KPI Semantico\03. Entrega | 14 |
| 09. KPI Semantico\04. ORH | 14 |
| 09. KPI Semantico\05. Desvio SPR | 14 |
| 08. Base\04. Plano vs Real | 11 |
| 08. Base\10. Reconciliacao | 8 |
| 08. Base\07. Metas | 8 |
| 99. Backoffice\01. Nao Publicavel | 8 |
| 10. Operacional\04. Mensal Alias | 6 |
| 90. Legado\02. Alias de Compatibilidade | 5 |
| 08. Base\09. Entrega | 3 |

## Grupos Criticos

1. `90. Legado\01. HTML`: congelar como legado de apresentacao.
2. `90. Legado\02. Alias de Compatibilidade` e `91. Legado\01. Diario Alias`: manter so por compatibilidade.
3. `10. Operacional\03. Semanal Alias`: manter curto prazo, mas consolidar aliases no futuro.
4. `09. KPI Semantico`: manter como camada semantica oficial.
5. `08. Base\08. Frota e Capacidade` e `10. Operacional\02. Torre de Controle`: sao os blocos mais importantes para o foco do painel.

## Acoes por Categoria

### manter_base_canonica

- Quantidade: `180`
- Exemplo: `Total Rotas, Total Entregas, Total Insucessos, % Entregas Efetivas, % Insucessos, Total KM Realizado, Media KM por Rota, Total Pedidos, Total Volumes, Media Pedidos por Rota, Veiculos Ativos, % Rotas Concluidas, Tempo Medio Planejado (h), Tempo Medio Realizado (h), Utilizacao Jornada 8h (%)`

### manter_semantica_kpi

- Quantidade: `70`
- Exemplo: `KPI SPR Ped Valor, KPI SPR Ped Meta, KPI SPR Ped Delta, KPI SPR Ped Delta%, KPI SPR Ped Status, KPI SPR Ped Cor, KPI SPR Ped Icone, KPI SPR Ped Texto Card, KPI SPR Vol Valor, KPI SPR Vol Meta, KPI SPR Vol Delta, KPI SPR Vol Delta%, KPI SPR Vol Status, KPI SPR Vol Cor, KPI SPR Vol Icone`

### manter_operacional

- Quantidade: `55`
- Exemplo: `Pior Filial SPR Semana, Valor Pior Filial SPR Semana, Gap% Pior Filial SPR vs Meta, Pior Filial Entregas Semana, Valor Pior Filial Entregas Semana, Gap% Pior Filial Entregas vs Meta, Pior Filial ORH Semana, Qtd Filiais Abaixo Meta SPR, Qtd Filiais Criticas SPR, Qtd Filiais Abaixo Meta Entrega, Alerta Operacional, Alerta Nivel, Alerta Cor, Top 3 Piores Filiais SPR, Top 3 Piores Filiais Entregas`

### manter_investigacao

- Quantidade: `23`
- Exemplo: `TblExp Se Planejado, TblExp Tipo Unidade, TblExp Match Temporais, TblExp Delta Pedidos Plan x Real, TblExp Delta Volumes Plan x Real, TblExp Delta KM Plan x Real, TblExp Delta Tempo Plan x Real (h), TblExp % Entregas Efetivas Linha, TblExp % Insucessos Linha, TblExp SPR Ped Real Linha, TblExp SPR Ped Plan Linha, TblExp SPR Delta Ped Linha, TblExp SPR Vol Real Linha, TblExp SPR Vol Plan Linha, TblExp SPR Delta Vol Linha`

### manter_oculto

- Quantidade: `8`
- Exemplo: `SLA Ciclo P50 (h), SLA Ciclo P90 (h), % Rotas Sem Data Final, Tempo Medio Ciclo (h), Custo por Rota (R$), Custo por Pedido (R$), Custo por KM (R$/km), Custo por Entrega Efetiva (R$)`

### manter_curto_prazo_consolidar_alias

- Quantidade: `45`
- Exemplo: `TabSem Rotas Planejadas, TabSem Rotas Planejadas Executadas, TabSem % Execucao Rotas, TabSem Pedidos Planejados, TabSem Volumes Planejados, TabSem % Execucao Pedidos, TabSem % Execucao Volumes, TabSem Match Mesmo Dia, TabSem Match D+/-1, TabSem Match Fora Janela, TabSem % Match Mesmo Dia, TabSem % Match D+/-1, TabSem % Match Fora Janela, TabSem Rotas Nao Planejadas, TabSem Rotas Sem Tempo`

### legado_substituir_gradualmente

- Quantidade: `30`
- Exemplo: `Desvio SPR Pedidos (pts), Desvio SPR Volumes (pts), Meta Global ORH, Meta Filial SPR, Card SPR Pedidos Real, TblDia Rotas Planejadas, TblDia Rotas Planejadas Executadas, TblDia % Execucao Rotas, TblDia Pedidos Planejados, TblDia Volumes Planejados, TblDia % Execucao Pedidos, TblDia % Execucao Volumes, TblDia Match Mesmo Dia, TblDia Match D+/-1, TblDia Match Fora Janela`

### congelar_legado

- Quantidade: `45`
- Exemplo: `HTML Card SPR Ped, HTML Card SPR Vol, HTML Card Entregas, HTML Card ORH, HTML Card Alerta, HTML Ranking SPR Semana, HTML Ranking Entregas Semana, HTML Card ORH Cenarios, HTML Card Total Rotas, HTML Card Total Pedidos, HTML Card Total Volumes, HTML Card KM Total, HTML Card Veiculos, HTML Card Peso Total, HTML Card Variacao Diaria`

