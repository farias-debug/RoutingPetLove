# Setup da Evolução do Dashboard

## Escopo validado

- frontend React em Dashboard/frontend
- API Node em Dashboard/api
- camadas SQL em Dashboard/bigquery
- publicação web em Firebase Hosting
- API pública em Cloud Run

## Ferramentas verificadas

- Node.js 22.14.0
- npm 10.9.2
- Python 3.14.3 em venv do projeto
- gcloud 560.0.0
- bq 2.1.29
- git 2.52.0.windows.1
- firebase-tools 15.11.0

## Observações de ambiente

- o shell não resolve python e pip globalmente, mas o venv do projeto foi configurado e está funcional
- autenticação GCP validada com a conta lucas.batista@petlove.com.br
- projeto Firebase disponível: data-aileron-482822-d0
- API pública respondendo em https://dashboard-logistico-api-745676656148.us-central1.run.app

## Builds executados

- npm install no frontend: concluído
- npm run build no frontend: concluído
- npx tsc --noEmit no frontend: concluído sem erros reportados
- node --check em Dashboard/api/server.js: concluído sem erro de sintaxe

## Ajustes aplicados nesta etapa

- mock local deixou de ser fallback implícito; agora depende de VITE_ENABLE_MOCKS=true
- filtros globais passaram a buscar opções reais via API
- filtro tipoVeiculo foi adicionado à barra global
- endpoints /api/resumo/cards e /api/resumo/tendencia-semanal passaram a aceitar filtros operacionais
- endpoint /api/kpi-diario passou a calcular KPIs operacionais em grão de rota/dia via alertas_rotas e custos via VW_Base_Execucao
- filtro Unidade consolidado via fonte canônica e aplicado nos endpoints principais
- nomes de filial, transportador e motorista harmonizados no backend e refletidos no frontend
- leitura de ocupação composta substituída nas telas críticas por capacidade de peso
- API publicada no Cloud Run na revisão dashboard-logistico-api-00007-mjm
- frontend publicado novamente em produção e staging no Firebase Hosting
- hotfix pós-publicação aplicado para corrigir a agregação de nome de filial em /api/filiais/performance e a cláusula de prioridade em /api/drill-rotas

## Validação pública desta rodada

- Cloud Run respondeu 200 em /health, /api/filtros/opcoes, /api/kpi-diario?periodo=2026-03 e /api/resumo/cards?periodo=2026-03
- Cloud Run respondeu 200 também na bateria de endpoints do frontend: /api/metas, /api/resumo/tendencia-semanal, /api/filiais/performance, /api/alertas, /api/alertas/contagem, /api/drill-rotas, /api/transportadores, /api/frota/ocupacao-tipo e /api/motoristas/kpis
- Firebase Hosting respondeu 200 em produção e staging, inclusive em rotas internas da SPA
- preview channel publicado em https://data-aileron-482822-d0--staging-u35eu5su.web.app

## Pendências fora desta etapa

- executar conferência visual manual final nas telas publicadas
- comparar casos dourados com Sheets e Excel em homologação publicada
- revisar ranking de transportadores por filial com uma fonte agregada específica
