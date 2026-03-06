Plano de Melhoria Visual e UX - Dashboard de Roteirização Last Mile

A) MAPA VISUAL DO PAINEL (estrutura modular por perguntas operacionais)
PAINEL 1: Torre de Controle / Fluxo do Dia
Pergunta: "O que mudou hoje? Onde está o problema agora?"

Ação: Priorizar investigação em filiais/rotas críticas no dia atual

KPIs principais (5-8):

Total Rotas / Pedidos / Volumes (valor absoluto + variação D-1)
% Rotas Finalizadas vs Carregadas
Alertas Críticos (qtd filiais abaixo meta)
Pior Filial do Dia (Entregas / SPR)
Status Operacional Geral (semáforo)
Visuais recomendados:

Cards principais: nativos (formatação condicional) ou SVG/DAX para "hero numbers" com variação D-1
Alerta prioritário: Deneb (card customizado com ícone + texto de ação)
Ranking Top/Bottom 5 Filiais: tabela nativa com barras de dados embutidas
Sparkline de tendência 7 dias: visual nativo de linha (minimalista, sem eixos)
Medidas/grupos:

01. Resumo Executivo (Total Rotas, Pedidos, Volumes, Entregas)
09. Variacoes Temporais (Var D-1, MA7)
13. Rankings e Alertas KPI (Pior Filial, Qtd Filiais Abaixo Meta, Alerta Operacional)
15. Torre de Controle Operacional (todas as Op_)
Como organizar páginas:

Criar nova página "Torre de Controle" ou renomear "Executivo" → "Torre de Controle"
Layout: 3 níveis visuais:
Filtros compactos no topo (Data, Filial slicer minimalista)
Hero cards (3-4 KPIs principais, grande fonte)
Alertas + Rankings + Sparklines (detalhamento rápido)
PAINEL 2: Scoreboard de Volume + Qualidade
Pergunta: "Estamos entregando com qualidade? O volume está dentro do esperado?"

Ação: Avaliar performance semanal/mensal vs meta (SPR, Entregas, Volume)

KPIs principais:

SPR Ped Realizado (valor + gap vs meta)
% Entregas Efetivas (valor + gap vs meta)
Total Pedidos / Rotas / Volumes (YTD + variação WoW/MoM)
% Insucessos (tendência MA7)
Visuais recomendados:

Bullet chart nativo para Meta vs Real (SPR, Entregas)
Progress bar (formatação condicional em tabela ou Deneb)
KPI Cards com semáforo: SVG/DAX (card "premium" com ícone, cor, texto de status)
Comparativo semanal: gráfico de barras agrupadas (Planejado vs Realizado)
Medidas/grupos:

02. SPR - Densidade (SPR Ped, SPR Vol, Gap vs Meta)
08. Eficacia de Entrega (% Entregas, Taxa Insucesso)
11. Metas e Parametros (todas as metas)
12. KPI Cards (toda a factory: Valor/Meta/Delta/Status/Cor/Icone/Texto)
Como organizar páginas:

Consolidar em página "Performance Semanal" ou "Scoreboard"
Remover redundância entre páginas "Executivo" e "Visão Semanal" (consolidar)
Layout: grid 2x3 (6 cards principais) + 1 gráfico de tendência semanal
PAINEL 3: Eficiência SPR (Densidade & Drivers)
Pergunta: "Por que o SPR está acima/abaixo da meta? Quais drivers estão impactando?"

Ação: Investigar filiais/veículos com baixa densidade; ajustar planejamento

KPIs principais:

SPR Ped Realizado vs Planejado vs Meta
SPR Vol Realizado vs Planejado
Desvio SPR Plan vs Real (pontos)
SPR por Tipo de Veículo (ocupação)
Ranking Filiais (melhores/piores SPR)
Visuais recomendados:

Waterfall chart (nativo) para mostrar drivers do desvio SPR
Small multiples (matriz de gráficos de linha por Filial)
Scatter plot: SPR Ped vs SPR Vol (identificar outliers)
Tabela drill-through: por Rota com cores condicionais
Medidas/grupos:

02. SPR - Densidade (todas)
04. Desvios Plan x Real (Desvio SPR Pedidos, Volumes)
06. Eficiencia KM (Pedidos/KM)
13. Rankings e Alertas KPI (Top 3 Piores Filiais SPR)
Como organizar páginas:

Manter página "SPR" atual, mas dividir em:
"SPR Overview" (cartões + tendência)
"SPR Detalhamento" (drill-through por Filial/Tipo Veículo)
Ou consolidar em única página com tooltip page rico
PAINEL 4: Jornada ORH (Utilização & Overtime)
Pergunta: "Estamos utilizando bem a jornada? Há potencial de consolidação?"

Ação: Reduzir rotas curtas, consolidar ociosidade, evitar overtime

KPIs principais:

ORH Tempo Realizado (h) vs Meta
% Rotas Overtime (>8h) e % Rotas Curtas (<4h)
Potencial Consolidação (rotas)
Economia Potencial (h)
Tempo Médio Realizado vs Planejado
Visuais recomendados:

Histograma (distribuição de tempo de rota) - nativo de colunas agrupadas
Gauge chart nativo para Utilização Jornada 8h (%)
Cenários side-by-side: tabela com formatação condicional (ORH Real, ORH 8h, Economia)
Heatmap Deneb (Filial x Dia da Semana → cor = % Overtime)
Medidas/grupos:

03. ORH - Unidade e Cenarios (todas)
05. Produtividade/h (Pedidos/h, Entregas/h)
09. Variacoes Temporais (MA7 ORH Tempo, Var D-1 ORH)
Como organizar páginas:

Nova página "ORH & Jornada" ou renomear "Frota e Capacidade" → separar em 2
Layout: cards ORH no topo, histograma/cenários abaixo, tooltip para drill por Filial
PAINEL 5: Capacidade & Mix de Veículos
Pergunta: "A frota está dimensionada? Há sobrecarga ou ociosidade?"

Ação: Ajustar mix de veículos, redistribuir carga entre tipos

KPIs principais:

Ocupação Pedidos (%) e Ocupação Volumes (%) por Tipo Veículo
% Rotas Acima Capacidade (P75)
Tipo Veículo Crítico (maior ocupação)
Rotas por Veículo Dia
Excesso Médio (acima P75)
Visuais recomendados:

Treemap nativo (Tipo Veículo → tamanho = qtd rotas, cor = ocupação %)
Stacked bar chart (mix de veículos por Filial)
Tabela de capacidade: nativa com formatação condicional (verde/amarelo/vermelho)
Tooltip page: mini-card com Cap P75 e Excesso Médio
Medidas/grupos:

07. Frota e Capacidade (todas)
01. Resumo Executivo (Veiculos Ativos)
Como organizar páginas:

Dividir "Frota e Capacidade" em 2:
"Capacidade (Mix & Ocupação)"
"ORH & Jornada" (já proposto acima)
Layout: treemap central + tabela de apoio + filtro de Tipo Veículo no topo
PAINEL 6: Plano vs Real + Reconciliação
Pergunta: "Estamos executando o que foi planejado? Onde está o desvio?"

Ação: Corrigir planejamento, investigar rotas não planejadas, melhorar aderência

KPIs principais:

Aderência Pedidos, Volumes, KM, Tempo (%)
% Match Mesmo Dia / D±1 / Fora Janela
Cobertura Rotas (%)
% Sem Planejado
Gap Médio Plan vs Real (dias)
Visuais recomendados:

Radar chart Deneb (aderência em 5 dimensões: Pedidos, Volumes, KM, Tempo, Rotas)
Sankey diagram (fluxo: Planejado → Executado Mesmo Dia → D+1 → Fora Janela)
Tabela de reconciliação: nativa com drill-through para detalhes de rota
Medidas/grupos:

04. Desvios Plan x Real (todas as Aderências)
10. Reconciliacao (todas)
19. Tabeloes Exportacao DAX > 02. KPI Semanal (Match temporais)
Como organizar páginas:

Nova página "Plano vs Real" ou renomear "Base Geral" → "Reconciliação"
Layout: radar chart no topo (destaque visual), tabela de detalhamento abaixo
PAINEL 7: Investigação (Drill-Through / Tabelão Operacional)
Pergunta: "Quais rotas estão gerando exceções? Qual o detalhe por rota/motorista?"

Ação: Exportar, investigar, corrigir outliers

KPIs principais:

Todas as colunas relevantes de fato_rotas (linha por linha)
Flags visuais: Acima Capacidade, Overtime, Sem Planejado, Match Temporal
Tags Operacionais (TblExp)
Visuais recomendados:

Tabela nativa com formatação condicional forte (ícones para flags)
Drill-through page (ativada por clique em qualquer visual)
Tooltip page (mini-scoreboard por Filial/Rota)
Medidas/grupos:

19. Tabeloes Exportacao DAX > 01. Linha Operacional (todas TblExp)
15. Torre de Controle Operacional (Op_)
Como organizar páginas:

Página drill-through oculta (não visível no menu, só por drill)
Ou página "Base Operacional" (tabela grande, exportável)
Layout: filtros no topo, tabela ocupando 90% da tela
PAINEL 8: Qualidade de Dados (opcional, diagnóstico)
Pergunta: "Os dados estão consistentes? Há rotas sem tempo/data?"

Ação: Corrigir no TMS, validar carga

KPIs principais:

% Rotas Sem Tempo
% Rotas Sem Data Final
Qtd Rotas Não Planejadas
Qtd Rotas Aguardando Aceite
Visuais recomendados:

Cards simples nativos (valores absolutos + %)
Tabela de validação: listar rotas com problemas
Medidas/grupos:

_Nao Publicavel (% Rotas Sem Data Final)
15. Torre de Controle Operacional (Op Rotas Sem Tempo, Nao Planejadas)
Como organizar páginas:

Página oculta "Qualidade de Dados" (só para auditoria interna)
Ou seção no final da página "Torre de Controle"
B) KIT DE COMPONENTES REUTILIZÁVEIS
1. KPI Card Principal (com variação WoW/MoM)
Quando usar: Primeira linha de qualquer painel (hero metrics)

Layout:

Título (ex: "Total de Rotas")
Valor principal (fonte grande, bold)
Variação (WoW/MoM/D-1) com seta ↑↓ e cor (verde/vermelho)
Unidade (ex: "#,##0", "0.0%")
Regras visuais:

Cor de variação: verde se positivo e "maior é melhor", vermelho se negativo
Tamanho: valor 3x maior que variação
Sem bordas/sombras pesadas (minimalista)
Versão fácil (nativo):

Visual de cartão nativo do Power BI
Campo principal: Total Rotas
Tooltip: Var WoW Rotas (formatado com setas via Unicode)
Versão premium (SVG/DAX):


KPI Card SVG =
VAR Valor = [Total Rotas]
VAR VarWoW = [Var WoW Rotas]
VAR Cor = IF(VarWoW > 0, "#10B981", "#EF4444")
VAR Seta = IF(VarWoW > 0, "▲", "▼")
RETURN
"data:image/svg+xml;utf8," &
"<svg width='200' height='100' xmlns='http://www.w3.org/2000/svg'>" &
"<text x='10' y='30' font-size='32' font-weight='bold' fill='#1F2937'>" & FORMAT(Valor, "#,##0") & "</text>" &
"<text x='10' y='60' font-size='16' fill='" & Cor & "'>" & Seta & " " & FORMAT(VarWoW, "+0.0%;-0.0%") & "</text>" &
"</svg>"
2. KPI Card de Alerta (semáforo + texto de ação)
Quando usar: Destacar exceções (filiais críticas, alertas)

Layout:

Ícone/semáforo (🔴🟡🟢 ou ⚠️)
Título do alerta (ex: "Filiais Abaixo Meta SPR")
Valor (qtd ou %)
Texto de ação (ex: "Investigar Rio e SP")
Regras visuais:

Vermelho: crítico (ação imediata)
Amarelo: atenção (monitorar)
Verde: ok (sem ação)
Versão fácil (nativo):

Card nativo + formatação condicional de cor de fundo
Tooltip com Top 3 Piores Filiais
Versão premium (Deneb):

Template baseado em Deneb Showcase - Alert Card
Vega spec com mark: rect para fundo colorido + mark: text para ícone/texto
3. Meta vs Real (bullet/progress)
Quando usar: Mostrar progresso vs meta (SPR, Entregas, ORH)

Layout:

Barra de progresso (0-100% ou valor absoluto)
Marcador de meta (linha vertical)
Cor: verde se acima, vermelho se abaixo
Versão fácil (nativo):

Visual de gráfico de barras agrupadas horizontal
Valores: Valor Realizado, Meta
Formatação condicional de cor
Versão premium (Deneb):

Bullet chart customizado com Deneb Vega Templates
Spec Vega com mark: bar + mark: rule (linha de meta)
4. Ranking Top/Bottom (por filial/transportador)
Quando usar: Identificar melhores/piores performers

Layout:

Tabela com 3 colunas: Rank, Nome, Valor
Top 5 (verde) e Bottom 5 (vermelho)
Barras de dados embutidas
Versão fácil (nativo):

Tabela nativa
Formatação condicional: barra de dados na coluna de valor
Ícones: ↑ (top) ↓ (bottom)
Versão premium (Deneb):

Template de ranking com Deneb Showcase - Ranked List
Adicionar sparkline inline por item
5. Tendência (sparkline curta)
Quando usar: Mostrar tendência de 7/14/30 dias em espaço compacto

Layout:

Linha minimalista (sem eixos, sem rótulos)
Cor única ou gradiente (verde→vermelho)
Tooltip com valores diários
Versão fácil (nativo):

Gráfico de linha nativo
Desabilitar título, eixos, grade, legenda
Tamanho: 100x30px
Versão premium (SVG/DAX):


Sparkline SVG =
// Gerar caminho SVG de linha com CONCATENATEX de últimos 7 dias
// Fonte: https://github.com/devolpferreira/Power-BI_DAX_SVG
6. Tabela de Investigação (colunas essenciais + destaque de exceções)
Quando usar: Drill-through, exportação, análise linha a linha

Layout:

Colunas: Filial, Rota, Data, Pedidos, SPR, ORH, Status
Ícones para flags (⚠️ Overtime, 🚫 Sem Planejado)
Cores alternadas para leitura
Versão fácil (nativo):

Tabela nativa
Formatação condicional por coluna (verde/amarelo/vermelho)
Ícones via campo calculado com Unicode
Versão premium (não necessário):

Nativo já resolve bem (HTML não vale custo de manutenção)
7. Painel de Filtros (compacto e padronizado)
Quando usar: Topo de toda página

Layout:

Horizontal, alinhado à esquerda
Filtros: Data (slicer de intervalo), Filial (dropdown), Tipo Veículo (dropdown)
Botão "Limpar filtros"
Versão fácil (nativo):

Slicers nativos com estilo "Dropdown" ou "Tile"
Agrupados em container com fundo cinza claro
Tamanho: 1/12 da altura da página
Versão premium (não necessário):

Manter nativo (simplicidade > customização)
8. Tooltip "Rico" (tooltip page com mini KPIs e tendência)
Quando usar: Hover em qualquer visual principal

Layout:

Mini-card com 3-4 KPIs (Pedidos, SPR, ORH, Entregas)
Sparkline de 7 dias
Comparativo vs meta
Versão fácil (nativo):

Tooltip page nativa
Conteúdo: 4 cards + 1 sparkline
Tamanho: 300x200px
Exemplo: Power BI Tooltip Pages
Versão premium (Deneb):

Template de tooltip customizado (se precisar de layout mais sofisticado)
C) CHECKLIST DE MELHORIAS RÁPIDAS (aplicar em 1-2h)
Layout & Alinhamento (30 min)
✅ Definir grid de 12 colunas (use guias no Power BI: View → Gridlines → 12)
✅ Alinhar TODOS os visuais ao grid (selecionar tudo → Format → Align)
✅ Padronizar espaçamento entre visuais: 16px (use régua de pixels)
✅ Remover bordas/sombras desnecessárias (Format → Border → Off)
Títulos & Microcopy (20 min)
✅ Padronizar títulos de visuais: fonte Segoe UI, 12pt, bold, cor #1F2937
✅ Adicionar microcopy de ação em cards de alerta (ex: "⚠️ Investigar Rio e SP")
✅ Remover títulos redundantes (se o card diz "Total de Rotas", o título do visual pode ser vazio)
Formatação Numérica & Unidades (15 min)
✅ Padronizar formato de número: "#,##0" (inteiros), "0.0%" (percentuais), "0.0" (decimais)
✅ Adicionar unidade em títulos de medidas (ex: "SPR Ped (ped/rota)", "ORH Tempo (h)")
✅ Usar separador de milhares em todas as medidas (evitar "5000", usar "5,000")
Interação (Cross-Filter vs Highlight) (10 min)
✅ Desabilitar cross-filter em cards de KPI (Edit interactions → None)
✅ Habilitar highlight (não filter) em gráficos de linha/barra (evita filtro agressivo)
✅ Configurar drill-through em tabelas (Add drill-through → página de investigação)
Tooltips & Drill-Through (20 min)
✅ Criar 1 tooltip page padrão com: Filial, Total Rotas, SPR, ORH, % Entregas
✅ Aplicar tooltip page em TODOS os visuais principais (Format → Tooltip → Report page)
Performance Visual (5 min)
✅ Reduzir qtd de visuais por página (máximo 12-15 visuais)
✅ Remover shapes/imagens decorativas desnecessárias (fundo, logos grandes)
✅ Desabilitar animações (File → Options → Report settings → Animations → Off)
D) PLANO DE ITERAÇÃO EM 3 RODADAS
RODADA 1: Padronização Visual (tema, grid, cabeçalho, filtros, cards base)
O que alterar:

Aplicar tema JSON customizado (gerar com PowerBI Theme Templates)
Criar template de cabeçalho padrão (logo + título + filtros)
Substituir 5 cards HTML por cards nativos com formatação condicional
Definir grid 12 colunas e alinhar tudo
Padronizar formatação numérica (aplicar em lote via "Format Painter")
Como validar:

✅ Todos os visuais alinhados ao grid
✅ Tema aplicado (cores consistentes)
✅ Pelo menos 5 cards HTML substituídos por nativos (sem quebra visual)
Prints para revisão:

Screenshot da página "Executivo" antes/depois
Screenshot do painel de filtros (topo)
Lista de medidas formatadas (mostrar FormatString no DAX Studio)
Ideias dos repositórios GitHub (3-5):

1. Tema Base Limpo (Logistics Dashboard)
📦 Repo: Fleet Management Dashboard

O que copiar: Paleta de cores (azul/verde para positivo, vermelho para negativo)

Onde aplicar: Tema JSON do Power BI (View → Themes → Customize Current Theme → Export)

Como implementar:

Baixar PBIX, abrir, exportar tema JSON
Ajustar cores para identidade visual Petlove (roxo/rosa)
Importar em "View → Themes → Browse for themes"
2. Grid de 12 Colunas + Cabeçalho Padrão
📦 Repo: Logistics Performance Dashboard

O que copiar: Layout de cabeçalho (logo + título + 3 filtros horizontais)

Onde aplicar: Topo de todas as páginas

Como implementar:

Criar container com fundo cinza claro (#F9FAFB)
Altura: 80px, largura: 100%
Posição fixa: Y=0, agrupar logo + slicers
3. Card Nativo com Formatação Condicional
📦 Repo: Supply Chain Inventory Dashboard

O que copiar: Cards de KPI com cores de fundo condicionais

Onde aplicar: Página "Torre de Controle" (substituir 5 HTML cards)

Como implementar:

Visual nativo: Card ou Text Box
Formatação condicional: Format → Background color → fx (baseado em KPI Status)
Regra: Verde (#10B981) se "OK", Vermelho (#EF4444) se "Crítico"
4. Slicer Minimalista (Dropdown Compacto)
📦 Repo: Power BI Logistics Dashboard

O que copiar: Estilo de slicer (dropdown, sem borda, fundo branco)

Onde aplicar: Painel de filtros (Data, Filial, Tipo Veículo)

Como implementar:

Slicer → Format → Slicer settings → Style: Dropdown
Format → Background: Branco (#FFFFFF), Border: Off
Tamanho: 200px largura x 40px altura
5. Formatação Numérica em Lote (DAX Studio)
📦 Docs: DAX Variables Best Practices

O que copiar: Script DAX para aplicar FormatString em lote

Onde aplicar: Todas as medidas de 01. Resumo Executivo e 02. SPR

Como implementar:

Conectar DAX Studio ao PBIX
Rodar script para atualizar FormatString de todas as medidas (ex: #,##0 para inteiros)
Salvar e reabrir Power BI
RODADA 2: Torre de Controle (alertas + ranking + drill-through)
O que alterar:

Criar nova página "Torre de Controle" com layout proposto (Painel 1)
Implementar 3 cards de alerta com Deneb (Filiais Críticas, Pior Filial, Alertas Totais)
Criar ranking Top/Bottom 5 Filiais (tabela nativa com barras de dados)
Configurar drill-through page (Investigação)
Adicionar sparklines de tendência 7 dias (nativos, minimalistas)
Como validar:

✅ Página "Torre de Controle" funcional
✅ Drill-through ativado (clicar em Filial → vai para página de investigação)
✅ Alertas destacados visualmente (vermelho/amarelo/verde)
Prints para revisão:

Screenshot da página "Torre de Controle" completa
Screenshot do drill-through em ação
Screenshot de 1 card de alerta Deneb
RODADA 3: Refinamento e Troca Gradual de HTML (SVG/DAX ou Deneb)
O que alterar:

Substituir 10 HTML cards por SVG/DAX (cards premium, mantendo apelo visual)
Implementar bullet charts para Meta vs Real (Deneb ou nativo)
Criar tooltip page padrão e aplicar em todos os visuais
Revisar paleta de cores (garantir contraste WCAG AA)
Testar responsividade (visualizar em mobile layout)
Como validar:

✅ Redução de pelo menos 50% dos HTML cards (substituídos por SVG/Deneb)
✅ Tooltip page funcionando em todos os visuais principais
✅ Contraste de cores validado (usar ferramenta WebAIM)
Prints para revisão:

Screenshot de 3 cards SVG/DAX (antes HTML)
Screenshot de tooltip page (hover)
Report de acessibilidade (contraste de cores)
Próximos Passos
Agora você tem:

✅ Mapa de 8 painéis orientados por perguntas operacionais
✅ Kit de 8 componentes reutilizáveis (versão fácil + premium)
✅ Checklist de 18 melhorias rápidas (aplicar em 1-2h)
✅ Plano de 3 rodadas com ideias concretas dos repositórios GitHub
Como iterar comigo:

Aplique a Rodada 1 (padronização visual)
Me envie prints de:
Página "Executivo" antes/depois
Painel de filtros (topo)
3-5 cards nativos (substituindo HTML)
Eu reviso e proponho ajustes finos
Partimos para Rodada 2 (Torre de Controle)
