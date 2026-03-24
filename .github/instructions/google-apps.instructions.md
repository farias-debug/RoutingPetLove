---
applyTo:
  - "Dashboard/google_apps/**"
---

# Instruções — Google Apps Script

## Visão Geral

Scripts que constroem dashboards visuais (PAINEL_GERENCIAL, PAINEL_OPERACIONAL, DRILLDOWN) dentro do Google Sheets, consumindo as 13 abas de dados sincronizadas do BigQuery.

## Arquitetura

```
[ARQUIVADO] sync_bq_to_sheets.py (fluxo Sheets descontinuado)
        ↓
main.gs → dashboard_builder.gs → panel_cache.gs
        ↓
PAINEL_GERENCIAL / PAINEL_OPERACIONAL / DRILLDOWN (abas visuais)
```

## Módulos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `main.gs` | Entry points, orquestração |
| `config.gs` | Configurações, IDs, constantes |
| `dashboard_builder.gs` | Construção dos painéis visuais |
| `panel_cache.gs` | Cache materializado para performance |
| `formatters.gs` | Formatação de números, datas, cores |
| `pivot_builder.gs` | Tabelas dinâmicas programáticas |
| `bq_sync.gs` | Sincronização complementar com BQ |
| `ui.gs` | Interface do usuário, menus, sidebar |
| `Sidebar.html` | HTML da sidebar |

## Deploy

```powershell
# Push local → Google (via clasp)
cd Dashboard\google_apps; npx @google/clasp push

# Pull Google → local
cd Dashboard\google_apps; npx @google/clasp pull
```

## Convenções

- Usar `PropertiesService` para cache
- Nomes de funções: camelCase
- Documentar entry points no topo de `main.gs`
- Config centralizada em `config.gs`
- `.clasp.json` NÃO versionado (tem script ID)
