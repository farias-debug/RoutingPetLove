# Validação Funcional do Frontend

## Validações executadas

- deploy das views v6 no BigQuery concluído com sucesso
- cliente HTTP atualizado para timeout, no-store, abort e validação Zod
- paginação server-side implementada em alertas, drill de rotas e motoristas
- filtros globais ampliados e persistidos na URL
- frontend buildado e tipado com sucesso
- frontend publicado em produção e staging
- smoke tests de rota SPA executados em produção e staging
- testes públicos da API executados após deploy do Cloud Run
- CORS validado para origem de produção e preview/staging
- smoke tests públicos executados em /api/filtros/opcoes, /api/kpi-diario e /api/resumo/cards após a nova revisão do backend

## Evidências objetivas

- deploy_v6_api.py retornou 6/6 views OK
- npx tsc --noEmit executado sem erros
- npm run build executado sem erros
- bundle publicado contém a URL pública do Cloud Run
- /health, /api/filtros/opcoes, /api/kpi-diario e /api/resumo/cards responderam 200 na URL pública
- / e /alertas responderam 200 nas URLs publicadas do Hosting

## Cobertura funcional confirmada

### Resumo Executivo

- cards consumindo API real
- tendência semanal consumindo API real
- ranking/performance por filial consumindo API real

### Planejado x Realizado

- KPIs e gráficos ligados às fontes reais agregadas
- remoção de dependência de tendência hardcoded para metas principais

### Custos e Eficiência

- cards e ranking ligados à API real
- KPI diário publicado com custos e DPPH vindos de fontes reais compatíveis com o grão operacional

### Frota e Capacidade

- ocupação por tipo de veículo em fonte real
- bug de estado de loading corrigido

### Tempo e SLA

- reference lines consumindo metas reais da API

### Aderência e Atendimento

- metas e aderências consumindo dados reais das fontes agregadas

### Transportadores

- ranking, share e score em fonte real

### Motoristas e Jornada

- KPIs conectados à API real
- tabela com paginação server-side

### Investigação Operacional

- cards de contagem reais
- alertas e drill com filtros e paginação server-side

## Divergências ainda existentes

- parte do planejado x realizado por período depende de fontes agregadas sem granularidade diária completa
- golden case numérico contra Sheets e Excel ainda depende de validação manual adicional

## Pendências remanescentes

- executar conferência visual manual final nas telas publicadas
- comparar casos dourados com Sheets e Excel em homologação publicada
