# Wireframe - E-mail Diario

## Objetivo

Desenhar a hierarquia visual do e-mail executivo sem depender ainda do HTML final.

## Estrutura

```text
+------------------------------------------------------------+
| Petlove                                                    |
| Resumo Executivo Diario                                    |
| Fechamento operacional de 25/03                            |
| Base comparavel ate 25/03                                  |
+------------------------------------------------------------+
| Score operacional | Entrega efetiva | Rotas | Alertas crit |
| 16,7              | 89,1%           | 356   | 1.209        |
| vs D-1 -16,6 pts  | vs D-1 +0,6 pp  | -16   | overtime+EC  |
+------------------------------------------------------------+
| Riscos do dia                                              |
| [Overtime 245] [Nao planejadas 15] [Entrega critica 1209] |
+------------------------------------------------------------+
| Foco do dia                                                |
| 01-Sao Paulo puxando queda de score e desvio de tempo.     |
| Acao sugerida: abrir investigacao operacional.             |
+------------------------------------------------------------+
| Abrir dashboard                                            |
+------------------------------------------------------------+
```

## Regras de layout

- largura 600 a 640 px
- 24 px de padding lateral
- cards com borda leve e sombra muito discreta
- uma unica coluna em mobile
- CTA em botao unico

## Ordem visual

1. marca
2. data base
3. 4 KPIs
4. 3 riscos
5. foco do dia
6. CTA

## Tokens sugeridos

- cor base: aproveitar a paleta do shell atual, mas reduzir peso do roxo
- fundo: branco ou cinza muito claro
- texto primario: azul escuro
- alertas: warning e danger com uso pontual

## Modulos reutilizaveis do front atual

- hero simplificado inspirado em `PageHeroAnalitico`
- cards inspirados em `KPICard`
- variacoes curtas inspiradas em `VariationCards`

## Nao usar no e-mail

- graficos com muitos eixos
- tabelas longas
- mais de uma CTA primaria
- textos explicativos extensos
