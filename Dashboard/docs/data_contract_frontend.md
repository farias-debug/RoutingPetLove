# Contrato Analítico Padronizado — Frontend React ↔ API ↔ BigQuery

> Versão 2.0 | 2026-03-21 | Projeto: Petlove Monitoramento de Cargas

---

## 1. Objetivo e escopo

Este documento fecha formalmente a Fase 2 do dashboard.

Para qualquer divergência sobre fórmula, grão, naming ou fronteira entre camada analítica, API e frontend, a referência principal passa a ser o documento docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md.

Seu papel é padronizar:

- convenções de payload entre API e frontend
- semântica de janelas temporais e comparativos
- regras de exibição de cards, séries, rankings e contribuições
- critérios mínimos para considerar uma métrica apta para publicação em novas páginas

Este documento é canônico para qualquer nova implementação setorial.

---

## 2. Convenções gerais

- Formato de nomes: camelCase nos payloads JSON da API.
- Datas: YYYY-MM-DD.
- Percentuais: a API expõe fração entre 0 e 1 quando a métrica é percentual; o frontend converte para exibição.
- Moeda: número decimal bruto; o frontend formata em pt-BR.
- Paginação: query params page e limit; resposta com data, total, page e pages.
- Filtros: query params como periodo, filial, transportador, status, prioridade e tipoVeiculo.
- Erros: payload com error, code e details opcional.
- Encoding: UTF-8.

---

## 3. Semântica analítica padronizada

### 3.1 Camadas temporais oficiais

- Atual do recorte: métrica calculada exclusivamente com os filtros ativos e a janela solicitada pelo usuário
- MTD: acumulado do primeiro dia do mês da data-base até a última data disponível com dados válidos no recorte
- YTD: acumulado do primeiro dia do ano da data-base até a última data disponível com dados válidos no recorte
- D-1: última data anterior disponível com dados válidos no mesmo contexto analítico; não pressupõe necessariamente “ontem civil”

### 3.2 Regras de comparação

- Delta versus meta: realizado menos meta no mesmo período, mesma granularidade e mesma unidade
- Delta percentual versus meta: (realizado - meta) dividido por meta, quando meta for diferente de zero
- Variação D-1: realizado atual menos realizado da data D-1 equivalente no mesmo contexto analítico
- Contribuição percentual: valor da entidade dividido pelo total da mesma métrica, mesma camada temporal e mesmos filtros
- Ranking de maior alta e maior queda: só pode usar entidades comparáveis no mesmo período, mesma granularidade e mesma regra de filtro

### 3.3 Regras por família de métrica

- Percentuais operacionais: API expõe fração entre 0 e 1; frontend converte para 0 a 100 apenas na exibição
- Moeda: API expõe valor decimal bruto; frontend só formata moeda
- Contagens e volumes: API expõe valor bruto consolidado; frontend não pode reaplicar agregação
- Scores: API expõe valor final consolidado; frontend não recalcula score a partir de submétricas sem contrato explícito

### 3.4 Regras de exibição no frontend

- Todo card temporal deve explicitar o período representado
- Toda referência a meta deve usar a mesma unidade do valor principal
- Nenhum texto executivo pode usar rótulo de “melhor”, “pior”, “líder” ou “mais crítico” sem ordenação explícita compatível com esse rótulo
- Séries históricas não podem depender de ordem implícita da API; o frontend deve ordenar quando existir campo de ordenação canônico
- Gráficos não devem usar domínio fixo quando isso puder esconder deterioração real fora da faixa esperada

### 3.5 Critério para publicar nova métrica em página setorial

Uma métrica só é considerada pronta para publicação quando atende simultaneamente a estes critérios:

- definição semântica única
- fonte identificada no BigQuery ou endpoint validado
- unidade explícita
- regra de filtro conhecida
- camada temporal suportada declarada
- comportamento esperado em ausência de dados documentado

---

## 4. Ambientes e URLs

### Produção publicada

```env
VITE_API_BASE_URL=https://dashboard-logistico-api-745676656148.us-central1.run.app
```

### Staging publicada

```env
VITE_API_BASE_URL=https://dashboard-logistico-api-745676656148.us-central1.run.app
```

### Desenvolvimento local

```env
VITE_API_BASE_URL=http://localhost:3001
```

### Mock local controlado

O frontend só usa mock quando duas condições são verdadeiras:

- VITE_API_BASE_URL está vazio
- VITE_ENABLE_MOCKS=true

Sem isso, a ausência de API é tratada como erro de configuração, para evitar números fictícios em execução local.

---

## 5. Endpoints efetivamente suportados

### GET /health

Retorna status operacional da API e metadados do ambiente.

### GET /api/metas

Metas globais consumidas pelo frontend para cards e reference lines.

Resposta típica:

```ts
type MetaGlobal = {
  kpiId: string
  kpiNome: string
  meta: number
  sentido: string | null
  unidade: string | null
}
```

Fonte BigQuery: metas_globais.

### GET /api/filtros/opcoes

Retorna listas reais para popular os selects globais.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status
- prioridade

Resposta típica:

```ts
type FilterOptionItem = { value: string; label: string }

type FilterOptionsResponse = {
  periodos: FilterOptionItem[]
  filiais: FilterOptionItem[]
  transportadores: FilterOptionItem[]
  tiposVeiculo: FilterOptionItem[]
  status: FilterOptionItem[]
  prioridades: FilterOptionItem[]
}
```

### GET /api/resumo/cards

Cards do Resumo Executivo com valor atual, meta, delta e data-base.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/resumo/tendencia-semanal

Tendência semanal agregada para gráficos do resumo.

Observação semântica: endpoint ainda é semanal e não deve ser tratado como substituto de uma série diária setorial de Onda 2.

Parâmetros opcionais:

- semanas
- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/executivo/serie-diaria

Série diária de KPIs consolidados para o cockpit executivo. Suporta janela configurável.

Parâmetros opcionais:

- janela (default: 30d)
- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/filiais/performance

Performance agregada por filial, usada em resumo, planejado x realizado e aderência.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/alertas

Alertas operacionais paginados.

Parâmetros opcionais:

- page
- limit
- periodo
- filial
- transportador
- status
- prioridade
- tipoVeiculo

Resposta típica:

```ts
type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pages: number
}
```

Fonte BigQuery: base_execucao_canonica (filtros de alerta).

### GET /api/alertas/contagem

Contagem agregada de alertas para os cards da página de investigação operacional.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status
- prioridade

### GET /api/drill-rotas

Drill paginado de rotas com filtros server-side.

Parâmetros opcionais:

- page
- limit
- periodo
- filial
- transportador
- status
- prioridade
- tipoVeiculo
- sort
- order

### GET /api/transportadores

Resumo por transportador para ranking, custo médio e share.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/frota/ocupacao-tipo

Ocupação por tipo de veículo.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/motoristas

Lista paginada de motoristas.

Parâmetros opcionais:

- page
- limit
- periodo
- filial
- transportador

### GET /api/motoristas/kpis

KPIs consolidados da página de motoristas.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

### GET /api/kpi-diario

KPIs diários consolidados usados em páginas operacionais.

Parâmetros opcionais:

- periodo
- filial
- transportador
- tipoVeiculo
- status

---

## 6. Regras importantes do contrato

- O browser não consulta BigQuery diretamente.
- Toda leitura web passa pela API Node em Cloud Run.
- O frontend valida respostas com Zod antes de propagar os dados aos componentes.
- Datas vindas do BigQuery são normalizadas na API antes do envio ao frontend.
- Os filtros globais ativos na UI são persistidos em query string.
- Paginação de alertas, drill e motoristas é server-side.
- O frontend não pode derivar MTD, YTD ou D-1 por heurística se a fonte não expuser data ou camada suficientes para isso.
- Quando houver ordenação canônica disponível, o frontend deve normalizar a sequência antes de construir highlights ou séries.

---

## 7. Estado atual das camadas temporais

| Métrica/Família | Atual | MTD | YTD | D-1 | Observação |
| --- | --- | --- | --- | --- | --- |
| KPI diário consolidado | Suportado | Parcial | Não suportado | Parcial | depende de nova camada explícita |
| Resumo semanal | Suportado | Não suportado | Não suportado | Não suportado | endpoint ainda semanal |
| Série diária do cockpit | Suportado | Suportado | Não suportado | Parcial | base mais madura hoje |
| Filiais performance | Suportado | Parcial | Não suportado | Não suportado | sem comparativo temporal estável |
| Transportadores | Suportado | Parcial | Não suportado | Não suportado | fonte agregada atual limita recortes |
| Frota por tipo | Suportado | Parcial | Não suportado | Não suportado | falta histórico temporal |
| Motoristas | Suportado | Parcial | Não suportado | Não suportado | falta série diária setorial |
| Alertas e drill | Suportado | Parcial | Não suportado | Não suportado | falta deduplicação diária e comparação |

---

## 8. Limitações conhecidas

- Planejado x realizado por período pode retornar nulos em parte dos campos planejados, dependendo da granularidade exposta pela fonte diária.
- O ranking de transportadores ainda depende de visão agregada que não suporta todos os recortes possíveis, principalmente filial.

---

## 9. Critério de aceite da Fase 2

- definições de Atual, MTD, YTD, D-1, delta versus meta e contribuição percentual formalizadas
- regras de exibição e ordenação explícitas
- parâmetros efetivos dos endpoints alinhados ao frontend atual
- limitações atuais transferidas para backlog consciente, sem ambiguidade de contrato

---

## 10. Status de implementação

- API real implementada em Dashboard/api.
- Pipeline v7 canônico publicado no BigQuery.
- Frontend publicado consumindo a URL pública do Cloud Run.
- Mock mantido apenas como fallback local controlado e explícito.

---

## 11. Mapeamento Naming snake_case → camelCase

### 11.1 Convenção de Naming entre Camadas

**BigQuery → API → Frontend:**

- BigQuery usa `snake_case` (padrão SQL)
- API JSON usa `camelCase` (padrão JavaScript/JSON)
- Frontend TypeScript usa `camelCase` (padrão JavaScript)

**Transformação:** O mapeamento acontece em `Dashboard/api/server.js` ao serializar respostas BigQuery para JSON.

### 11.2 Medidas Atômicas

| BigQuery (snake_case) | API/Frontend (camelCase) | Observação |
|---|---|---|
| qtd_rotas | rotas | Simplificado |
| qtd_pedidos | pedidos | Simplificado |
| qtd_volumes | volumes | Simplificado |
| qtd_entregues | entregas | Simplificado + renomeado |
| qtd_insucessos | insucessos | Simplificado |
| qtd_baixas | baixas | Simplificado |
| peso_real_kg | pesoReal | Sem unidade no nome |
| km_real | kmReal | — |
| tempo_operacional_h | tempoOperacional | Sem unidade no nome |
| tempo_real_h | tempoReal | Sem unidade no nome |
| tempo_plan_h | tempoPlanejado | Sem unidade no nome |
| pedidos_plan | pedidosPlanejados | — |
| volumes_plan | volumesPlanejados | — |
| peso_plan_kg | pesoPlanejado | Sem unidade no nome |
| valor_total | valorTotal | — |
| capacidade_peso_kg | capacidadePeso | Sem unidade no nome |

### 11.3 KPIs Derivados

| BigQuery (snake_case) | API/Frontend (camelCase) | Observação |
|---|---|---|
| spr_pedidos | sprPedidos | — |
| spr_volumes | sprVolumes | — |
| pct_entregas_efetivas | entregasEfetivas | Simplificado, sem "pct_" |
| pct_rotas_concluidas | rotasConcluidas | Simplificado, sem "pct_" |
| orh | orh | Mantém sigla |
| ader_pedidos | aderenciaPedidos | Expandido |
| ader_volumes | aderenciaVolumes | Expandido |
| ader_peso | aderenciaPeso | Expandido |
| ader_km | aderenciaKm | Expandido |
| ader_tempo | aderenciaTempo | Expandido |
| ocup_peso_veiculo | ocupacaoPeso | Simplificado |
| ocupacao_composta | ocupacaoComposta | Legado - mesmo que ocupacaoPeso |
| custo_medio_carga | custoMedioCarga | — |
| custo_medio_pedido | custoMedioPedido | — |
| custo_medio_volume | custoMedioVolume | — |
| dpph | dpph | Mantém sigla |
| score_operacional | scoreOperacional | — |

### 11.4 Campos de Dimensão

| BigQuery (snake_case) | API/Frontend (camelCase) | Observação |
|---|---|---|
| data_referencia | dataReferencia | — |
| filial | filial | Mantém (palavra simples) |
| tipo_filial | tipoFilial | — |
| regiao | regiao | Mantém (palavra simples) |
| transportador | transportador | Mantém (palavra simples) |
| motorista | motorista | Mantém (palavra simples) |
| cpf_motorista | cpfMotorista | — |
| placa | placa | Mantém (palavra simples) |
| tipo_veiculo | tipoVeiculo | — |
| status_tms | status | Simplificado |
| meta_spr_filial | metaSpr | Simplificado |
| capacidade_volume_dia | capacidadeVolumeDia | — |

### 11.5 Flags Operacionais

| BigQuery (snake_case) | API/Frontend (camelCase) | Observação |
|---|---|---|
| flag_rota_concluida | flagRotaConcluida | — |
| flag_nao_planejada | flagNaoPlanejada | — |
| flag_sem_tempo | flagSemTempo | — |
| flag_overtime | flagOvertime | — |
| flag_entrega_critica | flagEntregaCritica | — |
| flag_match_critico | flagMatchCritico | — |
| possui_planejamento | possuiPlanejamento | — |

### 11.6 Valores Especiais

**Percentuais:**

- BigQuery: fração 0-1 (ex: 0.98 para 98%)
- API: fração 0-1 (mantém)
- Frontend: converte para 0-100 apenas na exibição

**Moeda:**

- BigQuery: decimal bruto (ex: 1234.56)
- API: decimal bruto (mantém)
- Frontend: formata com `formatMoney()` pt-BR (R$ 1.234,56)

**Datas:**

- BigQuery: DATE tipo nativo (YYYY-MM-DD)
- API: string ISO (YYYY-MM-DD)
- Frontend: Date object ou string ISO

**NULL values:**

- BigQuery: NULL
- API: `null` (JSON)
- Frontend: `null` ou `undefined` (TypeScript)

### 11.7 Convenções de Status

| BigQuery | API/Frontend | Observação |
|---|---|---|
| 'OK' | 'OK' | Mantém |
| 'Atencao' | 'Atenção' | Acentuação corrigida |
| 'Critico' | 'Crítico' | Acentuação corrigida |
| 'Informativo' | 'Informativo' | Mantém |
| 'Saturado' | 'Saturado' | Mantém |
| 'Sem dados' | 'Sem dados' | Mantém |

**Cores de status (hex):**

- OK: `#10b981` (verde)
- Atenção: `#f59e0b` (amarelo)
- Crítico: `#ef4444` (vermelho)
- Informativo: `#6b7280` (cinza)
- Saturado: `#dc2626` (vermelho escuro)
