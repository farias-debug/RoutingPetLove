# Painel Monitoramento Petlove — Configuração de Agentes

## Projeto

Dashboard operacional de transporte last mile em Power BI Desktop.
Foco: gestão de roteirização, frota, operação diária/semanal, aderência, produtividade, jornada, capacidade, plano vs real.

## Stack

- **Modelo semântico**: Power BI Desktop (TMDL/PBIR) — 389 medidas DAX na tabela `_Medidas`
- **Pipeline de dados**: Python 3.14 · pandas · openpyxl · numpy · pyarrow
- **Automação**: PowerShell · Playwright (extração TMS)
- **Tema visual**: JSON customizado (paleta Petlove)

## Estrutura do Repositório

```
Dashboard/
  config/                # Constantes e mapeamentos Python
  scripts/               # Pipeline (transform.py) e extratores
  data/                  # Fontes brutas (gitignored)
  output/powerbi/        # CSVs para Power BI (regenerável, gitignored)
  theme/                 # Tema JSON do Power BI
  docs/                  # Documentação técnica
  Painel Monitoramento - Petlove.Report/         # Report PBIR
  Painel Monitoramento - Petlove.SemanticModel/  # Modelo TMDL
scripts/                 # Automação PowerShell (daily_pipeline, git_sync, health_check)
```

## Grupos de Medidas — Hierarquia Oficial

| Grupo | Papel | Prioridade |
|-------|-------|-----------|
| 01. Operacao | Core — volume, execução, status | Alta |
| 02. SPR e Performance | Core — SPR, produtividade/hora, eficiência/KM | Alta |
| 03. Jornada e ORH | Core — ORH, jornada, tempo operacional | Alta |
| 04. Frota e Capacidade | Core — capacidade referência, ocupação | Alta |
| 05. Plano vs Real | Core — desvios, aderência, cobertura, contexto | Alta |
| 06. Shared | Apoio — temporais, metas (SPR, ORH), SVG Cards | Média |
| 07. Investigacao | Core — drill-through linha operacional (22 TblExp) | Alta |
| 98. Suporte | Apoio — entrega, KPI entrega, metas entrega | Média |
| 99. Backoffice | Não-prioritário — pode remover medidas | Mínima |
| 90. Legado | Referência de migração HTML → nativo/SVG | Migração |

### Premissas sobre grupos

- **06. Shared/03. SVG Cards**: contém iniciativas com erros; não assumir continuidade — reavaliar e reconstruir
- **90. Legado**: medidas HTML descontinuadas; usar como referência para migração, não como estrutura final
- **98. Suporte**: manter para progresso/status, mas não é core
- **99. Backoffice**: pode ter medidas removidas sem impacto no core

## Prioridade Técnica para Visuais

1. **Visuais nativos** + formatação condicional + tooltip pages
2. **SVG via DAX** para cards premium, badges, semáforos, bullets, sparkline
3. **Deneb (Vega/Vega-Lite)** somente quando houver ganho real (ranking, variance, lollipop, small multiples)

Regra: se algo pode ser resolvido com visual nativo, **não forçar Deneb**.

## Paleta Visual Obrigatória

| Token | Cor | Uso |
|-------|-----|-----|
| Primary | `#441A80` | Foco primário, identidade |
| Primary-2 | `#5B2D8C` | Variação secundária |
| Accent/Warning | `#F5A623` | Atenção, alertas |
| Success | `#4CAF50` | Dentro da meta, sucesso |
| Danger | `#E74C3C` | Desvio crítico |
| Background | `#FFFFFF` | Fundo principal |
| Surface | `#F9FAFB` | Cards, superfícies |
| Border/Divider | `#E5E7EB` | Bordas, divisórias |
| Text secondary | `#6A7282` | Texto secundário |
| Text muted | `#A3A8B2` | Texto auxiliar |

Regras: não usar cor como único indicador de estado; combinar cor + ícone + texto; preservar contraste.

## Organização Visual — Painéis/Módulos

O dashboard deve ser organizado em **painéis/módulos** (6 a 8), não em abas canônicas.

Cada módulo responde:
1. O que mudou desde ontem/semana?
2. Onde está o problema?
3. Por que aconteceu?
4. O que precisa ser feito?

Hierarquia visual: máximo 3 níveis (título+filtros → KPIs → detalhes/diagnóstico).

## Pipeline de Dados

```
data/CSV + data/XLSX + tab_auxiliar/*.xlsx
              ↓
        transform.py
              ↓
      output/powerbi/ (3 CSVs: fato_rotas, fato_planejado, dim_tipo_veiculo)
              ↓
      Power BI Desktop (Refresh)
```

## Regras de Operação do Agente

- Executar diretamente, sem aguardar validação entre etapas
- Código Python → `Dashboard/scripts/`, config → `Dashboard/config/`
- Nunca editar `data/` ou `output/` diretamente
- Dados são imutáveis — pipeline recalcula tudo das fontes
- Measures DAX ficam na tabela `_Medidas`
- Itens obsoletos vão para `_archive/` (gitignored)
- Ao encontrar ambiguidade, registrar premissa e seguir

## Agentes Disponíveis

| Agente | Arquivo | Papel |
|--------|---------|-------|
| Semantic Auditor | `.github/agents/semantic-auditor.agent.md` | Auditoria e governança de medidas DAX |
| UX Architect | `.github/agents/ux-architect.agent.md` | Design de módulos e componentes visuais |
| HTML Migration | `.github/agents/html-migration.agent.md` | Migração HTML → nativo/SVG/Deneb |
| Repo Executor | `.github/agents/repo-executor.agent.md` | Execução de mudanças no repositório |

## Skills Disponíveis

| Skill | Pasta | Domínio |
|-------|-------|---------|
| powerbi-measure-governance | `.github/skills/powerbi-measure-governance/` | Catalogação, taxonomia e refatoração de medidas |
| dashboard-ux-system | `.github/skills/dashboard-ux-system/` | Design system, componentes visuais, layout |
| html-to-svg-native | `.github/skills/html-to-svg-native/` | Migração de visuais HTML para alternativas |
| deneb-pattern-selector | `.github/skills/deneb-pattern-selector/` | Seleção de patterns Deneb/Vega adequados |
| theme-governance | `.github/skills/theme-governance/` | Governança de tema JSON e paleta |
| project-structure-auditor | `.github/skills/project-structure-auditor/` | Auditoria de caminhos, dependências e coerência |
