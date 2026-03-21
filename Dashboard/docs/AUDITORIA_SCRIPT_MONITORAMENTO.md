# Auditoria do Apps Script de Monitoramento

Data da auditoria: 2026-03-18

Arquivos auditados:
- `Dashboard/google_apps/apps_script_monitoramento.gs`
- `C:\Users\lucas.batista\Downloads\Relatorio_Monitoramento_Carga (10).xlsx`

## Escopo

Mapeamento do fluxo do Apps Script, validação do schema real gerado no `.xlsx` e identificação de gaps de lógica, nomenclatura e higiene estrutural.

## Mapeamento do fluxo

### Entradas lidas pelo script

1. Abas mensais
- Detectadas por regex de mês em `getMonthlySheets_()`.
- No arquivo auditado: `janeiro`, `fevereiro`, `março`.
- Schema real encontrado nas 3 abas: 39 colunas.
- Campos-chave usados pelo script:
  - `Id Carga`
  - `status`
  - `N° Placa`
  - `Tipo`
  - `Motorista`
  - `CPF Motorista`
  - `Transportador`
  - `Rota`
  - `Filial`
  - `dtabertura`
  - `Data de carregamento`
  - `Quantidade`
  - `Quantidade Volumes`
  - `Valor Pagamento Carga`
  - `Km Planejado`
  - `Km Realizado`
  - `Tempo Planejado`
  - `Tempo Realizado`
  - `Paradas`
  - `Peso`
  - `Clientes`
  - `Perfomance`
  - `Entregues`
  - `Insucessos`
  - `baixas`
  - `Data Atribuição Motorista`
  - `Data Inicio de Rota APP`
  - `Última Baixa`

2. Dimensão
- Aba: `dimensao`
- Schema real encontrado: 9 colunas
- Campos usados:
  - `Filial`
  - `Codigo`
  - `Nome Filial`
  - `Tipo`
  - `MetaSPR`
  - `Capacidade Volume Dia`

3. Planejamento
- Aba: `bd_planejamento`
- Schema real encontrado: 9 colunas
- Campos usados:
  - `Filial`
  - `Lista`
  - `Pedidos`
  - `Volume`
  - `Km`
  - `Tempo de Rota`
  - `Peso`

### Regras de transformação

1. Filtragem por tipo de filial
- Apenas registros cuja dimensão resolve para `Tipo = UNIDADE` entram na base final.

2. Chave de enriquecimento
- Planejamento é cruzado por `IdCarga/Lista + Filial canônica`.

3. Deduplicação
- A base mensal consolidada é deduplicada por `IdCarga + Filial`.
- Quando há repetição, o script mantém o registro com maior `Data de Carregamento` ou `Data Planejada`.

4. Normalização
- Gera `VW_Base_Execucao` com 54 colunas normalizadas.
- A partir dela gera:
  - `Resumo_Semana_Filial_Diario`
  - `Resumo_Semana_Filial_Matriz`
  - `Resumo_Ocupacao_Veic_Transp`
- Opcionalmente, via menu separado, gera:
  - `Resumo_Filial`

## Outputs validados no arquivo auditado

### 1. `VW_Base_Execucao`
- Linhas usadas no arquivo: 26.276
- Linhas de dados: 26.275
- Colunas úteis com header: 54
- Colunas usadas no workbook exportado: 63

Conclusão:
- O schema principal bate com `BASE_HEADERS`.
- Existem 9 colunas extras em branco no range exportado.

### 2. `Resumo_Semana_Filial_Diario`
- Linhas usadas no arquivo: 1.594
- Linhas de dados: 1.593
- Colunas úteis com header: 33

Conclusão:
- O schema bate com `RESUMO_SEMANA_FILIAL_DIARIO_HEADERS`.

### 3. `Resumo_Semana_Filial_Matriz`
- Linhas usadas no arquivo: 7.430
- Linhas de dados: 7.429
- Colunas úteis com header: 15
- Colunas usadas no workbook exportado: 22

Conclusão:
- O schema lógico bate com `RESUMO_SEMANA_FILIAL_MATRIZ_HEADERS`.
- Existem 7 colunas extras em branco no range exportado.
- O volume de 7.429 linhas fecha exatamente com 323 combinações semana-filial x 23 métricas.

### 4. `Resumo_Ocupacao_Veic_Transp`
- Linhas usadas no arquivo: 1.593
- Linhas de dados: 1.592
- Colunas úteis com header: 26

Conclusão:
- O schema bate com `RESUMO_OCUPACAO_HEADERS`.

### 5. `Resumo_Filial`
- Linhas usadas no arquivo: 29
- Linhas de dados: 28
- Colunas úteis com header: 34

Conclusão:
- A aba existe e está coerente com `gerarResumoFilial()`.
- Isso contradiz parcialmente o comentário inicial do script, que diz que essa aba foi removida do fluxo principal.

## Gaps encontrados

### Gap 1. `Progresso Execucao (%)` está em escala 0-100, não 0-1

Evidência:
- O valor amostrado no arquivo para `Progresso Execucao (%)` está como `100`, não `1`.
- O cálculo usa pontos `100/75/50/25/0` e divide pela quantidade de cargas.
- O campo é formatado como decimal, não como percentual.

Impacto:
- O nome com `%` sugere semântica percentual fracionária.
- Se isso for consumido no Power BI como percent, o visual pode duplicar a escala.

Validação recomendada:
- Confirmar se o esperado é:
  - manter 0-100 e renomear para `Progresso Execucao (pts)` ou similar, ou
  - converter para 0-1 e formatar como `%`.

### Gap 2. `Total Peso Pedidos (kg)` na prática é peso planejado

Evidência:
- O acumulador `pesoPedidosKg` soma `Peso Planejado (kg)`.
- A nomenclatura do output usa `Pedidos`, não `Planejado`.

Impacto:
- Pode induzir leitura errada no diário e na matriz.
- Analiticamente, “peso dos pedidos” e “peso planejado” não são necessariamente a mesma entidade semântica.

Validação recomendada:
- Confirmar se o correto é:
  - renomear para `Total Peso Planejado (kg)`, ou
  - trocar a origem do campo se o objetivo era peso real de pedidos.

### Gap 3. A deduplicação depende da unicidade de `IdCarga + Filial`

Evidência:
- Foi encontrado 1 caso duplicado nas abas mensais:
  - `973190 | Petlog43 Murici_PL_SJK`
- O registro aparece em `fevereiro` e `março` com o mesmo conteúdo.

Impacto:
- Neste caso específico, a deduplicação parece correta.
- Mesmo assim, a regra depende de o identificador ser estável e globalmente único no tempo.

Validação recomendada:
- Confirmar com negócio/TMS se `Id Carga` é chave global.
- Se não for, incluir `Data` na chave de deduplicação e no vínculo com planejamento.

### Gap 4. O workbook exportado mantém colunas em branco além do schema lógico

Evidência:
- `VW_Base_Execucao`: 63 colunas usadas no arquivo, mas 54 headers válidos.
- `Resumo_Semana_Filial_Matriz`: 22 colunas usadas, mas 15 headers válidos.

Impacto:
- Pode atrapalhar exportações, conectores e validações automáticas por range usado.
- Também aumenta ruído para auditoria e comparação de schema.

Validação recomendada:
- Ajustar a rotina de escrita para limpar ou remover colunas excedentes da aba antes da exportação final.

### Gap 5. Divergência entre documentação e comportamento

Evidência:
- O comentário inicial afirma que `Resumo_Filial` foi removido.
- O menu `onOpen()` ainda expõe `Gerar resumo por filial`.
- O arquivo auditado contém a aba `Resumo_Filial`.

Impacto:
- Gera ruído operacional sobre o que é “oficial” no fluxo.

Validação recomendada:
- Decidir se `Resumo_Filial` continua suportado.
- Se sim, atualizar a documentação do cabeçalho.
- Se não, remover menu e função.

## Pontos de atenção que não são erro, mas precisam de confirmação

1. Conversão de duração
- A função `durationToHours_()` assume que números entre `0` e `1` representam fração de dia do Google Sheets.
- Isso faz sentido para os exemplos auditados, mas é uma premissa importante do pipeline.

2. Chave do planejamento
- `bd_planejamento` é agregado por `Lista + Filial`.
- Foram encontrados 45 casos duplicados nessa chave, mas o script soma esses registros de propósito.
- Isso só é correto se duplicidade em planejamento significar quebra legítima da mesma carga, e não colisão indevida.

3. Abas fora do contrato do script
- O arquivo também contém `PAINEL_GERENCIAL` e `Página51`.
- Elas não entram no fluxo do Apps Script, então são artefatos paralelos do workbook e não saídas gerenciadas pelo script.

## Parecer final

O mapeamento estrutural do script está consistente com o `.xlsx` auditado. As entradas, os enriquecimentos e os três outputs principais estão aderentes ao contrato implementado.

Os principais pontos a validar antes de “fechar” esse pipeline como contrato confiável são:
- escala semântica de `Progresso Execucao (%)`
- nomenclatura de `Total Peso Pedidos (kg)`
- premissa de unicidade de `IdCarga + Filial`
- limpeza de colunas excedentes no workbook exportado
- alinhamento entre documentação e comportamento real do script
