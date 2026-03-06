# Arquitetura Canonica do Relatorio

## Objetivo

Definir a arquitetura operacional minima do relatorio `Painel Monitoramento - Petlove.pbip` a partir do estado real do modelo semantico. Esta referencia substitui nomes antigos de pastas, agrupamentos legados e qualquer estrutura visual anterior.

Foco atual do painel:

- roteirizacao
- execucao operacional
- frota
- capacidade
- leitura por filial
- acompanhamento semanal

Arquivos de apoio que passam a ser referencia junto com este documento:

- `Dashboard/docs/KPI_AUDITORIA_ATUAL.md`
- `Dashboard/docs/KPI_ORGANIZACAO_COMPLETA.md`
- `Dashboard/docs/CATALOGO_PAINEIS_CANONICOS.md`

## Camadas canonicas

### 08. Base

Camada de negocio e analitica. Aqui ficam contagens, somatorios, aderencias, produtividade, capacidade e reconciliacao.

Subpastas ativas:

- `08. Base\01. Execucao e Volume`
- `08. Base\02. SPR e Densidade`
- `08. Base\03. ORH e Jornada`
- `08. Base\04. Plano vs Real`
- `08. Base\05. Produtividade`
- `08. Base\06. Temporal`
- `08. Base\07. Metas`
- `08. Base\08. Frota e Capacidade`
- `08. Base\09. Entrega`
- `08. Base\10. Reconciliacao`

### 09. KPI Semantico

Camada oficial de contrato de KPI. Todo card principal deve nascer daqui ou da Base.

Familias ativas:

- `09. KPI Semantico\01. SPR Pedidos`
- `09. KPI Semantico\02. SPR Volumes`
- `09. KPI Semantico\03. Entrega`
- `09. KPI Semantico\04. ORH`
- `09. KPI Semantico\05. Desvio SPR`

Contrato minimo esperado por KPI:

- `Valor`
- `Meta`
- `Delta`
- `Delta%`
- `Status`
- `Status Codigo`
- `Status Texto`
- `Cor`
- `Icone`
- `Texto Card`
- `Trend D-1`
- `Trend WoW`
- `Acao`

### 10. Operacional

Camada de consumo operacional e leitura de acompanhamento.

Subpastas ativas:

- `10. Operacional\01. Alertas e Rankings`
- `10. Operacional\02. Torre de Controle`
- `10. Operacional\03. Semanal Alias`
- `10. Operacional\04. Mensal Alias`

### 11. Investigacao

Camada de drill-through e tabelao operacional.

- `11. Investigacao\01. Linha Operacional`

### Legado e restrito

Nao entram em visual novo:

- `90. Legado\01. HTML`
- `90. Legado\02. Alias de Compatibilidade`
- `91. Legado\01. Diario Alias`
- `99. Backoffice\01. Nao Publicavel`

## Regras de uso

### Pode alimentar visual novo

- `manter_base_canonica`
- `manter_semantica_kpi`
- `manter_operacional`
- `manter_investigacao`

### Pode existir, mas nao deve ser primeira escolha

- `manter_curto_prazo_consolidar_alias`
- `legado_substituir_gradualmente`

### Nao usar em construcao nova

- `congelar_legado`
- `manter_oculto`

## Modulos visuais canonicos

### 01 Torre de Controle

Pergunta:
- o que mudou hoje e onde esta o problema agora?

Pastas prioritarias:

- `08. Base\01. Execucao e Volume`
- `10. Operacional\01. Alertas e Rankings`
- `10. Operacional\02. Torre de Controle`
- `10. Operacional\03. Semanal Alias`
- `08. Base\06. Temporal`

KPIs hero sugeridos:

- `Total Rotas`
- `Total Pedidos`
- `Total Volumes`
- `Veiculos Ativos`
- `Op Alerta Prioritario`

Blocos obrigatorios:

- alertas e ranking por filial
- progresso do dia
- tabela semanal por filial

### 02 Scoreboard SPR e Performance

Pergunta:
- estamos rodando com densidade e produtividade adequadas?

Pastas prioritarias:

- `08. Base\02. SPR e Densidade`
- `08. Base\05. Produtividade`
- `09. KPI Semantico\01. SPR Pedidos`
- `09. KPI Semantico\02. SPR Volumes`
- `09. KPI Semantico\05. Desvio SPR`
- `08. Base\07. Metas`
- `08. Base\06. Temporal`

KPIs hero sugeridos:

- `KPI SPR Ped Valor`
- `KPI SPR Vol Valor`
- `KPI Desvio SPR Valor`
- `Pedidos/h Realizado`
- `Volumes/h Realizado`

### 03 Eficiencia SPR e ORH

Pergunta:
- por que a eficiencia caiu e como a jornada esta sendo usada?

Pastas prioritarias:

- `08. Base\02. SPR e Densidade`
- `08. Base\03. ORH e Jornada`
- `08. Base\05. Produtividade`
- `09. KPI Semantico\04. ORH`

KPIs hero sugeridos:

- `SPR Ped Realizado`
- `Gap SPR vs Meta (pts)`
- `Tempo Medio Realizado (h)`
- `Utilizacao Jornada 8h (%)`
- `KPI ORH Valor`

### 04 Capacidade e Mix

Pergunta:
- onde a frota esta saturada ou ociosa por filial e tipo de veiculo?

Pastas prioritarias:

- `08. Base\08. Frota e Capacidade`
- `10. Operacional\03. Semanal Alias`
- `10. Operacional\04. Mensal Alias`

KPIs hero sugeridos:

- `Ocupacao Composta (%)`
- `Ocupacao Filial Composta (%)`
- `Status Capacidade Filial`
- `Gap Capacidade Volumes Semana`
- `Tipo Veiculo Critico Ocupacao`

### 05 Plano vs Real

Pergunta:
- o executado aderiu ao planejado e onde esta o gap?

Pastas prioritarias:

- `08. Base\04. Plano vs Real`
- `08. Base\10. Reconciliacao`
- `08. Base\07. Metas`
- `08. Base\06. Temporal`

KPIs hero sugeridos:

- `Aderencia Pedidos (%)`
- `Aderencia Volumes (%)`
- `Aderencia KM (%)`
- `Cobertura Rotas (%)`
- `% Match Mesmo Dia`

### 90 Investigacao

Pergunta:
- quais rotas e linhas explicam a excecao?

Pastas prioritarias:

- `11. Investigacao\01. Linha Operacional`

Regra:

- sem hero cards
- foco em tabela, filtro e drill-through

## Estatisticas atuais do modelo

- `456` measures no total
- `24` display folders
- `180` base e analitica
- `70` semantica KPI
- `100` operacional
- `23` investigacao
- `30` compatibilidade
- `45` apresentacao legada
- `8` backoffice

## Proxima ordem de construcao

1. `01 Torre de Controle`
2. `04 Capacidade e Mix`
3. `02 Scoreboard SPR e Performance`
4. `05 Plano vs Real`
5. `03 Eficiencia SPR e ORH`
6. `90 Investigacao`
