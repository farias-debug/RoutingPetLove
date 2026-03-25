# Plano de Implementacao - E-mail Diario

## Objetivo

Transformar o blueprint em um fluxo real de reporte por e-mail, sem dependencia de WhatsApp.

## Entregas tecnicas

### 1. Adapter de resumo diario

Criar um adapter que consome os endpoints canonicamente disponiveis e monta o payload final do e-mail.

Entradas sugeridas:

- `/api/kpi-diario`
- `/api/alertas/contagem`
- `/api/filiais/performance`

Saida:

- `ResumoExecutivoDiario` conforme `resumo_executivo_diario.schema.json`

### 2. Renderer HTML

Criar um renderer que recebe o payload e devolve:

- `subject`
- `preheader`
- `html`
- `text`

### 3. Orquestracao diaria

Fluxo sugerido:

```text
agendador -> coleta dados -> monta payload -> gera HTML -> envia e-mail
```

## Regras da v1

- um unico layout
- sem segmentos por diretoria
- sem charts
- sem mais de 4 KPIs
- sem metricas de peso no topo

## Sugestao de stack

### Opcao simples

- Node.js ou Python para montar payload
- HTML responsivo em template proprio
- envio SMTP ou provedor transacional

### Opcao integrada ao repo

- adapter em `Dashboard/api` ou `Dashboard/scripts`
- templates documentados em `Dashboard/docs/resumo_executivo_diario`
- scheduler externo ou script manual ate validar o formato

## Checklist de rollout

1. validar copy com stakeholders
2. validar semantica dos 4 KPIs
3. validar visual em desktop e mobile
4. validar assunto e preheader
5. validar lista inicial de destinatarios
6. enviar piloto interno
7. ajustar antes de automatizar

## Comandos iniciais

Renderizar o exemplo estatico:

```bash
npm --prefix Dashboard run report:email:render:example
```

Gerar payload real a partir da API local:

```bash
npm --prefix Dashboard run report:email:payload:api
```

Gerar payload + HTML + texto em uma passada:

```bash
npm --prefix Dashboard run report:email:api
```

Enviar por SMTP:

```bash
npm --prefix Dashboard run report:email:send
```

Configurar antes:

- copiar `Dashboard/.env.report.example`
- preencher `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- confirmar `REPORT_EMAIL_TO=lucas.batista@petlove.com.br`
