# _deploy (ARCHIVED)

Os UDFs individuais que existiam aqui foram movidos para `Dashboard/_archive/deploy_udfs_legacy/`.

**Motivo**: estavam **desincronizados** com o pipeline v7 (`pipeline_dashboard_v7.sql`):

- `normalize_text`: usava `UPPER()` aqui vs `LOWER()` no v7
- `vehicle_type_canonical`: retornava valores diferentes
- Demais UDFs: versões potencialmente defasadas

A fonte canônica de UDFs é o arquivo `pipeline_dashboard_v7.sql`.
