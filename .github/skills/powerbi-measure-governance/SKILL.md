---
name: powerbi-measure-governance
description: >
  DOMAIN SKILL — Governança de medidas DAX para Power BI.
  USE FOR: catalogar medidas, classificar por status, detectar duplicidades,
  validar nomenclatura e display folders, propor taxonomia, identificar medidas
  faltantes. DO NOT USE FOR: design visual, layout de páginas, SVG/Deneb.
---

# Power BI Measure Governance

## Domínio

Governança, catalogação e refatoração de medidas DAX no modelo semântico Power BI.

## Quando Usar

- Inventariar medidas existentes em `_Medidas.tmdl`
- Classificar medidas por status (core, apoio, legado, duplicada, remoção, refatorar, faltante)
- Validar conformidade com a hierarquia de display folders
- Detectar duplicidades e sobreposições
- Propor medidas faltantes para gestão diária/semanal
- Refatorar fórmulas ineficientes
- Reorganizar display folders

## Hierarquia de Display Folders

```
01. Operacao\01. Volume e Execucao
02. SPR e Performance\01. SPR Base
02. SPR e Performance\02. Produtividade Hora
02. SPR e Performance\03. Eficiencia KM
03. Jornada e ORH\01. ORH e Jornada
04. Frota e Capacidade\01. Referencia de Capacidade
04. Frota e Capacidade\02. Ocupacao Geral
05. Plano vs Real\01. Desvios Absolutos
05. Plano vs Real\02. Aderencia Percentual
05. Plano vs Real\03. Cobertura e Match
05. Plano vs Real\04. Contexto de Execucao
06. Shared\01. Temporal
06. Shared\02. Metas\01. SPR
06. Shared\02. Metas\02. ORH
06. Shared\03. SVG Cards
07. Investigacao\01. Linha Operacional
98. Suporte\01. Entrega
98. Suporte\02. KPI Entrega
98. Suporte\03. Metas Entrega
98. Suporte\04. Entrega Operacional
90. Legado\*
99. Backoffice\*
```

## Convenção de Nomenclatura

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| (nenhum) | Base direta | `Total Entregas` |
| `%` | Percentual | `% Aderencia Rotas` |
| `Var` | Variação | `Var Entregas Plan vs Real` |
| `Meta` | Referência | `Meta SPR` |
| `Rank` | Ranking | `Rank Filial SPR` |
| `Avg` | Média | `Avg Jornada Motorista` |
| `Flag` | Booleano | `Flag Jornada Excedida` |
| `_` | Auxiliar/interna | `_Base Rotas Filtradas` |
| `SVG` | Visual SVG | `SVG Badge Status` |
| `TT` | Tooltip | `TT Detalhe Rota` |
| `FMT` | Formatação | `FMT Cor Status Entrega` |

## Checklist de Validação

- [ ] Toda medida tem displayFolder definido
- [ ] Nenhuma medida na raiz (sem folder)
- [ ] Convenção de nomenclatura respeitada
- [ ] Medidas legadas em `90. Legado\`
- [ ] Sem duplicidades entre grupos core
- [ ] formatString definido para todas as medidas
- [ ] Medidas auxiliares (`_` prefixo) com description

## Tabelas do Modelo

| Tabela | Tipo |
|--------|------|
| _Medidas | Medidas (389) |
| _Metas | Parâmetros |
| fato_rotas | Fato (21k linhas, 48 cols) |
| fato_planejado | Fato (46k linhas, 10 cols) |
| dim_calendario | Dimensão DAX |
| dim_filial | Dimensão (37 filiais) |
| dim_tipo_veiculo | Dimensão (11+ tipos) |

## Arquivo Principal

`Dashboard/Painel Monitoramento - Petlove.SemanticModel/definition/tables/_Medidas.tmdl`
