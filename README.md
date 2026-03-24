# BeQ Dashboard — Faturamento de Obras

Dashboard executivo da BeQ Metropolitana. Consome dados em tempo real do Google Sheets via CSV público.

## Stack
- **Vite + React 18**
- **Recharts** para gráficos
- **Vercel Serverless Function** (`/api/sheets.js`) para buscar e normalizar os dados

## Rodar localmente

```bash
npm install
npm run dev
```

> Para testar a API local, use `vercel dev` (requer Vercel CLI instalado).

## Deploy na Vercel

1. Crie um repositório no GitHub e suba este projeto
2. Entre em [vercel.com](https://vercel.com) → New Project → importe o repo
3. Clique em **Deploy** — zero configuração necessária

## Estrutura

```
api/
  sheets.js          ← Serverless function: busca e normaliza as 6 abas
src/
  context/
    DataContext.jsx  ← Estado global + fetch + filtros
  lib/
    metrics.js       ← Cálculos: SLA, faturamento, desvios
    constants.js     ← Cores e constantes
  components/
    Sidebar.jsx      ← Navegação lateral
    UI.jsx           ← KPICard, ChartCard, FilterBar, SLAFarol, etc.
  pages/
    Executivo.jsx    ← KPIs + faturamento + status + municípios
    Faturamento.jsx  ← Evolução + curva acumulada + vs meta
    SLA.jsx          ← Faróis + radar + comparativo por tipo
    Pagamento.jsx    ← Status + desvios + gargalos
  App.jsx            ← Router
  main.jsx           ← Entry point
index.html
vite.config.js
vercel.json
```

## Requisito: planilha pública

A planilha deve estar com acesso:
> **Qualquer pessoa com o link → Visualizador**
