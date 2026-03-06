# 02 — Inventário de Medidas

> 389 medidas em _Medidas. Extraído via DAX (INFO.MEASURES) em 2026-03-06.

## Resumo por Grupo

| Grupo | Subfolders | Medidas | Status |
|-------|-----------|---------|--------|
| 01. Operacao | 6 | ~48 | Core |
| 02. SPR e Performance | 6 | ~73 | Core |
| 03. Jornada e ORH | 2 | ~27 | Core |
| 04. Frota e Capacidade | 4 | ~54 | Core |
| 05. Plano vs Real | 4 | ~19 | Core |
| 06. Shared | 3 | ~66 | Apoio (Temporal, Metas, SVG) |
| 07. Investigacao | 1 | ~22 | Core (drill-through) |
| 90. Legado | 5 | ~44 | Legado (migrar) |
| 98. Suporte | 4 | ~32 | Apoio |
| 99. Backoffice | 1 | ~8 | Baixa prioridade |
| **Total** | **36** | **389** | |

---

## 01. Operacao (48 medidas)

### 01. Volume e Execucao (10)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Total Rotas | Base | Core | Contagem principal |
| Total Pedidos | Base | Core | |
| Total Volumes | Base | Core | |
| Total Peso (kg) | Base | Core | Sem descrição ⚠️ |
| Total KM Realizado | Base | Core | |
| Media KM por Rota | Derivada | Core | |
| Media Pedidos por Rota | Derivada | Core | |
| Media Volumes por Rota | Derivada | Core | |
| Veiculos Ativos | Base | Core | DISTINCTCOUNT placas |
| % Rotas Concluidas | Percentual | Core | Flag Rota Concluida=1 |

### 02. Alertas e Prioridades (5)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Alerta Operacional | Status | Core | Texto concatenado de alertas |
| Alerta Nivel | Status | Core | Nível do alerta |
| Alerta Cor | Format | Core | Cor hex |
| Op Alerta Prioritario | Status | Core | |
| Op Status ORH | Status | Core | 1/0/-1 para formatação |
| Op Status SPR | Status | Core | 1/0/-1 para formatação |

### 03. Ranking e Participacao (12)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Score Operacional | Derivada | Core | Ponderado: SPR 45% + ORH 30% + Cap 25% |
| Score SPR (0-100) | Derivada | Core | Normalizado 0-100 |
| Op Rank Score Filial | Ranking | Core | RANKX dense |
| Op Rank SPR Filial | Ranking | Core | RANKX dense |
| Op Pedidos Filial % | Derivada | Core | Participação % |
| Op Rotas Filial % | Derivada | Core | Participação % |
| Pior Filial SPR Semana | Ranking | Core | |
| Valor Pior Filial SPR Semana | Derivada | Core | |
| Gap% Pior Filial SPR vs Meta | Derivada | Core | |
| Pior Filial ORH Semana | Ranking | Core | |
| Qtd Filiais Abaixo Meta SPR | Derivada | Core | |
| Qtd Filiais Criticas SPR | Derivada | Core | |
| Top 3 Piores Filiais SPR | Ranking | Core | Texto concatenado |

### 04. Medias e Tendencias (7)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Op Dias com Dados | Base | Core | DISTINCTCOUNT datas |
| Op Media Diaria Rotas | Derivada | Core | |
| Op Media Diaria Pedidos | Derivada | Core | |
| Op Media Diaria Volumes | Derivada | Core | |
| Op Media Diaria Peso (kg) | Derivada | Core | |
| Op Media Diaria Performance (%) | Derivada | Core | |
| Op Tendencia SPR | Status | Core | 1/0/-1 |

### 05. Planejado vs Realizado (9)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Op Rotas Planejadas | Base | Core | |
| Op Rotas Realizadas | Base | Core | |
| Op Pedidos Planejados | Base | Core | |
| Op Pedidos Realizados | Base | Core | |
| Op Volumes Planejados | Base | Core | |
| Op Volumes Realizados | Base | Core | |
| Op Progresso Rotas (%) | Derivada | Core | |
| Op Progresso Pedidos (%) | Derivada | Core | |
| Op Progresso Volumes (%) | Derivada | Core | |

### 06. Status de Rota (5)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Op Rotas Aguardando Aceite | Base | Core | |
| Op Rotas Carregadas | Base | Core | |
| Op Rotas Finalizadas | Base | Core | |
| Op Rotas Nao Planejadas | Base | Core | |
| Op Rotas Sem Tempo | Base | Core | |

---

## 02. SPR e Performance (73 medidas)

### 01. SPR Base (15)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Total Rotas Unidade | Base | Core | Filtrado para filiais Unidade |
| Total Pedidos Unidade | Base | Core | |
| Total Volumes Unidade | Base | Core | |
| SPR Ped Realizado | Derivada | Core | Pedidos/Rotas (Unidade) |
| SPR Vol Realizado | Derivada | Core | |
| SPR Peso Realizado (kg/rota) | Derivada | Core | |
| SPR KM Realizado (km/rota) | Derivada | Core | |
| SPR Ped Planejado | Derivada | Core | Fonte: fato_planejado |
| SPR Vol Planejado | Derivada | Core | |
| SPR Peso Planejado (kg/rota) | Derivada | Core | |
| SPR KM Planejado (km/rota) | Derivada | Core | |
| Gap SPR vs Meta (pts) | Variação | Core | Real - Meta |
| Desvio SPR Ped Plan vs Real (pts) | Variação | Core | |
| Desvio SPR Vol Plan vs Real (pts) | Variação | Core | |

### 02. Produtividade Hora (10)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Pedidos/h Planejado | Derivada | Core | |
| Pedidos/h Realizado | Derivada | Core | |
| Volumes/h Planejado | Derivada | Core | |
| Volumes/h Realizado | Derivada | Core | |
| Peso/h Planejado (kg/h) | Derivada | Core | |
| Peso/h Realizado (kg/h) | Derivada | Core | |
| Entregas Efetivas/h | Derivada | Core | |
| Desvio Pedidos/h | Variação | Core | |
| Desvio Volumes/h | Variação | Core | |
| Desvio Peso/h | Variação | Core | |

### 03. Eficiencia KM (6)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Pedidos/KM Planejado | Derivada | Core | |
| Pedidos/KM Realizado | Derivada | Core | |
| Volumes/KM Realizado | Derivada | Core | |
| Peso/KM Realizado (kg/km) | Derivada | Core | |
| Desvio Pedidos/KM | Variação | Core | |
| Eficiencia KM (%) | Derivada | Core | Plan/Real ratio |

### 04. KPI SPR Pedidos (14)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| KPI SPR Ped Valor | KPI | Core | |
| KPI SPR Ped Meta | KPI | Core | |
| KPI SPR Ped Delta | KPI | Core | |
| KPI SPR Ped Delta% | KPI | Core | |
| KPI SPR Ped Status | KPI | Core | Semáforo |
| KPI SPR Ped Cor | Format | Core | Hex |
| KPI SPR Ped Icone | Format | Core | Direcional |
| KPI SPR Ped Texto Card | Format | Core | Concatenado |
| KPI SPR Ped Acao | Alerta | Core | Microcopy |
| KPI SPR Ped Origem Meta | Meta | Core | |
| KPI SPR Ped Status Codigo | Format | Core | |
| KPI SPR Ped Status Texto | Format | Core | |
| KPI SPR Ped Trend D-1 | Temporal | Core | |
| KPI SPR Ped Trend WoW | Temporal | Core | |

### 05. KPI SPR Volumes (14)

Mesma estrutura do pack SPR Pedidos. 14 medidas com pattern: Valor, Meta, Delta, Delta%, Status, Cor, Icone, Texto Card, Acao, Origem Meta, Status Codigo, Status Texto, Trend D-1, Trend WoW.

### 06. KPI Desvio SPR (14)

Mesma estrutura. Foco no desvio entre planejado e realizado.

---

## 03. Jornada e ORH (27 medidas)

### 01. ORH e Jornada (13)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Tempo Medio Planejado (h) | Base | Core | |
| Tempo Medio Realizado (h) | Base | Core | |
| Utilizacao Jornada 8h (%) | Derivada | Core | |
| Ociosidade Jornada 8h (%) | Derivada | Core | |
| Gap ORH vs Meta (h) | Variação | Core | |
| Horas Ociosas Totais | Base | Core | |
| % Rotas Curtas (<4h) | Derivada | Core | |
| % Rotas Overtime (>8h) | Derivada | Core | |
| Potencial Consolidacao (rotas) | Derivada | Core | 2-a-2 |
| Economia Potencial (h) | Derivada | Core | 50% ocioso |
| Status ORH | Status | Core | Semáforo |
| Total Rotas ORH Base | Base | Core | Sem descrição ⚠️ |
| Total Rotas ORH Planejado Base | Base | Core | Sem descrição ⚠️ |

### 02. KPI ORH (14)

Pattern KPI completo (14 medidas).

---

## 04. Frota e Capacidade (54 medidas)

### 01. Referencia de Capacidade (8)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Cap P75 Pedidos | Base | Core | Da dim_tipo_veiculo |
| Cap P75 Volumes | Base | Core | |
| Cap P75 Peso (kg) | Base | Core | |
| Cap P75 KM | Base | Core | Percentil 75 histórico |
| Cap P75 Tempo (h) | Base | Core | |
| Cap Media Pedidos | Base | Core | |
| Cap Media Volumes | Base | Core | |
| Cap Media Peso (kg) | Base | Core | |

### 02. Ocupacao Geral (12)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Ocupacao Pedidos (%) | Derivada | Core | Atual/P75 |
| Ocupacao Volumes (%) | Derivada | Core | |
| Ocupacao Composta (%) | Derivada | Core | |
| Ocupacao Pedidos Semana Atual (%) | Temporal | Core | |
| Ocupacao Volumes Semana Atual (%) | Temporal | Core | |
| Rotas Acima Cap Pedidos | Base | Core | |
| % Rotas Acima Cap | Derivada | Core | |
| Rotas por Veiculo Dia | Derivada | Core | |
| Status Capacidade | Status | Core | Semáforo |
| Status Capacidade Cor | Format | Core | |
| Status Capacidade Texto | Format | Core | |
| Acao Capacidade | Alerta | Core | |

### 03. Mix por Tipo (7)

| Medida | Tipo | Status | Observação |
|--------|------|--------|------------|
| Ocupacao Pedidos Tipo (%) | Derivada | Core | Por tipo veículo |
| Ocupacao Volumes Tipo (%) | Derivada | Core | |
| % Rotas Acima Cap Volumes | Derivada | Core | |
| Rotas Acima Cap Volumes | Base | Core | |
| Excesso Medio Pedidos (acima P75) | Derivada | Core | |
| Excesso Medio Volumes (acima P75) | Derivada | Core | |
| Tipo Veiculo Critico Ocupacao | Ranking | Core | |

### 04. Filial e Semana (27)

Medidas de capacidade agregadas por filial e semana: Capacidade (Pedidos, Volumes, Peso, Veículos) × (Dia Total, Semana) + Gap × dimensões + Ocupação Filial (Pedidos, Volumes, Peso, Veículos, Composta) + Status + Ação.

---

## 05. Plano vs Real (19 medidas)

### 01. Desvios Absolutos (5)

Pedidos, Volumes, Peso, KM, Tempo — todos real - planejado.

### 02. Aderencia Percentual (5)

Pedidos, Volumes, Peso, KM, Tempo — todos real / planejado.

### 03. Cobertura e Match (5)

Cobertura Rotas (%), % Match Mesmo Dia, % Match D+/-1, % Sem Planejado, % Fora Janela D+/-1.

### 04. Contexto de Execucao (4)

Gap Medio Plan vs Real (dias), Performance Media (%), % Rotas com Ajudante, KM Total Planejado.

---

## 06. Shared (66 medidas)

### 01. Temporal (41)

Variações D-1 (8), WoW (9), MoM (6), MA7 (5), YTD (5), Semanas (6), Performance Semana (2).

### 02. Metas (8)

SPR: Meta Global Ped/Vol (Real/Plan), Meta Global Desvio Ped/Vol, Meta SPR Pedidos (filial).
ORH: Meta ORH Tempo (h).

### 03. SVG Cards (17) ⚠️

| Medida | Status | Observação |
|--------|--------|------------|
| SVG Card SPR Ped | Reavaliar | Erros reportados |
| SVG Card SPR Vol | Reavaliar | |
| SVG Card Total Rotas | Reavaliar | |
| SVG Card Total Pedidos | Reavaliar | |
| SVG Card Rotas Planejadas | Reavaliar | |
| SVG Card Rotas Realizadas | Reavaliar | |
| SVG Card ORH | Reavaliar | |
| SVG Card Eficiencia KM | Reavaliar | |
| SVG Card Pedidos Hora | Reavaliar | |
| SVG Card Score Operacional | Reavaliar | |
| SVG Card Ocupacao Composta | Reavaliar | |
| SVG Card Capacidade | Reavaliar | |
| SVG Card Capacidade Pedidos | Reavaliar | |
| SVG Card Capacidade Volumes | Reavaliar | |
| SVG Card Capacidade Peso | Reavaliar | |
| SVG Card Capacidade Veiculos | Reavaliar | |
| SVG Strip Alerta Operacional | Reavaliar | |

---

## 07. Investigacao (22 medidas)

### 01. Linha Operacional

22 medidas com prefixo `TblExp` — funcionam no nível de linha (row-level) para tabelas de investigação drill-through. Incluem: SPR Plan/Real linha, Delta Plan x Real (KM, Pedidos, Volumes, Tempo), Flags (Acima Capacidade, Overtime, Fora D+/-1, Rota Não Planejada, Sem Tempo), % Entregas/Insucessos, Aderência, Tags Operacionais, etc.

---

## 90. Legado HTML (44 medidas)

### Cards (34)

Cards HTML usando Baloo 2 font, SVG inline, hover, fadeIn. **Todos candidatos a migração.**

Principais: SPR Ped/Vol/KM/Peso, Entregas, ORH, Alerta, Total Rotas/Pedidos/Volumes/KM/Peso/Veículos, Desvio SPR, Produtividade, Eficiência KM, Capacidade, Ocupação Frota, Status Frota, Variação Diária, Comparativo Semanal, MoM Resumo, YTD Resumo, Semana Resumo, Filial Spotlight, Performance Geral, Progresso Metas, Reconciliação, Consolidação, Aderência Radar, Alerta Filiais, SPR Plan vs Real.

### Rankings (4)

SPR Semana, Entregas Semana, ORH Semana, Rotas Críticas Semana.

### Tabelas (2)

Filiais Consolidado Semana, Ocupação Tipo Veículo Semana.

### Gráficos (3)

Barras Filial Semana, Tendência Mensal, Tendência Semanal.

### Torre (1)

Torre Controle Operacional.

---

## 98. Suporte (32 medidas)

### 01. Entrega (7)
Base de entregas: Total Entregas/Insucessos, % Entregas Efetivas, % Insucessos, % Baixas/Pedidos, Taxa Insucesso/Sucesso MA7.

### 02. KPI Entrega (14)
Pattern KPI completo (14 medidas).

### 03. Metas Entrega (2)
Meta Global % Entregas, Meta Filial Entrega.

### 04. Entrega Operacional (9)
Rankings, status, scores, tendência, pior filial — específicos de entregas.

---

## 99. Backoffice (8 medidas)

### 01. Nao Publicavel

SLA Ciclo P50/P90, % Rotas Sem Data Final, Tempo Medio Ciclo, Custo por Rota/Pedido/KM/Entrega Efetiva.

**Status**: Sem descrição em nenhuma. Podem ser removidas sem impacto no core.

---

## Análise de Padrões

### KPI Pattern (4 packs × 14 = 56 medidas)

Cada KPI pack segue: Valor, Meta, Delta, Delta%, Status, Cor, Icone, Texto Card, Acao, Origem Meta, Status Codigo, Status Texto, Trend D-1, Trend WoW.

Packs: SPR Pedidos, SPR Volumes, Desvio SPR, Entregas (em 98. Suporte), ORH.

### Medidas sem descrição

~40 medidas sem campo `description`. Concentradas em:
- 04. Frota e Capacidade\04. Filial e Semana (27)
- 01. Operacao (vários itens novos)
- 99. Backoffice (8)

### Medidas candidatas a consolidação

- `Total Peso (kg)` em 01. Operacao vs medidas de peso em outros grupos — verificar se é a mesma base
- Variações D-1/WoW/MoM em 06. Temporal — volume alto (23 medidas). Avaliar se todas são usadas em visuais
