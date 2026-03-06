---
applyTo:
  - "Dashboard/scripts/*.py"
  - "Dashboard/config/*.py"
  - "Dashboard/requirements.txt"
---

# Instruções — Pipeline Python de Transformação

## Visão Geral

O script `Dashboard/scripts/transform.py` é o pipeline canônico que transforma dados brutos em CSVs consumidos pelo Power BI.

```
data/CSV + data/XLSX + tab_auxiliar/*.xlsx
              ↓
        transform.py
              ↓
      output/powerbi/ (3 CSVs)
```

### Saídas

| Arquivo | Linhas (aprox) | Colunas | Descrição |
|---------|---------------|---------|-----------|
| fato_rotas.csv | ~21k | 48 | Fato principal de monitoramento |
| fato_planejado.csv | ~46k | 10 | Planejamento de carga |
| dim_tipo_veiculo.csv | 11+ | 13 | Dimensão de tipos de veículo |

### Formato CSV

- Separador: `;`
- Encoding: `UTF-8 BOM`
- Datas: `YYYY-MM-DD`

## Fontes de Dados

| Fonte | Tipo | Caminho |
|-------|------|---------|
| Monitoramento TMS | CSV | `data/Relatorio_Monitoramento_Carga_Completo.csv` |
| Planejamento | XLSX | `data/Relorio_Planejamento_Carga_Completo.xlsx` |
| Filiais (auxiliar) | XLSX | `data/tab_auxiliar/dim_filial.xlsx` |
| Placas/Veículos (auxiliar) | XLSX | `data/tab_auxiliar/dim_placas_veiculos.xlsx` |

## Regras de Desenvolvimento

### Imutabilidade dos dados

- **Nunca editar** arquivos em `data/` ou `output/` diretamente
- O pipeline recalcula tudo das fontes — dados são imutáveis
- Qualquer correção deve ser feita no `transform.py` ou nos mapeamentos em `config/`

### Organização de código

- Scripts Python → `Dashboard/scripts/`
- Configurações e mapeamentos → `Dashboard/config/`
- Constantes de renomeação → `Dashboard/config/constantes.py`
- De-para tipo veículo (23 mappings) → `Dashboard/config/de_para_tipo.py`

### Padrões de código

- Usar `pathlib.Path` para caminhos (já configurado no transform.py)
- Filiais excluídas: `{"testes tm", "testes tms", "provet01 moema"}`
- Nomes de colunas normalizados via mapeamento em `constantes.py`
- Tipos de veículo padronizados via `de_para_tipo.py`

### Ao modificar o pipeline

1. Verificar se novas colunas são compatíveis com o modelo semântico TMDL
2. Manter consistência de tipos (datas como `YYYY-MM-DD`, numéricos sem formatação locale)
3. Testar com `python Dashboard/scripts/transform.py` antes de commitar
4. Validar que o Power BI consegue fazer refresh após mudanças nos CSVs

### Dependências

Definidas em `Dashboard/requirements.txt`:
- pandas
- openpyxl
- numpy
- pyarrow

### Execução

```powershell
# Via venv
& Dashboard\.venv\Scripts\python.exe Dashboard\scripts\transform.py

# Via task do VS Code
# "📊 Pipeline: Apenas Transform (sem Git)"
```

## O Que NÃO Fazer

- Não adicionar lógica de negócio que deveria ser medida DAX
- Não criar CSVs temporários — o output é regenerável
- Não hardcodar caminhos absolutos (usar ROOT_DIR/DATA_DIR do script)
- Não alterar encoding ou separador sem atualizar as M queries do Power BI
