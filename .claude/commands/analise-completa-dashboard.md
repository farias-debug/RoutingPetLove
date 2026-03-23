---
description: Execute uma analise completa e rigorosa do stack de medidas, filtros temporais, contratos API/frontend e disponibilizacao no dashboard, identificando tudo que falta de governanca, validacao e prontidao operacional no projeto Dashboard.
argument-hint: "[escopo opcional: tela, KPI, endpoint ou dominio]"
---

# Analise Completa do Dashboard

Execute uma analise completa do projeto Dashboard com foco em medidas, formulas, filtros temporais, contratos analiticos, API e disponibilizacao no dashboard.

Escopo solicitado pelo usuario: $ARGUMENTS

Se o usuario nao limitar o escopo, use o projeto inteiro.

## Objetivo central

Produzir a analise mais completa possivel do stack analitico atual, respondendo com evidencias:

1. quais medidas e KPIs existem
2. como cada um e calculado de fato hoje
3. quais filtros temporais sao suportados de verdade
4. como cada KPI e disponibilizado na API e no frontend
5. quais atividades core de governanca, rastreabilidade, validacao e prontidao ainda nao estao sendo aplicadas hoje
6. qual backlog priorizado deve ser executado para fechar essas lacunas

## Fontes obrigatorias a ler antes de concluir

Leia e use como referencia primaria:

- Dashboard/docs/README.md
- Dashboard/docs/CATALOGO_MEDIDAS_CANONICO.md
- Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md
- Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md
- Dashboard/docs/data_contract_frontend.md
- Dashboard/docs/matriz_contrato_front_api_bq.md
- Dashboard/api/server.js
- Dashboard/api/queries.js
- Dashboard/api/helpers.js
- Dashboard/frontend/src/
- Dashboard/bigquery/

Consulte arquivos legados apenas como apoio historico e sinalize isso explicitamente:

- Dashboard/_archive/
- Dashboard/docs/_archive/
- _tmp/
- .github/_old/

## Regras da analise

1. Considere o catalogo canonico como referencia semantica principal, mas sempre confronte com a implementacao real.
2. Diferencie claramente:
   - formula canonica
   - formula implementada hoje
   - formula exibida no dashboard
3. Para cada KPI importante, explicite:
   - nome tecnico
   - nome visual
   - formula atual real
   - unidade
   - grao minimo
   - camada oficial esperada
   - camada real atual
   - endpoint consumidor
   - hook/frontend consumidor
   - paginas onde aparece
4. Para temporalidade, verifique e documente separadamente:
   - periodo por mes YYYY-MM
   - intervalo explicito YYYY-MM-DD,YYYY-MM-DD
   - data unica YYYY-MM-DD
   - janela 7d
   - janela 14d
   - janela 30d
   - MTD
   - YTD
   - D-1
   - WoW
5. Nao aceite suporte temporal apenas por nome de campo ou por texto de documentacao. Valide pela implementacao real em helpers.js, server.js, queries.js e consumo no frontend.
6. Se API ou frontend recalcularem KPI, trate isso como problema estrutural e aponte o ponto ideal de correcao.
7. Se houver divergencia entre documento e codigo, considere o codigo como estado real atual e o documento como alvo esperado, deixando isso explicito.

## Atividades core que voce deve completar nesta analise

Voce nao deve parar em um resumo superficial. Complete obrigatoriamente estas atividades:

### 1. Inventario real de medidas e KPIs

Monte um inventario consolidado dos KPIs e medidas principais com origem, formula e status.

### 2. Matriz de linhagem ponta a ponta

Monte a linhagem completa para cada KPI critico:

BigQuery raw/staging/base/mart/view -> API query/view/endpoint -> schema/hook -> componente/pagina.

### 3. Auditoria de filtros temporais

Verifique exatamente o que funciona hoje e o que esta apenas parcial, implícito, inconsistente ou ausente.

### 4. Auditoria de contrato analitico

Verifique se payload, naming, unidade, grao, semantica temporal e responsabilidade de calculo estao coerentes entre BigQuery, API e frontend.

### 5. Auditoria de disponibilizacao no dashboard

Mapeie onde cada KPI aparece, com qual rota, pagina, hook e endpoint. Aponte metricas prontas, metricas parciais e metricas que nao deveriam estar publicadas ainda.

### 6. Lacunas core nao aplicadas hoje

Identifique explicitamente tudo que deveria existir e nao esta sendo aplicado hoje. No minimo verifique estes temas:

- fonte unica de verdade por KPI
- proibicao efetiva de recálculo em API/frontend
- matriz oficial KPI -> endpoint -> hook -> pagina
- suporte temporal explicito por contrato
- D-1 confiavel por base deduplicada
- MTD e YTD declarados e implementados de forma oficial
- regressao automatizada de formulas criticas
- validacao de metas com negocio
- documentacao sincronizada com codigo real
- checklist de prontidao para publicar nova metrica
- naming tecnico e visual harmonizado
- evidencias de grão e deduplicacao
- ownership de metrica por camada

### 7. Priorizacao executiva e tecnica

Classifique os gaps em:

- Critico
- Alto
- Medio
- Baixo

E para cada gap informe:

- impacto real
- risco de decisao errada no dashboard
- causa raiz
- melhor ponto de correcao
- complexidade estimada
- dependencias

### 8. Plano de execucao objetivo

Monte um backlog acionavel em ondas:

- onda 1: correcoes criticas de formula e contrato
- onda 2: temporalidade e comparativos
- onda 3: governanca e automacao
- onda 4: consolidacao de publicacao e pages setoriais

## Entregaveis obrigatorios da resposta

Sua resposta final deve conter exatamente estas secoes, nesta ordem:

1. Resumo executivo
2. Como o stack funciona hoje
3. Inventario consolidado de medidas e KPIs
4. Analise detalhada de filtros temporais
5. Matriz KPI -> origem -> API -> frontend -> dashboard
6. Divergencias entre catalogo canonico e implementacao real
7. Atividades core faltantes hoje
8. Backlog priorizado com quick wins e correcoes estruturais
9. Riscos de negocio e de confiabilidade analitica
10. Proxima sequencia ideal de execucao

## Formato obrigatorio de evidencia

- Sempre cite arquivos concretos e, quando possivel, funcoes ou trechos relevantes.
- Sempre diferencie fato confirmado no codigo de inferencia.
- Quando nao conseguir provar algo, escreva explicitamente: nao validado.
- Nao use frases vagas como "parece" ou "provavelmente" sem apontar a razao.

## Resultado minimo esperado

Ao terminar, eu devo sair com:

- um mapa claro de como cada KPI e calculado hoje
- um mapa claro dos filtros temporais reais
- um mapa claro de onde cada KPI entra no dashboard
- uma lista fechada do que falta para o projeto atingir governanca analitica de verdade
- um backlog objetivo para execucao imediata

Se durante a analise voce encontrar inconsistencias criticas ja conhecidas, como score operacional divergente, DPPH incorreto, temporalidade parcial, recálculo em camadas erradas ou lacunas de contrato, trate esses pontos como prioritarios e destaque logo no inicio.
