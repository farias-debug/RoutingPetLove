# Correção de Regras de Negócio

## Correções aplicadas
- Metas do frontend agora vêm de /api/metas e da base metas_globais.
- useMotoristasKpis passou a enviar periodo corretamente.
- Removido uso operacional de tipos fictícios de alerta no fluxo real; filtro de alerta agora respeita apenas flags existentes no BigQuery.
- Status operacionais passaram a usar valores reais do TMS e do BigQuery.
- DPPH foi adicionado ao conjunto de KPIs de motoristas.
- ORH tratado como tempo-meta em horas no contexto operacional do backend.
- Fallback implícito para mock deixou de ser automático; mock local agora exige VITE_ENABLE_MOCKS=true.
- /api/kpi-diario passou a calcular KPIs operacionais no grão de rota/dia a partir de alertas_rotas, preservando custos a partir da VW_Base_Execucao, com filtros reais de periodo, filial, transportador, status e tipoVeiculo.
- /api/resumo/cards passou a agregar no grão de rota/dia a partir de alertas_rotas para evitar inflação de métricas por duplicidade em granularidade inferior.
- /api/resumo/tendencia-semanal passou a respeitar os filtros globais suportados pela base operacional.
- Barra global de filtros passou a carregar opções reais da API, incluindo tipoVeiculo, status e prioridade.

## Divergências ainda existentes
- filtro filial em transportadores exige fonte agregada por filial, ainda não existente no dataset atual.
