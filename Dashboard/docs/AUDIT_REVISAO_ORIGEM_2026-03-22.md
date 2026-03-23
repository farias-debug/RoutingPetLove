# RELATÓRIO DE AUDITORIA — REVISÃO COMPLETA DA ORIGEM

**Data**: 2026-03-22
**Pipeline**: `data-aileron-482822-d0.monitoramento_carga`
**Escopo**: Origem → Camada Tratada → Lógica de Negócio → SQLs → Medidas → Simplificação

---

## 1. INVENTÁRIO DA ORIGEM

### 1.1 Arquivos Fonte

| Arquivo | Formato | Registros | Colunas | Encoding |
|---|---|---|---|---|
| `Relatorio_Monitoramento_Carga_Completo.csv` | CSV (`;`, decimal `,`) | 28.635 | 39 | utf-8-sig |
| `Relorio_Planejamento_Carga_Completo.xlsx` | XLSX | 24.833 | 9 | — |
| `tab_auxiliar/dim_filial.xlsx` | XLSX | 34 | 9 | — |

### 1.2 Colunas Mortas (100% NULL)

- `Valor Pagamento Parada` — 28.635 NULLs
- `Valor Pagamento Ajudante` — 28.635 NULLs
- `kmretorno` — 28.635 NULLs
- `Alerta` — 28.635 NULLs

**Recomendação**: Manter no staging (custo zero em views BQ) mas não criar métricas sobre elas.

---

## 2. PROBLEMAS ENCONTRADOS E CORREÇÕES APLICADAS

### 2.1 CRÍTICO — Insucessos Negativos

- **Descoberta**: 1.232 registros (4,3%) tinham `Insucessos < 0` no raw
- **Causa raiz**: A coluna `Insucessos` é na verdade `baixas - Entregues`. Confirmado: `Entregues + Insucessos == baixas` para 100% dos registros
- **Impacto sem correção**: `pct_entrega_efetiva = safe_div(entregas, entregas + insucessos)` — quando insucessos < 0, denominador < numerador → percentual > 100%
- **Status**: ✅ JÁ CORRIGIDO no `stg_monitoramento` com `GREATEST(IFNULL(SAFE_CAST(Insucessos AS FLOAT64), 0), 0)`
- **Validação**: Query confirma 0 insucessos negativos no stg após deploy

### 2.2 CRÍTICO — Filtro de Tipos de Veículo AUSENTE

- **Descoberta**: O dashboard deve exibir apenas **Utilitário, Passeio e Van** (93,6% dos registros)
- **Registros fora do scope**: 1.840 registros — Motocicleta (1.421), Não Selecionado (353), VUC (37), outros
- **Impacto sem correção**: KPIs distorcidos com dados de Motocicleta (operação muito diferente de last-mile)
- **Correção aplicada**: ✅ Adicionado filtro no `stg_monitoramento`:

  ```sql
  AND vehicle_type_canonical(Tipo) IN ('Utilitario', 'Passeio', 'Van')
  ```

- **Validação**: stg agora tem 26.795 registros (era 28.635), apenas 3 tipos

### 2.3 CRÍTICO — Provet01 Moema Excluída dos KPIs

- **Descoberta**: 1.361 registros da filial "Provet01 Moema" não tinham match no `dim_filial`
- **Causa raiz**: Filial ausente na planilha `dim_filial.xlsx`, classificada automaticamente como "Nao-Unidade"
- **Impacto sem correção**: 4,8% dos registros excluídos de TODOS os marts (WHERE tipo_filial = 'Unidade')
- **Correção aplicada**: ✅ Adicionado override na `dim_filial` view:

  ```sql
  overrides AS (
    SELECT * FROM UNNEST([
      STRUCT('PROVET01 MOEMA' AS filial_key, 'Unidade' AS tipo, 'SP' AS regiao)
    ])
  )
  ```

- **Nota**: Com filtro de veículos, apenas 28 rotas Provet01 Moema entram no escopo (97,9% eram Motocicleta)
- **Ação pendente**: Atualizar `dim_filial.xlsx` incluindo Provet01 Moema com meta_spr e capacidade_volume_dia

### 2.4 MODERADO — Filial "Testes TMS"

- **Descoberta**: 2 registros de teste/lixo da filial "Testes TMS"
- **Correção aplicada**: ✅ Filtro no `stg_monitoramento`:

  ```sql
  AND normalize_text(Filial) != 'TESTES TMS'
  ```

### 2.5 MODERADO — Motorista/Transportador sem TRIM

- **Descoberta**: Campos passados raw do TMS sem normalização mínima
- **Correção aplicada**: ✅ `TRIM(Motorista)` e `TRIM(Transportador)` no stg_monitoramento
- **Nota**: Normalização completa (UPPER + remoção prefixo) já ocorre via `motorista_key` em `base_execucao_canonica`

### 2.6 MODERADO — api_alertas_contagem_canonico sem filtro tipo_filial

- **Descoberta**: View v6 contava alertas de TODAS as filiais (incluindo Nao-Unidade)
- **Correção aplicada**: ✅ Adicionado `WHERE tipo_filial = 'Unidade'` no `pipeline_v6_api.sql`

### 2.7 INFORMATIVO — Transportador NULL

- **Situação**: 731 registros sem transportador no stg (após filtro veículos)
- **Impacto**: Aparecem como NULL nos marts por transportador — comportamento correto
- **Não requer correção**: Dado de origem

### 2.8 INFORMATIVO — Double-space em Filial

- **Situação**: "Petlog45  MORAIS-RIO_OSTRAS" (252 registros no raw com duplo espaço)
- **Impacto**: NENHUM — `normalize_text()` colapsa espaços múltiplos corretamente
- **Não requer correção**

---

## 3. VALIDAÇÃO DAS MEDIDAS

### 3.1 Tabela de KPIs — Definição e Status

| # | KPI | Fórmula SQL | Meta | Status |
|---|---|---|---|---|
| 1 | SPR Pedidos | `safe_div(qtd_pedidos, qtd_rotas)` | 42 ped/rota | ✅ Correto |
| 2 | SPR Volumes | `safe_div(qtd_volumes, qtd_rotas)` | 67 vol/rota | ✅ Correto |
| 3 | ORH | `safe_div(tempo_operacional_h, qtd_rotas)` | 7.0h (alvo) | ✅ Correto |
| 4 | Entregas Efetivas | `safe_div(entregues, entregues + GREATEST(insucessos,0))` | 98% | ✅ Correto após fix |
| 5 | Rotas Concluídas | `safe_div(rotas_concluidas, total_rotas)` | 95% | ✅ Correto |
| 6 | Ocupação Composta | `safe_div(peso_real, capacidade_peso_veiculo)` | 85% | ✅ Correto |
| 7 | Aderência Volumes | `LEAST(1.0, safe_div(volumes_real, volumes_plan))` | 90% | ✅ Correto |
| 8 | Custo/Carga | `safe_div(valor_total, qtd_rotas)` | R$500/carga | ✅ Correto |
| 9 | DPPH | `safe_div(qtd_entregues, tempo_operacional_h)` | 6.0 ent/h | ✅ Correto |

### 3.2 Sanity Check — Cálculo Manual vs Mart

- **pct_entregas_efetivas**: Recalculado manualmente a partir de `base_execucao_canonica` — divergência **ZERO** (< 0.0001) para todos os 79 dias

### 3.3 KPIs Médios Globais (pós-correção)

| KPI | Média | Meta | % da Meta |
|---|---|---|---|
| SPR Ped | 42.5 | 42.0 | 101% |
| SPR Vol | 59.0 | 67.0 | 88% |
| Entregas | 92.3% | 98.0% | 94% |
| ORH | 5.52h | 7.0h | — (alvo) |
| DPPH | 6.93 | 6.0 | 116% |
| Ocupação | 63.4% | 85.0% | 75% |

---

## 4. ARQUITETURA PÓS-AUDITORIA

```
RAW (3 tabelas BQ)
  └─ stg_monitoramento ──[FILTROS: veículos, Testes TMS, GREATEST(0), TRIM]
  └─ stg_planejamento
  └─ dim_filial ──[OVERRIDE: Provet01 Moema = Unidade]
       │
       ▼
  fct_execucao (84 cols) ──[JOIN staging + dim + planejamento + dedup]
       │
       ▼
  base_execucao_canonica ──[ponte semântica estável]
       │
       ▼
  ┌─ mart_diario_canonico          ──→ v5 pub_kpi_diario    ──→ v6 api_kpi_diario
  ├─ mart_filial_dia_canonico      ──→ v5 pub_kpi_filial    ──→ v6 api_filial
  ├─ mart_transportador_canonico   ──→ v5 pub_kpi_transp    ──→ v6 api_transp
  └─ mart_motorista_canonico       ──→                      ──→ v6 api_motoristas
```

---

## 5. DEPLOY EXECUTADO

| Pipeline | Statements | Resultado |
|---|---|---|
| `pipeline_v4.sql` | 35 (13 UDFs + 22 views) | ✅ 35/35 OK |
| `pipeline_v5_publicacao.sql` | 21 views | ✅ 21/21 OK |
| `pipeline_v6_api.sql` | 16 views | ✅ 16/16 OK |

**Total: 72/72 statements deployados com sucesso.**

---

## 6. AÇÕES PENDENTES (backlog)

| # | Ação | Prioridade | Complexidade |
|---|---|---|---|
| 1 | Atualizar `dim_filial.xlsx` com Provet01 Moema (meta_spr, capacidade) | Alta | Baixa |
| 2 | Investigar 731 registros sem transportador (dados de origem) | Média | Média |
| 3 | Definir se `ader_volumes = NULL` (quando volumes_plan = 0) deve ser tratado diferente | Média | Baixa |
| 4 | Remover colunas mortas do `load_raw_to_bq.py` se desejado (otimização marginal) | Baixa | Baixa |
| 5 | Considerar adicionar `referencia` como campo de partição/filtro nos marts | Baixa | Média |

---

## 7. ARQUIVOS MODIFICADOS

| Arquivo | Alteração |
|---|---|
| `Dashboard/bigquery/pipeline_v4.sql` | stg_monitoramento: TRIM motorista/transportador, filtro veículos, filtro Testes TMS. dim_filial: override Provet01 Moema como Unidade |
| `Dashboard/bigquery/pipeline_v6_api.sql` | api_alertas_contagem_canonico: adicionado WHERE tipo_filial = 'Unidade' |

### Arquivos temporários criados (podem ser removidos)

- `Dashboard/_tmp_audit_raw.py`
- `Dashboard/_tmp_audit_raw2.py`
- `Dashboard/_tmp_audit_raw3.py`
- `Dashboard/_tmp_validate.py`
