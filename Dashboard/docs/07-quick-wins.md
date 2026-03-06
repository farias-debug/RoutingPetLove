# 07 — Quick Wins

> 18 ações rápidas priorizadas por **impacto × esforço**. Cada ação é independente e pode ser executada sem dependência das demais.

---

## Matriz de Priorização

```
       Alto Impacto
         │
    ★★★  │  ★★☆
  QW-01  │  QW-05
  QW-02  │  QW-06
  QW-03  │  QW-07
  QW-04  │  QW-08
─────────┼──────────────── Esforço →
    ★☆☆  │  (evitar)
  QW-09  │
  QW-10  │
  ...    │
    Baixo│Impacto
```

---

## ★★★ Alto Impacto + Baixo Esforço (fazer primeiro)

### QW-01 — Corrigir paleta do tema JSON
| Campo | Detalhe |
|-------|---------|
| **O quê** | Substituir paleta errada (`#0F6D63`) pela correta (`#441A80`) em `monitoramento_operacional_base.json` |
| **Impacto** | 🔴 Crítico — toda identidade visual está errada |
| **Esforço** | ⚡ 15 min — edição de JSON |
| **Arquivo** | `Dashboard/theme/monitoramento_operacional_base.json` |
| **Como** | Substituir `dataColors`, `foreground`, `tableAccent`, `good`, `neutral`, `bad` pelos valores da paleta obrigatória |

### QW-02 — Remover dim_targets.csv órfão
| Campo | Detalhe |
|-------|---------|
| **O quê** | Remover `output/powerbi/dim_targets.csv` — não tem tabela correspondente no modelo |
| **Impacto** | 🟡 Médio — confusão de manutenção, pode gerar erros de refresh |
| **Esforço** | ⚡ 5 min — deletar arquivo |
| **Arquivo** | `Dashboard/output/powerbi/dim_targets.csv` |

### QW-03 — Documentar grupo 07. Investigacao nos instructions
| Campo | Detalhe |
|-------|---------|
| **O quê** | Adicionar `07. Investigacao\01. Linha Operacional` (22 medidas TblExp) ao `powerbi-semantic.instructions.md` |
| **Impacto** | 🟡 Médio — grupo novo não documentado, agentes e devs não sabem que existe |
| **Esforço** | ⚡ 10 min — edição de MD |
| **Arquivo** | `.github/instructions/powerbi-semantic.instructions.md` |

### QW-04 — Renomear páginas 06 e 07 (nomes duplicados)
| Campo | Detalhe |
|-------|---------|
| **O quê** | As páginas "KPIs Diarios" (06) e "KPIs Diarios" (07) têm o mesmo nome. Renomear para distinguir escopo |
| **Impacto** | 🟡 Médio — confusão do usuário e do operador |
| **Esforço** | ⚡ 5 min — edição de `displayName` no page.json |
| **Sugestão** | "KPIs Diários — Operação" e "KPIs Diários — Entregas" (ou consolidar em 1 página) |

---

## ★★☆ Alto Impacto + Esforço Moderado

### QW-05 — Desabilitar auto-date/time no modelo
| Campo | Detalhe |
|-------|---------|
| **O quê** | Desligar "Auto date/time" para eliminar 7 tabelas `LocalDateTable_*` ocultas |
| **Impacto** | 🟡 Médio — reduz peso do modelo, limpa tabelas desnecessárias |
| **Esforço** | 🕐 30 min — alterar flag no model.tmdl, testar refresh |
| **Pré-requisito** | `dim_calendario` já existe como tabela explícita, então auto-date é redundante |

### QW-06 — Validar e corrigir 17 SVG Cards
| Campo | Detalhe |
|-------|---------|
| **O quê** | Testar cada medida SVG em `06. Shared\03. SVG Cards` — corrigir DAX/SVG com erro |
| **Impacto** | 🔴 Crítico — SVG Cards são a base da migração do legado HTML |
| **Esforço** | 🕐 1-2 horas — avaliar e corrigir DAX |
| **Detalhe** | Erros conhecidos em SVG Cards; precisam ser corrigidos antes de substituir HTML |

### QW-07 — Criar tooltip pages (mínimo 2)
| Campo | Detalhe |
|-------|---------|
| **O quê** | Criar 2 tooltip pages: (1) KPI detalhado, (2) Spotlight de filial |
| **Impacto** | 🟡 Médio — melhora UX significativamente |
| **Esforço** | 🕐 1-2 horas — design + implementação |
| **Layout** | 320×240px, fundo branco, 5-6 linhas de info |

### QW-08 — Substituir 11 HTML KPI Cards básicos por nativo
| Campo | Detalhe |
|-------|---------|
| **O quê** | Sprint 1 da migração HTML: substituir cards simples (valor + label) por Card visual nativo |
| **Impacto** | 🔴 Alto — remove dependência de HTML Content Viewer em 11 visuais |
| **Esforço** | 🕐 2-3 horas — trocar visuais no report |
| **Referência** | Doc [06-plano-migracao-html-svg-deneb.md](06-plano-migracao-html-svg-deneb.md) Sprint 1, item 2 |

---

## ★☆☆ Impacto Moderado + Baixo Esforço

### QW-09 — Atualizar contagem de medidas no AGENTS.md
| Campo | Detalhe |
|-------|---------|
| **O quê** | AGENTS.md diz "473 measures" mas são 389. Atualizar |
| **Impacto** | 🟢 Baixo — correção de documentação |
| **Esforço** | ⚡ 5 min |
| **Arquivo** | `AGENTS.md` |

### QW-10 — Adicionar subfolders faltantes nos instructions
| Campo | Detalhe |
|-------|---------|
| **O quê** | `powerbi-semantic.instructions.md` não lista: `01.Op\04-06`, `04.Frota\03-04`, `06.Shared\03.SVG Cards`, `07.Investigacao` |
| **Impacto** | 🟢 Baixo — alinhamento doc × realidade |
| **Esforço** | ⚡ 15 min |
| **Arquivo** | `.github/instructions/powerbi-semantic.instructions.md` |

### QW-11 — Mover aux_capacidade.xlsx ou documentar
| Campo | Detalhe |
|-------|---------|
| **O quê** | `data/tab_auxiliar/aux_capacidade.xlsx` existe mas não é referenciado no transform.py |
| **Impacto** | 🟢 Baixo — limpeza/documentação |
| **Esforço** | ⚡ 10 min — verificar se é usado em M query; se não, mover para _archive |

### QW-12 — Adicionar description a ~40 medidas sem descrição
| Campo | Detalhe |
|-------|---------|
| **O quê** | ~40 medidas core não têm `description` no TMDL |
| **Impacto** | 🟡 Médio — dificulta manutenção e onboarding |
| **Esforço** | 🕐 1-2 horas — editar TMDL |

### QW-13 — Criar página de Jornada/ORH (M4)
| Campo | Detalhe |
|-------|---------|
| **O quê** | Módulo M4 não tem página dedicada. Medidas de `03. Jornada e ORH` existem (27) mas não têm página |
| **Impacto** | 🟡 Médio — gap funcional |
| **Esforço** | 🕐 2-3 horas — criar page com visuais |

### QW-14 — Criar página de Entregas (M7)
| Campo | Detalhe |
|-------|---------|
| **O quê** | Módulo M7 não tem página dedicada. Medidas de `98. Suporte` (32) precisam de home |
| **Impacto** | 🟡 Médio — gap funcional |
| **Esforço** | 🕐 2-3 horas — criar page com visuais |

### QW-15 — Promover 98.Suporte\01-02 para novo grupo 08. Entregas
| Campo | Detalhe |
|-------|---------|
| **O quê** | Medidas de Entrega não são "suporte" — promover para grupo próprio |
| **Impacto** | 🟡 Médio — taxonomia mais coerente |
| **Esforço** | 🕐 30 min — mover display folders no TMDL |

---

## Ações de Melhoria Contínua

### QW-16 — Criar dim_calendario em DAX puro (sem auto-date)
| Campo | Detalhe |
|-------|---------|
| **O quê** | Garantir que `dim_calendario` cobre todo o range necessário. Validar se auto-date pode ser desligado |
| **Impacto** | 🟢 Baixo — já funciona, mas precisa validação |
| **Esforço** | ⚡ 15 min — verificar DAX da tabela |

### QW-17 — Estabelecer padrão de KPI Pack para novos KPIs
| Campo | Detalhe |
|-------|---------|
| **O quê** | Documentar template de 14 medidas por KPI pack para que novos KPIs sigam o mesmo padrão |
| **Impacto** | 🟡 Médio — consistência futura |
| **Esforço** | ⚡ 15 min — já documentado no [03-taxonomia-medidas.md](03-taxonomia-medidas.md) |

### QW-18 — Consolidar páginas "KPIs Diários" (06+07) em 1
| Campo | Detalhe |
|-------|---------|
| **O quê** | Duas páginas com mesmo nome — avaliar consolidação em 1 página com filtro de escopo |
| **Impacto** | 🟡 Médio — reduz confusão, simplifica navegação |
| **Esforço** | 🕐 1-2 horas — redesign de layout |

---

## Resumo de Prioridade

| Prioridade | IDs | Esforço Total Aprox |
|-----------|-----|---------------------|
| **Fazer agora** (★★★) | QW-01, QW-02, QW-03, QW-04 | ~35 min |
| **Fazer esta semana** (★★☆) | QW-05, QW-06, QW-07, QW-08 | ~6 horas |
| **Fazer neste sprint** (★☆☆) | QW-09..QW-18 | ~8 horas |
