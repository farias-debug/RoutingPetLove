# CHANGELOG — Dashboard Logístico Last-Mile

> Registro canônico de todas as alterações de código, pipeline, API e documentação.
> Formato: data DESC · escopo · tipo · descrição.
> Criado em: 2026-03-25 · Manter atualizado a cada deploy ou modificação significativa.

---

## [2026-03-25] — UX: Nomenclatura Canônica, Novos KPIs, Proteção Null e Audit Visual

**Artefatos afetados:** `bigquery/pipeline_dashboard_v7.sql`, `api/queries.js`, `api/helpers.js`, `api/server.js`, `frontend/src/pages/FrotaCapacidade.tsx`, `frontend/src/pages/Transportadores.tsx`, `frontend/src/pages/AderenciaAtendimento.tsx`, `frontend/src/pages/InvestigacaoOperacional.tsx`, `frontend/src/pages/MotoristasJornada.tsx`

### Adicionado

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 1 | `api/queries.js` — `cardsQuery` | Novo card **Qtd Embarques** (posição 3): `CAST(k.qtd_rotas AS FLOAT64) AS rotas_f` adicionado ao CTE `metrics`; novo STRUCT com delta MoM e WoW | **Feature** |
| 2 | `api/helpers.js` | Nova função `truncateWords(value, maxWords=2)` — trunca string ao N primeiros tokens separados por espaço | **Feature** |

### Corrigido — Nomenclatura e Formatação

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 3 | `bigquery/pipeline_dashboard_v7.sql` — CTE `com_filial` | Filial agora formatada como `"09-Jundiai"` via `CONCAT(filial_codigo, '-', REGEXP_REPLACE(filial_nome, '^[A-Za-z]+\d+\s*', ''))` — nome genérico "Petlog" removido | **Melhoria** |
| 4 | `api/server.js` — 4 endpoints | `nomeFilial` retorna passthrough direto (`row.nomeFilial \|\| row.filial`) sem passar por `normalizeEntityLabel` — `normalizeEntityLabel` removia o hífen do formato `"09-Jundiai"` | **Bug** |
| 5 | `api/server.js` — 5 pontos | `transportador` agora wrapeado com `truncateWords(normalizeEntityLabel(...))` — exibe apenas os 2 primeiros nomes (ex.: "Ac2 Logistica Eireli" → "Ac2 Logistica") | **Melhoria** |

### Corrigido — Proteção Null / Runtime Safety

| # | Arquivo | Linha aprox. | Alteração | Tipo |
|---|---------|--------------|-----------|------|
| 6 | `frontend/src/pages/FrotaCapacidade.tsx` | L72-73 | `f.sprPedidosReal.toFixed(2)` → `(f.sprPedidosReal ?? 0).toFixed(2)` (idem `sprVolumesReal`) | **Bug crítico** |
| 7 | `frontend/src/pages/FrotaCapacidade.tsx` | L274-275 | `row.sprVeiculo.toFixed(2)` → `(row.sprVeiculo ?? 0).toFixed(2)` (idem `row.orh`) | **Bug crítico** |
| 8 | `frontend/src/pages/Transportadores.tsx` | L61-63 | `scatterData`: `t.custoMedioCarga.toFixed(2)` → `(t.custoMedioCarga ?? 0).toFixed(2)`, `t.scoreOperacional.toFixed(1)` → `(t.scoreOperacional ?? 0).toFixed(1)`, `t.entregasEfetivas * 100` → `(t.entregasEfetivas ?? 0) * 100` | **Bug crítico** |
| 9 | `frontend/src/pages/Transportadores.tsx` | tabela | `t.share * 100` → `(t.share ?? 0) * 100`, `t.scoreOperacional.toFixed(1)` → `(t.scoreOperacional ?? 0).toFixed(1)`, `t.entregasEfetivas * 100` → `(t.entregasEfetivas ?? 0) * 100` | **Bug crítico** |
| 10 | `frontend/src/pages/AderenciaAtendimento.tsx` | L258 | Progress bar: `width: \`${f.entregasEfetivas}%\`` → `width: \`${Math.min(f.entregasEfetivas, 100)}%\`` — evita overflow visual >100% | **Bug** |
| 11 | `frontend/src/pages/InvestigacaoOperacional.tsx` | tabela | `r.peso.toLocaleString("pt-BR")` → `(r.peso ?? 0).toLocaleString("pt-BR")` | **Bug** |
| 12 | `frontend/src/pages/MotoristasJornada.tsx` | L29 | `kpis.mediaRotasDia.toFixed(1)` → `(kpis.mediaRotasDia ?? 0).toFixed(1)` | **Bug** |

### Corrigido — Motoristas e Jornada

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 13 | `frontend/src/pages/MotoristasJornada.tsx` | Gráfico de barras filtrado para `horas > 0` — evita série vazia quando rotas do dia atual ainda estão em aberto | **Bug** |
| 14 | `frontend/src/pages/MotoristasJornada.tsx` | Estado vazio atualizado: "Sem dados de jornada registrados nesta página. Rotas do dia mais recente podem ainda estar em andamento." | **UX** |

### BigQuery — Deploy

| View | Status |
|------|--------|
| `base_execucao_canonica` | ✅ Reimplantada com formato de filial canônico (`"09-Jundiai"`) |

### Validado (API local)

| Endpoint | Resultado |
|----------|-----------|
| `GET /api/resumo/cards` | ✅ Card "Qtd Embarques": 356, trend MoM e WoW presentes |
| `GET /api/filtros/opcoes?tipo=filial` | ✅ Labels: "09-Jundiai", "01-São Paulo", "02-Recife" |
| `GET /api/filtros/opcoes?tipo=transportador` | ✅ Labels truncados: "Ac2 Logistica" (era "Ac2 Logistica Eireli") |

---

## [2026-03-25] — Correção de Unidades (Peso/Valor) + Nomes Harmonizados + Fix Gráficos

**Artefatos afetados:** `api/queries.js`, `bigquery/pipeline_dashboard_v7.sql`, `frontend/src/pages/CockpitOperacional.tsx`, `frontend/src/pages/MotoristasJornada.tsx`
**UDF publicada no BigQuery:** `vehicle_weight_capacity` (capacidades atualizadas)

### Corrigido — Unidades de Medida

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 1 | `api/queries.js` — todas as queries | `peso_real_kg / 1000.0` em todas as referências — TMS armazena em **gramas**, não kg | **Bug crítico** |
| 2 | `api/queries.js` — `kpiDiarioQuery`, `frotaOcupacaoQuery`, `transportadoresQuery`, `drillRotasQuery` | `valor_total / 100.0` em todas as referências — TMS armazena em **centavos**, não reais | **Bug crítico** |
| 3 | `bigquery/pipeline_dashboard_v7.sql` — `stg_monitoramento` | `SAFE_CAST(f.Peso AS FLOAT64) / 1000.0 AS peso_real_kg` (fonte) | **Bug crítico** |
| 4 | `bigquery/pipeline_dashboard_v7.sql` — `stg_monitoramento` | Valores de pagamento (`valor_carga`, `valor_rota`, etc.) divididos por 100.0 (fonte) | **Bug crítico** |
| 5 | `bigquery/pipeline_dashboard_v7.sql` — UDF `vehicle_weight_capacity` | Capacidades atualizadas: Van 900→5500, Utilitario 550→4500, Passeio 350→4000 (kg) | **Bug** |
| 6 | `api/queries.js` — `alertasQuery`, `drillRotasQuery` | Recalcula `ocupacaoPeso` inline (`peso_real_kg/1000/capacidade_peso_kg`) em vez de usar `ocup_peso_veiculo` pré-computado | **Bug** |
| 7 | `api/queries.js` — `frotaOcupacaoQuery` | Numerador filtrado para rotas com capacidade: `SUM(IF(capacidade_peso_kg IS NOT NULL, peso_real_kg/1000, NULL))` | **Bug** |

### Corrigido — Frontend

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 8 | `frontend/src/pages/CockpitOperacional.tsx` | Adicionado `h-full` em 6 divs wrapper de gráficos — `ResponsiveContainer` recebia height=0 | **Bug crítico** |
| 9 | `frontend/src/pages/MotoristasJornada.tsx` | Adicionado `TICK_STYLE_SM` ao import de `chartConfig` — causava ReferenceError em runtime | **Bug crítico** |

### Adicionado — Nomes Harmonizados

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 10 | `api/queries.js` — `alertasQuery` | `motorista` → `COALESCE(a.motorista_display, a.motorista)`, `transportador` → `COALESCE(a.transportador_display, ...)` | **Melhoria** |
| 11 | `api/queries.js` — `drillRotasQuery` | `motorista` → `COALESCE(d.motorista_display, d.motorista)`, `transportador` → `COALESCE(d.transportador_display, ...)` | **Melhoria** |
| 12 | `api/queries.js` — `motoristasQuery` + `motoristasCountQuery` | `motorista` → `COALESCE(b.motorista_display, b.motorista)`, `transportador` → `COALESCE(b.transportador_display, ...)` | **Melhoria** |
| 13 | `api/queries.js` — `transportadoresQuery` | `transportador` → `COALESCE(transportador_display, transportador, ...)` | **Melhoria** |

### Métricas Antes/Depois

| KPI | Antes | Depois | Fator |
|-----|-------|--------|-------|
| Peso Total | 1.174.833.130 kg | 1.174.833 kg | ÷1000 |
| Capacidade Utilizada | 585.513,6% | 72,6% | ÷1000 + UDF |
| Custo/Carga | R$ 50.243 | R$ 502 | ÷100 |
| Custo/Volume | R$ 820 | R$ 8,20 | ÷100 |
| Custo/Pedido | R$ 1.056 | R$ 10,56 | ÷100 |
| Valor Total | R$ 17.886.662 | R$ 178.866 | ÷100 |

### Observação — Dupla Conversão

⚠️ `queries.js` aplica `/1000` (peso) e `/100` (valor) para compensar dados brutos do BQ.
`pipeline_dashboard_v7.sql` também tem a correção na fonte.
**Quando o pipeline SQL for reimplantado no BigQuery, remover as conversões do `queries.js`** para evitar dupla conversão. Ver comentário no topo de `queries.js`.

### Validado

| Endpoint | Resultado |
|----------|-----------|
| `GET /api/resumo/cards` | ✅ Capacidade Utilizada: 0.726 (72,6%), Peso Total: 1.174.833 kg |
| `GET /api/kpi-diario` | ✅ custoMedioCarga: R$ 502, custoMedioVolume: R$ 8,20 |
| `GET /api/frota/ocupacao-tipo` | ✅ Utilitário: 75,8%, Passeio: 83,3%, Van: 67,6% |
| `GET /api/executivo/serie-diaria` | ✅ ocupacaoPeso: 0.75, 9 data points |

---

## [2026-03-25] — Correção de Bugs Críticos + Deploy Revisão 00045-hg5

**Artefatos afetados:** `api/queries.js`, `api/helpers.js`, `api/server.js`, `frontend/src/types/api.ts`, `docs/CATALOGO_MEDIDAS_CANONICO.md`, `docs/PIPELINE_BIGQUERY_CANONICO.md`
**Cloud Run revision:** `dashboard-logistico-api-00045-hg5`

### Corrigido

| # | Arquivo | Alteração | Tipo |
|---|---------|-----------|------|
| 1 | `api/queries.js` — `alertasQuery` | `a.ocup_volumes` → `a.aderencia_volumes` — coluna removida na refatoração v7 causava HTTP 500 | **Bug crítico** |
| 2 | `api/queries.js` — `motoristasQuery` | Reestruturado para CTE de 2 níveis: `motorista_dia` agrega primeiro, `CROSS JOIN metas_pivot_canonico` fora — impedia correct GROUP BY | **Bug** |
| 3 | `api/queries.js` — `filterTransportadoresQuery` | Adicionado `COALESCE(b.transportador_display, b.transportador) AS label` — dropdown exibia nome bruto sem `label` | **Gap** |
| 4 | `api/helpers.js` — `buildCanonWhere` | `normalizeEntityKey(...)`  → `normalizeEntityKey(...).toLowerCase()` — `normalize_text` BQ UDF retorna lowercase mas comparação era UPPERCASE; filtro nunca batia | **Bug silencioso** |
| 5 | `api/helpers.js` — `buildCanonAlertWhere` | Mesma correção de lowercase para param `transportador` | **Bug silencioso** |
| 6 | `api/server.js` — filtros/opcoes | Transportadores agora usam `row.label` em vez de `row.value` no `normalizeEntityLabel` | **Bug** |
| 7 | `frontend/src/types/api.ts` — `FilialPerformance` | Adicionado `regiao?: string \| null` — server.js envia o campo mas type não declarava | **Type gap** |
| 8 | `frontend/src/types/api.ts` — `Alerta` | `regiao: string` → `regiao: string \| null` (pode ser null se filial não está em dim_filial) | **Type error** |
| 9 | `frontend/src/types/api.ts` — `Alerta` | `matchTemporal: string` → `matchTemporal: string \| null` (server.js hardcodes null) | **Type error** |

### Documentação Atualizada

| Documento | Seções adicionadas/modificadas |
|-----------|-------------------------------|
| `docs/CATALOGO_MEDIDAS_CANONICO.md` | Seção 4.1.1 — KPIs row-level em `base_execucao_canonica`; Seção 4.1.2 — colunas display/key; Seção 11 — observações v7 no-marts; Seção 12 — artefatos ativos |
| `docs/PIPELINE_BIGQUERY_CANONICO.md` | Seção 5.1 — tabela de UDFs ativas (12 UDFs); Seção 5.2 — schema completo de `base_execucao_canonica` |

### Validado

| Endpoint | Resultado |
|----------|-----------|
| `GET /api/alertas?limit=2` | ✅ HTTP 200, 1371 alertas (antes: HTTP 500) |
| `GET /api/motoristas?limit=2` | ✅ HTTP 200, 2265 motoristas, `scoreOperacional` calculado |
| `GET /api/filtros/opcoes` | ✅ transportadores com `label` (Initcap) e `value` (UPPERCASE) |

---

## [2026-03-24] — Ruptura Controlada: Eliminação de Artefatos Sheets

**Artefatos afetados:** `bigquery/pipeline_dashboard_v7.sql`, `api/queries.js`, `api/server.js`, `docs/CATALOGO_MEDIDAS_CANONICO.md`, `docs/PIPELINE_BIGQUERY_CANONICO.md`, `docs/VOCABULARIO_SEMANTICO.md`
**Ref. completa:** `docs/_archive/RELATORIO_RUPTURA_CONTROLADA_2026-03-24.md`

### Removido

| Arquivo | Elemento | Motivo |
|---------|----------|--------|
| `pipeline_dashboard_v7.sql` | Aliases `km_realizado`, `km_planejado` | Duplicavam `km_real`, `km_plan` |
| `pipeline_dashboard_v7.sql` | Aliases `tempo_realizado_h_final`, `tempo_planejado_h_final` | Sem consumidores — DEAD CODE |
| `pipeline_dashboard_v7.sql` | Coluna `ocup_volumes` (calculava `adherence_ratio`) | Confusão semântica — aderência ≠ ocupação |

### Renomeado / Corrigido

| Arquivo | De | Para |
|---------|----|------|
| `api/queries.js` (6 ocorrências) | `km_realizado` | `km_real` |
| `api/queries.js` (3 ocorrências) | `km_planejado` | `km_plan` |
| `api/queries.js` (4 ocorrências) | `ocup_volumes` | `aderencia_volumes` |
| `api/queries.js` — `frotaOcupacaoQuery` | `SAFE_DIVIDE` nativo | UDF `safe_div` |
| `api/queries.js` — `kpiDiarioQuery` | `ordered_fallback` WHERE idêntico ao `ordered_complete` | WHERE relaxado (`entregas > 0` sem `tempoOperacionalTotal > 0`) |
| `api/server.js` — `orderMap` | `d.km_realizado` | `d.km_real` |

### Documentação Corrigida

| Documento | Correção |
|-----------|----------|
| `VOCABULARIO_SEMANTICO.md` | Metas corrigidas: SPR 42→67, Entregas 0.97→0.98, Rotas 0.85→0.95, ORH 6.0→7.0, Ocupação 0.80→0.85, DPPH 7.0→9.57 |
| `CATALOGO_MEDIDAS_CANONICO.md` | Seção 3.2 reescrita sem refs a marts inexistentes; 17 KPIs atualizados |
| `PIPELINE_BIGQUERY_CANONICO.md` | Removida referência a `pipeline_sheets_v8.sql`; corrigido "15→10 endpoints"; seção MARTS substituída |

### Arquivados (→ `docs/_archive/`)

7 documentos temporários/supersedidos movidos: `RELATORIO_RUPTURA_SHEETS_2026-03-23.md`, `PLANO_MELHORIAS_UX_2026-03-23.md`, `STATUS_MELHORIAS_2026-03-23.md`, `PROMPT_MELHORIA_VISUAL_CLAUDE_CODE.md`, `PROMPT_VALIDACAO_CLAUDE_CODE.md`, `ORGANIZACAO_PROJETO.md`, `lovable-sync.log`

---

## [2026-03-23] — Refatoração v7: Colunas Canônicas + Novos KPIs

**Artefatos afetados:** `bigquery/pipeline_dashboard_v7.sql`, `api/queries.js`, `api/server.js`

### Adicionado

| Artefato | Elemento | Descrição |
|----------|----------|-----------|
| `pipeline_dashboard_v7.sql` | `filial_code_canonical(val)` UDF | Extrai código numérico: `'PetLog01 SP'` → `'01'` |
| `pipeline_dashboard_v7.sql` | `filial_codigo` coluna | `filial_code_canonical(filial_raw)` em `base_execucao_canonica` |
| `pipeline_dashboard_v7.sql` | `motorista_display` | `INITCAP(LOWER(TRIM(motorista)))` |
| `pipeline_dashboard_v7.sql` | `transportador_display` | `INITCAP(LOWER(TRIM(transportador)))` |
| `pipeline_dashboard_v7.sql` | `semana_referencia` | `FORMAT_DATE('%G-W%V', data_referencia)` |
| `pipeline_dashboard_v7.sql` | `motorista_key_canonico`, `transportador_key_canonico` | Chaves normalizadas para joins e filtros |
| `pipeline_dashboard_v7.sql` | `aderencia_pedidos`, `aderencia_peso`, `aderencia_km`, `aderencia_tempo` | Medidas de aderência por dimensão |
| `pipeline_dashboard_v7.sql` | `ocup_peso_veiculo`, `dpph`, `custo_por_pedido`, `custo_por_volume` | KPIs row-level |
| `pipeline_dashboard_v7.sql` | `pct_entrega_efetiva`, `flag_rota_concluida`, `flag_nao_planejada` | Flags de status operacional |

### Removido

| Artefato | Elemento | Motivo |
|----------|----------|--------|
| `pipeline_dashboard_v7.sql` | `tempo_planejado_h`, `valor_parada`, `valor_ajudante` | Sempre zero nos dados reais |

---

## [2026-03-22] — Timezone Fix + Rebuild Documentação Canônica

**Artefatos afetados:** `api/helpers.js`, `docs/*.md`, `bigquery/pipeline_dashboard_v7.sql`

### Corrigido

| Arquivo | Alteração |
|---------|-----------|
| `api/helpers.js` — `buildTemporalWhere` / defaults | Timestamps sem `AT TIME ZONE` → adicionado `DATETIME(... , 'America/Sao_Paulo')` para BRT correto |
| `pipeline_dashboard_v7.sql` | Derivação de `data_referencia` passa a considerar offset BRT |

### Adicionado

| Documento | Descrição |
|-----------|-----------|
| `docs/ESTRUTURA_CANONICA_PROJETO.md` | Documento mestre de arquitetura: infraestrutura, fluxo, diretórios, todos os endpoints, stack frontend |
| `docs/CATALOGO_MEDIDAS_CANONICO.md` | Catálogo completo de KPIs com fórmulas, camada, metas |
| `docs/PIPELINE_BIGQUERY_CANONICO.md` | Documentação pipeline v7: decisões arquiteturais, responsabilidades por camada |
| `docs/VOCABULARIO_SEMANTICO.md` | Dicionário SQL → API → Frontend com metas canônicas |
| `docs/data_contract_frontend.md` | Contrato detalhado API → Frontend |
| `docs/matriz_contrato_front_api_bq.md` | Rastreabilidade hook → endpoint → BigQuery |

---

## [2026-03-20] — Deploy Inicial v7 (Cloud Run API + Pipeline SQL)

### Adicionado

| Artefato | Descrição |
|----------|-----------|
| `bigquery/pipeline_dashboard_v7.sql` | Pipeline unificado: 11 UDFs + 6 views (substituiu v4/v5/v6) |
| `bigquery/deploy_v7_dashboard.py` | Script de deploy: lê SQL, executa 18 statements, valida objetos |
| `api/server.js` | API REST Express — 16 endpoints, todas fontes `base_execucao_canonica` |
| `api/queries.js` | 20 query builders SQL com helpers `scoreExpr()`, `sd()`, `ar()`, `stdAggCols()` |
| `api/helpers.js` | 24 funções: `buildCanonWhere`, `buildCanonAlertWhere`, `normalizeEntityKey`, filtros temporais |
| `pipeline/run_pipeline.mjs` | Orquestrador Cloud Run Job (4 stages): GCS dims → Playwright → Python → BQ load |
| `frontend/` | Frontend React 18 + Vite + TanStack Query + shadcn/ui (migrado de PowerBI) |

### Arquitetural

- Eliminação da camada de marts materializada (v4/v5/v6 legado)
- API agrega inline via `queries.js` (substitui `mart_diario_canonico`, `mart_filial_dia` etc.)
- Google Sheets arquivado (`google_apps/` → `_archive/`)
- Cloud Scheduler automatiza pipeline Seg-Sex 8h BRT
- Firebase Hosting para frontend

---

## Backlog / Itens Pendentes

| Prioridade | Item | Arquivo | Impacto |
|------------|------|---------|---------|
| Alta | `peso_real_kg` em gramas no TMS — `ocup_peso_veiculo` retorna ~8961 ao invés de ~0.89 | `bigquery/pipeline_dashboard_v7.sql` → `stg_monitoramento` | `FrotaCapacidade`, `alertas` mostram valores incorretos |
| Média | `nomeFilial` nunca usa `dim_filial.nome_filial` — todos queries usam `b.filial AS nomeFilial` | `api/queries.js` | Display names de filial não enriquecidos |
| Média | Endpoint `/api/semanas` — série por `semana_referencia` para tendência ISO | `api/server.js` + `api/queries.js` | Dashboard de analytics semanal |
| Baixa | `filial_codigo` exposto em `filterFiliaisQuery` — atualmente não retornado | `api/queries.js` — `filterFiliaisQuery` | Filtro/ordenação por código de filial |

---

## Legenda de Tipos

| Tipo | Descrição |
|------|-----------|
| `Bug crítico` | Erro que causa falha de endpoint (HTTP 4xx/5xx) |
| `Bug` | Comportamento incorreto sem falha visível |
| `Bug silencioso` | Bug que não gera erro mas produz resultado errado |
| `Gap` | Funcionalidade ausente que deveria existir |
| `Type error` | Tipo TypeScript divergente da implementação real |
| `Cleanup` | Remoção de código morto ou redundante |
| `Rename canônico` | Renomeação para padronização semântica |
