# Auditoria Atual de Measures

- Gerado em: `2026-03-06 00:00:16`
- Fonte canonica: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\Painel Monitoramento - Petlove.SemanticModel\definition\tables\_Medidas.tmdl`

## Resumo Executivo

| Indicador | Valor |
|---|---|
| Measures totais | 456 |
| Display folders unicos | 24 |
| Aliases simples | 72 |
| Grupos com formula identica | 2 |
| Overlap TabSem x TblDia | 25 |

## Camadas Logicas

| Camada | Qtd |
|---|---|
| Base e Analitica | 180 |
| Semantica KPI | 70 |
| Operacional | 100 |
| Investigacao | 23 |
| Compatibilidade | 30 |
| Apresentacao | 45 |
| Backoffice | 8 |

## Familias por Prefixo

| Prefixo | Qtd |
|---|---|
| KPI | 70 |
| HTML | 45 |
| Op | 31 |
| TblExp | 23 |
| TblDia | 25 |
| TabSem | 45 |
| TabMes | 6 |

## Pastas Raiz Mais Pesadas

| Pasta raiz | Qtd |
|---|---|
| 08. Base | 180 |
| 10. Operacional | 100 |
| 09. KPI Semantico | 70 |
| 90. Legado | 50 |
| 91. Legado | 25 |
| 11. Investigacao | 23 |
| 99. Backoffice | 8 |

## Display Folders Mais Pesadas

| DisplayFolder | Qtd |
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

## Tipagem das Tabelas Principais

| Tabela | Colunas | String | Numerica | DateTime |
|---|---|---|---|---|
| fato_rotas | 48 | 13 | 27 | 8 |
| fato_planejado | 10 | 2 | 7 | 1 |
| dim_filial | 12 | 6 | 6 | 0 |
| dim_tipo_veiculo | 13 | 13 | 0 | 0 |

## Redundancias Objetivas

- `TabSem`: `45` medidas
- `TblDia`: `25` medidas
- Intersecao nominal: `25`
- Exemplo de overlap: `% Execucao Pedidos, % Execucao Rotas, % Execucao Volumes, % Match D+/-1, % Match Fora Janela, % Match Mesmo Dia, Alertas Criticos, Alertas Total, Match D+/-1, Match Fora Janela, Match Mesmo Dia, Pedidos Planejados, Rotas Nao Planejadas, Rotas Overtime, Rotas Planejadas, Rotas Planejadas Executadas, Rotas Sem Tempo, SPR Delta Ped Unidade, SPR Ped Planejado Unidade, SPR Ped Realizado Unidade`
- Aliases simples: `72`
- Exemplos de alias simples: `Desvio SPR Pedidos (pts), Desvio SPR Volumes (pts), Meta Global ORH, Meta Filial SPR, KPI SPR Ped Valor, KPI SPR Vol Valor, KPI SPR Vol Meta, KPI Entregas Valor, KPI ORH Valor, KPI ORH Meta, KPI Desvio SPR Valor, KPI Desvio SPR Meta, Op Status SPR, Op Status Entregas, Op Status ORH, Card SPR Pedidos Real, TabSem Rotas Planejadas, TabSem Rotas Planejadas Executadas, TabSem % Execucao Rotas, TabSem Pedidos Planejados`

## Formulas Iguais em Measures Diferentes

- `KPI Desvio SPR Origem Meta, KPI ORH Origem Meta, KPI SPR Vol Origem Meta`
- `Desvio SPR Pedidos (pts), KPI Desvio SPR Valor`

## Diagnostico

1. O catalogo agora esta reorganizado por camadas canonicas dentro da mesma tabela `_Medidas`.
2. `08. Base`, `09. KPI Semantico`, `10. Operacional` e `11. Investigacao` passaram a separar melhor negocio, contrato de KPI e consumo operacional.
3. `90. Legado` e `91. Legado` isolam apresentacao antiga e tabelas diarias legadas para evitar expansao acidental.
4. A duplicidade `TabSem` x `TblDia` continua estrutural e precisa ser consolidada antes de qualquer nova expansao.
5. O inventario abaixo agora reflete o estado real do TMDL apos a reorganizacao de display folders.

## Regras de Congelamento Recomendadas

1. Nao criar novas measures fora de uma arquitetura canonica revisada.
2. Congelar `90. Legado` e `91. Legado` como zonas de compatibilidade, sem novos usos.
3. Consolidar `TabSem`, `TabMes` e `TblDia` antes de abrir novas familias de KPI.
4. Reduzir aliases simples sempre que a medida nao acrescentar semantica real.
5. Manter como canonico: `08. Base` -> `09. KPI Semantico` -> `10. Operacional` -> `11. Investigacao`.

