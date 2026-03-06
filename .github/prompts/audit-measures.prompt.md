---
description: >
  Executa auditoria completa das medidas DAX do Painel Monitoramento Petlove.
  Lê _Medidas.tmdl, cataloga todas as medidas, classifica por status e produz
  inventário em Dashboard/docs/02-inventario-medidas.md.
mode: agent
---

# Auditoria de Medidas DAX

## Objetivo

Mapear, catalogar e classificar todas as medidas DAX da tabela `_Medidas` do modelo semântico `Painel Monitoramento - Petlove.SemanticModel`.

## Passos

1. **Ler o arquivo de medidas**
   - Abrir `Dashboard/Painel Monitoramento - Petlove.SemanticModel/definition/tables/_Medidas.tmdl`
   - Extrair: nome, expressão DAX, displayFolder, formatString, description

2. **Catalogar cada medida**
   Para cada medida, determinar:
   - **Grupo atual** (displayFolder)
   - **Objetivo funcional** (o que calcula)
   - **Tipo**: base | derivada | meta | status | alerta | variação | ranking | tooltip | SVG | format
   - **Granularidade**: dia | semana | filial | rota | veículo | geral
   - **Dependências**: outras medidas ou colunas referenciadas
   - **Status**: core | apoio | legado | duplicada | remoção | refatorar | faltante

3. **Classificar por grupo**
   Usar a hierarquia oficial:
   - Core: 01 a 05, 07. Investigacao
   - Apoio: 06. Shared, 98. Suporte
   - Legado: 90. Legado
   - Não-prioritário: 99. Backoffice
   - Atenção: 06. Shared\03. SVG Cards (erros conhecidos)

4. **Identificar problemas**
   - Medidas sem displayFolder
   - Medidas duplicadas ou com nomes ambíguos
   - Medidas legadas misturadas com core
   - Referências quebradas (colunas/medidas que não existem)
   - CALCULATE sem filtros explícitos em contexto ambíguo

5. **Identificar lacunas**
   - Medidas faltantes para gestão diária/semanal
   - Métricas operacionais esperadas mas ausentes
   - Medidas de alerta/status incompletas

6. **Produzir inventário**
   Criar `Dashboard/docs/02-inventario-medidas.md` com tabela completa e diagnóstico por grupo.

## Saída

Arquivo `Dashboard/docs/02-inventario-medidas.md` contendo:
- Tabela completa de medidas (nome, grupo, tipo, status, dependências, observações)
- Resumo quantitativo por grupo e por status
- Top 10 problemas encontrados
- Top 10 medidas faltantes recomendadas
- Premissas adotadas
