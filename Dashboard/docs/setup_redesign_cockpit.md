# Setup do Redesign do Cockpit Executivo-Operacional

## Objetivo

Transformar a home do dashboard em uma superfície única de leitura executivo-operacional, com scroll longo, navegação interna fixa, tendência diária, ranking, capacidade, alertas e drill operacional usando API real e BigQuery.

## Escopo implementado nesta rodada

- Nova home principal em frontend/src/pages/CockpitOperacional.tsx
- Rota principal / migrada para o cockpit
- Rota /cockpit-operacional adicionada
- Rota /resumo-executivo preservada para a home legada
- Novo endpoint backend /api/executivo/serie-diaria
- Contrato TypeScript e schema Zod para série diária executiva
- Sidebar renomeada para refletir a nova home
- Variação diária e bloco de SLA ajustados para enfatizar aderenciaVolumes em vez de ocupação bruta
- Correção final do ribbon title para /cockpit-operacional no DashboardLayout

## Arquitetura adotada

### Frontend

A home foi reorganizada em seções contínuas:

1. Visão geral
2. Tendências e variações
3. Filiais
4. Transportadores
5. Capacidade
6. SLA e produtividade
7. Alertas
8. Motoristas
9. Drill operacional

Cada seção usa dados reais já expostos pela API ou pelo novo endpoint diário.

### Backend

Foi criado o endpoint /api/executivo/serie-diaria para suportar séries 7d, 14d, 30d e MTD.

Características:

- Reusa buildBaseExecWhere para manter filtros semânticos já consolidados
- Respeita filtro de filiais do tipo Unidade
- Suporta filial, transportador, status e tipoVeiculo
- Usa janela temporal automática quando periodo não é informado
- Agrega métricas diárias diretamente de VW_Base_Execucao
- Foi alinhado ao schema publicado real da view em produção, não apenas ao SQL de _deploy

## Estado publicado validado

- API pública: <https://dashboard-logistico-api-745676656148.us-central1.run.app>
- Cloud Run revision ativa nesta rodada: dashboard-logistico-api-00011-hmw
- Staging publicado: <https://data-aileron-482822-d0--staging-u35eu5su.web.app>

- Rotas publicadas validadas: /, /cockpit-operacional, /transportadores

Smoke tests validados:

- /health
- /api/executivo/serie-diaria?janela=7d
- /api/kpi-diario?periodo=2026-03
- /api/drill-rotas?periodo=2026-03&limit=2

## Contratos utilizados pela nova home

### Endpoints existentes reaproveitados

- /api/resumo/cards
- /api/kpi-diario
- /api/filiais/performance
- /api/transportadores
- /api/frota/ocupacao-tipo
- /api/alertas/contagem
- /api/alertas
- /api/motoristas
- /api/motoristas/kpis
- /api/drill-rotas

### Novo endpoint

- /api/executivo/serie-diaria

Payload retornado:

- data
- rotas
- pedidos
- volumes
- entregasEfetivas
- sprPedidos
- sprVolumes
- scoreOperacional
- ocupacaoComposta
- aderenciaVolumes
- tempoMedRealizado
- qtdRotasNaoPlanejadas
- qtdRotasSemTempo
- qtdFiliaisCriticasSpr

## Validação de ambiente solicitada para a rodada

Executar a partir de Dashboard/frontend:

1. npm install
2. npm run build
3. npx tsc --noEmit

Executar na raiz do projeto ou conforme disponibilidade do ambiente:

1. node --version
2. npm --version
3. python --version
4. gcloud --version
5. bq version
6. firebase --version

Resultado observado nesta rodada:

- Node OK
- npm OK
- gcloud OK
- bq OK
- firebase OK
- python não resolvido globalmente neste shell

## Validação funcional mínima

- Abrir a rota /
- Confirmar sticky subnav com scroll interno
- Confirmar alternância 7d, 14d, 30d e MTD
- Confirmar carregamento de charts sem mocks
- Confirmar abertura do drawer no drill operacional
- Confirmar permanência das rotas legadas

Checklist concluído:

- Build do frontend OK com npm run build
- Typecheck OK com npx tsc --noEmit
- Syntax check do backend OK com node --check api/server.js
- Endpoint novo respondendo 200 após correção de schema publicado
- Staging acessível com renderização do cockpit e seções longas

## Pontos de atenção

- O endpoint novo resolve a necessidade de tendência diária da nova home, mas não substitui a futura revisão centralizada de metas produtivas no backend.
- O schema publicado de VW_Base_Execucao usa nomes legados como Tempo Realizado h, Tempo Planejado h, Peso Realizado kg, Peso Planejado kg e Possui Planejado. Novos endpoints devem validar a view ativa antes de assumir aliases do _deploy.
- Há outliers visíveis em alguns indicadores publicados, especialmente alertas agregados e alguns tipos de veículo com ocupação extrema, que parecem decorrer da camada de dados publicada e não do shell do cockpit.
- O preview channel do Firebase pode emitir warning de sync com Firebase Auth sem bloquear acesso.
- pipeline-status.md em memória de repositório está desatualizado e não deve ser usado como fonte única de versão ativa.

## Continuidade após o redesign da home

Depois da publicação do cockpit principal, a próxima etapa passou a ser a expansão do mesmo padrão para as abas setoriais.

Já iniciado nesta sequência:

- criação dos componentes reutilizáveis frontend/src/components/dashboard/PageHeroAnalitico.tsx e frontend/src/components/dashboard/PageSectionNav.tsx
- aplicação inicial do padrão em Planejado × Realizado e Custos e Eficiência
- continuidade planejada para Tempo e SLA, Transportadores e demais páginas curtas

Referência de progresso consolidada:

- docs/diagnostico_melhorias_dashboard.md
