# Schema Completo do Modelo Power BI (Atual)

- Gerado em: `2026-03-05T20:17:24`
- SemanticModel: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\Painel Monitoramento - Petlove.SemanticModel\definition`
- Report: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\Painel Monitoramento - Petlove.Report\definition`

## Resumo

| Metrica | Valor |
|---|---|
| tables_total | 9 |
| columns_total | 147 |
| measures_total | 368 |
| relationships_total | 6 |
| measure_folders_total | 25 |

## Tabelas e Colunas

### `_Medidas`

- Colunas: `1`
- Measures: `368`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| _ | unknown |  | [_] |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| _Medidas | calculated |  |  |

### `_Metas`

- Colunas: `4`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| KPI | unknown |  | [KPI] |
| Meta | unknown |  | [Meta] |
| Sentido | unknown |  | [Sentido] |
| Unidade | unknown |  | [Unidade] |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| _Metas | calculated |  |  |

### `DateTableTemplate_e2c61278-6fe2-4dfc-89bd-fcaeaa0e72a9`

- Colunas: `7`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| Date | dateTime | none | [Date] |
| Ano = YEAR([Date]) | int64 | none |  |
| MonthNo = MONTH([Date]) | int64 | none |  |
| Mês = FORMAT([Date], "MMMM") | string | none |  |
| QuarterNo = INT(([MonthNo] + 2) / 3) | int64 | none |  |
| Trimestre = "Qtr " & [QuarterNo] | string | none |  |
| Dia = DAY([Date]) | int64 | none |  |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| DateTableTemplate_e2c61278-6fe2-4dfc-89bd-fcaeaa0e72a9 | calculated |  |  |

### `dim_calendario`

- Colunas: `50`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| Data | unknown |  | [Data] |
| Ano | unknown |  | [Ano] |
| Trimestre | unknown |  | [Trimestre] |
| Mes | unknown |  | [Mes] |
| MesNome | unknown |  | [MesNome] |
| MesAno | unknown |  | [MesAno] |
| Semana | unknown |  | [Semana] |
| DiaSemanaNum | unknown |  | [DiaSemanaNum] |
| DiaSemana | unknown |  | [DiaSemana] |
| DiaDoAno | unknown |  | [DiaDoAno] |
| FimDeSemana | unknown |  | [FimDeSemana] |
| AnoSemana | unknown |  | [AnoSemana] |
| AnoMes | unknown |  | [AnoMes] |
| Semestre | unknown |  | [Semestre] |
| MesAbrev | unknown |  | [MesAbrev] |
| DiaUtil | unknown |  | [DiaUtil] |
| SemanaInicio | unknown |  | [SemanaInicio] |
| SemanaFim | unknown |  | [SemanaFim] |
| SemanaLabel | unknown |  | [SemanaLabel] |
| SemanaDoMes | unknown |  | [SemanaDoMes] |
| QuinzenaDoMes | unknown |  | [QuinzenaDoMes] |
| AnoSemanaLabel | unknown |  | [AnoSemanaLabel] |
| MesDia | unknown |  | [MesDia] |
| IsUltimaData | unknown |  | [IsUltimaData] |
| IsAnterior | unknown |  | [IsAnterior] |
| IsAteUltimaData | unknown |  | [IsAteUltimaData] |
| IsFuturo | unknown |  | [IsFuturo] |
| DiasAteUltimaData | unknown |  | [DiasAteUltimaData] |
| IsSemanaAtual | unknown |  | [IsSemanaAtual] |
| IsSemanaAnterior | unknown |  | [IsSemanaAnterior] |
| IsMesAtual | unknown |  | [IsMesAtual] |
| IsMesAnterior | unknown |  | [IsMesAnterior] |
| IsTrimestreAtual | unknown |  | [IsTrimestreAtual] |
| IsUltimos7Dias | unknown |  | [IsUltimos7Dias] |
| IsUltimos14Dias | unknown |  | [IsUltimos14Dias] |
| IsUltimos30Dias | unknown |  | [IsUltimos30Dias] |
| IsUltimos90Dias | unknown |  | [IsUltimos90Dias] |
| PeriodoLabel | unknown |  | [PeriodoLabel] |
| TrimestreLabel | unknown |  | [TrimestreLabel] |
| SemestreLabel | unknown |  | [SemestreLabel] |
| ISOSemana | unknown |  | [ISOSemana] |
| ISOAno | unknown |  | [ISOAno] |
| ISOAnoSemana | unknown |  | [ISOAnoSemana] |
| ISODiaSemana | unknown |  | [ISODiaSemana] |
| ISOAnoSemanaSort | unknown |  | [ISOAnoSemanaSort] |
| MesNomeAbrev3 | unknown |  | [MesNomeAbrev3] |
| MesLabel | unknown |  | [MesLabel] |
| DataLabel | unknown |  | [DataLabel] |
| DiaLabel | unknown |  | [DiaLabel] |
| SemanaCurtaLabel | unknown |  | [SemanaCurtaLabel] |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| dim_calendario | calculated |  |  |

### `dim_filial`

- Colunas: `7`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| Filial | string | none | Filial |
| Codigo | string | none | Codigo |
| NomeResumido | string | none | NomeResumido |
| Tipo | string | none | Tipo |
| MetaSPR | double | sum | MetaSPR |
| Regiao | string |  | Regiao |
| MetaEntrega | double |  | MetaEntrega |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| dim_filial | m | C:\Users\lucas.batista\Documents\Projetos\Dashboard\data\tab_auxiliar\dim_filial.xlsx | pt-BR |

### `dim_tipo_veiculo`

- Colunas: `13`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| TipoVeiculo | string | none | TipoVeiculo |
| Categoria | string | none | Categoria |
| Ordem | int64 | none | Ordem |
| JanelaReferenciaDias | int64 | none | JanelaReferenciaDias |
| DataInicioReferencia | dateTime | none | DataInicioReferencia |
| DataFimReferencia | dateTime | none | DataFimReferencia |
| RotasAmostra | int64 | none | RotasAmostra |
| CapP75PedidosRef | double | none | CapP75PedidosRef |
| CapP75VolumesRef | double | none | CapP75VolumesRef |
| CapP75PesoKgRef | double | none | CapP75PesoKgRef |
| CapMediaPedidosRef | double | none | CapMediaPedidosRef |
| CapMediaVolumesRef | double | none | CapMediaVolumesRef |
| CapMediaPesoKgRef | double | none | CapMediaPesoKgRef |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| dim_tipo_veiculo | m | C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\dim_tipo_veiculo.csv | pt-BR |

### `fato_planejado`

- Colunas: `10`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| IdCarga | int64 |  | IdCarga |
| Data Planejada | dateTime | none | Data Planejada |
| Filial | string |  | Filial |
| Rota Planejada | string |  | Rota Planejada |
| Pedidos Planejados | double |  | Pedidos Planejados |
| Volumes Planejados | double |  | Volumes Planejados |
| KM Planejado Plan | double |  | KM Planejado Plan |
| Tempo Planejado Plan (h) | double |  | Tempo Planejado Plan (h) |
| Peso Planejado (kg) | double |  | Peso Planejado (kg) |
| Executado | int64 |  | Executado |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| fato_planejado | m | C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\fato_planejado.csv |  |

### `fato_rotas`

- Colunas: `48`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| Filial | string | none | Filial |
| Rota | string | none | Rota |
| Tipo de Veiculo Padrao | string | none | Tipo de Veiculo Padrao |
| Tipo Frota | string | none | Tipo Frota |
| Motorista | string | none | Motorista |
| Transportador | string | none | Transportador |
| Placa | string | none | Placa |
| Data Referencia | dateTime | none | Data Referencia |
| Pedidos da Rota | int64 | sum | Pedidos da Rota |
| Volumes da Rota | int64 | sum | Volumes da Rota |
| Peso (kg) | double | sum | Peso (kg) |
| Paradas | int64 | sum | Paradas |
| Clientes | int64 | sum | Clientes |
| Entregues | int64 | sum | Entregues |
| Insucessos | int64 | sum | Insucessos |
| Baixas | int64 | sum | Baixas |
| KM Planejado | double | sum | KM Planejado |
| KM Realizado | double | sum | KM Realizado |
| Tempo Planejado (h) | double | sum | Tempo Planejado (h) |
| Tempo Realizado (h) | double | sum | Tempo Realizado (h) |
| Valor Pagamento Carga | double | sum | Valor Pagamento Carga |
| Valor Pagamento Rota | double | sum | Valor Pagamento Rota |
| Valor Pagamento Remessas | double | sum | Valor Pagamento Remessas |
| Valor Pagamento Km | double | sum | Valor Pagamento Km |
| IdCarga | string | none | IdCarga |
| Status | string | none | Status |
| CPF | string | none | CPF |
| Pedidos Planejados | int64 | sum | Pedidos Planejados |
| Volumes Planejados | int64 | sum | Volumes Planejados |
| KM Planejado Plan | double | sum | KM Planejado Plan |
| Tempo Planejado Plan (h) | double | sum | Tempo Planejado Plan (h) |
| Peso Planejado (kg) | double | sum | Peso Planejado (kg) |
| Possui Planejado | int64 | sum | Possui Planejado |
| Rota Concluida | int64 | sum | Rota Concluida |
| Data Planejada | dateTime | none | Data Planejada |
| Rota Planejada | string | none | Rota Planejada |
| Ajudante | int64 | sum | Ajudante |
| Performance (%) | double | sum | Performance (%) |
| Usuario Carregamento | string | none | Usuario Carregamento |
| Data de Abertura | dateTime | none | Data de Abertura |
| Data de Carregamento | dateTime | none | Data de Carregamento |
| Data Atribuicao Motorista | dateTime | none | Data Atribuicao Motorista |
| Data Inicio Rota | dateTime | none | Data Inicio Rota |
| Primeira Baixa | dateTime | none | Primeira Baixa |
| Ultima Baixa | dateTime | none | Ultima Baixa |
| Tempo Ciclo Entrega (h) | double | sum | Tempo Ciclo Entrega (h) |
| Gap Dias Plan vs Real | int64 | sum | Gap Dias Plan vs Real |
| Match Temporal | string | none | Match Temporal |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| fato_rotas | m | C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\fato_rotas.csv |  |

### `LocalDateTable_f94047f8-ee04-40ca-ab82-55389abadc0c`

- Colunas: `7`
- Measures: `0`
- Partitions: `1`

| Coluna | DataType | SummarizeBy | SourceColumn |
|---|---|---|---|
| Date | dateTime | none | [Date] |
| Ano = YEAR([Date]) | int64 | none |  |
| MonthNo = MONTH([Date]) | int64 | none |  |
| Mês = FORMAT([Date], "MMMM") | string | none |  |
| QuarterNo = INT(([MonthNo] + 2) / 3) | int64 | none |  |
| Trimestre = "Qtr " & [QuarterNo] | string | none |  |
| Dia = DAY([Date]) | int64 | none |  |

| Partition | Kind | Files | Locales |
|---|---|---|---|
| LocalDateTable_f94047f8-ee04-40ca-ab82-55389abadc0c | calculated |  |  |

## Relacionamentos

| Nome | From | To |
|---|---|---|
| AutoDetected_a5cb3fa3-a25e-4aaf-81bd-c9e9d66c1311 | fato_rotas.Filial | dim_filial.Filial |
| fato_rotas_dim_calendario | fato_rotas.'Data Referencia | dim_calendario.Data |
| fato_rotas_dim_tipo_veiculo | fato_rotas.'Tipo de Veiculo Padrao | dim_tipo_veiculo.TipoVeiculo |
| fato_planejado_Data Planejada_dim_calendario_Data | fato_planejado.'Data Planejada | dim_calendario.Data |
| fato_planejado_Filial_dim_filial_Filial | fato_planejado.Filial | dim_filial.Filial |
| 3ee41c61-f0b2-43ea-9325-8b588406a822 | fato_rotas.'Data Planejada | LocalDateTable_f94047f8-ee04-40ca-ab82-55389abadc0c.Date |

## Measures por Pasta

| DisplayFolder | Qtd Measures |
|---|---|
| 01. Resumo Executivo | 13 |
| 02. SPR - Densidade | 15 |
| 03. ORH - Unidade e Cenarios | 14 |
| 04. Desvios Plan x Real | 13 |
| 05. Produtividade/h | 10 |
| 06. Eficiencia KM | 6 |
| 07. Frota e Capacidade | 26 |
| 08. Eficacia de Entrega | 3 |
| 09. Variacoes Temporais | 31 |
| 10. Reconciliacao | 8 |
| 11. Metas e Parametros | 10 |
| 12. KPI Cards | 41 |
| 13. Rankings e Alertas KPI | 18 |
| 14. HTML Content\01. Cards KPI | 33 |
| 14. HTML Content\02. Tabelas e Rankings | 8 |
| 14. HTML Content\03. Graficos Semanais e Mensais | 2 |
| 14. HTML Content\04. Filial e Drilldown | 2 |
| 15. Torre de Controle Operacional\01. Fluxo e Volume | 19 |
| 15. Torre de Controle Operacional\02. Alertas | 1 |
| 15. Torre de Controle Operacional\03. Status e Tendencias | 8 |
| 19. Tabeloes Exportacao DAX\01. Linha Operacional | 23 |
| 19. Tabeloes Exportacao DAX\02. KPI Semanal | 25 |
| 19. Tabeloes Exportacao DAX\03. KPI Mensal | 6 |
| 19. Tabeloes Exportacao DAX\99. Legado TblDia | 25 |
| _Nao Publicavel | 8 |

## Catalogo Completo de Measures

| Tabela | Measure | DisplayFolder | FormatString |
|---|---|---|---|
| _Medidas | % Entregas Efetivas | 01. Resumo Executivo | 0.0% |
| _Medidas | % Insucessos | 01. Resumo Executivo | 0.0% |
| _Medidas | % Rotas Concluidas | 01. Resumo Executivo | 0.0% |
| _Medidas | Media KM por Rota | 01. Resumo Executivo | 0.0 |
| _Medidas | Media Pedidos por Rota | 01. Resumo Executivo | 0.0 |
| _Medidas | Peso (kg) | 01. Resumo Executivo | #,##0.0 |
| _Medidas | Total Entregas | 01. Resumo Executivo | #,##0 |
| _Medidas | Total Insucessos | 01. Resumo Executivo | #,##0 |
| _Medidas | Total KM Realizado | 01. Resumo Executivo | #,##0 |
| _Medidas | Total Pedidos | 01. Resumo Executivo | #,##0 |
| _Medidas | Total Rotas | 01. Resumo Executivo | #,##0 |
| _Medidas | Total Volumes | 01. Resumo Executivo | #,##0 |
| _Medidas | Veiculos Ativos | 01. Resumo Executivo | #,##0 |
| _Medidas | Desvio SPR Ped Plan vs Real (pts) | 02. SPR - Densidade | +0.0;-0.0;0 |
| _Medidas | Desvio SPR Vol Plan vs Real (pts) | 02. SPR - Densidade | +0.0;-0.0;0 |
| _Medidas | Gap SPR vs Meta (pts) | 02. SPR - Densidade | +0.0;-0.0;0 |
| _Medidas | Meta SPR Pedidos | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR KM Planejado (km/rota) | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR KM Realizado (km/rota) | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Ped Planejado | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Ped Realizado | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Peso Planejado (kg/rota) | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Peso Realizado (kg/rota) | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Vol Planejado | 02. SPR - Densidade | 0.0 |
| _Medidas | SPR Vol Realizado | 02. SPR - Densidade | 0.0 |
| _Medidas | Total Pedidos Unidade | 02. SPR - Densidade | #,##0 |
| _Medidas | Total Rotas Unidade | 02. SPR - Densidade | #,##0 |
| _Medidas | Total Volumes Unidade | 02. SPR - Densidade | #,##0 |
| _Medidas | % Rotas Curtas (<4h) | 03. ORH - Unidade e Cenarios | 0.0% |
| _Medidas | % Rotas Overtime (>8h) | 03. ORH - Unidade e Cenarios | 0.0% |
| _Medidas | Economia Potencial (h) | 03. ORH - Unidade e Cenarios | 0.0 |
| _Medidas | Gap ORH vs Meta (h) | 03. ORH - Unidade e Cenarios | +0.0;-0.0;0 |
| _Medidas | Horas Ociosas Totais | 03. ORH - Unidade e Cenarios | #,##0.0 |
| _Medidas | Meta ORH Tempo (h) | 03. ORH - Unidade e Cenarios | 0.0 |
| _Medidas | Ociosidade Jornada 8h (%) | 03. ORH - Unidade e Cenarios | 0.0% |
| _Medidas | Potencial Consolidacao (rotas) | 03. ORH - Unidade e Cenarios | #,##0 |
| _Medidas | Status ORH | 03. ORH - Unidade e Cenarios |  |
| _Medidas | Tempo Medio Planejado (h) | 03. ORH - Unidade e Cenarios | 0.0 |
| _Medidas | Tempo Medio Realizado (h) | 03. ORH - Unidade e Cenarios | 0.0 |
| _Medidas | Total Rotas ORH Base | 03. ORH - Unidade e Cenarios | #,##0 |
| _Medidas | Total Rotas ORH Planejado Base | 03. ORH - Unidade e Cenarios | #,##0 |
| _Medidas | Utilizacao Jornada 8h (%) | 03. ORH - Unidade e Cenarios | 0.0% |
| _Medidas | Aderencia KM (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Aderencia Pedidos (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Aderencia Peso (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Aderencia Tempo (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Aderencia Volumes (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Cobertura Rotas (%) | 04. Desvios Plan x Real | 0.0% |
| _Medidas | Desvio Absoluto KM | 04. Desvios Plan x Real | +#,##0;-#,##0;0 |
| _Medidas | Desvio Absoluto Pedidos | 04. Desvios Plan x Real | +#,##0;-#,##0;0 |
| _Medidas | Desvio Absoluto Peso | 04. Desvios Plan x Real | +#,##0;-#,##0;0 |
| _Medidas | Desvio Absoluto Tempo | 04. Desvios Plan x Real | +0.0;-0.0;0 |
| _Medidas | Desvio Absoluto Volumes | 04. Desvios Plan x Real | +#,##0;-#,##0;0 |
| _Medidas | Desvio SPR Pedidos (pts) | 04. Desvios Plan x Real | +0.0;-0.0;0 |
| _Medidas | Desvio SPR Volumes (pts) | 04. Desvios Plan x Real | +0.0;-0.0;0 |
| _Medidas | Desvio Pedidos/h | 05. Produtividade/h | +0.0;-0.0;0 |
| _Medidas | Desvio Peso/h | 05. Produtividade/h | +0.0;-0.0;0 |
| _Medidas | Desvio Volumes/h | 05. Produtividade/h | +0.0;-0.0;0 |
| _Medidas | Entregas Efetivas/h | 05. Produtividade/h | 0.0 |
| _Medidas | Pedidos/h Planejado | 05. Produtividade/h | 0.0 |
| _Medidas | Pedidos/h Realizado | 05. Produtividade/h | 0.0 |
| _Medidas | Peso/h Planejado (kg/h) | 05. Produtividade/h | 0.0 |
| _Medidas | Peso/h Realizado (kg/h) | 05. Produtividade/h | 0.0 |
| _Medidas | Volumes/h Planejado | 05. Produtividade/h | 0.0 |
| _Medidas | Volumes/h Realizado | 05. Produtividade/h | 0.0 |
| _Medidas | Desvio Pedidos/KM | 06. Eficiencia KM | +0.00;-0.00;0 |
| _Medidas | Eficiencia KM (%) | 06. Eficiencia KM | 0.0% |
| _Medidas | Pedidos/KM Planejado | 06. Eficiencia KM | 0.00 |
| _Medidas | Pedidos/KM Realizado | 06. Eficiencia KM | 0.00 |
| _Medidas | Peso/KM Realizado (kg/km) | 06. Eficiencia KM | 0.00 |
| _Medidas | Volumes/KM Realizado | 06. Eficiencia KM | 0.00 |
| _Medidas | % Rotas Acima Cap | 07. Frota e Capacidade | 0.0% |
| _Medidas | % Rotas Acima Cap Volumes | 07. Frota e Capacidade | 0.0% |
| _Medidas | Cap Media Pedidos | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap Media Peso (kg) | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap Media Volumes | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap P75 KM | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap P75 Pedidos | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap P75 Peso (kg) | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap P75 Tempo (h) | 07. Frota e Capacidade | 0.0 |
| _Medidas | Cap P75 Volumes | 07. Frota e Capacidade | 0.0 |
| _Medidas | Excesso Medio Pedidos (acima P75) | 07. Frota e Capacidade | 0.0 |
| _Medidas | Excesso Medio Volumes (acima P75) | 07. Frota e Capacidade | 0.0 |
| _Medidas | Ocupacao Composta (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Pedidos (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Pedidos Semana Atual (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Pedidos Tipo (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Peso (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Peso Tipo (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Volumes (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Volumes Semana Atual (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Ocupacao Volumes Tipo (%) | 07. Frota e Capacidade | 0.0% |
| _Medidas | Rotas Acima Cap Pedidos | 07. Frota e Capacidade | #,##0 |
| _Medidas | Rotas Acima Cap Volumes | 07. Frota e Capacidade | #,##0 |
| _Medidas | Rotas por Veiculo Dia | 07. Frota e Capacidade | 0.00 |
| _Medidas | Status Capacidade | 07. Frota e Capacidade | 0 |
| _Medidas | Tipo Veiculo Critico Ocupacao | 07. Frota e Capacidade |  |
| _Medidas | % Baixas/Pedidos | 08. Eficacia de Entrega | 0.0% |
| _Medidas | Taxa Insucesso MA7 | 08. Eficacia de Entrega | 0.0% |
| _Medidas | Taxa Sucesso MA7 | 08. Eficacia de Entrega | 0.0% |
| _Medidas | % Entregas YTD | 09. Variacoes Temporais | 0.0% |
| _Medidas | Delta Semana Rotas | 09. Variacoes Temporais | +#,##0;-#,##0;0 |
| _Medidas | Delta Semana SPR Ped | 09. Variacoes Temporais | +0.0;-0.0;0 |
| _Medidas | MA7 % Entregas Efetivas | 09. Variacoes Temporais | 0.0% |
| _Medidas | MA7 ORH Tempo | 09. Variacoes Temporais | 0.0 |
| _Medidas | MA7 Pedidos | 09. Variacoes Temporais | 0.0 |
| _Medidas | MA7 Rotas | 09. Variacoes Temporais | 0.0 |
| _Medidas | MA7 SPR Pedidos | 09. Variacoes Temporais | 0.0 |
| _Medidas | Pedidos YTD | 09. Variacoes Temporais | #,##0 |
| _Medidas | Rotas Semana Anterior | 09. Variacoes Temporais | #,##0 |
| _Medidas | Rotas Semana Atual | 09. Variacoes Temporais | #,##0 |
| _Medidas | Rotas YTD | 09. Variacoes Temporais | #,##0 |
| _Medidas | SPR Ped Semana Anterior | 09. Variacoes Temporais | 0.0 |
| _Medidas | SPR Ped Semana Atual | 09. Variacoes Temporais | 0.0 |
| _Medidas | SPR Ped YTD | 09. Variacoes Temporais | 0.0 |
| _Medidas | Var D-1 % Entregas | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var D-1 ORH Tempo | 09. Variacoes Temporais | +0.0;-0.0;0 |
| _Medidas | Var D-1 Pedidos | 09. Variacoes Temporais | +#,##0;-#,##0;0 |
| _Medidas | Var D-1 Rotas | 09. Variacoes Temporais | +#,##0;-#,##0;0 |
| _Medidas | Var D-1 SPR Pedidos | 09. Variacoes Temporais | +0.0;-0.0;0 |
| _Medidas | Var MoM % Entregas (pp) | 09. Variacoes Temporais | +0.0 pp;-0.0 pp;0.0 pp |
| _Medidas | Var MoM ORH Tempo (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var MoM Pedidos (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var MoM Rotas (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var MoM SPR Pedidos (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var WoW % Entregas | 09. Variacoes Temporais | +0.0 pp;-0.0 pp;0.0 pp |
| _Medidas | Var WoW ORH Tempo (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var WoW Pedidos | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var WoW Rotas | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Var WoW SPR Pedidos (%) | 09. Variacoes Temporais | +0.0%;-0.0%;0.0% |
| _Medidas | Volumes YTD | 09. Variacoes Temporais | #,##0 |
| _Medidas | % Fora Janela D±1 | 10. Reconciliacao | 0.0% |
| _Medidas | % Match D±1 | 10. Reconciliacao | 0.0% |
| _Medidas | % Match Mesmo Dia | 10. Reconciliacao | 0.0% |
| _Medidas | % Rotas com Ajudante | 10. Reconciliacao | 0.0% |
| _Medidas | % Sem Planejado | 10. Reconciliacao | 0.0% |
| _Medidas | Gap Medio Plan vs Real (dias) | 10. Reconciliacao | 0.0 |
| _Medidas | KM Total Planejado | 10. Reconciliacao | #,##0.0 |
| _Medidas | Performance Media (%) | 10. Reconciliacao | 0.0% |
| _Medidas | Meta Filial Entrega | 11. Metas e Parametros | 0.0% |
| _Medidas | Meta Filial SPR | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global % Entregas | 11. Metas e Parametros | 0.0% |
| _Medidas | Meta Global Desvio SPR Ped | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global Desvio SPR Vol | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global ORH | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global SPR Ped | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global SPR Ped Plan | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global SPR Vol | 11. Metas e Parametros | 0.0 |
| _Medidas | Meta Global SPR Vol Plan | 11. Metas e Parametros | 0.0 |
| _Medidas | Card SPR Pedidos Real | 12. KPI Cards | 0.0 |
| _Medidas | KPI Desvio SPR Cor | 12. KPI Cards |  |
| _Medidas | KPI Desvio SPR Delta | 12. KPI Cards | +0.0;-0.0;0 |
| _Medidas | KPI Desvio SPR Delta% | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI Desvio SPR Icone | 12. KPI Cards |  |
| _Medidas | KPI Desvio SPR Meta | 12. KPI Cards | 0.0 |
| _Medidas | KPI Desvio SPR Status | 12. KPI Cards |  |
| _Medidas | KPI Desvio SPR Texto Card | 12. KPI Cards |  |
| _Medidas | KPI Desvio SPR Valor | 12. KPI Cards | +0.0;-0.0;0 |
| _Medidas | KPI Entregas Cor | 12. KPI Cards |  |
| _Medidas | KPI Entregas Delta (pp) | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI Entregas Delta% | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI Entregas Icone | 12. KPI Cards |  |
| _Medidas | KPI Entregas Meta | 12. KPI Cards | 0.0% |
| _Medidas | KPI Entregas Status | 12. KPI Cards |  |
| _Medidas | KPI Entregas Texto Card | 12. KPI Cards |  |
| _Medidas | KPI Entregas Valor | 12. KPI Cards | 0.0% |
| _Medidas | KPI ORH Cor | 12. KPI Cards |  |
| _Medidas | KPI ORH Delta | 12. KPI Cards | +0.0;-0.0;0 |
| _Medidas | KPI ORH Delta% | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI ORH Icone | 12. KPI Cards |  |
| _Medidas | KPI ORH Meta | 12. KPI Cards | 0.0 |
| _Medidas | KPI ORH Status | 12. KPI Cards |  |
| _Medidas | KPI ORH Texto Card | 12. KPI Cards |  |
| _Medidas | KPI ORH Valor | 12. KPI Cards | 0.0 |
| _Medidas | KPI SPR Ped Cor | 12. KPI Cards |  |
| _Medidas | KPI SPR Ped Delta | 12. KPI Cards | +0.0;-0.0;0 |
| _Medidas | KPI SPR Ped Delta% | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI SPR Ped Icone | 12. KPI Cards |  |
| _Medidas | KPI SPR Ped Meta | 12. KPI Cards | 0.0 |
| _Medidas | KPI SPR Ped Status | 12. KPI Cards |  |
| _Medidas | KPI SPR Ped Texto Card | 12. KPI Cards |  |
| _Medidas | KPI SPR Ped Valor | 12. KPI Cards | 0.0 |
| _Medidas | KPI SPR Vol Cor | 12. KPI Cards |  |
| _Medidas | KPI SPR Vol Delta | 12. KPI Cards | +0.0;-0.0;0 |
| _Medidas | KPI SPR Vol Delta% | 12. KPI Cards | +0.0%;-0.0%;0.0% |
| _Medidas | KPI SPR Vol Icone | 12. KPI Cards |  |
| _Medidas | KPI SPR Vol Meta | 12. KPI Cards | 0.0 |
| _Medidas | KPI SPR Vol Status | 12. KPI Cards |  |
| _Medidas | KPI SPR Vol Texto Card | 12. KPI Cards |  |
| _Medidas | KPI SPR Vol Valor | 12. KPI Cards | 0.0 |
| _Medidas | Alerta Cor | 13. Rankings e Alertas KPI |  |
| _Medidas | Alerta Nivel | 13. Rankings e Alertas KPI |  |
| _Medidas | Alerta Operacional | 13. Rankings e Alertas KPI |  |
| _Medidas | Gap% Pior Filial Entregas vs Meta | 13. Rankings e Alertas KPI | +0.0%;-0.0%;0.0% |
| _Medidas | Gap% Pior Filial SPR vs Meta | 13. Rankings e Alertas KPI | +0.0%;-0.0%;0.0% |
| _Medidas | Pior Filial Entregas Semana | 13. Rankings e Alertas KPI |  |
| _Medidas | Pior Filial ORH Semana | 13. Rankings e Alertas KPI |  |
| _Medidas | Pior Filial SPR Semana | 13. Rankings e Alertas KPI |  |
| _Medidas | Qtd Filiais Abaixo Meta Entrega | 13. Rankings e Alertas KPI | #,##0 |
| _Medidas | Qtd Filiais Abaixo Meta SPR | 13. Rankings e Alertas KPI | #,##0 |
| _Medidas | Qtd Filiais Criticas SPR | 13. Rankings e Alertas KPI | #,##0 |
| _Medidas | Score Entrega (0-100) | 13. Rankings e Alertas KPI |  |
| _Medidas | Score Operacional | 13. Rankings e Alertas KPI |  |
| _Medidas | Score SPR (0-100) | 13. Rankings e Alertas KPI |  |
| _Medidas | Top 3 Piores Filiais Entregas | 13. Rankings e Alertas KPI |  |
| _Medidas | Top 3 Piores Filiais SPR | 13. Rankings e Alertas KPI |  |
| _Medidas | Valor Pior Filial Entregas Semana | 13. Rankings e Alertas KPI | 0.0% |
| _Medidas | Valor Pior Filial SPR Semana | 13. Rankings e Alertas KPI | 0.0 |
| _Medidas | HTML Card Aderencia Radar | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Alerta | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Alerta Filiais | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Capacidade | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Comparativo Semanal | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Consolidacao | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Desvio SPR | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Eficiencia KM | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Entregas | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Filial Spotlight | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card KM Total | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card MoM Resumo | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card ORH | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card ORH Cenarios | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Ocupacao Frota | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Performance Geral | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Peso Total | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Produtividade | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Progresso Metas | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Reconciliacao | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card SPR KM | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card SPR Ped | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card SPR Peso | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card SPR Plan vs Real | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card SPR Vol | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Semana Resumo | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Status Frota | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Total Pedidos | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Total Rotas | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Total Volumes | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Variacao Diaria | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card Veiculos | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Card YTD Resumo | 14. HTML Content\01. Cards KPI |  |
| _Medidas | HTML Ranking Entregas Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Ranking ORH Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Ranking Rotas Criticas Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Ranking SPR Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Tabela Filiais Consolidado Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Tabela Hierarquia Semana Filial Rota | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Tabela Ocupacao Tipo Veiculo Semana | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Torre Controle Operacional | 14. HTML Content\02. Tabelas e Rankings |  |
| _Medidas | HTML Grafico Tendencia Mensal | 14. HTML Content\03. Graficos Semanais e Mensais |  |
| _Medidas | HTML Grafico Tendencia Semanal | 14. HTML Content\03. Graficos Semanais e Mensais |  |
| _Medidas | HTML Grafico Barras Filial Semana | 14. HTML Content\04. Filial e Drilldown |  |
| _Medidas | HTML Tabela Alertas Filial Semana | 14. HTML Content\04. Filial e Drilldown |  |
| _Medidas | Op Dias com Dados | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0 |
| _Medidas | Op Media Diaria Pedidos | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0.0 |
| _Medidas | Op Media Diaria Rotas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0.0 |
| _Medidas | Op Pedidos Filial % | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0.0% |
| _Medidas | Op Pedidos Planejados | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Pedidos Realizados | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rank Entregas Filial | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0 |
| _Medidas | Op Rank SPR Filial | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0 |
| _Medidas | Op Rank Score Filial | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0 |
| _Medidas | Op Rotas Aguardando Aceite | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Carregadas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Filial % | 15. Torre de Controle Operacional\01. Fluxo e Volume | 0.0% |
| _Medidas | Op Rotas Finalizadas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Nao Planejadas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Planejadas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Realizadas | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Rotas Sem Tempo | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Volumes Planejados | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Volumes Realizados | 15. Torre de Controle Operacional\01. Fluxo e Volume | #,##0 |
| _Medidas | Op Alerta Prioritario | 15. Torre de Controle Operacional\02. Alertas |  |
| _Medidas | Op Progresso Pedidos (%) | 15. Torre de Controle Operacional\03. Status e Tendencias | 0.0% |
| _Medidas | Op Progresso Rotas (%) | 15. Torre de Controle Operacional\03. Status e Tendencias | 0.0% |
| _Medidas | Op Progresso Volumes (%) | 15. Torre de Controle Operacional\03. Status e Tendencias | 0.0% |
| _Medidas | Op Status Entregas | 15. Torre de Controle Operacional\03. Status e Tendencias | 0 |
| _Medidas | Op Status ORH | 15. Torre de Controle Operacional\03. Status e Tendencias | 0 |
| _Medidas | Op Status SPR | 15. Torre de Controle Operacional\03. Status e Tendencias | 0 |
| _Medidas | Op Tendencia Entregas | 15. Torre de Controle Operacional\03. Status e Tendencias | 0 |
| _Medidas | Op Tendencia SPR | 15. Torre de Controle Operacional\03. Status e Tendencias | 0 |
| _Medidas | TblExp % Entregas Efetivas Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0% |
| _Medidas | TblExp % Insucessos Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0% |
| _Medidas | TblExp Aderencia Pedidos Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.00 |
| _Medidas | TblExp Aderencia Volumes Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.00 |
| _Medidas | TblExp Delta KM Plan x Real | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +#,##0.0;-#,##0.0;0.0 |
| _Medidas | TblExp Delta Pedidos Plan x Real | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +#,##0;-#,##0;0 |
| _Medidas | TblExp Delta Tempo Plan x Real (h) | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +0.0;-0.0;0.0 |
| _Medidas | TblExp Delta Volumes Plan x Real | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +#,##0;-#,##0;0 |
| _Medidas | TblExp Flag Acima Capacidade | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0 |
| _Medidas | TblExp Flag Match Fora D+/-1 | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0 |
| _Medidas | TblExp Flag Overtime 8h | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0 |
| _Medidas | TblExp Flag Rota Nao Planejada | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0 |
| _Medidas | TblExp Flag Sem Tempo | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0 |
| _Medidas | TblExp Match Temporais | 19. Tabeloes Exportacao DAX\01. Linha Operacional |  |
| _Medidas | TblExp SPR Delta Ped Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +0.0;-0.0;0.0 |
| _Medidas | TblExp SPR Delta Vol Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | +0.0;-0.0;0.0 |
| _Medidas | TblExp SPR Ped Plan Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0 |
| _Medidas | TblExp SPR Ped Real Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0 |
| _Medidas | TblExp SPR Vol Plan Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0 |
| _Medidas | TblExp SPR Vol Real Linha | 19. Tabeloes Exportacao DAX\01. Linha Operacional | 0.0 |
| _Medidas | TblExp Se Planejado | 19. Tabeloes Exportacao DAX\01. Linha Operacional |  |
| _Medidas | TblExp Tags Operacionais | 19. Tabeloes Exportacao DAX\01. Linha Operacional |  |
| _Medidas | TblExp Tipo Unidade | 19. Tabeloes Exportacao DAX\01. Linha Operacional |  |
| _Medidas | TabSem % Execucao Pedidos | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem % Execucao Rotas | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem % Execucao Volumes | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem % Match D+/-1 | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem % Match Fora Janela | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem % Match Mesmo Dia | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0% |
| _Medidas | TabSem Alertas Criticos | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Alertas Total | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Match D+/-1 | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Match Fora Janela | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Match Mesmo Dia | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Pedidos Planejados | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Rotas Nao Planejadas | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Rotas Overtime | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Rotas Planejadas | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Rotas Planejadas Executadas | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Rotas Sem Tempo | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem SPR Delta Ped Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | +0.0;-0.0;0.0 |
| _Medidas | TabSem SPR Ped Planejado Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0 |
| _Medidas | TabSem SPR Ped Realizado Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | 0.0 |
| _Medidas | TabSem Status Operacional | 19. Tabeloes Exportacao DAX\02. KPI Semanal |  |
| _Medidas | TabSem Total Pedidos Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Total Rotas Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Total Volumes Unidade | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabSem Volumes Planejados | 19. Tabeloes Exportacao DAX\02. KPI Semanal | #,##0 |
| _Medidas | TabMes % Entregas Efetivas | 19. Tabeloes Exportacao DAX\03. KPI Mensal | 0.0% |
| _Medidas | TabMes ORH Utilizacao Unidade | 19. Tabeloes Exportacao DAX\03. KPI Mensal | 0.0% |
| _Medidas | TabMes Pedidos | 19. Tabeloes Exportacao DAX\03. KPI Mensal | #,##0 |
| _Medidas | TabMes Rotas | 19. Tabeloes Exportacao DAX\03. KPI Mensal | #,##0 |
| _Medidas | TabMes SPR Ped Unidade | 19. Tabeloes Exportacao DAX\03. KPI Mensal | 0.0 |
| _Medidas | TabMes Volumes | 19. Tabeloes Exportacao DAX\03. KPI Mensal | #,##0 |
| _Medidas | TblDia % Execucao Pedidos | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia % Execucao Rotas | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia % Execucao Volumes | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia % Match D+/-1 | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia % Match Fora Janela | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia % Match Mesmo Dia | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0% |
| _Medidas | TblDia Alertas Criticos | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Alertas Total | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Match D+/-1 | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Match Fora Janela | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Match Mesmo Dia | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Pedidos Planejados | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Rotas Nao Planejadas | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Rotas Overtime | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Rotas Planejadas | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Rotas Planejadas Executadas | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Rotas Sem Tempo | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia SPR Delta Ped Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | +0.0;-0.0;0.0 |
| _Medidas | TblDia SPR Ped Planejado Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0 |
| _Medidas | TblDia SPR Ped Realizado Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | 0.0 |
| _Medidas | TblDia Status Operacional | 19. Tabeloes Exportacao DAX\99. Legado TblDia |  |
| _Medidas | TblDia Total Pedidos Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Total Rotas Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Total Volumes Unidade | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | TblDia Volumes Planejados | 19. Tabeloes Exportacao DAX\99. Legado TblDia | #,##0 |
| _Medidas | % Rotas Sem Data Final | _Nao Publicavel | 0.0% |
| _Medidas | Custo por Entrega Efetiva (R$) | _Nao Publicavel | #,##0.00 |
| _Medidas | Custo por KM (R$/km) | _Nao Publicavel | #,##0.00 |
| _Medidas | Custo por Pedido (R$) | _Nao Publicavel | #,##0.00 |
| _Medidas | Custo por Rota (R$) | _Nao Publicavel | #,##0.00 |
| _Medidas | SLA Ciclo P50 (h) | _Nao Publicavel | 0.0 |
| _Medidas | SLA Ciclo P90 (h) | _Nao Publicavel | 0.0 |
| _Medidas | Tempo Medio Ciclo (h) | _Nao Publicavel | 0.0 |

## Report (Paginas e Visuais)

- Paginas: `11`
- Visuais totais: `40`
- Pagina ativa: `60c480f0bbae26605811`

| PageId | Nome | Qtd Visuais |
|---|---|---|
| 9b8d47009241dc052b91 | Executivo | 9 |
| 78d53a1ede414390cb10 | SPR | 7 |
| 58dfa821622b194e5780 | SPR Detalhamento | 2 |
| 31fa0ea5890a82873711 | Frota e Capacidade | 3 |
| 6d187cb3c5e56001e302 | Base Geral | 1 |
| 7b126714a15b28dcdca1 | Página 3 | 6 |
| 81b4d5306abad70e2a0a | Página 4 | 3 |
| dfa54507d66dc9e72840 | Página 5 | 2 |
| 917e82907e6a5ece1791 | Página 7 | 3 |
| c311a3312acaa8686b10 | Página 1 | 1 |
| 60c480f0bbae26605811 | Página 2 | 3 |

## CSV Profiles

| Arquivo | Existe | Rows | Columns |
|---|---|---|---|
| fato_rotas.csv | True | 20974 | 48 |
| fato_planejado.csv | True | 19249 | 10 |
| dim_filial.xlsx | True | 34 | 9 |
| dim_tipo_veiculo.csv | True | 11 | 13 |
