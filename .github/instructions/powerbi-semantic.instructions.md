---
applyTo:
  - "Dashboard/Painel Monitoramento - Petlove.SemanticModel/**"
  - "Dashboard/Painel Monitoramento - Petlove.SemanticModel/definition/tables/_Medidas.tmdl"
---

# Instruções — Modelo Semântico Power BI

## Contexto

O modelo semântico do Painel Monitoramento Petlove está em formato TMDL (Tabular Model Definition Language).
A tabela `_Medidas` contém 371 medidas DAX organizadas por display folders.
Todas as medidas devem ser gerenciadas exclusivamente nessa tabela.

## Tabelas do Modelo

| Tabela | Tipo | Fonte |
|--------|------|-------|
| dim_calendario | Dimensão | DAX calculada |
| dim_filial | Dimensão | dim_filial.xlsx (M query) |
| dim_tipo_veiculo | Dimensão | dim_tipo_veiculo.csv |
| fato_rotas | Fato | fato_rotas.csv |
| fato_planejado | Fato | fato_planejado.csv |
| _Medidas | Measures | 371 medidas DAX |
| _Metas | Parâmetros | DAX inline |

## Relacionamentos (N:1)

- fato_rotas[Filial] → dim_filial[Filial]
- fato_rotas[Data Referencia] → dim_calendario[Data]
- fato_rotas[Tipo de Veiculo Padrao] → dim_tipo_veiculo[TipoVeiculo]
- fato_planejado[Data Planejada] → dim_calendario[Data]
- fato_planejado[Filial] → dim_filial[Filial]

## Hierarquia de Grupos de Medidas (Display Folders)

### Core (alta prioridade)

```
01. Operacao\01. Volume e Execucao          (~10 medidas)
01. Operacao\02. Alertas e Prioridades      (~5 medidas)
01. Operacao\03. Ranking e Participacao      (~12 medidas)
01. Operacao\04. Medias e Tendencias         (~7 medidas)
01. Operacao\05. Planejado vs Realizado      (~9 medidas)
01. Operacao\06. Status de Rota              (~5 medidas)
01. Operacao\07. KPI Rotas                   (14 medidas — pack KPI)
02. SPR e Performance\01. SPR Base           (~15 medidas)
02. SPR e Performance\02. Produtividade Hora (~10 medidas)
02. SPR e Performance\03. Eficiencia KM      (~6 medidas)
02. SPR e Performance\04. KPI SPR Pedidos    (14 medidas — pack KPI)
02. SPR e Performance\05. KPI SPR Volumes    (14 medidas — pack KPI)
02. SPR e Performance\06. KPI Desvio SPR     (14 medidas — pack KPI)
03. Jornada e ORH\01. ORH e Jornada          (~13 medidas)
03. Jornada e ORH\02. KPI ORH                (14 medidas — pack KPI)
04. Frota e Capacidade\01. Referencia de Capacidade  (~8 medidas)
04. Frota e Capacidade\02. Ocupacao Geral            (~12 medidas)
04. Frota e Capacidade\03. Mix por Tipo              (~7 medidas)
04. Frota e Capacidade\04. Filial e Semana           (~27 medidas)
04. Frota e Capacidade\05. KPI Capacidade            (14 medidas — pack KPI)
05. Plano vs Real\01. Desvios Absolutos      (~5 medidas)
05. Plano vs Real\02. Aderencia Percentual   (~5 medidas)
05. Plano vs Real\03. Cobertura e Match      (~5 medidas)
05. Plano vs Real\04. Contexto de Execucao   (~4 medidas)
05. Plano vs Real\05. KPI Aderencia          (14 medidas — pack KPI)
07. Investigacao\01. Linha Operacional       (22 medidas TblExp)
```

### Apoio (prioridade média)

```
06. Shared\01. Temporal                     (~41 medidas — referências de data)
06. Shared\02. Metas\01. SPR                (~7 medidas)
06. Shared\02. Metas\02. ORH                (~1 medida)
06. Shared\03. SVG Cards                    (17 medidas — reavaliar migração)
06. Shared\04. Metas Global                 (3 medidas meta-global)
06. Shared\05. Var D-1                      (3 medidas variação dia anterior)
06. Shared\06. Var WoW                      (3 medidas variação semana)
08. Entregas\01. Entrega                    (6 medidas)
08. Entregas\02. KPI Entrega                (14 medidas — pack KPI)
08. Entregas\03. Metas Entrega              (2 medidas)
08. Entregas\04. Entrega Operacional        (9 medidas)
```

### Grupos eliminados (histórico)

```
90. Legado    — ELIMINADO Sprint 3 (61 medidas: 43 HTML + 17 SVG + 1 orphan)
98. Suporte   — ELIMINADO → renomeado para 08. Entregas (31 medidas)
99. Backoffice — ELIMINADO Fase 1 (8 medidas removidas)
```

### Padrão KPI Pack (14 medidas por KPI)

Todo novo KPI deve seguir o template de 14 medidas:

```
Valor, Meta, Delta, Delta%, Status, Status Codigo, Status Texto,
Cor, Icone, Texto Card, Acao, Origem Meta, Trend D-1, Trend WoW
```

KPI Packs existentes (8): SPR Pedidos, SPR Volumes, Desvio SPR, ORH, Entrega, Rotas, Capacidade, Aderência.

## Convenção de Nomenclatura de Medidas

### Padrão obrigatório

```
[Prefixo] Nome Descritivo [Sufixo Contexto]
```

### Prefixos por tipo

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| (nenhum) | Medida base direta | `Total Entregas` |
| `%` | Percentual / taxa | `% Aderencia Rotas` |
| `Δ` ou `Var` | Variação / desvio | `Var Entregas Plan vs Real` |
| `Meta` | Valor de referência | `Meta SPR` |
| `Rank` | Ranking | `Rank Filial SPR` |
| `Avg` | Média | `Avg Jornada Motorista` |
| `Flag` | Indicador booleano | `Flag Jornada Excedida` |
| `_` | Medida auxiliar/interna | `_Base Rotas Filtradas` |
| `SVG` | Visual SVG via DAX | `SVG Badge Status` |
| `TT` | Tooltip | `TT Detalhe Rota` |
| `FMT` | Formatação condicional | `FMT Cor Status Entrega` |

### Regras

- Nomes em português, claros e descritivos
- Sem abreviações obscuras
- Display folder obrigatório — nunca deixar medida na raiz
- Medidas auxiliares (prefixo `_`) devem ter comentário explicativo
- Medidas legadas devem ficar em `90. Legado\` até migração completa

## Regras de Edição do Modelo

1. **Nunca criar medidas fora da tabela `_Medidas`**
2. **Sempre definir `displayFolder`** ao criar/mover medida
3. **Sempre definir `formatString`** adequado (%, #,##0, etc.)
4. **Documentar medidas complexas** com `description` no TMDL
5. **Não alterar relacionamentos** sem validar impacto nas medidas existentes
6. **Após refatoração**, verificar se display folders órfãos foram limpos
7. **Metas** ficam em `06. Shared\02. Metas\` ou na tabela `_Metas`

## Validações ao Editar

- Verificar se a medida referencia colunas que existem no modelo
- Verificar se VAR/RETURN está bem formado
- Verificar se CALCULATE tem filtros explícitos e não ambíguos
- Verificar se medidas derivadas referenciam medidas base corretas
- Testar se o display folder path usa `\` como separador (padrão TMDL)

## Formato CSV para Fontes

- Separador: `;`
- Encoding: `UTF-8 BOM`
- Datas: `YYYY-MM-DD`
- Path M queries: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\`
