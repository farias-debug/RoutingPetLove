# Blueprint - Resumo Executivo Diario

## Objetivo

Definir um pacote canonico para publicar um resumo executivo diario da operacao last-mile por e-mail.

O blueprint parte do principio de que o resumo diario nao deve tentar reproduzir o dashboard inteiro. Ele deve responder, em menos de 20 segundos de leitura:

1. Como a operacao fechou o ultimo dia comparavel
2. Onde esta a maior pressao do dia
3. Qual acao o leitor deve tomar em seguida

## Escopo da v1

### Entregas

- um payload unico de resumo diario
- um render HTML para e-mail
- regras editoriais de conteudo
- criterios de rollout

### Fora da v1

- charts complexos no e-mail
- metricas com semantica ainda instavel
- personalizacao por perfil de destinatario
- automacao de canais de mensagem fora de e-mail

## Principios de produto

- Leitura em piramide invertida: headline, 4 KPIs, 3 riscos, 1 foco, 1 CTA
- Mobile-first: o bloco precisa funcionar primeiro em tela estreita
- Zero ambiguidade: toda metrica precisa ter unidade, contexto e data-base
- Uma verdade unica: o resumo diario deriva do mesmo contrato da API
- Menos e melhor: executivo diario nao e mini-dashboard

## Estrutura recomendada

### 1. Header

- titulo: `Resumo Executivo Diario`
- subtitulo: `Fechamento operacional de {data_base}`
- apoio: `Base comparavel ate {data_base}`

### 2. North Star KPIs

Usar no maximo 4 cards:

- Score operacional
- Entrega efetiva
- Rotas do dia
- Alertas criticos

### 3. Radar de risco

Usar 3 chips simples:

- Overtime
- Nao planejadas
- Entrega critica

### 4. Foco do dia

Um unico bloco narrativo:

- entidade: filial, transportador ou rota
- problema principal
- impacto resumido
- acao sugerida

### 5. CTA

- `Abrir dashboard`
- opcional: `Ver investigacao operacional`

## E-mail

### Objetivo

Entregar um snapshot executivo visual, com densidade media e leitura em coluna unica.

### Regras

- largura alvo: 600 a 640 px
- uma coluna principal
- no maximo 4 cards na area superior
- sem tabelas longas
- no maximo 1 insight narrativo
- CTA visivel acima da dobra em mobile

### Conteudo ideal

- assunto: `Resumo Executivo Diario - 25/03`
- preheader: `Score, entrega, alertas e foco operacional do dia`

## Payload canonico

O payload proposto esta em `resumo_executivo_diario.schema.json`.

Campos principais:

- `asOfDate`
- `title`
- `subtitle`
- `northStarKpis`
- `riskChips`
- `focusOfDay`
- `cta`
- `email`

## Mapeamento de dados v1

### Fontes internas reaproveitaveis

- `Dashboard/frontend/src/types/api.ts`
- `Dashboard/frontend/src/pages/CockpitOperacional.tsx`
- `Dashboard/frontend/src/components/dashboard/PageHeroAnalitico.tsx`
- `Dashboard/frontend/src/components/dashboard/KPICard.tsx`
- `Dashboard/frontend/src/components/dashboard/VariationCards.tsx`
- `scripts/codex_standup.ps1`

### Endpoints sugeridos

- `/api/kpi-diario`
- `/api/alertas/contagem`
- `/api/filiais/performance`
- `/api/transportadores`

### KPIs recomendados para a v1

| Bloco | Campo | Origem |
| --- | --- | --- |
| Score operacional | `scoreOperacional` | `KpiDiario` |
| Entrega efetiva | `pctEntregasEfetivas` | `KpiDiario` |
| Rotas do dia | `rotas` | `KpiDiario` |
| Alertas criticos | `entregaCritica + overtime` ou `total` | `AlertaContagem` |
| Foco do dia | pior `scoreOperacional` ou pior `sprVsMeta` | `FilialPerformance` |

### Metricas para evitar na v1

Enquanto a semantica nao estiver estabilizada, nao colocar no resumo executivo diario:

- `pctOcupacaoPeso`
- totais de peso sem validacao de unidade
- qualquer percentual que esteja aparecendo em ordens de grandeza absurdas

## Regra editorial do foco do dia

O bloco `focusOfDay` precisa nascer de uma regra objetiva, por exemplo:

1. se houver `entregaCritica > 0`, usar risco operacional
2. senao, escolher a filial com pior `scoreOperacional`
3. senao, escolher o transportador com pior combinacao de score e entrega efetiva

Formato:

- titulo: `Foco do dia`
- alvo: `01-Sao Paulo`
- motivo: `score pressionado por baixa entrega efetiva e desvio de tempo`
- acao: `abrir investigacao operacional e revisar filas criticas`

## Arquitetura sugerida

```text
BigQuery/API -> daily summary adapter -> canonical payload
                                     -> email renderer
```

### Sugestao de responsabilidades

- API: expor os dados de base
- adapter do resumo: escolher metricas, textos e foco do dia
- renderer de e-mail: gerar HTML seguro para clients de e-mail

## Fases de implementacao

### Fase 1

- definir payload canonico
- montar e-mail estatico com dados mockados

### Fase 2

- ligar ao `/api/kpi-diario` e `/api/alertas/contagem`
- automatizar o foco do dia
- revisar copy com stakeholders

### Fase 3

- envio automatizado
- medicao de abertura e clique
- segmentacao por publico

## Criterios de aceite

- leitura principal em menos de 20 segundos
- bloco superior util em mobile sem scroll excessivo
- nenhuma metrica sem unidade ou data-base
- foco do dia sempre presente
- CTA sempre presente

## Referencias internas

- `Dashboard/frontend/src/pages/CockpitOperacional.tsx`
- `Dashboard/frontend/src/pages/AderenciaAtendimento.tsx`
- `Dashboard/frontend/src/components/dashboard/PageHeroAnalitico.tsx`
- `Dashboard/frontend/src/components/dashboard/KPICard.tsx`
- `Dashboard/frontend/src/components/dashboard/VariationCards.tsx`
- `scripts/codex_standup.ps1`

## Referencias externas

- Really Good Emails - DoorDash digest: <https://reallygoodemails.com/emails/november-dasher-digest>
- Really Good Emails - Basecamp daily recap: <https://reallygoodemails.com/emails/daily-recap-email-design-basecamp>
- Postmark email design guides: <https://postmarkapp.com/guides/email-design>
- Campaign Monitor - email design review and hierarchy references: <https://www.campaignmonitor.com/wp-content/uploads/2023/08/Campaign-Monitor-ProServ-One-Pagers.pdf?1=1>

## Decisoes assumidas neste blueprint

- front local padrao em `localhost:8080`
- API local padrao em `localhost:3001`
- resumo diario com foco executivo, nao analitico
- v1 sem metricas de ocupacao de peso no topo
- canal primario e unico da v1: e-mail
