# Plano Estrutural Canônico de Dados

Projeto: Monitoramento Logístico Last-Mile
Data: 2026-03-22
Status: canônico para revisão estrutural da camada de dados, medidas, contratos e naming

---

## 1. Objetivo

Este documento estabelece a visão canônica para simplificar o projeto de ponta a ponta, tomando a base raw como referência primária e removendo recalculos espalhados entre BigQuery, API, Google Sheets e frontend.

Artefatos complementares obrigatórios desta visão:

- docs/SCHEMA_RAW_CANONICO.md
- docs/CATALOGO_MEDIDAS_CANONICO.md

Ele substitui interpretações conflitantes entre diagnósticos, dicionários e contratos quando houver divergência sobre:

- grão operacional
- definição de medida
- naming
- ponto de cálculo
- fronteira entre dados, API e visual

---

## 2. Princípios Canônicos

1. A fonte de verdade operacional é a base raw carregada no BigQuery.
2. O grão canônico da execução é 1 linha por id_carga.
3. O relacionamento estrutural principal do projeto é simples: monitoramento e planejamento se reconciliam por id_carga, com atributos auxiliares por filial e calendário.
4. Nenhum KPI publicado pode ser recalculado em mais de uma camada sem justificativa formal.
5. API e frontend não são lugares de regra de negócio; são camadas de entrega.
6. Google Sheets é canal de publicação, não fonte semântica.
7. Toda métrica publicada deve ter fórmula, unidade, grão, data de referência e comportamento em ausência de dados documentados.
8. Naming técnico e naming visual devem ser harmonizados por catálogo explícito, nunca por tradução ad hoc em cada tela.

---

## 3. Diagnóstico Consolidado

Os documentos existentes convergem em quatro problemas estruturais:

1. Há duplicação de cálculo entre v4, v5, v6 e api/server.js.
2. O score operacional e outros KPIs apresentam divergência de fórmula entre camadas.
3. A camada de publicação acumulou responsabilidade analítica demais.
4. O frontend e a API ainda consomem contratos parcialmente heterogêneos.

Conclusão consolidada:

- a complexidade atual não vem da base de dados raiz
- a complexidade foi introduzida nas camadas derivadas
- a correção deve partir do raw e do grão id_carga

---

## 4. Arquitetura Alvo Simplificada

Arquitetura canônica alvo:

RAW -> STAGING_CANONICO -> BASE_EXECUCAO_CANONICA -> MARTS_CANONICOS -> PUBLICACAO -> API/FRONTEND

### 4.1 RAW

Objetos:

- raw_monitoramento
- raw_planejamento
- raw_dim_filial

Responsabilidade:

- preservar o dado recebido
- não embutir semântica analítica
- registrar tipos e campos de origem

### 4.2 STAGING_CANONICO

Responsabilidade:

- normalizar tipos
- padronizar textos e chaves
- unificar parsing temporal
- expor nomes técnicos estáveis

Regras:

- nenhum KPI agregado nesta camada
- apenas derivadas atômicas e determinísticas
- todo campo de staging deve apontar para um campo raw de origem

### 4.3 BASE_EXECUCAO_CANONICA

Responsabilidade:

- consolidar a linha operacional por id_carga
- anexar atributos de calendário, filial e planejamento reconciliados
- expor medidas atômicas prontas para agregação

Este deve ser o novo centro semântico do projeto.

Colunas esperadas por família:

- chaves: id_carga, data_referencia, filial_id, filial_nome, transportador_nome, motorista_id, motorista_nome
- execução: qtd_rotas_base, qtd_pedidos, qtd_volumes, qtd_entregues, qtd_insucessos, qtd_baixas
- planejamento: pedidos_plan, volumes_plan, peso_plan_kg, km_plan, tempo_plan_h
- capacidade: peso_real_kg, capacidade_peso_kg, tipo_veiculo
- tempos: tempo_operacional_h, tempo_ocioso_h
- custos: valor_carga, valor_rota, valor_parada, valor_remessas, valor_km, valor_ajudante, valor_total
- flags: flag_rota_concluida, flag_nao_planejada, flag_sem_tempo, flag_overtime, flag_match_mesmo_dia

### 4.4 MARTS_CANONICOS

Responsabilidade:

- agregar a base canônica por grão analítico
- calcular KPIs uma única vez por grão
- expor também metas e status derivados da mesma regra

Grãos canônicos mínimos:

- mart_diario_canonico
- mart_filial_dia_canonico
- mart_transportador_dia_canonico
- mart_motorista_dia_canonico

Regra obrigatória:

- qualquer view de publicação ou view de API deve consumir estes marts ou a base canônica, nunca recriar fórmula livremente

### 4.5 PUBLICACAO

Responsabilidade:

- adaptar nomes e formatos para consumo
- não redefinir cálculo

Escopo permitido:

- alias de colunas
- ordenação
- seleção de subconjunto
- enriquecimento leve de calendário

Escopo proibido:

- redefinição de score
- reclassificação de status
- recomposição temporal já disponível no mart

### 4.6 API E FRONTEND

Responsabilidade:

- filtrar, paginar, serializar e exibir

Escopo proibido:

- recalcular KPI
- recomputar score
- reinterpretar unidade
- aplicar meta diferente da documentada

---

## 5. Grão, Chaves e Data de Referência

### 5.1 Grão canônico

- Execução operacional: 1 linha por id_carga
- KPI diário: 1 linha por data_referencia
- KPI por filial: 1 linha por data_referencia + filial
- KPI por transportador: 1 linha por data_referencia + transportador
- KPI por motorista: 1 linha por data_referencia + motorista normalizado

### 5.2 Chaves canônicas

- id_carga: chave operacional primária
- filial_key: chave padronizada da unidade
- transportador_key: nome tratado até existir dimensão própria estável
- motorista_key: preferencialmente cpf_motorista; fallback para nome normalizado apenas quando cpf ausente

### 5.3 Data de referência

Decisão canônica inicial:

- data_referencia padrão do dashboard operacional = data_planejada reconciliada com a execução

Regras:

- qualquer exceção deve ser explicitada no catálogo da métrica
- dt_abertura, dt_carregamento e ts_inicio_rota podem ser usados como apoio analítico, mas não substituem a data_referencia padrão sem contrato formal

---

## 6. Catálogo Canônico de Medidas

### 6.1 Medidas atômicas

Estas medidas pertencem à base canônica e podem ser agregadas:

- qtd_rotas
- qtd_pedidos
- qtd_volumes
- qtd_entregues
- qtd_insucessos
- qtd_baixas
- peso_real_kg
- km_real
- tempo_operacional_h
- valor_total
- pedidos_plan
- volumes_plan
- peso_plan_kg
- km_plan
- tempo_plan_h

### 6.2 KPIs derivados oficiais

As fórmulas abaixo são as únicas permitidas para publicação, salvo revisão formal.

| KPI | Fórmula canônica | Unidade | Grão mínimo |
| --- | --- | --- | --- |
| spr_pedidos | qtd_pedidos / qtd_rotas | número | qualquer mart |
| spr_volumes | qtd_volumes / qtd_rotas | número | qualquer mart |
| pct_entregas_efetivas | qtd_entregues / (qtd_entregues + qtd_insucessos) | fração 0-1 | qualquer mart |
| pct_rotas_concluidas | qtd_rotas_concluidas / qtd_rotas | fração 0-1 | qualquer mart |
| orh | tempo_operacional_h / qtd_rotas | horas/rota | qualquer mart |
| ader_volumes | clamp(qtd_volumes / volumes_plan) conforme regra oficial | fração 0-1 | mart com planejamento |
| ader_pedidos | clamp(qtd_pedidos / pedidos_plan) conforme regra oficial | fração 0-1 | mart com planejamento |
| ocup_peso_veiculo | peso_real_kg / capacidade_peso_kg | fração 0-1 | mart com capacidade |
| custo_medio_carga | valor_total / qtd_rotas | moeda | qualquer mart |
| custo_medio_pedido | valor_total / qtd_pedidos | moeda | qualquer mart |
| dpph | qtd_entregues / tempo_operacional_h | entregas/hora | qualquer mart |

Observações canônicas:

- DPPH usa entregues, não pedidos.
- Ocupação física oficial é ocup_peso_veiculo.
- Ocupação baseada em planejado não deve se chamar ocupação; deve ser tratada como aderência ou desvio vs plano.
- Score operacional nunca deve ser calculado fora do catálogo central.

### 6.3 Score operacional canônico

Composição oficial do score:

- status_spr_volumes
- status_entregas_efetivas
- status_rotas_concluidas
- status_orh
- status_ader_volumes
- status_ocup_peso

Regra:

- score_operacional = avg(status_score(componentes)) * 100

Proibição explícita:

- não substituir spr_volumes por outra métrica no primeiro argumento
- não trocar orh por overtime ou jornada média sem revisão formal
- não misturar score de motorista com score global usando composição diferente

---

## 7. Regras de Naming

### 7.1 Naming técnico

Padrões oficiais:

- qtd_: contagens absolutas
- pct_: percentuais em fração 0-1
- spr_: eficiência por rota
- ader_: aderência ao planejamento
- ocup_: ocupação de capacidade física
- custo_medio_: custo unitário
- tempo_: duração em horas
- gap_: diferença absoluta entre realizado e referência
- var_d1_: variação contra a data anterior válida
- status_: classificação textual
- meta_: valor de referência
- flag_: indicador booleano

### 7.2 Naming visual

A harmonização de nomes exibidos ao usuário deve seguir um catálogo fixo:

| Nome técnico | Nome visual |
| --- | --- |
| qtd_rotas | Qtd Rotas |
| qtd_pedidos | Qtd Pedidos |
| qtd_volumes | Qtd Volumes |
| pct_entregas_efetivas | Entregas Efetivas |
| pct_rotas_concluidas | Rotas Concluídas |
| spr_pedidos | SPR Pedidos |
| spr_volumes | SPR Volumes |
| orh | ORH |
| ader_volumes | Aderência Volumes |
| ocup_peso_veiculo | Capacidade Utilizada |
| dpph | DPPH |
| custo_medio_carga | Custo Médio por Carga |
| custo_medio_pedido | Custo Médio por Pedido |
| score_operacional | Score Operacional |

Regra:

- um nome visual por métrica
- uma métrica técnica por nome visual
- o frontend não pode inventar rótulos alternativos para o mesmo indicador

---

## 8. Regras de Schema e Contrato

Toda entidade publicada deve documentar:

- nome da view ou endpoint
- grão
- chave primária lógica
- colunas obrigatórias
- unidade de cada métrica
- filtros aceitos
- camada temporal suportada
- comportamento com nulos e denominador zero

Regras obrigatórias:

1. Percentuais sempre em fração 0-1 na API.
2. Datas em formato YYYY-MM-DD.
3. Valores monetários em decimal bruto.
4. API não devolve métrica formatada como fonte principal; texto formatado é acessório.
5. O contrato de frontend deve apontar para a view ou mart de origem, não para cálculo implícito em server.js.

---

## 9. Simplificações Estruturais Obrigatórias

### 9.1 Remover duplicação de cálculo

Deve sair de cena:

- SQL inline analítico no api/server.js
- score alternativo em views v6
- recomputação de deltas e comparativos já presentes nos marts

### 9.2 Reclassificar camadas

Alvo estrutural:

- v4 deixa de ser mistura de fato e apresentação
- v5 passa a ser apenas publicação
- v6 passa a ser apenas contrato para API

### 9.3 Canonizar a base operacional

Antes de qualquer redesign de dashboard, criar ou consolidar uma view central equivalente a base_execucao_canonica com:

- campos atômicos auditáveis
- flags operacionais documentadas
- reconciliação clara com planejamento
- suporte explícito ao cálculo dos marts canônicos

### 9.4 Padronizar motorista

Chave preferencial:

- cpf_motorista

Fallback:

- nome normalizado

Sem isso, qualquer leitura por motorista deve ser tratada como confiabilidade parcial.

---

## 10. Roadmap de Implementação

### Fase 1. Congelamento semântico

- declarar este documento como referência principal
- impedir novos cálculos fora da camada analítica
- registrar catálogo oficial de métricas e naming

### Fase 2. Reconstrução da base canônica

- revisar staging a partir do raw
- consolidar base_execucao_canonica por id_carga
- documentar colunas e regras de reconciliação

### Fase 3. Reconstrução dos marts

- gerar marts por grão a partir da base canônica
- centralizar score, status e metas
- eliminar fórmulas divergentes

### Fase 4. Limpeza de publicação e API

- reescrever views v5 para serem adaptadoras finas
- reescrever v6 para consumo direto dos marts canônicos
- reduzir server.js a filtro, paginação e serialização

### Fase 5. Contratos e visual

- revisar contratos do frontend contra as novas views
- harmonizar rótulos dos componentes visuais
- remover qualquer fallback que esconda quebra de dados reais

---

## 11. Decisões Já Consolidadas

Estas decisões podem ser adotadas imediatamente como referência de trabalho:

1. O projeto deve ser simplificado a partir da base raw, não a partir das views atuais.
2. O relacionamento estrutural principal é id_carga.
3. O score operacional deve ter uma única fórmula oficial.
4. DPPH oficial usa entregues por hora.
5. Ocupação física oficial é por peso sobre capacidade do veículo.
6. API e frontend não devem recalcular KPI.
7. Google Sheets não define semântica.
8. Nomes visuais precisam vir de um catálogo padronizado.

---

## 12. Próximos Artefatos Derivados

Após este documento, os próximos artefatos a alinhar são:

- DICIONARIO_DADOS.md
- data_contract_frontend.md
- matriz_contrato_front_api_bq.md
- pipeline_v4.sql
- pipeline_v5_publicacao.sql
- pipeline_v6_api.sql
- api/server.js

Até essa revisão terminar, qualquer dúvida semântica deve voltar a este plano e, se necessário, ao dado raw.
