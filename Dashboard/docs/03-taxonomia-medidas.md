# 03 — Taxonomia de Medidas (Estrutura Alvo)

> Proposta de organização, nomenclatura e hierarquia baseada no estado real do modelo (389 medidas).

## 1. Diagnóstico por Grupo

### 01. Operacao — ✅ Bem estruturado

- **6 subfolders** (Volume, Alertas, Ranking, Médias, Plan vs Real, Status Rota)
- Evolução orgânica e coerente desde a versão inicial
- Score Operacional ponderado (SPR 45% + ORH 30% + Cap 25%) é boa prática
- **Ajuste**: nenhum dos subfolders existentes precisa de remoção

### 02. SPR e Performance — ✅ Maduro, ligeiramente pesado

- 73 medidas são muitas para um grupo, mas a estrutura em 6 subfolders justifica
- O pattern KPI (14/pack) é replicável e sólido
- **Ajuste**: Os 3 KPI packs (04/05/06) são 42 medidas — poderia haver um subfolder `KPI` consolidado, mas a separação por tema funciona

### 03. Jornada e ORH — ✅ Completo

- 27 medidas cobrindo tempo, utilização, ociosidade, consolidação, status
- KPI ORH completo
- **Ajuste**: Faltam medidas de distribuição (P10, P50, P90 do tempo realizado)

### 04. Frota e Capacidade — ✅ Expandido significativamente

- Evolução de 2 para 4 subfolders
- Mix por Tipo e Filial/Semana agregam valor analítico
- **Ajuste**: 27 medidas em Filial/Semana é denso — nem todas provavelmente são usadas em visuais

### 05. Plano vs Real — ✅ Coerente

- 19 medidas, 4 dimensões (desvios, aderência, cobertura, contexto)
- **Ajuste**: considerar adicionar semáforo/status consolidado

### 06. Shared — ⚠️ Precisa reorganização

- 41 medidas temporais é muito — mas cada uma tem uso claro (D-1, WoW, MoM, MA7, YTD, Semana)
- SVG Cards (17) com erros — **reavaliar**
- **Ajuste**: SVG Cards deveria ser movido para fora de Shared se for mantido (é visual, não compartilhado)

### 07. Investigacao — ✅ Novo e bem focado

- 22 medidas TblExp no nível de linha
- Padrão consistente com prefixo `TblExp`
- **Ajuste**: Falta página drill-through correspondente no report

### 90. Legado — Referência de migração

- 44 medidas HTML não devem ser base para estrutura final
- Servem como inventário do que precisa ser substituído

### 98. Suporte — ⚠️ Reclassificar entregas

- Entregas é um tema operacional importante — considerar promover para grupo próprio ou integrar ao 01. Operacao
- KPI Entregas e Entrega Operacional são patterns maduros

### 99. Backoffice — Pode reduzir

- 8 medidas sem descrição; custo e SLA não são prioridade atual

---

## 2. Taxonomia Alvo

### Hierarquia de Grupos (proposta)

```
01. Operacao\
    01. Volume e Execucao          # Manter
    02. Alertas e Prioridades      # Manter
    03. Ranking e Participacao     # Manter
    04. Medias e Tendencias        # Manter
    05. Planejado vs Realizado     # Manter
    06. Status de Rota             # Manter

02. SPR e Performance\
    01. SPR Base                   # Manter
    02. Produtividade Hora         # Manter
    03. Eficiencia KM              # Manter
    04. KPI SPR Pedidos            # Manter
    05. KPI SPR Volumes            # Manter
    06. KPI Desvio SPR             # Manter

03. Jornada e ORH\
    01. ORH e Jornada              # Manter
    02. KPI ORH                    # Manter

04. Frota e Capacidade\
    01. Referencia de Capacidade   # Manter
    02. Ocupacao Geral             # Manter
    03. Mix por Tipo               # Manter
    04. Filial e Semana            # Manter

05. Plano vs Real\
    01. Desvios Absolutos          # Manter
    02. Aderencia Percentual       # Manter
    03. Cobertura e Match          # Manter
    04. Contexto de Execucao       # Manter

06. Shared\
    01. Temporal                   # Manter
    02. Metas\01. SPR              # Manter
    02. Metas\02. ORH              # Manter
    02. Metas\03. Entrega          # ← MOVER de 98.Suporte\03
    03. SVG Cards                  # Reavaliar → migrar para visuais nativos

07. Investigacao\
    01. Linha Operacional          # Manter

08. Entregas\                     # ← PROMOVER de 98.Suporte
    01. Base                       # ← de 98.Suporte\01
    02. KPI Entrega                # ← de 98.Suporte\02
    03. Operacional                # ← de 98.Suporte\04

90. Legado\
    01. HTML\01-05                 # Manter como referência até migração

98. Suporte\                      # Residual após promoção de Entregas
    (avaliar necessidade)

99. Backoffice\
    01. Nao Publicavel             # Manter ou remover
```

### Justificativa das Mudanças

1. **Promover Entregas para grupo 08**: Entregas é tema operacional central (7 medidas base + 14 KPI + 9 operacional = 30 medidas). Merece grupo próprio ao lado dos core 01-07.

2. **Mover Metas Entrega para 06.Shared\02.Metas\03.Entrega**: Metas são compartilhadas e devem ficar centralizadas.

3. **SVG Cards em 06.Shared**: São visuais, não dados compartilhados. Se mantidos, ficariam melhor como subfolder de um grupo visual (`06.Shared\03. SVG Cards` → `06. Shared\04. Visual\SVG Cards`). Mas recomendação é migrar para nativos e descartar.

---

## 3. Convenção de Nomenclatura

### Prefixos Obrigatórios

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| *(nenhum)* | Medida base direta | `Total Rotas` |
| `%` | Percentual / taxa | `% Rotas Concluidas` |
| `Var` | Variação / desvio | `Var D-1 Rotas` |
| `Meta` | Valor de referência | `Meta SPR Pedidos` |
| `Rank` | Ranking | `Op Rank SPR Filial` |
| `Avg` | Média | `Media KM por Rota` |
| `Flag` | Indicador booleano | `TblExp Flag Overtime 8h` |
| `KPI` | Pack KPI | `KPI SPR Ped Valor` |
| `Op` | Operacional consolidado | `Op Status SPR` |
| `TblExp` | Nível linha (drill) | `TblExp SPR Ped Real Linha` |
| `SVG` | Visual SVG via DAX | `SVG Card SPR Ped` |
| `HTML` | Legado HTML | `HTML Card SPR Ped` |
| `Cap` | Capacidade ref. | `Cap P75 Pedidos` |
| `MA7` | Média móvel 7d | `MA7 Rotas` |

### Sufixos Contextuais

| Sufixo | Uso | Exemplo |
|--------|-----|---------|
| `(h)` | Unidade horas | `Tempo Medio Realizado (h)` |
| `(%)` | Unidade percentual | `Aderencia Pedidos (%)` |
| `(kg)` | Unidade peso | `Cap P75 Peso (kg)` |
| `(pts)` | Pontos | `Gap SPR vs Meta (pts)` |
| `(R$)` | Moeda | `Custo por Rota (R$)` |
| `Valor` | Valor atual | `KPI SPR Ped Valor` |
| `Meta` | Referência | `KPI SPR Ped Meta` |
| `Delta` | Diferença | `KPI SPR Ped Delta` |
| `Status` | Semáforo | `KPI SPR Ped Status` |
| `Cor` | Hex color | `KPI SPR Ped Cor` |
| `Icone` | Ícone direcional | `KPI SPR Ped Icone` |
| `Texto Card` | String para card | `KPI SPR Ped Texto Card` |
| `Acao` | Microcopy | `KPI SPR Ped Acao` |
| `Trend D-1` | Tendência diária | `KPI SPR Ped Trend D-1` |
| `Trend WoW` | Tendência semanal | `KPI SPR Ped Trend WoW` |

### Regras Gerais

1. **Nomes em português**, claros e descritivos
2. **Sem abreviações obscuras** (SPR é aceito por ser termo de domínio)
3. **Display folder obrigatório** — nunca deixar medida na raiz
4. **Medidas auxiliares** (prefixo `_`) devem ter comentário DAX
5. **Medidas legadas** ficam em `90. Legado\` até migração completa
6. **Toda nova medida** deve ter `description` preenchida no TMDL

---

## 4. KPI Pattern (Template)

Para cada KPI novo, criar as 14 medidas:

```
KPI [Nome] Valor          → Valor atual
KPI [Nome] Meta           → Referência/meta
KPI [Nome] Delta          → Valor - Meta
KPI [Nome] Delta%         → Delta / Meta
KPI [Nome] Status         → Semáforo texto
KPI [Nome] Status Codigo  → 1/0/-1
KPI [Nome] Status Texto   → Texto descritivo
KPI [Nome] Cor            → Hex (#4CAF50/#F5A623/#E74C3C)
KPI [Nome] Icone          → ▲/►/▼
KPI [Nome] Texto Card     → String concatenada para exibição
KPI [Nome] Acao           → Microcopy de ação
KPI [Nome] Origem Meta    → Fonte da meta
KPI [Nome] Trend D-1      → Tendência D-1
KPI [Nome] Trend WoW      → Tendência WoW
```

---

## 5. Medidas Faltantes (Gap Analysis)

| Medida Proposta | Grupo Sugerido | Prioridade |
|-----------------|----------------|------------|
| KPI Ocupacao Pack (14) | 04. Frota e Capacidade | Média |
| Distribuição Tempo P10/P50/P90 | 03. Jornada e ORH | Baixa |
| Status Consolidado Plano vs Real | 05. Plano vs Real | Média |
| % Rotas Sem Motorista | 01. Operacao\06. Status | Média |
| Rank Ocupação por Filial | 04. Frota e Capacidade | Baixa |
| Var WoW Ocupação (%) | 06. Shared\01. Temporal | Baixa |
| KPI Aderência Pack (14) | 05. Plano vs Real | Média |
| Score jornada Filial (0-100) | 03. Jornada e ORH | Baixa |
