# Pipeline BigQuery Canônico

Projeto: data-aileron-482822-d0.monitoramento_carga
Data: 2026-03-25
Status: documento canônico único para a camada de dados BigQuery — atualizado para refatoração v7 (2026-03-23)

---

## 1. Propósito

Este é o documento único e ativo para descrever a camada BigQuery do projeto.

Ele substitui documentação separada por versão para fins operacionais e arquiteturais. Os arquivos físicos podem continuar nomeados com v4, v5 e v6 por compatibilidade, mas a interpretação oficial do pipeline passa a ser unificada.

Regras de governança:

- não criar novos documentos de pipeline com nomes versionados
- não abrir documentação separada por v4, v5 ou v6 para descrever o estado ativo
- quando o pipeline mudar, atualizar este documento e os contratos canônicos relacionados

---

## 2. Visão Canônica da Arquitetura

Fluxo lógico oficial:

RAW -> STAGING -> BASE_EXECUCAO_CANONICA -> API (agregação dinâmica via queries.js)

Mapeamento para os artefatos físicos atuais (arquitetura v7):

| Camada lógica | Artefato físico atual | Papel canônico |
| --- | --- | --- |
| RAW | raw_monitoramento, raw_planejamento, raw_dim_filial | preservar a origem |
| STAGING | pipeline_dashboard_v7.sql: stg_monitoramento, stg_planejamento | normalizar, parse de tipos, dedup |
| DIMENSÃO | pipeline_dashboard_v7.sql: dim_filial | enriquecer com metadados de filial |
| BASE_EXECUCAO_CANONICA | pipeline_dashboard_v7.sql: base_execucao_canonica | consolidar a linha operacional por id_carga |
| METAS | pipeline_dashboard_v7.sql: metas_globais, metas_pivot_canonico | fonte única de metas |
| API | api/queries.js + api/server.js + api/helpers.js | agregação dinâmica direto de base_execucao_canonica |

**Decisão arquitetural v7:**

- **Marts eliminados**: Não há mais views mart_diario_canonico, mart_filial_dia, etc.
- **API agrega inline**: queries.js contém SQL que agrega diretamente de base_execucao_canonica
- **Simplicidade vs validação**: Deploy mais simples mas perde camada intermediária validável
- **Pipeline único**: v7 é o único pipeline ativo; artefatos de Sheets foram arquivados

---

## 3. Fonte de Verdade

Fonte de verdade do projeto:

- dado raiz carregado nas tabelas raw

Fonte de verdade semântica:

- docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md
- docs/SCHEMA_RAW_CANONICO.md
- docs/CATALOGO_MEDIDAS_CANONICO.md

Fonte de verdade operacional da camada BigQuery:

- este documento

Fonte de verdade contratual para frontend e API:

- docs/data_contract_frontend.md
- docs/matriz_contrato_front_api_bq.md

---

## 4. Responsabilidades por Camada

### 4.1 RAW

Responsável por:

- armazenar monitoramento, planejamento e dimensão de filial carregados no BigQuery
- manter fidelidade com a origem

Não deve:

- carregar semântica de KPI
- carregar nomes visuais

### 4.2 NORMALIZACAO

Responsável por:

- parse de tipos, datas, durações e decimais
- padronização textual
- derivadas atômicas determinísticas

Não deve:

- calcular score operacional agregado
- formatar dados para consumo visual

### 4.3 BASE_EXECUCAO_CANONICA

Responsável por:

- expor o registro operacional reconciliado por id_carga
- anexar atributos auxiliares de calendário, filial e planejamento
- disponibilizar medidas atômicas auditáveis

### 4.4 API (substitui MARTS)

Na arquitetura v7, a API (queries.js) substitui a camada de marts.

Responsável por:

- calcular KPIs por grão sob demanda (inline SQL)
- carregar metas, status e score segundo a regra central
- suportar filtros dinâmicos e paginação

Grãos suportados (via queries.js, não materialized):

- diário (kpiDiarioQuery, serieDiariaQuery)
- filial (filiaisPerformanceQuery)
- transportador (transportadoresQuery)
- motorista (motoristasQuery, motoristasKpisQuery)
- tipo veículo (frotaOcupacaoQuery)

### 4.5 (PUBLICACAO — descontinuada)

Na v7, não há camada de publicação separada.
Artefatos de publicação (kpi_resumo_diario, Resumo_Filial, etc.) foram arquivados.
O frontend consome diretamente a API.

### 4.5 API ENDPOINTS

Responsável por:

- expor endpoints estáveis
- aplicar filtros, paginação e serialização
- converter snake_case SQL → camelCase JSON

Não deve:

- reimplementar lógica analítica já presente nos marts

---

## 5. Arquivos Físicos Ativos (Arquitetura v7)

| Arquivo | Situação | Uso |
| --- | --- | --- |
| pipeline/run_pipeline.mjs | ativo | orquestrador Cloud Run Job (5 etapas) |
| extraction/extrair_planejamento.py | ativo | extração planejamento de rotas do Google Sheets |
| extraction/extrair_relatorio_tms.mjs | ativo | extração TMS via Playwright |
| extraction/consolidar_monitoramento.py | ativo | consolidação CSVs incrementais + backup GCS |
| bigquery/load_raw_to_bq.py | ativo | carga raw via Python API (WRITE_TRUNCATE) |
| bigquery/pipeline_dashboard_v7.sql | ativo | camada completa: staging, dim, base, metas, UDFs |
| bigquery/deploy_v7_dashboard.py | ativo | script de deploy do pipeline v7 |
| bigquery/validate_pipeline.py | ativo | validação de integridade (row counts, freshness, KPI sanity) |
| bigquery/validate_data_contract.py | ativo | validação de schemas e valores canônicos de metas |
| api/queries.js | ativo | agregações inline SQL para todos os endpoints |
| api/server.js | ativo | 13 endpoints REST consumindo queries.js |
| api/helpers.js | ativo | filtros, parsing, defaults temporais, buildCanonWhere |

**Arquivos descontinuados (arquivados em bigquery/_archive/):**

- pipeline_sheets_v8.sql, sync_bq_to_sheets.py (Sheets consome views separadamente se necessário)
- pipeline_v4.sql, pipeline_v5_publicacao.sql, pipeline_v6_api.sql
- deploy_v4.py, deploy_v5_publicacao.py, deploy_v6_api.py

---

## 5.1 UDFs Ativas em pipeline_dashboard_v7.sql

| UDF | Assinatura | Descrição |
| --- | --- | --- |
| normalize_text | (val STRING) → STRING | lowercase + strip acentos + trim |
| safe_div | (num FLOAT64, den FLOAT64) → FLOAT64 | divisão segura retorna NULL quando den=0 |
| adherence_ratio | (real FLOAT64, plan FLOAT64) → FLOAT64 | LEAST(1.0, safe_div(real, plan)) |
| status_higher | (val FLOAT64, meta FLOAT64) → STRING | OK/Atencao/Critico/Informativo |
| status_target_band | (val, target, att_gap, crit_gap FLOAT64) → STRING | banda de alvo (usado para ORH) |
| capacity_status | (val FLOAT64) → STRING | Saturado/Critico/Atencao/OK para ocupação |
| status_score | (s STRING) → FLOAT64 | mapeia status textual para 0.0/0.5/1.0 |
| fn_score_operacional | (6x STRING) → FLOAT64 | score médio via status_score (0–100) |
| vehicle_type_canonical | (raw_type STRING) → STRING | normaliza tipo veículo: Van, Utilitario, Passeio |
| vehicle_weight_capacity | (tipo STRING) → FLOAT64 | capacidade kg por tipo de veículo |
| motorista_key_canonical | (cpf, nome STRING) → STRING | chave de dedup motorista: CPF ou normalize_text(nome) |
| filial_code_canonical | (val STRING) → STRING | extrai código numérico da filial: 'PetLog01' → '01' |

## 5.2 Schema de base_execucao_canonica (colunas principais)

Grão: 1 linha por id_carga (rota individual).

| Coluna | Tipo | Origem | Descrição |
| --- | --- | --- | --- |
| id_carga | STRING | raw_monitoramento | chave primária da rota |
| data_referencia | DATE | derivada ts_carregamento / dtabertura | data canônica de execução |
| filial | STRING | dim_filial.filial_nome | nome formatado da filial |
| filial_key | STRING | normalize_text(filial_raw) | chave de join |
| filial_codigo | STRING | filial_code_canonical(filial_raw) | código numérico '01'–'16' |
| tipo_filial | STRING | dim_filial.tipo | 'Unidade' ou outro |
| regiao | STRING | dim_filial.regiao | região geográfica |
| transportador | STRING | raw_monitoramento | nome bruto |
| transportador_display | STRING | INITCAP(LOWER(TRIM(transportador))) | nome formatado para exibição |
| transportador_key_canonico | STRING | COALESCE(normalize_text(transportador), 'SEM_TRANSPORTADOR') | chave de join |
| motorista | STRING | raw_monitoramento | nome bruto |
| motorista_display | STRING | INITCAP(LOWER(TRIM(motorista))) | nome formatado para exibição |
| motorista_key_canonico | STRING | motorista_key_canonical(cpf, nome) | chave de dedup motorista |
| tipo_veiculo | STRING | vehicle_type_canonical(tipo_veiculo_raw) | Van / Utilitario / Passeio |
| capacidade_peso_kg | FLOAT64 | vehicle_weight_capacity(tipo_veiculo) | capacidade física inferida |
| semana_referencia | STRING | FORMAT_DATE('%G-W%V', data_referencia) | semana ISO ex: '2026-W12' |
| pct_entrega_efetiva | FLOAT64 | safe_div(entregues, entregues+insucessos) | efetividade de entrega row-level |
| aderencia_volumes | FLOAT64 | adherence_ratio(volumes, volumes_plan) | NULL sem planejamento |
| aderencia_pedidos | FLOAT64 | adherence_ratio(pedidos, pedidos_plan) | NULL sem planejamento |
| aderencia_peso | FLOAT64 | adherence_ratio(peso, peso_plan) | NULL sem planejamento |
| aderencia_km | FLOAT64 | adherence_ratio(km, km_plan) | NULL sem planejamento |
| aderencia_tempo | FLOAT64 | adherence_ratio(tempo, tempo_plan) | NULL sem planejamento |
| ocup_peso_veiculo | FLOAT64 | safe_div(peso_real_kg, capacidade_peso_kg) | ocupação física do veículo |
| dpph | FLOAT64 | safe_div(entregues, tempo_operacional_h) | entregas por hora |
| custo_por_pedido | FLOAT64 | safe_div(valor_total, qtd_pedidos) | custo unitário row-level |
| custo_por_volume | FLOAT64 | safe_div(valor_total, qtd_volumes) | custo unitário row-level |

O pipeline roda automaticamente via Cloud Run Job `pipeline-tms-bq` (Cloud Scheduler: `0 8 * * 1-5` BRT).
Orquestrador: `pipeline/run_pipeline.mjs`

### 6.0 Etapa 0 — Download dimensões do GCS

Baixa arquivos de `gs://petlove-tms-data/tms-monitoramento/dimensoes/` para `/app/data/tab_auxiliar/`.

### 6.1 Etapa 1 — Extração planejamento (Google Sheets)

Script: `extraction/extrair_planejamento.py`

- **Fonte**: Google Sheets `1zANDyZMZIdVp22C-RgPw3yu4L97rEJ5XYZnTj0TZDBw` (aba GID `63799993`)
- **Autenticação**: `google.auth.default()` (SA do Cloud Run)
- **Filtro**: apenas linhas com Data no ano 2026
- **Conversões**: datas Excel serial → ISO, tempo fracção → HH:MM:SS
- **Saída**: `data/planejamento_2026.csv` (9 colunas: Filial, Cluster, Data, Lista, Pedidos, Volume, Km, Tempo de Rota, Peso)
- **Rename no load**: Cluster→Rota, Data→Data Planejada, Lista→Id Carga (para casar com schema BQ)
- **Pré-requisitos**: Sheets API habilitada; planilha compartilhada com a SA `pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com`

### 6.2 Etapa 2 — Extração TMS (Playwright)

Script: `extraction/extrair_relatorio_tms.mjs`

- Login automático no TMS com credenciais de Secret Manager (TMS_USER, TMS_PASS)
- Download de CSVs incrementais por período (PIPELINE_DAYS_BACK dias)
- Saída: `data/Relatorio_Monitoramento_Carga/*.csv`

### 6.3 Etapa 3 — Consolidação

Script: `extraction/consolidar_monitoramento.py`

- Concatena incrementais em `_Completo.csv`
- Remove sobreposições por período
- Move processados para `_processados/`
- Backup e upload para GCS

### 6.4 Etapa 4 — Carga raw no BigQuery

Script: `bigquery/load_raw_to_bq.py` (Python API, WRITE_TRUNCATE)

3 tabelas carregadas:

- `raw_monitoramento` ← `Relatorio_Monitoramento_Carga_Completo.csv`
- `raw_planejamento` ← `planejamento_2026.csv`
- `raw_dim_filial` ← `tab_auxiliar/dim_filial.xlsx`

Após a carga, as views staging e base_execucao_canonica atualizam automaticamente.

### 6.5 Validação (pós-pipeline)

- `bigquery/validate_pipeline.py` — row counts, freshness, dedup, KPI sanity
- `bigquery/validate_data_contract.py` — schemas, metas canônicas, ranges

---

## 7. Regras de Deduplicação Obrigatórias

### 7.1 Deduplicação do Planejamento

**Problema:** raw_planejamento pode conter múltiplos registros por id_carga, resultando em métricas planejadas infladas quando agregadas sem deduplicação.

**Solução implementada:**

```sql
ROW_NUMBER() OVER (
  PARTITION BY planning_key
  ORDER BY data_planejada DESC, id_carga DESC
) = 1
```

**Localização:** Aplicada em `stg_planejamento` antes do JOIN com `base_execucao_canonica`

**Regra de negócio:** Quando existem múltiplas linhas para o mesmo planning_key (id_carga + filial_key), prevalece o registro com data_planejada mais recente.

**Validação:** Executar query de contagem de duplicatas antes/depois:

```sql
SELECT
  planning_key,
  COUNT(*) AS n
FROM stg_planejamento
GROUP BY 1
HAVING COUNT(*) > 1
```

**Impacto:** Métricas `volumes_plan`, `pedidos_plan`, `peso_plan_kg`, `km_plan`, `tempo_plan_h` deixam de ser infladas por duplicação.

### 7.2 Canonização da Chave de Motorista

**Problema:** Motoristas podem aparecer com o mesmo CPF mas nomes ligeiramente diferentes, ou sem CPF mas com nomes normalizados diferentes, levando a agregações incorretas.

**Solução implementada:**

**UDF canônica:**

```sql
CREATE OR REPLACE FUNCTION motorista_key_canonical(cpf STRING, nome STRING) AS (
  COALESCE(
    NULLIF(TRIM(cpf), ''),
    normalize_text(nome)
  )
);
```

**Localização UDF:** `bigquery/_deploy/13_udf_motorista_key_canonical.sql`

**Coluna derivada:** `motorista_key_canonico` em `base_execucao_canonica`

**Uso obrigatório:** TODOS os marts por motorista devem usar `motorista_key_canonico` em GROUP BY, nunca `motorista` ou `cpf_motorista` isoladamente.

**Regra de negócio:**

- Se CPF disponível e não vazio: usa CPF como chave
- Se CPF NULL ou vazio: usa normalize_text(nome) como chave
- Motoristas com mesmo CPF são sempre o mesmo motorista, independente de variações no nome

**Validação operacional:**

- Alertar quando > 20% dos registros usam fallback para nome (CPF ausente)
- CPF deve ser tratado com zero à esquerda preservado

**Impacto:** `base_execucao_canonica` agrega corretamente motoristas com mesmo CPF mas nomes diferentes, via coluna `motorista_key_canonico`.

### 7.3 Canonização da Chave de Transportador

**Problema:** Registros sem transportador (NULL) eram aceitos silenciosamente, dificultando análise de completude.

**Solução implementada:**

```sql
COALESCE(
  NULLIF(normalize_text(transportador), ''),
  'SEM_TRANSPORTADOR'
) AS transportador_key_canonico
```

**Localização:** Coluna `transportador_key_canonico` em `base_execucao_canonica`

**Uso obrigatório:** Marts por transportador devem usar `transportador_key_canonico`

**Regra de negócio:**

- Transportador NULL ou vazio é tratado como categoria explícita 'SEM_TRANSPORTADOR'
- Permite rastreamento e análise de registros com dado faltante

**Impacto:** `base_execucao_canonica` inclui coluna `transportador_key_canonico` com valor 'SEM_TRANSPORTADOR' quando aplicável.

---

## 8. Regras Operacionais Obrigatórias

1. KPIs são calculados exclusivamente em `queries.js` agregando de `base_execucao_canonica`.
2. Percentuais publicados na API ficam em fração 0-1.
3. DPPH oficial usa entregues por hora.
4. Ocupação física oficial usa peso real por capacidade do veículo.
5. Score operacional só pode usar a composição oficial documentada.
6. Qualquer mudança de fórmula exige atualização conjunta deste documento, do plano estrutural e dos contratos.
7. Qualquer mudança em coluna raw, parse ou chave exige atualização do schema raw canônico.
8. Toda chave de agrupamento (filial, transportador, motorista) deve usar a versão canonizada quando disponível.
9. Deduplicação de planejamento é obrigatória antes de JOIN com execução.

---

## 9. Antipadrões Proibidos

- criar documentação nova chamada v7, v8 ou similar para descrever o pipeline ativo
- duplicar regra semântica em README, documento avulso e contrato sem referência única
- publicar documento de deploy como se ele fosse a visão arquitetural principal
- usar Google Sheets como referência de semântica

---

## 10. Histórico Documental

Documento arquivado que deixa de ser a referência principal:

- docs/_archive/PIPELINE_V4_DOCUMENTACAO.md

Documento que deixa de existir como categoria ativa separada:

- documentação exclusiva de v5 como documento operacional do estado corrente

Motivo do arquivamento:

- descreve um estado de deploy por versão
- não atende à necessidade atual de uma visão única, contínua e canônica

Motivo da absorção de v5 no documento canônico:

- a camada de publicação continua existindo fisicamente no SQL
- a sua descrição operacional passa a fazer parte da visão única do pipeline e não de um documento isolado

---

## 11. Próximas Evoluções Previstas

A arquitetura v7 esta consolidada. Evoluções previstas:

- Expor filial_codigo nos endpoints de filtro para seleção por código no frontend
- Adicionar endpoint /api/semanas para agrupamento por semana_referencia
- Avaliar materialization de motoristasQuery se latencia de resposta aumentar com volume
