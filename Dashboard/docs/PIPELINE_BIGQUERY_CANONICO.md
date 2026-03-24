# Pipeline BigQuery Canônico

Projeto: data-aileron-482822-d0.monitoramento_carga
Data: 2026-03-22
Status: documento canônico único para a camada de dados BigQuery

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
| bigquery/pipeline_dashboard_v7.sql | ativo | camada completa Dashboard: staging, dim, base, metas, UDFs |
| bigquery/load_raw_to_bq.py | ativo | carga raw via bq load --replace |
| bigquery/validate_pipeline.py | ativo | validação de integridade (row counts, freshness, KPI sanity) |
| bigquery/validate_data_contract.py | ativo | validação de schemas e valores canônicos de metas |
| api/queries.js | ativo | agregações inline SQL para todos os endpoints |
| api/server.js | ativo | 10 endpoints REST consumindo queries.js |
| api/helpers.js | ativo | filtros, parsing, defaults temporais |

**Arquivos descontinuados (arquivados em bigquery/_archive/):**

- pipeline_sheets_v8.sql, sync_bq_to_sheets.py (Sheets consome views separadamente se necessário)
- pipeline_v4.sql, pipeline_v5_publicacao.sql, pipeline_v6_api.sql
- deploy_v4.py, deploy_v5_publicacao.py, deploy_v6_api.py

---

## 6. Ordem Oficial de Execução (v7)

1. **Extrair dados do TMS** (scripts/extraction/extrair_relatorio_tms.mjs ou consolidar_monitoramento.py)
2. **Opcional: persistir em GCS** quando ambiente é efêmero (usa TMS_GCS_BUCKET, TMS_GCS_PREFIX)
3. **Carregar raw** via bigquery/load_raw_to_bq.py (executa bq load --replace para 3 tabelas)
4. **Deploy pipeline v7** executando pipeline_dashboard_v7.sql no BigQuery Console ou via bq query
5. **Validar integridade** via bigquery/validate_pipeline.py (row counts, freshness, dedup, KPI sanity)
6. **Validar contratos** via bigquery/validate_data_contract.py (schemas, metas canônicas, ranges)

### 6.1 Persistencia intermediaria recomendada

Quando a extracao do TMS roda fora da maquina local, os CSVs intermediarios devem ser persistidos em um bucket GCS configurado por variaveis de ambiente:

- TMS_GCS_BUCKET
- TMS_GCS_PREFIX

Convencao operacional:

- incrementais: gs://bucket/prefix/incrementais/
- processados: gs://bucket/prefix/processados/
- consolidado: gs://bucket/prefix/consolidado/Relatorio_Monitoramento_Carga_Completo.csv
- backups: gs://bucket/prefix/backups/

O diretorio local data/ continua como espelho de trabalho, mas a persistencia entre execucoes deixa de depender do disco do runner.

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

**Localização:** Aplicada em `dim_planejamento` antes do JOIN com `fct_execucao`

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

**Impacto:** `mart_motorista_dia_canonico` e derivados agregam corretamente motoristas com mesmo CPF mas nomes diferentes.

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

**Impacto:** `mart_transportador_dia_canonico` inclui linha 'SEM_TRANSPORTADOR' quando aplicável.

---

## 8. Regras Operacionais Obrigatórias

1. KPI não pode ser recalculado em server.js se já existir em mart canônico.
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

## 11. Próxima Etapa Técnica

O próximo avanço estrutural esperado é:

- reduzir a carga semântica espalhada entre v5, v6 e server.js
- aproximar a implementação física do desenho canônico definido em docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md

Até lá, toda evolução da camada BigQuery deve ser registrada aqui e não em novos documentos por versão.
