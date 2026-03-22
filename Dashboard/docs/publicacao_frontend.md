# Publicação do Frontend

## Status atual

- produção publicada com sucesso após rebuild e redeploy desta rodada
- staging publicada com sucesso em preview channel atualizado
- backend público disponível na revisão dashboard-logistico-api-00007-mjm e integrado ao build publicado

## URLs publicadas

- produção: [https://data-aileron-482822-d0.web.app](https://data-aileron-482822-d0.web.app)
- staging: [https://data-aileron-482822-d0--staging-u35eu5su.web.app](https://data-aileron-482822-d0--staging-u35eu5su.web.app)
- API pública: [https://dashboard-logistico-api-745676656148.us-central1.run.app](https://dashboard-logistico-api-745676656148.us-central1.run.app)

## Pré-requisitos usados

- firebase login concluído
- frontend com npm install executado
- build de produção gerado em Dashboard/frontend/dist
- backend disponível em URL pública antes do deploy do Hosting

## Setup Firebase efetivo

- projeto: data-aileron-482822-d0
- arquivo de configuração: firebase.json
- aliases: definidos em .firebaserc
- diretório público: frontend/dist
- rewrite SPA: todas as rotas para /index.html

## Comandos executados

```powershell
npm --prefix frontend run build
firebase deploy --config firebase.json --project data-aileron-482822-d0 --only hosting
firebase hosting:channel:deploy staging --project data-aileron-482822-d0
```

## Observações de ambiente

- frontend/.env.production e frontend/.env.staging apontam para a URL pública do Cloud Run
- o bundle publicado foi validado e contém a URL correta da API
- refresh de rotas SPA foi validado em produção e staging
- a API pública respondeu 200 em /health, /api/filtros/opcoes, /api/kpi-diario e /api/resumo/cards após o deploy
- após o deploy inicial, a API recebeu hotfixes nas rotas /api/filiais/performance e /api/drill-rotas; a revisão ativa validada passou a ser dashboard-logistico-api-00007-mjm
- a revisão 00007 foi validada com smoke test cobrindo todos os endpoints usados pelos hooks do frontend
- produção validada com resposta 200 também em rota interna SPA /frota
- staging validada com resposta 200 também em rota interna SPA /transportadores
- o preview channel foi publicado com sucesso, mas o Firebase reportou aviso ao sincronizar domínio com Firebase Auth; o canal continua acessível

## Troubleshooting

- erro de CORS: ajustar allowlist do backend e redeployar o Cloud Run
- preview channel do Firebase: garantir suporte a domínios no padrão data-aileron-482822-d0--*.web.app
- refresh quebrando rota: conferir rewrite SPA em firebase.json
- build sem API: conferir frontend/.env, frontend/.env.production e frontend/.env.staging

## Rollback simples

- publicar novamente um build anterior do frontend no Firebase Hosting
- manter a URL pública do Cloud Run estável para evitar mudança de contrato no frontend

## Pipeline publicado

```text
TMS -> CSV -> BigQuery v4/v5/v6 -> API REST em Cloud Run -> React Dashboard em Firebase Hosting
                                   -> Google Sheets -> Apps Script
```

O dashboard React e o fluxo de Google Sheets continuam coexistindo sobre a mesma base analítica, sem consulta direta do browser ao BigQuery.
