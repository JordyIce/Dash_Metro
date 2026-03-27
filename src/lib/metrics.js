// ── Formatadores ──────────────────────────────────────────────────────────────
export function fmtBRL(n) {
  return (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
    if (filters.tipoExecucao?.length    && !filters.tipoExecucao.includes(e.tipoExecucao))      return false
    if (filters.statusPagamento?.length && !filters.statusPagamento.includes(e.statusPagamento)) return false

    // Filtro por janela de envio (dateFrom / dateTo)
    // Registros sem janelaEnvio usam dataApontamento como fallback.
    // Se o filtro está ativo e o registro não tem nenhuma das duas datas → excluir.
    const refEnvio = e.janelaEnvio || e.dataApontamento
    if (filters.dateFrom || filters.dateTo) {
      if (!refEnvio)                                       return false
      if (filters.dateFrom && refEnvio < filters.dateFrom) return false
      if (filters.dateTo   && refEnvio > filters.dateTo)   return false
    }

    // Filtro por janela de pagamento (payFrom / payTo)
    // Se o filtro está ativo e o registro não tem janelaPagamento → excluir.
    const refPag = e.janelaPagamento
    if (filters.payFrom || filters.payTo) {
      if (!refPag)                                     return false
      if (filters.payFrom && refPag < filters.payFrom) return false
      if (filters.payTo   && refPag > filters.payTo)   return false
    }

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

// ── SLA ───────────────────────────────────────────────────────────────────────
// Se a data final estiver ausente, usa hoje como fallback.
// Se a data base estiver ausente, retorna null (sem base não há SLA calculável).
const TODAY = new Date().toISOString().slice(0, 10)
function diffDaysOrToday(base, end) {
  if (!base) return null
  return diffDays(base, end || TODAY)
}

export function slaApontamento(e) { return diffDaysOrToday(e.dataEnergizacao, e.dataApontamento) }
export function slaValidacao(e)   { return diffDaysOrToday(e.dataUF,          e.dataUV)          }
export function slaLiquidacao(e)  { return diffDaysOrToday(e.dataApontamento, e.dataLiquidacao)  }
export function slaSetup(e)       { return diffDaysOrToday(e.dataEnergizacao, e.janelaPagamento) }

export function avgSLA(data, fn) {
  const vals = data.map(fn).filter(v => v !== null && v >= 0)
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
      slaSetup:       avgSLA(sub, slaSetup),
      countAp:  sub.filter(e => slaApontamento(e) !== null).length,
      countVal: sub.filter(e => slaValidacao(e)   !== null).length,
      countLiq: sub.filter(e => slaLiquidacao(e)  !== null).length,
      countSet: sub.filter(e => slaSetup(e)       !== null).length,
    }
  })
}

// Distribuição de SLA para histograma
export function slaDistribuicao(data, fn, buckets = [0,7,15,30,60,9999]) {
  const vals = data.map(fn).filter(v => v !== null && v >= 0)
  const labels = ['0-7d', '8-15d', '16-30d', '31-60d', '60d+']
  const counts = new Array(labels.length).fill(0)
  vals.forEach(v => {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (v >= buckets[i] && v < buckets[i+1]) { counts[i]++; break }
    }
  })
  return labels.map((label, i) => ({ label, count: counts[i] }))
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

export function faturamentoPorJanelaPagamento(data) {
  const map = new Map()
  for (const e of data) {
    if (!e.janelaPagamento) continue
    const cur = map.get(e.janelaPagamento) ?? { valorPago: 0, valorApontado: 0 }
    cur.valorPago     += e.valorPago
    cur.valorApontado += e.valorApontado
    map.set(e.janelaPagamento, cur)
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

// Mapeia tipoExecucao para o campo de meta correspondente
const TIPO_META_FIELD = {
  'CONSTRUÇÃO':              'metaConstrucao',
  'PARCIAL':                 'metaParcial',
  'MANUTENÇÃO PREVENTIVA':   'metaManutencaoPreventiva',
  'MANUTENÇÃO PESADA':       'metaManutencaoPesada',
  'MANUTENÇÃO LINHA VIVA':   'metaLinhaViva',
  'MEDIÇÃO GRÁFICA':         'metaMedicaoGrafica',
}

// Retorna o valor de meta correto de um objeto meta dado um filtro de tipos.
// Sem filtro → metaTotal. Um ou mais tipos → soma das metas individuais.
export function metaParaTipos(metaObj, tiposFiltro = []) {
  if (!metaObj) return 0
  if (!tiposFiltro.length) return metaObj.metaTotal ?? 0
  return tiposFiltro.reduce((acc, tipo) => {
    const field = TIPO_META_FIELD[tipo]
    return acc + (field ? (metaObj[field] ?? 0) : 0)
  }, 0)
}

// Soma as metas de todos os meses dentro do intervalo [from, to] (ISO YYYY-MM-DD).
// Se from/to forem vazios, soma todos os meses disponíveis.
// tiposFiltro opcional reduz para a soma das metas individuais dos tipos selecionados.
export function somarMetas(metas, from, to, tiposFiltro = []) {
  if (!metas?.length) return 0
  return metas
    .filter(m => {
      if (from && m.janela < from) return false
      if (to   && m.janela > to)   return false
      return true
    })
    .reduce((acc, m) => acc + metaParaTipos(m, tiposFiltro), 0)
}

export function metaVsReal(data, metas, tiposFiltro = []) {
  const fat     = faturamentoPorJanela(data)
  const metaMap = new Map(metas.map(m => [m.janela, m]))
  return fat.map(f => {
    const metaObj = metaMap.get(f.janela)
    const meta    = metaParaTipos(metaObj, tiposFiltro)
    return { label: f.label, janela: f.janela, real: f.valorPago, meta, pct: meta > 0 ? (f.valorPago / meta) * 100 : 0 }
  })
}

// ── Status ────────────────────────────────────────────────────────────────────
export function statusBreakdown(data) {
  const map = new Map()
  for (const e of data) {
    const s   = e.statusPagamento || 'SEM STATUS'
    const cur = map.get(s) ?? { qtd: 0, valor: 0, valorApontado: 0 }
    cur.qtd           += 1
    cur.valor         += e.valorPago
    cur.valorApontado += e.valorApontado
    map.set(s, cur)
  }
  return [...map.entries()].map(([status, v]) => ({ status, ...v })).sort((a, b) => b.valor - a.valor)
}

// ── Municípios ────────────────────────────────────────────────────────────────
export function topMunicipios(data, n = 10) {
  const map = new Map()
  for (const e of data) {
    if (!e.municipio) continue   // ignora registros sem município
    const cur = map.get(e.municipio) ?? { qtd: 0, valor: 0 }
    cur.qtd   += 1
    cur.valor += e.valorPago
    map.set(e.municipio, cur)
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
