# Dashboard Transporte Last Mile

Projeto canonico da PetloveSupply para processamento dos relatorios de transporte
e consumo no Power BI Desktop.

## Fontes Canonicas

| Camada | Caminho | Regra |
|--------|---------|-------|
| Entrada (monitoramento) | `data/Relatorio_Monitoramento_Carga_Completo.csv` | Source of truth do realizado |
| Entrada (planejamento) | `data/Relorio_Planejamento_Carga_Completo.xlsx` | Source of truth do planejado |
| Configuracao | `config/constantes.py` | Mapa de colunas e formatos |
| Configuracao | `config/de_para_tipo.py` | Fallback do tipo de veiculo quando a placa nao estiver cadastrada |
| Auxiliar | `data/tab_auxiliar/dim_filial.xlsx` | Cadastro canonico de filiais e metas |
| Auxiliar | `data/tab_auxiliar/dim_placas_veiculos.xlsx` | Cadastro canonico de placas para tipo/frota |
| Pipeline | `scripts/transform.py` | Unico script canonico de transformacao |
| Saida Power BI | `output/powerbi/fato_rotas.csv` | Fato realizado + merge com planejado |
| Saida Power BI | `output/powerbi/fato_planejado.csv` | Fato planejado completo |
| Saida Power BI | `output/powerbi/dim_tipo_veiculo.csv` | Dimensao de veiculos |
| Entrypoint Power BI | `Painel Monitoramento - Petlove.pbip` | Arquivo canonico para abrir projeto |
| Binario canônico | `Painel Monitoramento - Petlove.pbix` | Snapshot binario do dashboard |
| Definicao versionada do relatorio | `Painel Monitoramento - Petlove.Report` | Artefatos PBIR do report |
| Definicao versionada do modelo | `Painel Monitoramento - Petlove.SemanticModel` | Artefatos TMDL do semantic model |

## Execucao

```powershell
cd C:\Users\lucas.batista\Documents\Projetos\Dashboard
.\.venv\Scripts\python.exe scripts\transform.py
```

Pipeline completo (transform + git sync):

```powershell
cd C:\Users\lucas.batista\Documents\Projetos
.\scripts\daily_pipeline.ps1
```

Auditoria de KPIs (complexidade e redundancia):

```powershell
cd C:\Users\lucas.batista\Documents\Projetos
.\Dashboard\.venv\Scripts\python.exe .\Dashboard\scripts\auditar_kpis.py
```

Arquivos de apoio:
- `docs/KPI_PLAYBOOK_ROTEIRIZACAO.md` (framework de desenvolvimento)
- `docs/KPI_AUDITORIA_ATUAL.md` (snapshot da auditoria automatica)

## Dependencias

Python (`requirements.txt`):
- `pandas`
- `numpy`
- `openpyxl`
- `pyarrow`

Node (`package.json`):
- `playwright` (extracao TMS)

## Regras Operacionais

- Nao editar manualmente arquivos em `output/`.
- `data/tab_auxiliar/` e a fonte canonica das dimensoes auxiliares locais.
- `output/powerbi/` e sempre regenerado pelo `transform.py`.
- `Painel Monitoramento - Petlove.pbix` e `Painel Monitoramento - Petlove.pbip` sao os arquivos canonicos do dashboard.
- O modelo semantico e as measures DAX continuam gerenciados no Power BI Desktop.

## Fluxo Atual via MCP

- O fluxo de modelagem e manutencao semantica deve ocorrer via `powerbi-modeling-mcp` (MCP Server).
- O pacote legado `sampleCustomVisual` foi descontinuado e removido do `report.json`.
- Evolucoes de layout/formatacao devem priorizar visuais nativos e recursos ja registrados no report.
- Novos pacotes `.pbiviz` so devem ser adicionados em `Painel Monitoramento - Petlove.Report/CustomVisuals/` quando houver necessidade tecnica clara e aprovacao previa.
