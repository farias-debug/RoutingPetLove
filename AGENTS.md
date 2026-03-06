# Dashboard Transporte Last Mile

Dashboard operacional de transporte last mile, Power BI Desktop.

- **Stack**: Python 3.14 · pandas · openpyxl · numpy · pyarrow · Power BI Desktop (MCP) · Node.js (Playwright)
- **Operador**: Lucas Batista

## Estrutura

```
Dashboard/
  config/                # Constantes e mapeamentos Python
    constantes.py        # Renomeacao colunas, tipos veiculo, config CSV
    de_para_tipo.py      # De-para tipo veiculo (23 mappings)
    tema_petlove.json    # Tema visual Power BI
  scripts/               # Pipeline e utilitarios
    transform.py         # Pipeline principal (normaliza, mescla, exporta)
    extrair_relatorio_tms.mjs        # Scraper Playwright (TMS)
    extrair_monitoramento_rotas.ps1  # Wrapper PowerShell extrator
  data/                  # Fontes brutas — LOCAL, gitignored
    Relatorio_Monitoramento_Carga_Completo.csv   (~21k linhas, TMS)
    Relorio_Planejamento_Carga_Completo.xlsx     (~46k linhas)
    tab_auxiliar/
      dim_filial.xlsx             # 37 filiais + metas + regiao
      dim_placas_veiculos.xlsx    # Placas → tipo/frota
  output/powerbi/        # CSVs para Power BI — regeneravel, gitignored
    fato_rotas.csv       # ~21k linhas, 48 colunas
    fato_planejado.csv   # ~46k linhas, 10 colunas
    dim_tipo_veiculo.csv # 11+ tipos, 13 colunas
  docs/                  # Documentacao tecnica
  Painel Monitoramento - Petlove.pbip            # Projeto Power BI
  Painel Monitoramento - Petlove.Report/         # Report (PBIR)
  Painel Monitoramento - Petlove.SemanticModel/  # Modelo (TMDL)
scripts/                 # Automacao PowerShell
  daily_pipeline.ps1     # Transform + Git sync
  git_daily_sync.ps1     # Commit + push categorizado
  health_check.ps1       # Diagnostico do ambiente
.vscode/                 # Settings compartilhados
```

## Pipeline

```
data/CSV + data/XLSX + tab_auxiliar/*.xlsx
              ↓
        transform.py
              ↓
      output/powerbi/ (3 CSVs)
              ↓
      Power BI Desktop (Refresh)
```

```powershell
# Executar pipeline
& Dashboard\.venv\Scripts\python.exe Dashboard\scripts\transform.py

# Pipeline completo (transform + git sync)
.\scripts\daily_pipeline.ps1
```

## Modelo Semantico Power BI

### Tabelas

| Tabela           | Tipo     | Fonte                |
|------------------|----------|----------------------|
| dim_calendario   | Dimensao | DAX calculada        |
| dim_filial       | Dimensao | dim_filial.xlsx (M)  |
| dim_tipo_veiculo | Dimensao | dim_tipo_veiculo.csv |
| fato_rotas       | Fato     | fato_rotas.csv       |
| fato_planejado   | Fato     | fato_planejado.csv   |
| _Medidas         | Measures | 473 measures DAX     |
| _Metas           | Params   | DAX inline           |

### Relacionamentos (N:1)

- fato_rotas[Filial] → dim_filial[Filial]
- fato_rotas[Data Referencia] → dim_calendario[Data]
- fato_rotas[Tipo de Veiculo Padrao] → dim_tipo_veiculo[TipoVeiculo]
- fato_planejado[Data Planejada] → dim_calendario[Data]
- fato_planejado[Filial] → dim_filial[Filial]

### CSV Format

- Separador: `;` · Encoding: `UTF-8 BOM` · Datas: `YYYY-MM-DD`
- Path M queries: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\`

## Regras

- Codigo Python → `Dashboard/scripts/`, config → `Dashboard/config/`
- Nunca editar `data/` ou `output/` diretamente
- Dados sao imutaveis — pipeline recalcula tudo das fontes
- Power BI gerenciado via Power BI Desktop + MCP
- Measures DAX ficam na tabela `_Medidas`
- Itens obsoletos vao para `_archive/` (gitignored)
