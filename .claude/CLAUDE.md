# Dashboard e Dados - Memoria de Projeto para Claude

Este workspace concentra o stack de dashboard operacional e pipeline de dados em torno de Dashboard/.

## Escopo principal

- Frontend React: Dashboard/frontend/
- API e agregacoes para o dashboard: Dashboard/api/
- SQL, cargas e validacoes BigQuery: Dashboard/bigquery/
- Extracao e consolidacao: Dashboard/extraction/
- Documentacao canonica: Dashboard/docs/

## Como trabalhar neste projeto

- Responda em portugues do Brasil por padrao.
- Trate Dashboard/ como fonte primaria. Evite usar .github/_old/, Dashboard/_archive/ e _tmp/ como base de implementacao, exceto quando o usuario pedir historico ou comparacao.
- Antes de alterar metricas do dashboard, rastreie o fluxo completo: BigQuery -> views v5/v6 -> API -> hooks/client frontend -> componente/pagina.
- Antes de alterar UI, confirme rota, estado de loading, estado vazio, erro e comportamento mobile.
- Preserve os caminhos canonicos e evite criar documentacao ativa com nomes versionados para descrever o estado atual.

## Regras de frontend

- Stack principal: React + Vite + TypeScript + shadcn/ui + Tailwind + Recharts + React Query + Zod.
- Reaproveite hooks existentes em Dashboard/frontend/src/hooks/ e schemas em Dashboard/frontend/src/services/api/.
- Use graficos responsivos, formatacao consistente de moeda, percentual e datas, e evite componentes paralelos se ja houver padrao equivalente.
- Sempre que possivel, valide mudancas com lint, build e testes no frontend.

## Regras de dados

- Considere como referencia operacional o pipeline BigQuery canonico documentado em Dashboard/docs/.
- Ao analisar KPIs, deixe explicito: grao, filtros, janela temporal, tratamento de nulos, deduplicacao e denominador.
- Prefira corrigir divergencias na raiz do calculo ou da view, nao no frontend.
- Se a mudanca afetar dado publicado, avalie impacto na API e no consumo React.

## Skills recomendadas

- Use /dashboard-frontend para construir ou refatorar telas, componentes, filtros e graficos.
- Use /data-analysis para investigar KPIs, views, SQL, API e divergencias de dados.
- Use /dashboard-root-cause quando o problema cruzar frontend, API e BigQuery e exigir rastreamento ponta a ponta.
