# Setup de Execução Real

## Ferramentas encontradas

- Node.js 22.14.0
- npm 10.9.2
- Python 3.14.3
- git 2.52.0
- gcloud CLI 560.0.0
- bq CLI 2.1.29
- firebase-tools 15.11.0

## Ferramentas instaladas

- Nenhuma instalação global adicional foi necessária.
- A API Node foi criada em Dashboard/api com dependências locais do backend.

## Autenticações validadas

- gcloud autenticado com [lucas.batista@petlove.com.br](mailto:lucas.batista@petlove.com.br)
- projeto ativo GCP/Firebase: data-aileron-482822-d0
- Firebase CLI autenticado com [lucas.batista@petlove.com.br](mailto:lucas.batista@petlove.com.br)

## Repositórios usados

- Workspace atual Dashboard
- Não havia repositório HTTP de API separado no workspace
- A API REST foi implementada no próprio repositório em Dashboard/api

## Projeto Firebase selecionado

- data-aileron-482822-d0

## Hosting configurado

- public: frontend/dist
- rewrite SPA para /index.html
- cache longo para assets versionados
- no-cache para index.html

## Backend publicado

- serviço Cloud Run: dashboard-logistico-api
- região: us-central1
- URL pública: [https://dashboard-logistico-api-745676656148.us-central1.run.app](https://dashboard-logistico-api-745676656148.us-central1.run.app)
- arquivo de variáveis usado no deploy: Dashboard/api/cloudrun.env.yaml

## Frontend publicado

- produção: [https://data-aileron-482822-d0.web.app](https://data-aileron-482822-d0.web.app)
- staging: [https://data-aileron-482822-d0--staging-u35eu5su.web.app](https://data-aileron-482822-d0--staging-u35eu5su.web.app)

## Permissões e infraestrutura efetivamente ajustadas

- APIs ativadas: run.googleapis.com, cloudbuild.googleapis.com, artifactregistry.googleapis.com
- papéis adicionados à service account de compute para permitir build e publicação no Cloud Run

## Observações operacionais

- O preview channel do Firebase exige CORS explícito no backend; isso já foi corrigido na API.
- O frontend de produção e staging aponta para a mesma URL pública do Cloud Run.
- O fallback de mock continua disponível apenas para desenvolvimento local.
