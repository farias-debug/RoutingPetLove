# Documentação Canônica

Este diretório contém apenas a documentação ativa do projeto.

## Documentos ativos

| Documento | Papel |
| --------- | ----- |
| [PLANO_ESTRUTURAL_DADOS_CANONICO.md](PLANO_ESTRUTURAL_DADOS_CANONICO.md) | Estrutura do projeto, camadas e regras de organização |
| [CATALOGO_MEDIDAS_CANONICO.md](CATALOGO_MEDIDAS_CANONICO.md) | Fonte única de verdade para KPIs, fórmulas e nomenclatura |
| [SCHEMA_RAW_CANONICO.md](SCHEMA_RAW_CANONICO.md) | Contrato de entrada dos arquivos raw |
| [PIPELINE_BIGQUERY_CANONICO.md](PIPELINE_BIGQUERY_CANONICO.md) | Pipeline ativo no BigQuery |
| [data_contract_frontend.md](data_contract_frontend.md) | Contrato API -> frontend |
| [matriz_contrato_front_api_bq.md](matriz_contrato_front_api_bq.md) | Rastreabilidade hook -> endpoint -> BigQuery |
| [AUDIT_REVISAO_ORIGEM_2026-03-22.md](AUDIT_REVISAO_ORIGEM_2026-03-22.md) | Auditoria final da revisão da origem |
| [README.md](README.md) | Este índice |

## Arquivamento

- Material legado, temporário, diagnósticos, planos encerrados e documentos supersedidos ficam em [docs/_archive/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/_archive)
- Documentos de transição do diretório raiz foram movidos para [_archive/legacy_docs_root/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_archive/legacy_docs_root)

## Regra de governança

- Não criar novo documento para substituir assunto já coberto por um canônico.
- Atualizar o arquivo canônico existente.
- Encerrado o uso de um diagnóstico ou plano temporário, mover para arquivo morto.
