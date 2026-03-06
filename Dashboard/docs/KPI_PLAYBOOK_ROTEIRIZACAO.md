# Playbook KPI - Roteirizacao, Execucao, Frota e Capacidade

## Objetivo

Estabelecer uma regra simples para criar, revisar e publicar measures no painel sem voltar ao caos anterior.

Este playbook parte do estado atual do modelo:

- `456` measures totais
- `24` display folders
- `08. Base`, `09. KPI Semantico`, `10. Operacional`, `11. Investigacao` como camadas oficiais
- `90/91` como compatibilidade e legado

## Regra principal

Nenhuma medida nova deve nascer direto para visual.

Ordem correta:

1. `08. Base`
2. `09. KPI Semantico`
3. `10. Operacional`
4. `11. Investigacao`
5. visual no `.Report`

## Quando criar em cada camada

### 08. Base

Criar aqui quando a medida for:

- soma
- contagem
- media
- razao
- aderencia
- desvio
- ocupacao
- reconciliacao

Exemplos:

- `Total Rotas`
- `SPR Ped Realizado`
- `Pedidos/h Realizado`
- `Ocupacao Filial Composta (%)`

### 09. KPI Semantico

Criar aqui quando a medida representar contrato de KPI para card.

Partes aceitas:

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

Criar aqui quando a medida servir para:

- alerta
- ranking
- torre de controle
- resumo semanal
- acompanhamento mensal

Nao usar esta camada para reinventar regra de negocio.

### 11. Investigacao

Criar aqui quando a medida existir apenas para:

- drill-through
- tabelao
- detalhe de rota
- detalhe de filial

## O que nao fazer

### Nao criar em legado

Nao criar medidas novas em:

- `90. Legado\01. HTML`
- `90. Legado\02. Alias de Compatibilidade`
- `91. Legado\01. Diario Alias`
- `99. Backoffice\01. Nao Publicavel`

### Nao duplicar formula so por contexto visual

Se a formula ja existe:

- usar a medida canonica
- ou criar alias explicito de compatibilidade, nunca uma copia silenciosa

## Nomenclatura

### Base

Preferir nomes de negocio claros:

- `Total Rotas`
- `Total Pedidos`
- `Capacidade Volumes Semana`
- `Gap Capacidade Volumes Semana`

### KPI

Prefixo obrigatorio:

- `KPI SPR Ped Valor`
- `KPI SPR Ped Meta`
- `KPI SPR Ped Status Texto`

### Operacional

Prefixos aceitos:

- `Op` para torre e alerta
- `TabSem` para wrapper semanal temporario
- `TabMes` para wrapper mensal temporario
- `TblExp` para investigacao

### Compatibilidade

Aliases antigos devem ficar em:

- `90. Legado\02. Alias de Compatibilidade`

Exemplos atuais:

- `Card SPR Pedidos Real`
- `Meta Filial SPR`
- `Meta Global ORH`

## Checklist antes de publicar uma measure

1. A medida pertence a uma unica camada logica.
2. O nome responde ao negocio, nao ao visual.
3. O folder esta correto.
4. Existe formato numerico coerente.
5. Se for KPI, o contrato esta completo.
6. Se for alias, o motivo de compatibilidade e explicito.
7. Nao depende de HTML para regra de negocio.

## Checklist antes de usar uma measure em visual novo

Pode usar diretamente:

- `manter_base_canonica`
- `manter_semantica_kpi`
- `manter_operacional`
- `manter_investigacao`

Evitar em visual novo:

- `manter_curto_prazo_consolidar_alias`
- `legado_substituir_gradualmente`
- `congelar_legado`
- `manter_oculto`

## Artefatos de controle

- `Dashboard/docs/KPI_AUDITORIA_ATUAL.md`
- `Dashboard/docs/KPI_ORGANIZACAO_COMPLETA.md`
- `Dashboard/docs/CATALOGO_PAINEIS_CANONICOS.md`
- `Dashboard/docs/ARQUITETURA_CANONICA_RELATORIO.md`

## Regra de construcao visual

Para o foco atual do projeto, a ordem e:

1. `01 Torre de Controle`
2. `04 Capacidade e Mix`
3. `02 Scoreboard SPR e Performance`
4. `05 Plano vs Real`
5. `03 Eficiencia SPR e ORH`
6. `90 Investigacao`
