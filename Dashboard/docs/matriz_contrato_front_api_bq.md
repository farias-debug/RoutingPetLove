# Matriz Frontend × API × BigQuery

Esta matriz descreve a aderência real entre hooks, endpoints, fontes BQ, filtros, grão e prontidão temporal na arquitetura v7.

> **Fonte canônica única**: todos os endpoints consultam `base_execucao_canonica` (abreviada `bec`) como base de dados. Não existem mais views intermediárias de marts, kpi_card_latest, alertas_rotas ou api_* separadas.

| Tela / Uso | Hook | Endpoint | Fonte BQ | Filtros efetivos | Grão atual | Payload | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resumo Executivo | useResumoCards | /api/resumo/cards | bec + CROSSTAB dinâmico (queries.js cardsQuery) | periodo, filial, transportador, tipoVeiculo, status | snapshot agregado do período | KpiCard[] | Aderente |
| Resumo Executivo / Cockpit | useTendenciaSemanal | /api/resumo/tendencia-semanal | bec agregado por semana ISO | semanas, periodo, filial, transportador, tipoVeiculo, status | semanal | TendenciaSemanal[] | Aderente |
| Cockpit Executivo / Aderência / Tempo e SLA | useCockpitSerieDiaria | /api/executivo/serie-diaria | bec agregado por data_referencia | janela, periodo, filial, transportador, tipoVeiculo, status | diário; default = janela 30d | CockpitSerieDiaria[] | Aderente |
| Resumo Executivo / Aderência / Planejado | useFilialPerformance | /api/filiais/performance | bec + stg_planejamento JOIN por filial/data | periodo, filial, transportador, tipoVeiculo, status | agregado por filial | FilialPerformance[] | Parcial — aderências auxiliares (ader_km, ader_tempo) no schema mas sem UI |
| Investigação | useAlertas | /api/alertas | bec (unitOnly) com flags de alerta | page, limit, periodo, filial, transportador, status, prioridade, tipoVeiculo, tipo | evento paginado (rota) | PaginatedResponse\<Alerta\> | Aderente |
| Investigação | useAlertasContagem | /api/alertas/contagem | bec com flags de alerta | periodo, filial, transportador, tipoVeiculo, status, prioridade | agregado | AlertaContagem | Aderente |
| Investigação | useDrillRotas | /api/drill-rotas | bec (unitOnly) | page, limit, periodo, filial, transportador, status, prioridade, tipoVeiculo, sort, order | rota paginada; sort por ocupacaoPeso | PaginatedResponse\<DrillRota\> | Aderente |
| Custos / Transportadores | useTransportadores | /api/transportadores | bec agregado por transportador | periodo, filial, transportador | agregado por parceiro; status computado via fn_score_operacional em SQL | TransportadorResumo[] | Aderente |
| Frota e Capacidade | useOcupacaoTipoVeiculo | /api/frota/ocupacao-tipo | bec agregado por tipo_veiculo | periodo, filial, transportador, tipoVeiculo, status | agregado por tipo; campo `ocupacaoPeso` | OcupacaoTipoVeiculo[] | Aderente |
| Motoristas | useMotoristas | /api/motoristas | bec (unitOnly) agregado por motorista/data | page, limit, periodo, filial, transportador, overtime | motorista paginado | PaginatedResponse\<Motorista\> | Aderente |
| Motoristas | useMotoristasKpis | /api/motoristas/kpis | bec | periodo, filial, transportador, tipoVeiculo, status | agregado | MotoristaKpis | Aderente |
| Múltiplas telas | useKpiDiario | /api/kpi-diario | bec | periodo, filial, transportador, tipoVeiculo, status; default = mês corrente | snapshot diário consolidado | KpiDiario | Aderente |
| Tempo e SLA / múltiplas telas | useMetas | /api/metas | metas_globais | sem filtros | catálogo canônico | MetaGlobal[] | Aderente |
| Todas as telas | useGlobalFilters | /api/filtros/opcoes | bec (facetas independentes por dimensão) | cross-dimensional por exclusão | opções de filtro | FiltrosOpcoes | Aderente |

## Leitura de status

- **Aderente**: contrato compatível com o uso publicado e com a semântica v7 documentada.
- **Parcial**: contrato funciona, mas não cobre integralmente os recortes temporais ou dimensões desejadas.

## Convenções de naming (v7)

| Campo antigo | Campo atual | Localização |
| --- | --- | --- |
| `ocupacaoComposta` | `ocupacaoPeso` | API response, schemas Zod, TypeScript types, mock data |
| `ocup_composta` | `ocupacao_peso` | SQL alias em queries.js |
| `metaOcupacaoComposta` | `metaOcupacaoPeso` | KpiDiario type, schemas |
| `status_transportador` (JS) | `status_transportador` (SQL) | Calculado em queries.js via fn_score_operacional |

## Defaults temporais

- Endpoints sem `periodo` explícito resolvem para o mês corrente via `resolveDefaultPeriodo()` (helpers.js).
- `/api/executivo/serie-diaria` sem `periodo` usa janela rolante de 30 dias via `resolveJanelaPeriodo()`.
- YTD suportado: `janela=ytd` expande de 01/jan até hoje.

## Lacunas pendentes

- Tendência semanal não é comparável como série setorial (sem dimensão por filial)
- kpi-diário não expõe MTD e YTD como camadas explícitas de contrato
- Alertas e drill sem baseline D-1 deduplicado para comparação temporal confiável
