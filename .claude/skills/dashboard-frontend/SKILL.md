---
name: dashboard-frontend
description: Use when building, refactoring, debugging, or reviewing the React dashboard frontend in Dashboard/frontend, especially pages, filters, charts, layout, responsiveness, React Query integration, and API-driven visualizations.
argument-hint: "[rota, pagina, componente ou problema]"
---

# Dashboard Frontend

Atue como especialista no frontend do dashboard operacional.

## Antes de implementar

1. Leia frontend-reference.md para entender stack, rotas, convencoes e checklist.
2. Identifique a rota, o componente principal e a origem do dado.
3. Verifique se ja existe hook, schema Zod, formatter ou componente reutilizavel equivalente.

## Diretrizes de execucao

- Trabalhe primeiro em Dashboard/frontend/.
- Se faltar dado ou contrato, consulte a API em Dashboard/api/ antes de criar gambiarra no frontend.
- Para filtros globais, respeite sincronizacao por URL/searchParams.
- Para graficos, preserve responsividade, legibilidade, estados vazios e formatacao de eixo/tooltip.
- Para ajustes visuais, preserve o design system existente do projeto em vez de inventar uma linguagem paralela.
- Para bugs, descreva causa raiz em termos de contrato de dados, estado React, formatação ou responsividade.

## Validacao obrigatoria

- Rode lint se alterar codigo TypeScript ou JSX.
- Rode build se alterar pagina, rotas, hooks ou configuracao.
- Rode testes se houver cobertura afetada ou se a mudanca alterar comportamento.

## Evite

- Editar dist/, node_modules/, _archive/ e _tmp/ sem pedido explicito.
- Duplicar hooks, schemas ou utilitarios existentes.
- Corrigir metrica no componente se a divergencia estiver na API ou no SQL.

## Referencia adicional

- Veja frontend-reference.md para stack, paginas, camada de dados e checklist.
