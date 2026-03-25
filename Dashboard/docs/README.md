# Documentação Canônica

Este diretório contém apenas a documentação ativa do projeto.

## Documentos ativos

| Documento | Papel |
| --------- | ----- |
| [ESTRUTURA_CANONICA_PROJETO.md](ESTRUTURA_CANONICA_PROJETO.md) | ★ Documento mestre: infraestrutura, fluxo completo, diretórios, endpoints, stack |
| [CHANGELOG.md](CHANGELOG.md) | ★ Registro de todas as alterações de código, pipeline, API e docs |
| [CATALOGO_MEDIDAS_CANONICO.md](CATALOGO_MEDIDAS_CANONICO.md) | Fonte única de verdade para KPIs, fórmulas e nomenclatura |
| [PIPELINE_BIGQUERY_CANONICO.md](PIPELINE_BIGQUERY_CANONICO.md) | Pipeline ativo: decisões arquiteturais, UDFs, schema de base_execucao_canonica |
| [VOCABULARIO_SEMANTICO.md](VOCABULARIO_SEMANTICO.md) | Dicionário SQL → API → Frontend + metas canônicas |
| [SCHEMA_RAW_CANONICO.md](SCHEMA_RAW_CANONICO.md) | Contrato de entrada dos arquivos raw |
| [PLANO_ESTRUTURAL_DADOS_CANONICO.md](PLANO_ESTRUTURAL_DADOS_CANONICO.md) | Estrutura do projeto, camadas e regras de organização |
| [data_contract_frontend.md](data_contract_frontend.md) | Contrato API → frontend |
| [matriz_contrato_front_api_bq.md](matriz_contrato_front_api_bq.md) | Rastreabilidade hook → endpoint → BigQuery |
| [README.md](README.md) | Este índice |

## Arquivamento

- Material legado, temporário, diagnósticos, planos encerrados e documentos supersedidos ficam em [docs/_archive/](docs/_archive/)
- Documentos de transição do diretório raiz foram movidos para `_archive/legacy_docs_root/`

## Regra de governança

- Não criar novo documento para substituir assunto já coberto por um canônico.
- Atualizar o arquivo canônico existente.
- **Toda alteração de código, SQL ou API deve ser registrada no** [CHANGELOG.md](CHANGELOG.md).
- Encerrado o uso de um diagnóstico ou plano temporário, mover para `_archive/`.
