# RELATÓRIO — RUPTURA CONTROLADA DA HERANÇA SHEETS

Data: 2026-03-24
Executor: Agente sênior de arquitetura de dados + analytics engineering + BI engineering + full-stack integration

---

## 1. Resumo Executivo

Execução completa de ruptura controlada com a lógica orientada a Google Sheets que permeava o pipeline de dados, a API e a documentação do projeto Dashboard Logístico Last-Mile.

**Escopo da intervenção:**

- 3 arquivos de código modificados (pipeline SQL, queries.js, server.js)
- 5 documentos canônicos atualizados
- 7 documentos obsoletos arquivados
- 3 bugs corrigidos
- 0 breaking changes na API REST (contrato frontend preservado)

**Resultado:** O projeto agora opera com nomenclatura canônica exclusiva, sem aliases legados, sem referências a marts inexistentes, e sem divergências entre código e documentação.

---

## 2. Diagnóstico do Legado Sheets

### 2.1 Vestígios identificados no código

| Local | Vestígio | Impacto |
| --- | --- | --- |
| pipeline_dashboard_v7.sql | Aliases `km_realizado`, `km_planejado` duplicando `km_real`, `km_plan` | Duplicação semântica desnecessária |
| pipeline_dashboard_v7.sql | Aliases `tempo_realizado_h_final`, `tempo_planejado_h_final` | Mortos — nenhum consumidor |
| pipeline_dashboard_v7.sql | `ocup_volumes` calculava `adherence_ratio` mas nomeava como "ocupação" | Confusão semântica: aderência ≠ ocupação |
| pipeline_dashboard_v7.sql | Bloco de comentário sobre `pub_metas` removida | Cruft documental |
| queries.js | `frotaOcupacaoQuery` usava `SAFE_DIVIDE` nativo em vez de UDF `safe_div` | Inconsistência com padrão canônico |
| queries.js | `kpiDiarioQuery` com `ordered_fallback` idêntico a `ordered_complete` | Bug: fallback não relaxava condições |
| queries.js | Referências a `km_realizado`, `km_planejado`, `ocup_volumes` | Dependência de aliases legados |
| server.js | `orderMap` referenciando `d.km_realizado` | Dependência de alias legado |

### 2.2 Vestígios identificados na documentação

| Documento | Vestígio | Impacto |
| --- | --- | --- |
| PIPELINE_BIGQUERY_CANONICO.md | `pipeline_sheets_v8.sql` listado como "ativo" | Referência a artefato descontinuado |
| PIPELINE_BIGQUERY_CANONICO.md | "15 endpoints REST" (eram 10) | Contagem incorreta |
| PIPELINE_BIGQUERY_CANONICO.md | Seção MARTS_CANONICOS descrevendo marts inexistentes | Arquitetura fantasma |
| CATALOGO_MEDIDAS_CANONICO.md | KPIs com "Camada oficial: mart canonico" | Marts não existem na v7 |
| CATALOGO_MEDIDAS_CANONICO.md | Seção 3.2 listando mart_diario_canonico etc. | Objetos inexistentes |
| CATALOGO_MEDIDAS_CANONICO.md | Seção 3.3 listando views de publicação como "ainda relevantes" | Artefatos arquivados |
| VOCABULARIO_SEMANTICO.md | Metas divergentes: SPR=22 (real=42), Entregas=0.97 (real=0.98), ORH=6.0 (real=7.0), Ocupação=0.80 (real=0.85) | Desinformação |
| VOCABULARIO_SEMANTICO.md | `km_realizado`, `km_planejado` como nomes SQL | Nomes legados |
| 7 docs em docs/ | RELATORIO_RUPTURA, PLANOs, PROMPTs, STATUS, lovable-sync.log | Material temporário/supersedido |

---

## 3. Nova Arquitetura (v7 canônica)

```
RAW (3 tabelas)
  ↓
STAGING (pipeline_dashboard_v7.sql)
  stg_monitoramento — parse, dedup, normalização
  stg_planejamento  — dedup por (id_carga, filial)
  ↓
DIMENSÃO
  dim_filial — enriquecimento com metadados
  ↓
BASE CANÔNICA
  base_execucao_canonica — 1 row/id_carga, todas medidas atômicas + flags + KPIs row-level
  metas_globais — 7 metas canônicas
  metas_pivot_canonico — 1 row com todas metas em colunas
  ↓
API (queries.js — agregação dinâmica)
  scoreExpr() — DRY, função única para fn_score_operacional
  sd() / ar() — helpers para UDFs safe_div / adherence_ratio
  stdAggCols() — colunas de agregação padrão
  ↓
SERVER (server.js — 10 endpoints REST)
  snake_case SQL → camelCase JSON
  ↓
FRONTEND (React + TypeScript)
  Consome API via @tanstack/react-query
```

**Decisões confirmadas:**

- Sem camada de marts materializada (BigQuery cache é suficiente para volume atual)
- UDFs centralizadas no pipeline SQL, chamadas por queries.js
- Score operacional via `scoreExpr()` — nunca duplicado

---

## 4. Alterações Implementadas

### 4.1 pipeline_dashboard_v7.sql

| Alteração | Tipo |
| --- | --- |
| Removido alias `km_realizado` (duplicava `km_real`) | Cleanup |
| Removido alias `km_planejado` (duplicava `km_plan`) | Cleanup |
| Removido alias `tempo_realizado_h_final` (sem consumidores) | Cleanup |
| Removido alias `tempo_planejado_h_final` (sem consumidores) | Cleanup |
| Renomeado `ocup_volumes` → `aderencia_volumes` | Fix semântico |
| Removido bloco de comentário sobre pub_metas | Cleanup |

### 4.2 api/queries.js

| Alteração | Tipo |
| --- | --- |
| `frotaOcupacaoQuery`: 4x `SAFE_DIVIDE` → UDF `safe_div` | Bug fix (consistência) |
| `kpiDiarioQuery`: `ordered_fallback` WHERE relaxado para `entregas > 0` (sem `tempoOperacionalTotal > 0`) | Bug fix (fallback funcional) |
| Todas refs `km_realizado` → `km_real` (6 ocorrências) | Rename canônico |
| Todas refs `km_planejado` → `km_plan` (3 ocorrências) | Rename canônico |
| Todas refs `ocup_volumes` → `aderencia_volumes` (4 ocorrências) | Rename canônico |

### 4.3 api/server.js

| Alteração | Tipo |
| --- | --- |
| `orderMap.kmRealizado`: `d.km_realizado` → `d.km_real` | Rename canônico |

### 4.4 Documentação atualizada

| Documento | Alterações |
| --- | --- |
| PIPELINE_BIGQUERY_CANONICO.md | Removida linha sheets v8 da tabela arquitetural; atualizada decisão v7 (pipeline único); corrigido "15 endpoints" → "10 endpoints"; seção MARTS substituída por "API (substitui MARTS)"; seção PUBLICACAO marcada descontinuada; passo 5 (deploy v8) removido da ordem de execução; lista de arquivos ativos atualizada |
| CATALOGO_MEDIDAS_CANONICO.md | Seção 3.2 reescrita: "Agregação dinâmica (API - substitui marts)"; seção 3.3 marcada descontinuada; 17 KPIs atualizados de "mart canonico" para "queries.js"; seção 5.2 reescrita sem refs a mart_filial_dia; princípio 3 atualizado; regra de implementação atualizada; medidas 5.3/5.4/5.5 atualizadas |
| VOCABULARIO_SEMANTICO.md | `km_realizado` → `km_real`; `km_planejado` → `km_plan`; metas corrigidas: SPR 42→67, Entregas 0.97→0.98, Rotas 0.85→0.95, ORH 6.0→7.0, Ocupação 0.80→0.85, DPPH 7.0→9.57 |
| docs/README.md | Índice atualizado: removido AUDIT_REVISAO; adicionado VOCABULARIO_SEMANTICO; setas → |

### 4.5 Documentos arquivados (→ docs/_archive/)

1. RELATORIO_RUPTURA_SHEETS_2026-03-23.md
2. PLANO_MELHORIAS_UX_2026-03-23.md
3. STATUS_MELHORIAS_2026-03-23.md
4. PROMPT_MELHORIA_VISUAL_CLAUDE_CODE.md
5. PROMPT_VALIDACAO_CLAUDE_CODE.md
6. ORGANIZACAO_PROJETO.md
7. lovable-sync.log

---

## 5. Referências Externas Consultadas

| Fonte | Insight aplicado |
| --- | --- |
| dbt Best Practices: How we structure our dbt projects | Validação do padrão staging → intermediate → marts. A ausência de marts materialized na v7 é uma decisão legítima quando a API faz agregação inline |
| dbt Metrics layer overview | Confirmação de que métricas devem ser definidas centralmente (equivalente ao nosso `scoreExpr()` + `metas_globais`) |
| BigQuery documentation: Query performance | Cache do BigQuery justifica a abordagem de recomputação inline — sem necessidade de pre-materializar |

---

## 6. Divergências Eliminadas

| # | Divergência | Resolução |
| --- | --- | --- |
| 1 | `frotaOcupacaoQuery` usava `SAFE_DIVIDE` nativo, todos outros usavam UDF `safe_div` | Substituído por `safe_div` via namespace completo |
| 2 | `kpiDiarioQuery` `ordered_fallback` tinha WHERE idêntico ao `ordered_complete` | WHERE relaxado: removido `tempoOperacionalTotal > 0` |
| 3 | `ocup_volumes` nomeava uma `adherence_ratio` como "ocupação" | Renomeado para `aderencia_volumes` |
| 4 | Aliases `km_realizado`/`km_planejado` duplicavam `km_real`/`km_plan` | Aliases removidos, queries.js usa nomes canônicos |
| 5 | Aliases `tempo_*_h_final` sem consumidores | Removidos |
| 6 | PIPELINE_BIGQUERY doc listava v8 como "ativo" e marts inexistentes | Atualizado para v7 pura |
| 7 | CATALOGO atribuía KPIs a "mart canonico" inexistente | Atualizado para "queries.js" |
| 8 | VOCABULARIO tinha 6 metas divergentes da realidade | Corrigido para valores de metas_globais |
| 9 | 7 documentos obsoletos misturados com canônicos | Arquivados em docs/_archive/ |

---

## 7. Validação

### 7.1 Integridade do código

| Verificação | Resultado |
| --- | --- |
| queries.js — zero erros sintáticos | ✅ |
| server.js — zero erros sintáticos | ✅ |
| pipeline_dashboard_v7.sql — zero erros sintáticos | ✅ |
| Zero referências residuais a `km_realizado`, `km_planejado`, `ocup_volumes`, `SAFE_DIVIDE`, `tempo_*_h_final`, `pub_metas` | ✅ |
| Contrato API preservado (camelCase keys inalterados) | ✅ |

### 7.2 Frontend build

Build apresenta erro **pré-existente** em `CockpitOperacional.tsx` (tag JSX mismatch na linha 456) — NÃO relacionado a esta intervenção. O contrato API→Frontend está intacto:

- server.js continua emitindo mesmos campo camelCase
- TypeScript interfaces em `types/api.ts` não foram alteradas
- Nenhum endpoint foi adicionado/removido

### 7.3 Deploy necessário

Para ativar as mudanças em produção:

1. **BigQuery**: Re-executar `pipeline_dashboard_v7.sql` — recria `base_execucao_canonica` com novos nomes de coluna
2. **Cloud Run**: Re-deploy da API com `queries.js` e `server.js` atualizados
3. **Validação**: Executar `validate_pipeline.py` e `validate_data_contract.py`

**⚠️ IMPORTANTE**: O deploy do pipeline SQL e da API devem ser feitos juntos — se apenas o SQL for atualizado, a API quebrará ao referenciar colunas com nomes antigos.

---

## 8. Itens Pendentes

| # | Item | Prioridade | Responsável |
| --- | --- | --- | --- |
| 1 | Fix pré-existente em CockpitOperacional.tsx (JSX tag mismatch) | Alta | Frontend dev |
| 2 | Re-deploy coordenado SQL + API em produção | Alta | Pipeline eng |
| 3 | Executar validate_pipeline.py pós-deploy | Alta | Pipeline eng |
| 4 | Padronizar filiaisPerformanceQuery (camelCase→snake_case SQL aliases) | Baixa | Próxima iteração — requer mudança coordenada em queries.js + server.js (~60 campos) |
| 5 | Considerar AUDIT_REVISAO_ORIGEM para docs/_archive/ (ausente na listagem atual) | Baixa | Doc cleanup |
| 6 | Avaliar se VOCABULARIO_SEMANTICO.md deve ser integrado ao CATALOGO | Baixa | Consolidação doc |
