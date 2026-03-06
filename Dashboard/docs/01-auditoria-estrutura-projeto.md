# 01 — Auditoria Estrutural do Projeto

> Gerado em 2026-03-06 via inspeção direta do modelo semântico e repositório.

## 1. Estrutura Física

```
Dashboard/
  config/                          # Mapeamentos Python
    constantes.py                  # Nomes, tipos, formato CSV
    de_para_tipo.py                # 23 mappings tipo veículo
    tema_petlove.json              # Tema legado (não aplicado)
  scripts/
    transform.py                   # Pipeline canônico (~850 linhas)
    extrair_relatorio_tms.mjs      # Scraper Playwright
    extrair_monitoramento_rotas.ps1
    auditar_kpis.py                # Utilitário de auditoria
    gerar_catalogo_paineis.py      # Gerador de catálogo
    gerar_manifesto_construcao_relatorio.py
    mapear_schema_pbix.py
  data/
    Relatorio_Monitoramento_Carga_Completo.csv   # ~21k linhas (TMS)
    Relorio_Planejamento_Carga_Completo.xlsx      # ~46k linhas
    tab_auxiliar/
      dim_filial.xlsx              # 37 filiais + meta + região
      dim_placas_veiculos.xlsx     # Placas → tipo/frota
      aux_capacidade.xlsx          # ⚠️ Sem referência no transform.py
  output/powerbi/
    fato_rotas.csv                 # 48 colunas
    fato_planejado.csv             # 10 colunas
    dim_tipo_veiculo.csv           # 13 colunas
    dim_targets.csv                # ⚠️ Órfão — sem tabela no modelo
  theme/
    monitoramento_operacional_base.json  # ⚠️ Paleta ERRADA
  manifests/
    measures/                      # Vazio
    pages/                         # Vazio
  Painel Monitoramento - Petlove.SemanticModel/
    definition/
      model.tmdl                   # Cultura pt-BR, 15 tabelas ref
      relationships.tmdl           # 5 N:1 core + 7 auto-date
      database.tmdl                # Compat 1600
      tables/
        _Medidas.tmdl              # 389 medidas DAX
        _Metas.tmdl                # Parâmetros globais
        fato_rotas.tmdl
        fato_planejado.tmdl
        dim_filial.tmdl
        dim_tipo_veiculo.tmdl
        dim_calendario.tmdl
        + 7 LocalDateTable_*.tmdl  # Auto-gerados
  Painel Monitoramento - Petlove.Report/
    definition/
      pages/                       # 8 páginas (IDs hash)
      report.json
```

## 2. Cadeia de Dados

```
TMS CSV ──→ transform.py ──→ fato_rotas.csv ──────→ SemanticModel
XLSX Plan ─→ transform.py ──→ fato_planejado.csv ──→ SemanticModel
dim_filial.xlsx ─────────────────────────────────→ M Query (direto)
dim_placas.xlsx ──→ transform.py (join) ──→ fato_rotas.csv
                    transform.py ──→ dim_tipo_veiculo.csv ──→ SemanticModel
```

**Resultado**: cadeia coerente. O transform.py é o ponto único de transformação.

## 3. Modelo Semântico

### Tabelas (15 total)

| Tabela | Tipo | Colunas | Observação |
|--------|------|---------|------------|
| fato_rotas | Fato | 48 | Principal — 1 linha/rota |
| fato_planejado | Fato | 10 | Planejamento, inclui não-executadas |
| dim_filial | Dimensão | 12 | Via M Query (Excel direto) |
| dim_tipo_veiculo | Dimensão | 13 | Via CSV (transform.py) |
| dim_calendario | Dimensão | 50 | DAX calculada — 2026 completo |
| _Medidas | Medidas | 1 + 389 | Tabela exclusiva de medidas |
| _Metas | Parâmetros | 4 | Sem relacionamento, LOOKUPVALUE |
| 7× LocalDateTable | Auto | 7 cada | Auto-geradas por colunas de data |

### Relacionamentos Core (N:1)

| De | Para | Chave |
|----|------|-------|
| fato_rotas[Filial] | dim_filial[Filial] | Filial |
| fato_rotas[Data Referencia] | dim_calendario[Data] | Data |
| fato_rotas[Tipo de Veiculo Padrao] | dim_tipo_veiculo[TipoVeiculo] | Tipo |
| fato_planejado[Data Planejada] | dim_calendario[Data] | Data |
| fato_planejado[Filial] | dim_filial[Filial] | Filial |

### Relacionamentos Auto-Date (7)

Cada coluna de data em fato_rotas (Data Planejada, Data de Abertura, Data de Carregamento, Data Atribuicao Motorista, Data Inicio Rota, Primeira Baixa, Ultima Baixa) gera um `LocalDateTable`. Isso é comportamento padrão do Power BI quando Auto Date/Time está ativo.

**Impacto**: 7 tabelas extras com 7 colunas cada = **49 colunas** de overhead. Desativar Auto Date/Time é recomendado já que existe `dim_calendario`.

## 4. Páginas do Report (8)

| # | Nome | Observação |
|---|------|------------|
| 1 | 01 Torre de Controle | Visão geral operacional |
| 2 | 02 Scoreboard | Comparativo por filial |
| 3 | 03 Eficiencia SPR | Performance/stops por rota |
| 4 | 04 Capacidade e Mix | Frota e ocupação |
| 5 | 05 Plano vs Real | Aderência planejamento |
| 6 | 06 KPIs Diários | Indicadores diários (1) |
| 7 | 07 KPIs Diários | Indicadores diários (2) — ⚠️ mesmo nome |
| 8 | 08 Análise Filiais | Drill por filial |

**Problemas**:
- Páginas 06 e 07 têm o mesmo nome
- Não há página dedicada a Jornada/ORH
- Não há página de Investigação (drill-through)
- Não há tooltip pages

## 5. Problemas Encontrados

### Críticos

| # | Problema | Impacto | Ação |
|---|----------|---------|------|
| 1 | **Tema JSON com paleta errada** | Cores do report não seguem paleta obrigatória (#441A80). Usa verde (#0F6D63) e off-white (#F6F7F4) | Recriar tema com paleta correta |
| 2 | **dim_targets.csv órfão** | Arquivo gerado sem tabela correspondente no modelo | Remover ou integrar ao modelo |
| 3 | **Páginas 06/07 com mesmo nome** | Confusão na navegação | Renomear com propósito distinto |

### Moderados

| # | Problema | Impacto | Ação |
|---|----------|---------|------|
| 4 | **7 LocalDateTable ativas** | Peso no modelo, conflito potencial com dim_calendario | Desativar Auto Date/Time |
| 5 | **aux_capacidade.xlsx sem uso** | Arquivo no tab_auxiliar sem referência no pipeline | Avaliar necessidade ou remover |
| 6 | **manifests/ vazios** | Pastas measures/ e pages/ sem conteúdo | Popular com catálogos ou remover |
| 7 | **44 medidas HTML legado** | Referências visuais pesadas, não sustentáveis | Plano de migração (doc 06) |
| 8 | **SVG Cards com erros** | 17 medidas em 06.Shared\03.SVG Cards parcialmente funcionais | Reavaliar e reconstruir |

### Observações

| # | Item | Detalhe |
|---|------|---------|
| 9 | **07. Investigacao** — grupo novo | 22 medidas TblExp (nível linha) não documentadas previamente |
| 10 | **KPI Pattern maduro** | 14 medidas/pack — padrão replicável e consistente |
| 11 | **transform.py sólido** | ~850 linhas, bem estruturado, parsing resiliente |
| 12 | **Naming consistente** | Convenção de prefixos já aplicada (KPI, SPR, Op, TblExp, HTML, SVG) |

## 6. Pontos Fortes

- Pipeline Python canônico com imutabilidade de dados
- Modelo star-schema limpo (2 fatos, 3 dimensões + calendário)
- Convenção de display folders clara e hierárquica
- Pattern de KPI replicável (14 medidas/pack)
- Scripts auxiliares para extração (Playwright) e automação (daily_pipeline)
- Projeto em formato .pbip (versionável)

## 7. Recomendações Imediatas

1. **Corrigir tema JSON** — aplicar paleta obrigatória (#441A80, #5B2D8C, #F5A623, etc.)
2. **Desativar Auto Date/Time** no modelo para eliminar 7 LocalDateTables
3. **Remover/integrar dim_targets.csv**
4. **Renomear páginas 06/07** para evitar duplicidade
5. **Avaliar SVG Cards** — reconstruir as 17 medidas com padrão estável
6. **Criar tooltip pages** — atualmente inexistentes
7. **Criar página de Investigação** — medidas TblExp (07.) existem mas sem página
