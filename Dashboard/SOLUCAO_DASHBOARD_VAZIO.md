# Solução: Dashboard Vazio - Correção Completa do Fluxo de Dados

**Data:** 22 de março de 2026
**Problema:** Dashboard não retornava nenhuma medida
**Status:** ✅ RESOLVIDO

---

## 📋 Resumo Executivo

O dashboard estava completamente vazio devido a **desconexão crítica entre BigQuery, API e Frontend**. A refatoração recente para pipelines v7/v8 deixou dependências não resolvidas que impediam o fluxo de dados.

### Problema Raiz Identificado

1. **Pipeline v7 incompleto**: Criava `metas_globais`, mas API esperava `pub_metas` e `metas_pivot_canonico`
2. **Flags críticas ausentes**: `flag_sem_tempo`, `flag_entrega_critica`, `flag_match_critico` não existiam
3. **Incompatibilidade de tipos**: Views staging (stg_monitoramento, stg_planejamento) tentavam aplicar TRIM/PARSE em campos já tipados (TIMESTAMP, DATE, INTEGER)
4. **Aliases faltando**: Campos `km_realizado`, `km_planejado` eram referenciados pela API mas não existiam
5. **CORS bloqueando**: API não permitia requisições do frontend em portas de desenvolvimento

---

## 🔧 Soluções Implementadas

### Fase 1-3: BigQuery - Pipeline v7 Completo

#### Arquivos Criados/Modificados

**1. `Dashboard/bigquery/pipeline_dashboard_v7.sql`** (378 linhas)
- Pipeline completo e auto-suficiente para o dashboard
- Substitui dependências de v4, v5, v6

**Objetos criados (18 total):**

**UDFs (11):**
1. `normalize_text` - Normalização de texto (lowercase, sem acentos)
2. `safe_div` - Divisão segura (null-safe)
3. `adherence_ratio` - Cálculo de aderência (min 1.0)
4. `status_higher` - Status comparativo (higher is better)
5. `status_target_band` - Status com banda de tolerância
6. `capacity_status` - Status de capacidade (saturação)
7. `status_score` - Conversão status → score numérico
8. `fn_score_operacional` - Score operacional composto (6 fatores)
9. `vehicle_type_canonical` - Normalização tipo de veículo
10. `vehicle_weight_capacity` - Capacidade de peso por tipo
11. `motorista_key_canonical` - Chave canônica motorista (CPF ou nome)

**Views Core (5):**
1. `stg_monitoramento` - Staging de raw_monitoramento (parse + normalização)
2. `stg_planejamento` - Staging de raw_planejamento (deduplicação)
3. `dim_filial` - Dimensão de filiais (enriquecimento)
4. `metas_globais` - Metas KPI (7 metas hard-coded)
5. `base_execucao_canonica` - **Tabela atômica principal** (28.635 rotas)

**Views Derivadas (2):**
1. `pub_metas` - Alias de metas_globais (compatibilidade API)
2. `metas_pivot_canonico` - Metas pivotadas para scoring

#### Correções Aplicadas

**A) Tratamento de Tipos em Staging**

**Problema:** raw_monitoramento e raw_planejamento tinham campos já tipados, mas o SQL tentava aplicar TRIM/PARSE.

**Correção em stg_monitoramento:**
```sql
-- ANTES (causava erro):
SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Data Atribuição Motorista`))

-- DEPOIS:
f.`Data Atribuição Motorista` AS ts_atribuicao_motorista  -- já é TIMESTAMP
```

**Campos numéricos corrigidos:**
- `Quantidade`, `Quantidade Volumes`, `Entregues`, `Insucessos` → INTEGER
- `Km Planejado`, `Km Realizado`, `Peso`, `Paradas` → FLOAT
- Valores de pagamento → FLOAT
- **Solução:** Remoção de TRIM/REPLACE/PARSE, apenas CAST direto

**Correção em stg_planejamento:**
```sql
-- ANTES:
SAFE.PARSE_DATE('%d/%m/%Y', TRIM(p.`Data Planejada`))

-- DEPOIS:
p.`Data Planejada` AS data_planejada  -- já é DATE
```

**Campo TIME corrigido:**
```sql
-- ANTES:
CASE WHEN p.`Tempo de Rota` LIKE '%:%' THEN ...

-- DEPOIS:
TIME_DIFF(p.`Tempo de Rota`, TIME(0, 0, 0), MINUTE) / 60.0 AS tempo_plan_h
```

**B) Flags Críticas Adicionadas**

Adicionado CTE `com_flags_adicionais` em `base_execucao_canonica`:

```sql
-- Flag: Rota sem tempo planejado ou realizado
(COALESCE(cp.tempo_plan_h, 0) = 0 AND COALESCE(cp.tempo_operacional_h, 0) = 0)
  AS flag_sem_tempo,

-- Flag: Entrega crítica (efetividade < 95%)
(safe_div(cp.qtd_entregues, cp.qtd_entregues + cp.qtd_insucessos) < 0.95
  AND safe_div(cp.qtd_entregues, cp.qtd_entregues + cp.qtd_insucessos) IS NOT NULL
) AS flag_entrega_critica,

-- Flag: Match crítico (diferença > 1 dia planejado vs realizado)
(ABS(DATE_DIFF(COALESCE(cp.data_planejada, cp.data_referencia), cp.data_referencia, DAY)) > 1
) AS flag_match_critico
```

**C) Views de Metas**

**pub_metas** (alias para compatibilidade):
```sql
CREATE OR REPLACE VIEW pub_metas AS
SELECT
  kpi_id AS KPI,
  kpi_nome AS Nome,
  meta AS Meta,
  sentido AS Sentido,
  unidade AS Unidade
FROM metas_globais;
```

**metas_pivot_canonico** (pivotagem para scoring):
```sql
CREATE OR REPLACE VIEW metas_pivot_canonico AS
SELECT
  MAX(CASE WHEN kpi_id = 'spr_pedidos' THEN meta END) AS meta_spr_ped,
  MAX(CASE WHEN kpi_id = 'spr_volumes' THEN meta END) AS meta_spr_vol,
  MAX(CASE WHEN kpi_id = 'entregas_efetivas' THEN meta END) AS meta_entregas,
  MAX(CASE WHEN kpi_id = 'rotas_concluidas' THEN meta END) AS meta_rotas,
  MAX(CASE WHEN kpi_id = 'orh' THEN meta END) AS meta_orh,
  MAX(CASE WHEN kpi_id = 'aderencia_volumes' THEN meta END) AS meta_ader_vol,
  MAX(CASE WHEN kpi_id = 'ocupacao_composta' THEN meta END) AS meta_ocup,
  safe_div(
    MAX(CASE WHEN kpi_id = 'spr_volumes' THEN meta END),
    MAX(CASE WHEN kpi_id = 'orh' THEN meta END)
  ) AS meta_dpph
FROM metas_globais;
```

**D) Aliases de Compatibilidade**

Adicionado ao SELECT final de `base_execucao_canonica`:
```sql
SELECT
  *,
  -- Aliases para compatibilidade com API (nomes legados)
  km_real AS km_realizado,
  km_plan AS km_planejado,
  tempo_operacional_h AS tempo_realizado_h_final,
  tempo_plan_h AS tempo_planejado_h_final
FROM com_flags_adicionais;
```

**2. `Dashboard/bigquery/deploy_v7_dashboard.py`** (178 linhas)
- Script automatizado de deploy
- Validação de objetos criados
- Testes de queries

**Execução:**
```bash
cd Dashboard/bigquery
python deploy_v7_dashboard.py
```

**Resultado:** 18/18 objetos criados com sucesso

---

### Fase 4: API - Correção de CORS

#### Arquivo Modificado

**`Dashboard/api/server.js`**

**Problema:** API só permitia origins específicos (localhost:8080, localhost:4173). Frontend em desenvolvimento roda em portas dinâmicas (8081, 8082, 8083).

**Correção:**
```javascript
// ANTES:
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:8080,http://localhost:4173,https://...")

// DEPOIS:
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:4173,http://localhost:5173,https://...")
```

**Impacto:** Frontend consegue fazer requisições à API sem bloqueio CORS.

---

## 📊 Validação Completa

### BigQuery - Testes Executados

```sql
-- Teste 1: pub_metas
SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.pub_metas`;
-- ✅ Resultado: 7 metas retornadas

-- Teste 2: metas_pivot_canonico
SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot_canonico`;
-- ✅ Resultado: 1 row com todas as metas pivotadas

-- Teste 3: base_execucao_canonica
SELECT COUNT(*) FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica`;
-- ✅ Resultado: 28.635 rotas

-- Teste 4: Query tipo cards (com metas pivotadas)
WITH metas AS (SELECT * FROM metas_pivot_canonico)
SELECT
  b.data_referencia,
  COUNT(DISTINCT b.id_carga) AS rotas,
  SUM(b.qtd_volumes) AS volumes,
  ROUND(safe_div(SUM(b.qtd_volumes), COUNT(DISTINCT b.id_carga)), 2) AS spr_vol,
  m.meta_spr_vol
FROM base_execucao_canonica b
CROSS JOIN metas m
WHERE b.data_referencia >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1, 5
ORDER BY 1 DESC;
-- ✅ Resultado: Dados agregados retornados (ex: 2026-03-18 com 165 rotas, SPR 65.29 vs meta 67)
```

### API - Endpoints Validados

| Endpoint | Status | Payload |
|----------|--------|---------|
| `GET /api/metas` | ✅ 200 | 7 metas (spr_volumes, spr_pedidos, entregas_efetivas, rotas_concluidas, orh, aderencia_volumes, ocupacao_composta) |
| `GET /api/resumo/cards?periodo=2026-03` | ✅ 200 | 8 cards com valores, metas, deltas, status (OK/Crítico/Atenção), trends D-1 e WoW |
| `GET /api/kpi-diario?periodo=2026-03-19` | ✅ 200 | Objeto completo (rotas: 10, pedidos: 333, volumes: 487, SPR: 48.7, score: 50) |
| `GET /api/filiais/performance?periodo=2026-03` | ✅ 200 | 28 filiais com rotas, SPR, aderências, score operacional |

**Exemplo de resposta - Cards:**
```json
[
  {
    "kpi": "Aderencia Volumes",
    "valor": 1,
    "meta": 0.95,
    "delta": 0.05,
    "status": "OK",
    "cor": "#12B76A",
    "trendD1": 0.051,
    "trendWow": 0,
    "valorTexto": "100%",
    "metaTexto": "95%",
    "deltaTexto": "+5%",
    "acao": "Comparar planejamento e executado",
    "databaseDt": "2026-03-19"
  }
]
```

### Frontend - Configuração Validada

**Arquivo:** `Dashboard/frontend/.env`
```
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_ENV=local
VITE_ENABLE_MOCKS=false
VITE_API_ENABLED=true
```

**Servidor Vite:**
- Porta dinâmica: 8081 (ou 8082, 8083 dependendo da disponibilidade)
- HTTP 200 na página principal
- React carregando corretamente

---

## 🚀 Configuração Final para Execução

### Passo 1: Iniciar API

```bash
cd Dashboard/api
node server.js
```

**Saída esperada:**
```
Dashboard API listening on port 8080
BigQuery: data-aileron-482822-d0.monitoramento_carga
```

### Passo 2: Iniciar Frontend

```bash
cd Dashboard/frontend
npm run dev
```

**Saída esperada:**
```
VITE v5.4.19 ready in 256 ms

➜  Local:   http://localhost:8081/
➜  Network: http://192.168.31.176:8081/
```

### Passo 3: Acessar Dashboard

**URL:** `http://localhost:8081/resumo-executivo`

**Páginas disponíveis:**
1. `/resumo-executivo` - 8 cards + gráficos + tabela filiais
2. `/cockpit-operacional` - Série temporal + alertas + drill
3. `/planejado-realizado` - Comparação plan vs real
4. `/aderencia-atendimento` - Aderências e entregas
5. `/tempo-sla` - ORH e tempos
6. `/frota-capacidade` - Ocupação por tipo de veículo
7. `/custos-eficiencia` - Custos por transportador
8. `/transportadores` - Tabela de transportadores

---

## 📁 Estrutura de Arquivos

```
Dashboard/
├── bigquery/
│   ├── pipeline_dashboard_v7.sql          [CRIADO] Pipeline completo
│   ├── deploy_v7_dashboard.py             [CRIADO] Script de deploy
│   ├── pipeline_sheets_v8.sql             [EXISTENTE] Pipeline Sheets (depende v7)
│   ├── pipeline_v4.sql                    [OBSOLETO] A ser arquivado
│   ├── pipeline_v5_publicacao.sql         [OBSOLETO] A ser arquivado
│   └── pipeline_v6_api.sql                [OBSOLETO] A ser arquivado
├── api/
│   ├── server.js                          [MODIFICADO] CORS atualizado
│   ├── queries.js                         [EXISTENTE] Queries validadas
│   └── helpers.js                         [EXISTENTE] Helpers validados
└── frontend/
    ├── .env                               [EXISTENTE] Configuração validada
    └── src/                               [EXISTENTE] React app

Commits:
├── fb734b9: feat(bigquery): complete pipeline v7 with API alignment
└── 5963b8a: fix(bigquery): add API compatibility aliases
```

---

## ✅ Critérios de Sucesso - TODOS ATINGIDOS

- [x] Pipeline v7 é auto-suficiente (cria todos objetos que API espera)
- [x] API retorna dados para todos os endpoints sem erro
- [x] Frontend configurado e rodando
- [x] Fluxo completo validado: BigQuery → API → Frontend
- [x] 28.635 rotas disponíveis para visualização
- [x] CORS configurado para desenvolvimento local
- [x] Sem dependências de pipelines obsoletos (v4, v5, v6)

---

## 🔄 Próximos Passos (Fase 6 - Opcional)

### Limpeza de Objetos Obsoletos

**No BigQuery:**
```sql
-- Listar objetos a remover
SELECT table_name
FROM `data-aileron-482822-d0.monitoramento_carga.INFORMATION_SCHEMA.TABLES`
WHERE table_name LIKE 'api_%'     -- v6
   OR table_name LIKE 'mart_%'    -- v4
   OR table_name LIKE 'fct_%'     -- v4
ORDER BY table_name;
```

**Executar cleanup:**
```bash
cd Dashboard/bigquery
python -c "
from google.cloud import bigquery
client = bigquery.Client(project='data-aileron-482822-d0')

# DROP views obsoletas
obsolete = ['api_*', 'mart_*', 'fct_*', 'dim_transportador', 'dim_motorista']
# Script de limpeza aqui
"
```

**No repositório:**
```bash
# Mover pipelines obsoletos para _archive/
mkdir -p Dashboard/bigquery/_archive
mv Dashboard/bigquery/pipeline_v4.sql Dashboard/bigquery/_archive/
mv Dashboard/bigquery/pipeline_v5_publicacao.sql Dashboard/bigquery/_archive/
mv Dashboard/bigquery/pipeline_v6_api.sql Dashboard/bigquery/_archive/
mv Dashboard/bigquery/deploy_v6_api.py Dashboard/bigquery/_archive/
```

---

## 📝 Lições Aprendidas

1. **Validar schema de tabelas raw antes de criar staging**: Evita erros de TRIM/PARSE em campos já tipados
2. **Manter lista de CORS origins abrangente em desenvolvimento**: Incluir todas as portas comuns (8080-8083, 4173, 5173)
3. **Criar views alias para compatibilidade**: Facilita migração sem quebrar API existente
4. **Script de deploy automatizado**: Valida objetos criados e testa queries básicas
5. **Documentar flags e campos calculados**: Deixar claro o que é pré-computado vs calculado on-demand

---

## 🆘 Troubleshooting

### Dashboard não carrega dados

**Verificar:**
1. API rodando? `curl http://localhost:8080/api/metas`
2. Frontend rodando? `curl http://localhost:8081/`
3. CORS habilitado? Verificar console do navegador (F12)

**Soluções:**
- Reiniciar API: `cd Dashboard/api && node server.js`
- Reiniciar Frontend: `cd Dashboard/frontend && npm run dev`
- Verificar porta do frontend e adicionar ao CORS em `server.js`

### BigQuery views não existem

**Verificar:**
```sql
SELECT table_name
FROM `data-aileron-482822-d0.monitoramento_carga.INFORMATION_SCHEMA.TABLES`
WHERE table_name IN ('base_execucao_canonica', 'pub_metas', 'metas_pivot_canonico');
```

**Solução:**
```bash
cd Dashboard/bigquery
python deploy_v7_dashboard.py
```

### API retorna erro "table not found"

**Causa:** Pipeline v7 não foi deployado.

**Solução:** Executar deploy do pipeline v7 (ver acima).

---

**Documentação criada em:** 2026-03-22
**Autor:** Lucas Batista + Claude Opus 4.6
**Versão:** 1.0
