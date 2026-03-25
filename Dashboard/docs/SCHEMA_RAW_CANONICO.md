# Schema Raw Canônico

Projeto: Monitoramento Logístico Last-Mile
Data: 2026-03-24
Status: referência canônica para schemas de entrada, parse e normalização

---

## 1. Objetivo

Este documento congela a estrutura dos dados de origem que alimentam o pipeline.

Ele define:

- arquivos fonte aceitos
- colunas esperadas
- tipos lógicos canônicos
- regras obrigatórias de parse
- chaves e relacionamentos de reconciliação

Em caso de divergência entre planilhas, scripts ad hoc e código de consumo, prevalece este documento.

---

## 2. Fontes Oficiais

### 2.1 Monitoramento

- Arquivo: Dashboard/data/Relatorio_Monitoramento_Carga_Completo.csv
- Destino BigQuery: raw_monitoramento
- Chave operacional: Id Carga
- Frequência: carga consolidada do TMS

### 2.2 Planejamento

- Fonte: Google Sheets `1zANDyZMZIdVp22C-RgPw3yu4L97rEJ5XYZnTj0TZDBw` (aba GID `63799993`)
- Extrator: `extraction/extrair_planejamento.py`
- Arquivo intermediário: `Dashboard/data/planejamento_2026.csv`
- Destino BigQuery: raw_planejamento
- Chave operacional: Id Carga (coluna "Lista" na planilha, renomeada no load)
- Filtro: apenas dados do ano 2026
- Frequência: diária (Cloud Run Job, etapa 1/5)
- Autenticação: SA `pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com` (Viewer na planilha)
- Mapeamento de colunas: Cluster→Rota, Data→Data Planejada, Lista→Id Carga

### 2.3 Dimensão de filial

- Arquivo: Dashboard/data/tab_auxiliar/dim_filial.xlsx
- Destino BigQuery: raw_dim_filial
- Chave de negócio principal: Filial normalizada

---

## 3. Regras Gerais de Parse

### 3.1 CSV monitoramento

- Separador: ;
- Encoding de leitura: utf-8-sig
- Decimais: vírgula, convertidos para ponto antes do load
- Datas textuais: padrão brasileiro

### 3.2 CSV planejamento (extraído do Google Sheets)

- Separador: , (vírgula)
- Encoding: utf-8
- Decimais: ponto (já normalizado pelo extrator)
- Datas: formato ISO (YYYY-MM-DD), convertidas de serial Excel pelo extrator
- Tempos: formato HH:MM:SS, convertidos de fração decimal pelo extrator
- Leitura via Google Sheets API: `valueRenderOption=UNFORMATTED_VALUE` + `dateTimeRenderOption=SERIAL_NUMBER` (independente de locale)

### 3.3 Regras obrigatórias

1. Id Carga é o vínculo operacional primário entre monitoramento e planejamento.
2. Nenhum campo raw deve carregar interpretação analítica agregada.
3. Toda normalização textual deve ocorrer por função centralizada.
4. Timestamps brutos em texto devem ser preservados ou convertidos sem perda de rastreabilidade.

---

## 4. Schema Oficial: raw_monitoramento

| Coluna de origem | Nome lógico canônico | Tipo lógico | Regra |
| --- | --- | --- | --- |
| Id Carga | id_carga | inteiro | chave operacional primária |
| status | status_tms | texto | status operacional bruto |
| N° Placa | placa | texto | renomeado no load para N_ Placa por compatibilidade |
| Tipo | tipo_veiculo_raw | texto | canonicalização posterior |
| Motorista | motorista | texto | nome bruto do motorista |
| CPF Motorista | cpf_motorista | texto identificador | normalizar com zero à esquerda |
| Transportador | transportador | texto | nome bruto do parceiro |
| Rota | rota | texto | identificador operacional da rota |
| Filial | filial_raw | texto | normalizar para filial_key |
| dt/ts abertura ou dtabertura | ts_abertura | timestamp | parse brasileiro para ISO quando aplicável |
| Data de carregamento | ts_carregamento | timestamp | parse DD/MM/YYYY HH:MM |
| Quantidade | qtd_pedidos | número | pedidos reais |
| Quantidade Volumes | qtd_volumes | número | volumes reais |
| Entregues | qtd_entregues | número | entregas concluídas |
| Insucessos | qtd_insucessos | número | insucessos operacionais |
| Peso | peso_real_kg | número | peso realizado |
| Km Planejado | km_plan | número | planejamento de km |
| Km Realizado | km_real | número | realizado de km |
| Tempo Planejado | tempo_planejado_raw | duração textual | converter para horas decimais |
| Tempo Realizado | tempo_realizado_raw | número ou duração | normalizar para horas decimais |
| Paradas | qtd_paradas | número | total de paradas |
| Clientes | qtd_clientes | número | clientes atendidos |
| Valor Pagamento Carga | valor_carga | moeda | componente financeiro |
| Valor Pagamento Rota | valor_rota | moeda | componente financeiro |
| Valor Pagamento Parada | valor_parada | moeda | componente financeiro |
| Valor Pagamento Remessas | valor_remessas | moeda | componente financeiro |
| Valor Pagamento Km | valor_km | moeda | componente financeiro |
| Valor Pagamento Ajudante | valor_ajudante | moeda | componente financeiro |
| Alerta | alerta_tms | texto | sinalização do TMS |
| Perfomance | performance_pct_raw | percentual textual | limpar símbolo de % |
| baixas | qtd_baixas | número | baixas registradas |
| referencia | referencia | texto | referência auxiliar |
| Data Atribuição Motorista | ts_atribuicao_motorista | timestamp | início formal da jornada |
| Data Inicio de Rota APP | ts_inicio_rota | timestamp | início no app |
| Primeira Baixa | ts_primeira_baixa | timestamp | primeira baixa registrada |
| Última Baixa | ts_ultima_baixa | timestamp | última baixa registrada |
| Usuário Carregamento | usuario_carregamento | texto | operador responsável |
| Ajudante | ajudante | texto | apoio de rota |

Observação:

- O arquivo histórico pode conter pequenas variações de cabeçalho. A camada de load deve tratá-las sem alterar o significado lógico acima.

---

## 5. Schema Oficial: raw_planejamento

| Coluna de origem | Nome lógico canônico | Tipo lógico | Regra |
| --- | --- | --- | --- |
| Id Carga | id_carga | inteiro | vínculo principal com monitoramento |
| Filial | filial_raw | texto | origem para filial_key |
| Rota | rota_planejada | texto | rota do planejamento |
| Data Planejada | data_planejada | data | data oficial de referência para reconciliação |
| Pedidos | pedidos_plan | número | pedidos planejados |
| Volume | volumes_plan | número | volumes planejados |
| Peso | peso_plan_kg | número | peso planejado |
| Km | km_plan | número | km planejado |
| Tempo de Rota | tempo_plan_h | duração | converter para horas decimais |

Regra de vínculo:

- planning_key técnico = id_carga + filial_key

---

## 6. Schema Oficial: raw_dim_filial

| Coluna de origem | Nome lógico canônico | Tipo lógico | Regra |
| --- | --- | --- | --- |
| CD Origem | cd_origem | texto | identificador externo |
| Tabela | tabela | texto | origem cadastral |
| Filial | filial_nome | texto | rótulo principal da filial |
| Codigo | codigo | inteiro | código da filial |
| Nome Filial | nome_filial | texto | descrição completa |
| Tipo | tipo_filial | texto | unidade ou não-unidade |
| MetaSPR | meta_spr | número | meta local de SPR |
| Regiao | regiao | texto | regionalização |
| Capacidade Volume Dia | capacidade_volume_dia | número | capacidade diária |

Regra adicional:

- Filiais encontradas na execução e ausentes no cadastro devem entrar como Nao-Unidade até saneamento cadastral.

---

## 7. Chaves e Relacionamentos

### 7.1 Chaves primárias lógicas

- Monitoramento: id_carga
- Planejamento: id_carga
- Filial: filial_key

### 7.2 Relacionamentos canônicos

1. monitoramento ↔ planejamento por id_carga, com apoio de filial_key quando necessário
2. monitoramento ↔ dim_filial por filial_key
3. monitoramento ↔ dim_calendario por data_referencia derivada

### 7.3 Regra para motorista

**Chave canônica preferencial:**

```sql
COALESCE(
  NULLIF(TRIM(cpf_motorista), ''),
  normalize_text(motorista)
)
```

**Implementação obrigatória:**

- **Função UDF:** `motorista_key_canonical(cpf STRING, nome STRING)`
  - Localização: `Dashboard/bigquery/_deploy/13_udf_motorista_key_canonical.sql`
  - Criada em: 2026-03-22

- **Coluna derivada:** `motorista_key_canonico`
  - Localização: `base_execucao_canonica`
  - Fórmula: Aplica UDF `motorista_key_canonical(cpf_motorista, motorista)`

- **Uso obrigatório:** TODOS os marts por motorista devem usar `motorista_key_canonico` em GROUP BY
  - `base_execucao_canonica`: usa motorista_key_canonico
  - Qualquer agregação por motorista: deve usar a coluna canonizada

**Validação:**

- Alertar quando > 20% dos registros usam fallback para nome (CPF ausente)
- CPF deve ser tratado com zero à esquerda preservado
- Motoristas com CPF NULL mas nomes diferentes são tratados como motoristas distintos

**Observação:** Esta regra garante que motoristas com mesmo CPF sejam agregados corretamente, mesmo que o nome apareça com pequenas variações (ex: "João Silva" vs "JOAO SILVA").

---

## 8. Regras de Normalização Obrigatórias

1. filial_key = normalize_text(filial_raw)
2. transportador_key = normalize_text(transportador)
3. motorista_key = cpf_motorista quando válido; caso contrário normalize_text(motorista)
4. tipo_veiculo deve passar por canonicalização antes de qualquer análise de capacidade
5. Tempo Realizado em HH:MM deve ser convertido para horas decimais
6. Perfomance textual deve ser convertida para fração 0-1

---

## 9. O que Não É Semântica Raw

Os itens abaixo não pertencem ao schema raw e só podem existir em camadas derivadas:

- score_operacional
- status semafóricos
- ocupação física
- aderência ao planejamento
- DPPH
- SPR

---

## 10. Artefatos Dependentes

Este documento serve de base para:

- Dashboard/docs/CATALOGO_MEDIDAS_CANONICO.md
- Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md
- Dashboard/bigquery/load_raw_to_bq.py
- Dashboard/bigquery/pipeline_v4.sql
