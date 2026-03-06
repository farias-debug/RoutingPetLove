---
name: project-structure-auditor
description: >
  DOMAIN SKILL — Auditoria de estrutura do projeto Power BI.
  USE FOR: validar coerência de caminhos (data → transform → output → model → report),
  detectar dependências quebradas, pastas órfãs, acoplamento indevido, caminhos frágeis.
  DO NOT USE FOR: design visual, criação de medidas, pipeline Python em si.
---

# Project Structure Auditor

## Domínio

Auditoria de integridade estrutural do projeto Power BI, validando a cadeia de dependências desde dados brutos até o relatório final.

## Quando Usar

- Validar coerência entre `data/` → `transform.py` → `output/powerbi/` → `SemanticModel` → `Report`
- Detectar M queries apontando para caminhos incorretos
- Encontrar pastas órfãs ou arquivos sem referência
- Identificar dependências quebradas no modelo semântico
- Verificar se relacionamentos N:1 estão íntegros
- Detectar acoplamento entre estrutura física e camada visual

## Cadeia de Dependências

```
data/
  Relatorio_Monitoramento_Carga_Completo.csv     (~21k linhas)
  Relorio_Planejamento_Carga_Completo.xlsx        (~46k linhas)
  tab_auxiliar/
    dim_filial.xlsx                                (37 filiais)
    dim_placas_veiculos.xlsx                       (placas → tipo/frota)
        ↓
scripts/transform.py
  (+ config/constantes.py, config/de_para_tipo.py)
        ↓
output/powerbi/
  fato_rotas.csv           (48 colunas, separador ;, UTF-8 BOM)
  fato_planejado.csv       (10 colunas)
  dim_tipo_veiculo.csv     (13 colunas)
        ↓
SemanticModel/definition/
  tables/fato_rotas.tmdl         → M query aponta para fato_rotas.csv
  tables/fato_planejado.tmdl     → M query aponta para fato_planejado.csv
  tables/dim_tipo_veiculo.tmdl   → M query aponta para dim_tipo_veiculo.csv
  tables/dim_filial.tmdl         → M query aponta para dim_filial.xlsx
  tables/dim_calendario.tmdl     → DAX calculada
  tables/_Medidas.tmdl           → 389 medidas DAX
  tables/_Metas.tmdl             → Parâmetros DAX
  relationships.tmdl             → 5 relacionamentos N:1
        ↓
Report/definition/
  pages/*/page.json              → 8 páginas com visuais
  report.json                    → Configuração do report
```

## Relacionamentos Esperados (N:1)

| Lado N | Lado 1 |
|--------|--------|
| fato_rotas[Filial] | dim_filial[Filial] |
| fato_rotas[Data Referencia] | dim_calendario[Data] |
| fato_rotas[Tipo de Veiculo Padrao] | dim_tipo_veiculo[TipoVeiculo] |
| fato_planejado[Data Planejada] | dim_calendario[Data] |
| fato_planejado[Filial] | dim_filial[Filial] |

## Path das M Queries

Caminho esperado para CSVs: `C:\Users\lucas.batista\Documents\Projetos\Dashboard\output\powerbi\`

## Checklist de Validação

- [ ] M queries apontam para o path correto dos CSVs
- [ ] Colunas nos CSVs são compatíveis com as referenciadas nas medidas
- [ ] Relacionamentos N:1 existem e não estão duplicados
- [ ] Todas as tabelas referenciadas nas medidas existem no modelo
- [ ] Não há tabelas DateTable/LocalDateTable órfãs em excesso
- [ ] `dim_filial` aponta para o XLSX correto em `data/tab_auxiliar/`
- [ ] Encoding UTF-8 BOM e separador `;` consistentes
- [ ] Não há caminhos absolutos de outra máquina

## O Que Procurar

### Problemas comuns

- M query com caminho hardcoded de ambiente diferente
- Coluna renomeada no `transform.py` mas não atualizada no modelo
- Medida referenciando coluna que não existe mais
- Relacionamento duplicado ou com cardinalidade errada
- Tabela DateTable auto-gerada sem utilidade

### Sinais de fragilidade

- Muitas tabelas LocalDateTable_* (geradas automaticamente)
- Caminhos absolutos espalhados em múltiplos locais
- Config de encoding inconsistente entre transform.py e M queries
