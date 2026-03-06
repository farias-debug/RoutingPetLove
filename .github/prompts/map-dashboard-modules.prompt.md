---
description: >
  Mapeia a estrutura visual do dashboard em 6-8 módulos operacionais,
  com KPIs, visuais recomendados e grupos de medidas por módulo.
  Produz Dashboard/docs/04-mapa-modulos-painel.md.
mode: agent
---

# Mapa de Módulos do Dashboard

## Objetivo

Definir a organização visual do Painel Monitoramento Petlove em módulos operacionais, substituindo a lógica de "abas" por painéis com propósito claro.

## Passos

1. **Analisar páginas atuais do report**
   - Ler `Dashboard/Painel Monitoramento - Petlove.Report/definition/pages/pages.json` para listar páginas existentes
   - Para cada página, verificar visuals e layout no `page.json` correspondente
   - Identificar o que cada página mostra atualmente

2. **Cruzar com grupos de medidas**
   - Consultar inventário de medidas (se existir em `Dashboard/docs/02-inventario-medidas.md`)
   - Ou ler `_Medidas.tmdl` para mapear displayFolders
   - Associar cada grupo a perguntas operacionais

3. **Propor 6-8 módulos**
   Para cada módulo definir:
   - **Nome** descritivo da função operacional
   - **Pergunta principal** que responde
   - **Ação esperada** do operador ao usar
   - **KPIs de destaque** (3-5 por módulo)
   - **Grupos de medidas** que alimentam
   - **Visual recomendado** (nativo, SVG, Deneb)
   - **Prioridade de implementação** (1 = imediata, 3 = pode esperar)

4. **Definir hierarquia visual por módulo**
   - Nível 1: Título + filtros contextuais
   - Nível 2: KPIs principais (leitura em <3s)
   - Nível 3: Detalhes/diagnóstico

5. **Módulos recomendados** (referência, adaptar ao que existe)
   | # | Módulo | Foco |
   |---|--------|------|
   | 1 | Torre de Controle do Dia | Status geral da operação agora |
   | 2 | Execução e Volume | Volume executado, progresso, status |
   | 3 | Eficiência / SPR | Performance por rota, produtividade |
   | 4 | Jornada / ORH | Jornadas, ORH, tempo operacional |
   | 5 | Capacidade e Mix Veículos | Ocupação, mix, utilização da frota |
   | 6 | Plano vs Real | Aderência, desvios, reconciliação |
   | 7 | Entregas | Taxa de sucesso, insucessos |
   | 8 | Investigação Operacional | Drill-through por filial/rota |

6. **Produzir artefato**
   Criar `Dashboard/docs/04-mapa-modulos-painel.md` com detalhamento completo.

## Saída

Arquivo `Dashboard/docs/04-mapa-modulos-painel.md` contendo:
- Mapa de módulos com detalhamento completo
- Matriz módulo × grupo de medidas
- Prioridade de implementação
- Wireframe textual de cada módulo (layout em grid 12 colunas)
- Premissas adotadas
