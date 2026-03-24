// ── Formatadores ──────────────────────────────────────────────────────────────
export function fmtBRL(n) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s + 'T00:00:00')
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function toDate(s) {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export function diffDays(a, b) {
  const da = toDate(a), db = toDate(b)
  if (!da || !db) return null
  return Math.round(Math.abs(db - da) / 86_400_000)
}

// ── Filtros ───────────────────────────────────────────────────────────────────
export function applyFilters(data, filters) {
  return data.filter(e => {
    if (filters.tipoExecucao?.length   && !filters.tipoExecucao.includes(e.tipoExecucao))     return false
    if (filters.statusPagamento?.length && !filters.statusPagamento.includes(e.statusPagamento)) return false
    if (filters.janelaEnvio?.length    && !filters.janelaEnvio.includes(e.janelaEnvio))       return false
    if (filters.janelaPagamento?.length && !filters.janelaPagamento.includes(e.janelaPagamento)) return false
    return true
  })
}

// ── Agregações ────────────────────────────────────────────────────────────────
export function sumField(data, field) {
  return data.reduce((acc, e) => acc + (e[field] ?? 0), 0)
}

export function groupBy(data, key, valueKey) {
  const map = new Map()
  for (const e of data) {
    const k = e[key] || 'N/A'
    map.set(k, (map.get(k) ?? 0) + (e[valueKey] ?? 0))
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

export function groupByCount(data, key) {
  const map = new Map()
  for (const e of data) {
    const k = e[key] || 'N/A'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

// ── SLA ───────────────────────────────────────────────────────────────────────
export function slaApontamento(e) { return diffDays(e.dataEnergizacao, e.dataApontamento) }
export function slaValidacao(e)   { return diffDays(e.janelaEnvio,     e.janelaPagamento) }
export function slaLiquidacao(e)  { return diffDays(e.dataApontamento, e.dataLiquidacao)  }

export function avgSLA(data, fn) {
  const vals = data.map(fn).filter(v => v !== null)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function slaPorTipo(data) {
  const tipos = [...new Set(data.map(e => e.tipoExecucao))]
  return tipos.map(tipo => {
    const sub = data.filter(e => e.tipoExecucao === tipo)
    return {
      tipo,
      slaApontamento: avgSLA(sub, slaApontamento),
      slaValidacao:   avgSLA(sub, slaValidacao),
      slaLiquidacao:  avgSLA(sub, slaLiquidacao),
    }
  })
}

// ── Faturamento ───────────────────────────────────────────────────────────────
export function faturamentoPorJanela(data) {
  const map = new Map()
  for (const e of data) {
    if (!e.janelaEnvio) continue
    const cur = map.get(e.janelaEnvio) ?? { valorPago: 0, valorApontado: 0 }
    cur.valorPago     += e.valorPago
    cur.valorApontado += e.valorApontado
    map.set(e.janelaEnvio, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([janela, v]) => ({ janela, label: fmtDate(janela), ...v }))
}

export function acumuladoFaturamento(data) {
  const fat = faturamentoPorJanela(data)
  let acc = 0
  return fat.map(f => { acc += f.valorPago; return { label: f.label, acumulado: acc } })
}

export function metaVsReal(data, metas) {
  const fat    = faturamentoPorJanela(data)
  const metaMap = new Map(metas.map(m => [m.janela, m.metaTotal]))
  return fat.map(f => {
    const meta = metaMap.get(f.janela) ?? 0
    return { label: f.label, janela: f.janela, real: f.valorPago, meta, pct: meta > 0 ? (f.valorPago / meta) * 100 : 0 }
  })
}

// ── Status ────────────────────────────────────────────────────────────────────
export function statusBreakdown(data) {
  const map = new Map()
  for (const e of data) {
    const s   = e.statusPagamento || 'SEM STATUS'
    const cur = map.get(s) ?? { qtd: 0, valor: 0 }
    cur.qtd   += 1
    cur.valor += e.valorPago
    map.set(s, cur)
  }
  return [...map.entries()].map(([status, v]) => ({ status, ...v })).sort((a, b) => b.valor - a.valor)
}

// ── Municípios ────────────────────────────────────────────────────────────────
export function topMunicipios(data, n = 10) {
  const map = new Map()
  for (const e of data) {
    const m   = e.municipio || 'N/A'
    const cur = map.get(m) ?? { qtd: 0, valor: 0 }
    cur.qtd   += 1
    cur.valor += e.valorPago
    map.set(m, cur)
  }
  return [...map.entries()]
    .map(([municipio, v]) => ({ municipio, ...v }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n)
}

// ── Desvios ───────────────────────────────────────────────────────────────────
export function desvioApontadoVsPago(e) {
  if (!e.valorApontado) return null
  return ((e.valorPago - e.valorApontado) / e.valorApontado) * 100
}
export function desvioOrcadoVsPago(e) {
  if (!e.valorOrcado) return null
  return ((e.valorPago - e.valorOrcado) / e.valorOrcado) * 100
}
export function avgDesvio(data, fn) {
  const vals = data.map(fn).filter(v => v !== null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
