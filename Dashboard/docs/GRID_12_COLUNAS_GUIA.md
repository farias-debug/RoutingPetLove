# Grid 12 Colunas - Guia de Alinhamento

Data: 2026-03-05

## Especificações do Grid

### Dimensões da Página
- **Largura total:** 1280px
- **Altura total:** 720px
- **Colunas:** 12
- **Largura de cada coluna:** 106.67px (1280 / 12)
- **Espaçamento (gutter):** 16px
- **Margem lateral:** 16px

### Cálculo de Posições (X)

| Coluna | Início (x) | Largura Disponível |
|---|---|---|
| 1 | 0 | 106.67px |
| 2 | 106.67 | 106.67px |
| 3 | 213.33 | 106.67px |
| 4 | 320 | 106.67px |
| 5 | 426.67 | 106.67px |
| 6 | 533.33 | 106.67px |
| 7 | 640 | 106.67px |
| 8 | 746.67 | 106.67px |
| 9 | 853.33 | 106.67px |
| 10 | 960 | 106.67px |
| 11 | 1066.67 | 106.67px |
| 12 | 1173.33 | 106.67px |

### Tamanhos Padrão de Visuais

| Largura | Colunas | Pixels | Uso |
|---|---|---|---|
| 1/12 | 1 col | 106.67 | Mini card, ícone |
| 2/12 | 2 cols | 213.33 | Card pequeno |
| 3/12 | 3 cols | 320 | Card médio, slicer |
| 4/12 | 4 cols | 426.67 | Card grande |
| 6/12 | 6 cols | 640 | Gráfico médio |
| 8/12 | 8 cols | 853.33 | Gráfico grande |
| 12/12 | 12 cols | 1280 | Largura completa |

## Layout da Página Executivo (Atualizado)

### Cabeçalho (Y = 0-60px)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Data: 3 cols]    [Filial: 3 cols]    [Tipo Veículo: 3 cols]          │ Y=0, H=60
└─────────────────────────────────────────────────────────────────────────┘
```

### Cards KPI (Y = 80-260px)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Total Pedidos]  [Total Volumes]  [Total Rotas]  [Outros...]           │ Y=80, H=180
│   (3 cols)         (3 cols)         (3 cols)       (3 cols)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comparativo WoW (Y = 280-460px)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    [Comparativo WoW - 8 cols]                           │ Y=280, H=180
└─────────────────────────────────────────────────────────────────────────┘
```

### YTD Resumo (Y = 480-660px)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                      [YTD Resumo - 8 cols]                              │ Y=480, H=180
└─────────────────────────────────────────────────────────────────────────┘
```

## Posições Atualizadas (Executivo)

### Slicers (Cabeçalho)
| Visual | ID | Posição (x, y) | Tamanho (w, h) | Colunas |
|---|---|---|---|---|
| Slicer Data | slicer_data_001 | (0, 0) | (320, 60) | 3 |
| Slicer Filial | slicer_filial_002 | (333.33, 0) | (320, 60) | 3 |
| Slicer Tipo Veículo | slicer_tipo_veiculo_003 | (666.67, 0) | (320, 60) | 3 |

### Cards KPI (Linha 1)
| Visual | ID | Posição (x, y) | Tamanho (w, h) | Colunas |
|---|---|---|---|---|
| Total Pedidos | 342d6a88d8b70e616911 | (0, 80) | (280, 180) | 2.5 (~3) |
| Total Volumes | 2eb1d4ed950e087aa501 | (293.33, 80) | (280, 180) | 2.5 (~3) |
| Total Rotas | 8ff98b48a7762169b82e | (586.67, 80) | (280, 180) | 2.5 (~3) |

### Comparativo WoW
| Visual | ID | Posição (x, y) | Tamanho (w, h) | Colunas |
|---|---|---|---|---|
| Comparativo WoW | 1e581a9cb024044e836b | (0, 280) | (853.33, 180) | 8 |

### YTD Resumo
| Visual | ID | Posição (x, y) | Tamanho (w, h) | Colunas |
|---|---|---|---|---|
| YTD Resumo | 9cb87934163ec6a0ded1 | (0, 480) | (853.33, 180) | 8 |

## Regras de Espaçamento

1. **Espaçamento vertical entre seções:** 20px
2. **Espaçamento horizontal entre cards:** 13.33px (arredondado de 16px para fit 3 cards)
3. **Margem superior do cabeçalho:** 0px
4. **Margem inferior antes dos cards:** 20px

## Checklist de Alinhamento

- [ ] Todos os slicers alinhados no topo (Y=0)
- [ ] Cards KPI em linha horizontal (Y=80)
- [ ] Comparativo WoW centralizado (Y=280)
- [ ] YTD Resumo centralizado (Y=480)
- [ ] Espaçamento consistente entre cards (~13px)
- [ ] Larguras de cards arredondadas para grid

## Próximos Passos

1. Ajustar posições dos cards existentes (já criados)
2. Ajustar larguras para fit exato no grid
3. Validar no Power BI Desktop
4. Ajustar outros visuais restantes (Performance Geral, etc.)
