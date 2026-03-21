# Diagnóstico de Integração Real

## Cenário inicial

### O que já existia

- Frontend React em Dashboard/frontend
- Camadas BigQuery v4 e v5 ativas
- SQL v6 de apoio à API presente no repositório, mas inconsistente
- Firebase CLI instalado

### O que faltava

- API backend HTTP no workspace
- deploy válido das views v6
- contrato executável entre frontend, API e BigQuery
- validação de runtime no frontend
- paginação server-side nas telas pesadas
- publicação web operacional ponta a ponta

## Incompatibilidades encontradas

### Entre frontend e API

- não existia API HTTP; o frontend operava em mock quando VITE_API_BASE_URL ficava vazio
- useMotoristasKpis enviava data em vez de periodo
- filtros globais não incluíam status, prioridade e tipoVeiculo
- várias telas tinham tendências e metas hardcoded

### Entre API e BigQuery

- pipeline_v6_api.sql referenciava aliases inexistentes
- deploy_v6_api.py interpretava comentários como statements SQL válidos
- parte das fontes reais de custo e ocupação estava fora da visão usada originalmente

## Ações executadas

- criação da API REST em Dashboard/api
- correção e publicação das views v6 no BigQuery
- ajuste do contrato e do client do frontend
- inclusão de Zod para validação de payloads
- implementação de paginação server-side em alertas, drill e motoristas
- publicação da API em Cloud Run
- publicação do frontend em Firebase Hosting, produção e staging
- correção de CORS para domínio principal e preview channels do Firebase

## Status após execução

- backend público disponível em [https://dashboard-logistico-api-745676656148.us-central1.run.app](https://dashboard-logistico-api-745676656148.us-central1.run.app)
- frontend produção disponível em [https://data-aileron-482822-d0.web.app](https://data-aileron-482822-d0.web.app)
- frontend staging disponível em [https://data-aileron-482822-d0--staging-u35eu5su.web.app](https://data-aileron-482822-d0--staging-u35eu5su.web.app)
- smoke tests de SPA rewrite executados com retorno 200
- endpoints públicos /health, /api/metas e /api/alertas validados com sucesso
- CORS validado para produção e staging

## Riscos remanescentes

- algumas métricas de custo em kpi_diario seguem zeradas por limitação da fonte diária consolidada
- filtro por filial em transportadores ainda não cobre todos os recortes desejáveis
- performance por filial no recorte por período pode trazer campos planejados nulos quando a base diária não os expõe
- domínios customizados futuros exigirão atualização explícita da allowlist de CORS
