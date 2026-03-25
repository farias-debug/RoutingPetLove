# Modelos - WhatsApp Diario

## Objetivo

Definir uma versao curta do resumo diario, adequada para leitura rapida e envio por template.

## Modelo 1 - Texto utilitario curto

```text
Resumo Executivo Diario - 25/03

Score operacional: 16,7
Entrega efetiva: 89,1%
Rotas: 356
Alertas criticos: 1.209

Foco do dia: 01-Sao Paulo puxando a queda de score.

Abrir dashboard: {url}
```

## Modelo 2 - Texto com risco em destaque

```text
Resumo Executivo Diario - 25/03

Operacao fechou com score 16,7 e entrega efetiva de 89,1%.
O maior risco do dia esta em entrega critica: 1.209 ocorrencias.

Foco do dia: revisar investigacao operacional de 01-Sao Paulo.

Dashboard: {url}
```

## Modelo 3 - Template com variaveis

```text
Resumo Executivo Diario - {{1}}

Score operacional: {{2}}
Entrega efetiva: {{3}}
Rotas: {{4}}
Alertas criticos: {{5}}

Foco do dia: {{6}}

Abrir dashboard: {{7}}
```

## Regras editoriais

- uma ideia principal por mensagem
- no maximo 4 metricas
- sempre incluir data-base
- sempre incluir CTA
- evitar siglas internas nao obvias

## Regras de template

Seguindo a documentacao de templates/cards do provedor:

- header curto
- body objetivo
- footer opcional
- no maximo 1 CTA principal na v1

## O que nao fazer

- mandar tabela
- mandar lista longa de filiais
- mandar multiplos links
- mandar percentuais cuja semantica ainda nao esteja validada
