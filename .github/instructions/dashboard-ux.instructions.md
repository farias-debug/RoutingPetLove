---
applyTo:
  - "Dashboard/Painel Monitoramento - Petlove.Report/**"
  - "Dashboard/docs/04-mapa-modulos-painel.md"
  - "Dashboard/docs/05-kit-componentes-visuais.md"
---

# Instruções — UX e Design Visual do Dashboard

## Filosofia

O dashboard é uma ferramenta de **gestão operacional diária e semanal**.
Cada pixel deve ajudar o operador a identificar exceções e tomar decisões.
Menos decoração, mais sinalização.

## Organização: Painéis/Módulos, Não Abas

Organizar o dashboard em **6 a 8 módulos** independentes, cada um respondendo a uma pergunta operacional.

### Não fazer

- Tratar nomes de abas atuais como definitivos
- Criar páginas sem pergunta operacional clara
- Repetir KPIs entre módulos sem necessidade

### Cada módulo responde

1. O que mudou desde ontem/semana?
2. Onde está o problema?
3. Por que aconteceu?
4. O que precisa ser feito?

## Módulos Recomendados

| # | Módulo | Pergunta Principal | Grupos de Medidas |
|---|--------|--------------------|-------------------|
| 1 | Torre de Controle do Dia | Como está a operação agora? | 01. Operacao, 06. Shared\01. Temporal |
| 2 | Execução e Volume | Qual o volume executado vs planejado? | 01. Operacao\05-06, 05. Plano vs Real |
| 3 | Eficiência / SPR | A performance por rota está adequada? | 02. SPR e Performance (6 subfolders) |
| 4 | Jornada / ORH | As jornadas estão dentro dos limites? | 03. Jornada e ORH (2 subfolders) |
| 5 | Capacidade e Mix de Veículos | A frota está sendo usada adequadamente? | 04. Frota e Capacidade (4 subfolders) |
| 6 | Plano vs Real + Reconciliação | Qual a aderência ao planejamento? | 05. Plano vs Real (4 subfolders) |
| 7 | Entregas | Taxa de sucesso na meta? | 98. Suporte (proposto: 08. Entregas) |
| 8 | Investigação Operacional | Detalhe de filial/rota específica | 07. Investigacao (drill-through) |

### Páginas Atuais × Módulos

| Página Atual | Módulo Alvo | Ação |
|-------------|-------------|------|
| 01 Torre de Controle | M1 | Manter, otimizar |
| 02 Scoreboard | M1 ou M8 | Reavaliar (fundir) |
| 03 Eficiencia SPR | M3 | Manter |
| 04 Capacidade e Mix | M5 | Manter |
| 05 Plano vs Real | M6 | Manter |
| 06 KPIs Diários | M2 | Consolidar 06+07 |
| 07 KPIs Diários | M2 | Consolidar 06+07 |
| 08 Análise Filiais | M8 | Fundir com Investigação |
| *(criar)* | M4 Jornada/ORH | **Criar** |
| *(criar)* | M7 Entregas | **Criar** |

## Hierarquia Visual Obrigatória

Máximo **3 níveis** por módulo:

1. **Nível 1**: Título do módulo + filtros contextuais (data, filial, tipo veículo)
2. **Nível 2**: KPIs principais (3 a 5 por módulo) — leitura em <3 segundos
3. **Nível 3**: Detalhes / diagnóstico — tabelas, rankings, gráficos de investigação

## Paleta Visual

| Token | Cor | Uso |
|-------|-----|-----|
| Primary | `#441A80` | Identidade, foco principal, títulos |
| Primary-2 | `#5B2D8C` | Variação secundária, hover |
| Accent/Warning | `#F5A623` | Atenção, alertas moderados |
| Success | `#4CAF50` | Meta atingida, dentro do esperado |
| Danger | `#E74C3C` | Desvio crítico, fora da meta |
| Background | `#FFFFFF` | Fundo principal da página |
| Surface | `#F9FAFB` | Fundo de cards e superfícies |
| Border/Divider | `#E5E7EB` | Bordas de cards, separadores |
| Text secondary | `#6A7282` | Labels, subtítulos |
| Text muted | `#A3A8B2` | Texto auxiliar, notas |

### Regras de cor

- **Nunca** usar cor como único indicador de estado — sempre combinar com ícone e/ou texto
- Evitar blocos grandes com fundo saturado
- Preservar contraste WCAG AA mínimo
- `#E74C3C` somente para desvios reais, nunca decorativo
- `#4CAF50` somente para confirmação de meta/OK

## Grid e Espaçamentos

- Grid: **12 colunas** por módulo
- Espaçamentos padronizados: `8px / 16px / 24px`
- Bordas de cards: `1px solid #E5E7EB`, border-radius `4px`
- Sombra de cards: sutil ou nenhuma (evitar peso visual)
- Títulos de módulo: `14px bold`, cor `#441A80`
- Labels de KPI: `11px regular`, cor `#6A7282`
- Valores de KPI: `24px bold` (destaque) ou `18px bold` (secundário)

## Alertas e Microcopy

Todo alerta deve conter:
- **Regra**: condição que dispara (ex: `% Aderência < 85%`)
- **Cor e/ou ícone**: sinalização visual
- **Microcopy de ação**: texto curto orientando o que fazer

Exemplos:
- `⚠️ Investigar queda de ocupação na filial X`
- `🔴 Jornada excedida em 3 rotas — avaliar redistribuição`
- `📊 Desvio de +15% entre planejado e real — validar cadastro`

## Prioridade Técnica de Implementação Visual

1. **Visual nativo** + formatação condicional + tooltip pages
2. **SVG via DAX** para cards premium, badges, semáforos, sparklines curtas
3. **Deneb** somente para: ranking visual, variance/deviation, lollipop, small multiples

### Regra

Se um visual nativo resolve com clareza, **não usar Deneb**.
Deneb não deve ser usado apenas por estética.

## Componentes Padrão (Kit)

| # | Componente | Quando Usar |
|---|-----------|-------------|
| 1 | KPI Card Principal | Destaque de métrica core no Nível 2 |
| 2 | KPI Card de Alerta | Métrica fora da meta com ação sugerida |
| 3 | Meta vs Real | Comparação planejado vs executado |
| 4 | Ranking Top/Bottom | Filiais ou rotas com melhor/pior performance |
| 5 | Tendência Curta | Sparkline dos últimos 7 dias ou semana |
| 6 | Tabela de Investigação | Drill-through com filtros detalhados |
| 7 | Painel de Filtros | Filtros contextuais no topo do módulo |
| 8 | Tooltip Rico | Tooltip page com contexto adicional |

## Simplificação Visual

### Reduzir

- Shapes decorativos sem função
- Linhas e caixas que não agrupam conteúdo
- Duplicidade de cards entre módulos
- Peso visual desnecessário

### Aumentar

- Espaço em branco
- Agrupamento lógico por proximidade
- Contraste útil (fundo vs dados)
- Foco na exceção (não no caso normal)
- Velocidade de leitura
