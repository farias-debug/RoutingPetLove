# Deploy Pipeline v7 (Dashboard) + v8 (Sheets)

## 📊 Situação Atual (Auditoria Executada)

**TOTAL: 76 objetos** (62 views/tables + 14 UDFs)

### Distribuição:
- **10_SHEETS:** 8 views (Resumo_*, VW_*, alertas_rotas, etc.)
- **7_KPI_SHEETS:** 4 views (kpi_resumo_diario, kpi_filial_dia, etc.)
- **9_PUBLICACAO:** 8 views (pub_*)
- **8_API:** 16 views (api_* - NENHUMA USADA)
- **6_MART:** 9 views (4 duplicatas + 4 canônicas + 1 antiga)
- **3_DIMENSAO:** 8 views
- **2_STAGING:** 2 views ✅
- **1_RAW:** 3 tables ✅
- **Outros:** 18 views diversas

---

## ✅ Situação Final (Após Deploy + Limpeza)

**TOTAL: 27 objetos** (redução de 64%)

### Dashboard v7 (Core):
- 3 RAW tables
- 2 STAGING views
- 2 DIMENSÃO views (dim_filial, metas_globais)
- 1 BASE view (base_execucao_canonica)
- 12 UDFs essenciais

**= 20 objetos para Dashboard**

### Sheets v8 (Separado):
- 1 dim_filial_tratada
- 3 KPI views (kpi_resumo_diario, Resumo_Filial, VW_Base_Execucao)
- Outras conforme necessário

**= 4-7 objetos para Sheets**

---

## 🚀 Plano de Execução

### PASSO 1: Atualizar dim_filial NULLs (5 min)

```bash
.venv/Scripts/python.exe -c "
from google.cloud import bigquery
client = bigquery.Client(project='data-aileron-482822-d0')

# Ler e executar SQL
with open('bigquery/update_dim_filial_nulls.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Executar cada statement
for statement in sql.split(';'):
    if 'UPDATE' in statement or 'SELECT' in statement:
        print(f'Executando: {statement[:100]}...')
        client.query(statement).result()
        print('✅ OK')
"
```

**OU execute manualmente no BigQuery Console:**
```sql
bigquery/update_dim_filial_nulls.sql
```

---

### PASSO 2: Deploy Pipeline Dashboard v7 (10 min)

```bash
.venv/Scripts/python.exe -c "
from google.cloud import bigquery
client = bigquery.Client(project='data-aileron-482822-d0')

print('Deployando pipeline_dashboard_v7.sql...')
with open('bigquery/pipeline_dashboard_v7.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Executar
for statement in sql.split('CREATE OR REPLACE'):
    if statement.strip():
        full_statement = 'CREATE OR REPLACE' + statement
        print(f'Creating: {full_statement[20:80]}...')
        try:
            client.query(full_statement).result()
            print('✅ OK')
        except Exception as e:
            print(f'❌ ERRO: {e}')
            break
"
```

**Validar:**
```sql
SELECT COUNT(*) FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica`
```

Esperado: > 10,000 linhas

---

### PASSO 3: Deploy Pipeline Sheets v8 (5 min)

```bash
.venv/Scripts/python.exe -c "
from google.cloud import bigquery
client = bigquery.Client(project='data-aileron-482822-d0')

print('Deployando pipeline_sheets_v8.sql...')
with open('bigquery/pipeline_sheets_v8.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Executar
for statement in sql.split('CREATE OR REPLACE'):
    if statement.strip():
        full_statement = 'CREATE OR REPLACE' + statement
        print(f'Creating: {full_statement[20:80]}...')
        try:
            client.query(full_statement).result()
            print('✅ OK')
        except Exception as e:
            print(f'❌ ERRO: {e}')
"
```

**Validar:**
```sql
SELECT COUNT(*) FROM `data-aileron-482822-d0.monitoramento_carga.kpi_resumo_diario`
```

---

### PASSO 4: Testar Dashboard API (5 min)

```bash
# Se tiver script de smoke test:
pwsh scripts/smoke_dashboard_api.ps1

# OU testar manualmente:
curl http://localhost:8080/api/resumo/cards
```

**Validar que API retorna dados corretos**

---

### PASSO 5: Testar Google Sheets (5 min)

1. Abrir planilha Google Sheets conectada
2. Verificar que dados carregam normalmente
3. Conferir pelo menos: kpi_resumo_diario, dim_filial_tratada

---

### PASSO 6: Executar Limpeza (10 min)

**⚠️ IMPORTANTE: Só execute após confirmar v7 + v8 funcionando!**

```bash
.venv/Scripts/python.exe -c "
from google.cloud import bigquery
client = bigquery.Client(project='data-aileron-482822-d0')

print('⚠️  LIMPEZA: Removendo 30+ objetos desnecessários...')
print('Tem certeza? Digite SIM para continuar:')
confirmacao = input()

if confirmacao != 'SIM':
    print('❌ Cancelado')
    exit()

with open('bigquery/2_cleanup_objetos.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Executar DROPs
for statement in sql.split(';'):
    if 'DROP' in statement:
        print(f'Dropping: {statement[30:100]}...')
        try:
            client.query(statement).result()
            print('✅ Removido')
        except Exception as e:
            print(f'⚠️  Já removido ou não existe')
"
```

---

### PASSO 7: Validar Resultado Final (5 min)

```bash
.venv/Scripts/python.exe bigquery/execute_audit.py
```

**Esperado após limpeza:**
- 1_RAW: 3 tables
- 2_STAGING: 2 views
- 3_DIMENSAO_CORE: 3 views
- 4_BASE: 1 view
- 5_SHEETS: 3-7 views
- Total: ~15 objects + 12 UDFs = 27 objetos

**Redução: de 76 para 27 objetos (64%)**

---

## 📋 Checklist Final

- [ ] dim_filial atualizada (capacidade e meta preenchidas)
- [ ] Pipeline v7 deployado sem erros
- [ ] base_execucao_canonica tem dados
- [ ] Pipeline v8 deployado sem erros
- [ ] kpi_resumo_diario funciona
- [ ] Dashboard API responde corretamente
- [ ] Google Sheets carrega dados
- [ ] Limpeza executada
- [ ] Apenas ~27 objetos restantes
- [ ] Documentação atualizada

---

## 🔧 Troubleshooting

### Erro: "Table not found"
→ Confirmar que raw_monitoramento, raw_planejamento, raw_dim_filial existem

### Erro: "Function not found"
→ UDFs não deployadas - executar pipeline_dashboard_v7.sql novamente

### Erro: "Permission denied"
→ Verificar credenciais BigQuery no VSCode

### Dashboard não carrega
→ Verificar que base_execucao_canonica existe e tem dados
→ Checar logs da API

### Sheets não atualiza
→ Verificar conexão Sheets → BigQuery
→ Confirmar que views v8 existem

---

## 📁 Arquivos Criados

1. `pipeline_dashboard_v7.sql` - Core mínimo Dashboard
2. `pipeline_sheets_v8.sql` - Views separadas Sheets
3. `update_dim_filial_nulls.sql` - Preencher NULLs
4. `2_cleanup_objetos.sql` - Remover 30+ objetos
5. `execute_audit.py` - Script Python auditoria
6. `README_DEPLOY_V7_V8.md` - Este arquivo

---

## ⏭️ Próximos Passos

1. Executar este plano completo
2. Validar Dashboard + Sheets funcionando
3. Arquivar pipelines antigos (v4, v5, v6) em `_archive/`
4. Atualizar documentação canônica
5. Criar `deploy_v7_v8.py` automatizado

---

**Tempo total estimado: 45 minutos**
**Redução de complexidade: 64%**
**Status: Pronto para execução**
