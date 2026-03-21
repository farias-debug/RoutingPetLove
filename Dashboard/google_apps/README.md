# Google Apps Script · Monitoramento

Projeto Apps Script modular que controla a camada visual e analitica do painel no Google Sheets.

## Estrutura

- `apps_script_monitoramento.gs`
  Base legado-preservada com `atualizarModeloMonitoramento()`.
- `main.gs`
  Entrypoints publicos e logging.
- `config.gs`
  Constantes de abas, ranges, layout e defaults.
- `panel_cache.gs`
  Cache analitico materializado.
- `pivot_builder.gs`
  Apoio a named ranges, tabelas auxiliares e slicers.
- `dashboard_builder.gs`
  Montagem das abas gerenciais, operacionais e de drilldown.
- `formatters.gs`
  Helpers de escrita, cards, blocos e formatacao.
- `ui.gs`
  Menu e integracao com a sidebar.
- `Sidebar.html`
  Painel lateral de filtros.
- `appsscript.json`
  Manifesto do projeto.

## Abas gerenciadas

- `PAINEL_GERENCIAL`
- `PAINEL_OPERACIONAL`
- `DRILLDOWN_ANALITICO`
- `_CONFIG_PAINEL`
- `_CACHE_PAINEL`
- `_AUX_PIVOTS`
- `_LISTAS_VALIDACAO`
- `_LOG_MONITORAMENTO`

## Ordem oficial da planilha

1. `PAINEL_GERENCIAL`
2. `PAINEL_OPERACIONAL`
3. `DRILLDOWN_ANALITICO`
4. `VW_Base_Execucao`
5. `Resumo_Semana_Filial_Diario`
6. `Resumo_Semana_Filial_Matriz`
7. `Resumo_Ocupacao_Veic_Transp`
8. `Resumo_Filial`
9. `kpi_card_latest`
10. `kpi_resumo_diario`
11. `alertas_rotas`
12. `kpi_filial_dia`
13. `kpi_transportador_dia`
14. `metas_globais`
15. `dim_filial_tratada`
16. `drill_rotas`
17. `_CONFIG_PAINEL`
18. `_CACHE_PAINEL`
19. `_AUX_PIVOTS`
20. `_LISTAS_VALIDACAO`
21. `_LOG_MONITORAMENTO`

`Organizar Abas Canonicas` passa a ser o comando autoritativo para reaplicar essa estrutura.

## Pre-requisitos

1. A planilha precisa conter as abas de dados atualizadas.
2. As fontes minimas do painel sao:
   - `VW_Base_Execucao`
   - `Resumo_Semana_Filial_Diario`
   - `Resumo_Ocupacao_Veic_Transp`
3. O pacote completo publicado pelo Python tambem inclui abas suporte:
   - `Resumo_Filial`
   - `drill_rotas`
   - `alertas_rotas`
   - `kpi_resumo_diario`
   - `kpi_filial_dia`
   - `kpi_transportador_dia`
   - `kpi_card_latest`
   - `metas_globais`
   - `dim_filial_tratada`
4. `Node.js`, `npm` e `clasp` precisam estar disponiveis para automacao local.

## Uso com clasp

```powershell
cd C:\Users\lucas.batista\Documents\Projetos\Dashboard\google_apps
npm run clasp:login
npm run clasp:status
npm run clasp:push
```

Para vincular a pasta ao projeto Apps Script existente:

```powershell
npm run clasp:link -- <SCRIPT_ID>
```

## Uso na planilha

Menu `Monitoramento`:

- `Atualizar Base`
- `Reconstruir Paineis`
- `Atualizar Tudo`
- `Resetar Filtros`
- `Abrir Painel Lateral`
- `Gerar resumo por filial`

## Observacoes

- O pipeline de base foi mantido como contrato publico.
- O contrato oficial de dados agora e `core + suporte`, com publicacao feita por `bigquery/sync_bq_to_sheets.py`.
- O rebuild visual e idempotente nas abas gerenciadas.
- As abas tecnicas podem permanecer ocultas.
- O Google Sheets deixou de ser camada de transformacao pesada.
- O Apps Script deve assumir apenas:
  - organizacao das abas
  - formatacao
  - cache
  - reconstrucao visual
- As abas tecnicas ficam no final e podem permanecer ocultas.
- A publicacao das tabelas agora pertence ao `bigquery/`, via Google Sheets API com service account.
