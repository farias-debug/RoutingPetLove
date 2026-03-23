# Referencia de Dados e Pipeline

## Escopo principal

- BigQuery e SQL: Dashboard/bigquery/
- Extracao e consolidacao: Dashboard/extraction/
- API do dashboard: Dashboard/api/
- Documentacao canonica: Dashboard/docs/

## Fluxo canonico

1. Extracao TMS
2. Consolidacao de arquivos
3. Carga raw no BigQuery
4. Views analiticas v4
5. Views de publicacao v5
6. Views otimizadas para API v6
7. Consumo por API e frontend React

## Regras importantes

- Dataset principal: monitoramento_carga
- Views v5 abastecem publicacao e parte da camada consumida
- API deve refletir a semantica do BigQuery, nao recalcular sem necessidade
- Divergencias de KPI devem ser tratadas na view, query ou endpoint que origina o dado

## Checklist rapido

- Identificar o grao do dado
- Validar periodo e filtros
- Validar chaves de deduplicacao
- Validar nomes de campos publicados
- Verificar impacto em endpoint e pagina frontend
- Confirmar se existe documentacao canonica cobrindo a regra

## Fontes de verdade

- Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md
- Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md
- Dashboard/api/
