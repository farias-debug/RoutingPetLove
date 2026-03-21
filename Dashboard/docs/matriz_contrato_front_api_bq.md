# Matriz Frontend × API × BigQuery

Esta matriz fecha a visão operacional da Fase 2 e registra a aderência real entre hooks, endpoints, fontes, filtros, grão e prontidão temporal.

| Tela / Uso | Hook | Endpoint | Fonte BQ | Filtros efetivos | Grão atual | Camadas disponíveis | Payload esperado | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Resumo Executivo | useResumoCards | /api/resumo/cards | kpi_card_latest | periodo, filial, transportador, tipoVeiculo, status | snapshot consolidado | Atual | KpiCard[] | Aderente |
| Resumo Executivo / Tempo e SLA | useTendenciaSemanal | /api/resumo/tendencia-semanal | api_resumo_executivo_semanal | semanas, periodo, filial, transportador, tipoVeiculo, status | semanal | Atual semanal | TendenciaSemanal[] | Parcial |
| Cockpit Executivo / Resumo Executivo / Tempo e SLA / Aderência | useCockpitSerieDiaria | /api/executivo/serie-diaria | VW_Base_Execucao agregado por dia | janela, periodo, filial, transportador, tipoVeiculo, status | diário | Atual, MTD parcial, D-1 parcial | CockpitSerieDiaria[] | Aderente |
| Resumo Executivo / Aderência / Planejado | useFilialPerformance | /api/filiais/performance | Resumo_Filial, kpi_filial_dia | periodo, filial | agregado por filial | Atual, MTD parcial | FilialPerformance[] | Parcial |
| Investigação | useAlertas | /api/alertas | alertas_rotas | page, limit, periodo, filial, transportador, status, prioridade, tipoVeiculo, tipo | evento paginado | Atual | resposta paginada de alertas | Aderente |
| Investigação | useAlertasContagem | /api/alertas/contagem | alertas_rotas | periodo, filial, transportador | agregado | Atual | AlertaContagem | Aderente |
| Investigação | useDrillRotas | /api/drill-rotas | drill_rotas | page, limit, periodo, filial, transportador, status, prioridade, tipoVeiculo, sort, order | rota paginada | Atual | resposta paginada de rotas do drill | Aderente |
| Custos / Transportadores | useTransportadores | /api/transportadores | api_transportadores_resumo | periodo, filial parcial, transportador | agregado por parceiro | Atual, MTD parcial | TransportadorResumo[] | Parcial |
| Frota e Capacidade | useOcupacaoTipoVeiculo | /api/frota/ocupacao-tipo | api_ocupacao_tipo_veiculo | periodo, transportador, tipoVeiculo | agregado por tipo | Atual, MTD parcial | OcupacaoTipoVeiculo[] | Aderente |
| Motoristas | useMotoristas | /api/motoristas | api_motoristas_jornada | page, limit, periodo, filial, transportador, overtime | motorista paginado | Atual | resposta paginada de motoristas | Aderente |
| Motoristas | useMotoristasKpis | /api/motoristas/kpis | api_motoristas_jornada | periodo, filial, transportador | agregado | Atual, MTD parcial | MotoristaKpis | Aderente |
| Múltiplas telas | useKpiDiario | /api/kpi-diario | kpi_resumo_diario | periodo, filial, transportador, tipoVeiculo, status | snapshot diário consolidado | Atual, D-1 parcial | KpiDiario | Parcial |
| Tempo e SLA / múltiplas telas | useMetas | /api/metas | metas_globais | sem filtros | catálogo | Meta de referência | MetaGlobal[] | Aderente |

## Leitura de status

- Aderente: contrato atual compatível com o uso publicado e com a semântica documentada.
- Parcial: contrato publicado funciona, mas ainda não sustenta integralmente as camadas temporais ou recortes desejados para a Onda 2.

## Lacunas prioritárias que bloqueiam expansão limpa

- tendência semanal ainda não substitui série diária setorial
- transportadores por filial segue parcial por limitação da fonte agregada
- kpi diário ainda não expõe MTD e YTD como camada explícita de contrato
- alertas e drill ainda carecem de base diária deduplicada para comparação D-1 confiável
