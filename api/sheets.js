const SHEET_ID = '1HfQ2zj0De6gtFS39z-VR8ZCgRjcK5umusRnG_aYbh_4'

const ABAS = [
  { nome: 'PARCIAL',               tipo: 'parcial'    },
  { nome: 'MANUTENÇÃO PREVENTIVA', tipo: 'manutencao' },
  { nome: 'MANUTENÇÃO PESADA',     tipo: 'manutencao' },
  { nome: 'MANUTENÇÃO LINHA VIVA', tipo: 'manutencao' },
  { nome: 'MEDIÇÃO GRÁFICA',       tipo: 'manutencao' },
]
const NOME_META = 'META FATURAMENTO'

// ── CSV ─────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else { inQ = !inQ } }
    else if (c === ',' && !inQ) { result.push(cur); cur = '' }
    else { cur += c }
  }
  result.push(cur)
  return result
}

function normKey(s) {
  return s.replace(/^\uFEFF/, '').replace(/\u00A0/g, ' ').trim().normalize('NFC').toUpperCase()
}

function detectHeaderRow(lines) {
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const u = lines[i].toUpperCase()
    if (u.includes('TIPO DE') || u.includes('JANELA') || u.includes('STATUS') || u.includes('REGIONAL')) return i
  }
  return 0
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.replace(/\r$/, ''))
  const hi = detectHeaderRow(lines)
  if (lines.length <= hi) return []
  const headers = parseCSVLine(lines[hi]).map(h => normKey(h))
  const rows = []
  for (let i = hi + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = parseCSVLine(line)
    if (vals.every(v => !v.trim())) continue
    const obj = {}
    headers.forEach((h, idx) => { if (h) obj[h] = (vals[idx] ?? '').trim() })
    rows.push(obj)
  }
  return rows
}

// ── Field lookup (case-insensitive, accent-tolerant) ────────────────────
function get(row, ...keys) {
  for (const k of keys) {
    const nk = normKey(k)
    if (row[nk] !== undefined && row[nk] !== '') return row[nk]
  }
  return ''
}

// ── Number parsers ───────────────────────────────────────────────────────
function parseBRL(s) {
  if (!s || s === '-') return 0
  let v = s.replace(/R\$\s*/gi, '').replace(/['"]/g, '').trim()
  if (!v) return 0
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.')
  } else {
    const dots = (v.match(/\./g) || []).length
    if (dots > 1) v = v.replace(/\./g, '')
    else if (dots === 1) {
      const [, dec] = v.split('.')
      if (dec && dec.length === 3) v = v.replace('.', '')
    }
  }
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function parseNum(s) {
  if (!s) return 0
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseDate(s) {
  if (!s || s === '-') return null
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

// ── Normalizers ──────────────────────────────────────────────────────────
function normalizeParcial(row, idx) {
  const sgm = get(row, 'LCL/OS', 'SGM', 'LCL / OS', 'OS', 'LCL')
  const ot  = get(row, 'OT')
  const id  = sgm || ot
  if (!id) return null
  const status = get(row, 'STATUS PAGAMENTO', 'STATUS')
  if (!status) return null
  return {
    _id: `PARCIAL-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao:   get(row, 'TIPO DE EXECUÇÃO', 'TIPO DE EXECUCAO') || 'PARCIAL',
    regional:       get(row, 'REGIONAL'),
    municipio:      get(row, 'MUNICÍPIO', 'MUNICIPIO', 'MUNICPIO'),
    sistema:        get(row, 'SISTEMA'),
    workflowStatus: get(row, 'TAREFA', 'ESTADO'),
    dataEnergizacao: null,
    dataApontamento: parseDate(get(row, 'DATA DE ENVIO')),
    dataUF:          parseDate(get(row, 'DATA DE VALIDAÇÃO', 'DATA DE VALIDACAO')),
    dataUV:          null,
    dataLiquidacao:  null,
    janelaEnvio:     parseDate(get(row, 'JANELA DE ENVIO')),
    janelaPagamento: parseDate(get(row, 'JANELA DE PAGAMENTO')),
    valorOrcado:    0,
    valorApontado:  parseBRL(get(row, 'VALOR APONTADO')),
    valorPago:      parseBRL(get(row, 'VALOR PAGO')),
    qtdPoste: 0, qtdKLC: 0,
    statusPagamento: status, fonte: 'PARCIAL',
  }
}

function normalizeManutencao(row, fonte, idx) {
  const sgm = get(row, 'SGM')
  const ot  = get(row, 'OT', 'N° INCIDÊNCIA', 'N. INCIDENCIA', 'N° INCIDENCIA', 'INCIDÊNCIA', 'INCIDENCIA')
  const id  = sgm || ot
  if (!id) return null
  const status = get(row, 'STATUS PAGAMENTO', 'STATUS')
  if (!status) return null
  return {
    _id: `${fonte}-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao:   get(row, 'TIPO DE EXECUÇÃO', 'TIPO DE EXECUCAO') || fonte,
    regional:       get(row, 'REGIONAL'),
    municipio:      get(row, 'MUNICÍPIO', 'MUNICIPIO', 'MUNICPIO'),
    sistema:        get(row, 'SISTEMA'),
    workflowStatus: get(row, 'ESTADO'),
    dataEnergizacao: parseDate(get(row, 'DATA DE ENERGIZAÇÃO', 'DATA DE ENERGIZACAO')),
    dataApontamento: parseDate(get(row, 'DATA DO APONTAMENTO', 'DATA DE APONTAMENTO')),
    dataUF:          parseDate(get(row, 'DATA DE UF')),
    dataUV:          parseDate(get(row, 'DATA DE UV')),
    dataLiquidacao:  parseDate(get(row, 'DATA DA LIQUIDAÇÃO', 'DATA DA LIQUIDACAO')),
    janelaEnvio:     parseDate(get(row, 'JANELA DE ENVIO')),
    janelaPagamento: parseDate(get(row, 'JANELA DE PAGAMENTO')),
    valorOrcado:    parseBRL(get(row, 'VALOR ORÇADO', 'VALOR ORCADO')),
    valorApontado:  parseBRL(get(row, 'VALOR APONTADO')),
    valorPago:      parseBRL(get(row, 'VALOR PAGO')),
    qtdPoste: parseNum(get(row, 'QUANTIDADE POSTE', 'QTD POSTE')),
    qtdKLC:   parseNum(get(row, 'QUANTIDADE KLC',   'QTD KLC')),
    statusPagamento: status, fonte,
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  const r = await fetch(url, { headers: { Accept: 'text/csv,text/plain,*/*' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// ── Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ?debug=1 → inspeciona CSV cru das abas
  if (req.query?.debug === '1') {
    const out = {}
    for (const aba of [...ABAS, { nome: NOME_META }]) {
      try {
        const csv   = await fetchSheet(aba.nome)
        const lines = csv.split('\n').slice(0, 4)
        const rows  = parseCSV(csv).slice(0, 2)
        out[aba.nome] = { firstLines: lines, keys: rows[0] ? Object.keys(rows[0]) : [], sample: rows[0] }
      } catch (e) {
        out[aba.nome] = { error: e.message }
      }
    }
    return res.status(200).json(out)
  }

  const execucoes = [], metas = [], errors = [], counts = {}

  for (const aba of ABAS) {
    try {
      const csv  = await fetchSheet(aba.nome)
      const rows = parseCSV(csv)
      let n = 0
      rows.forEach((row, i) => {
        const e = aba.tipo === 'parcial'
          ? normalizeParcial(row, i)
          : normalizeManutencao(row, aba.nome, i)
        if (e) { execucoes.push(e); n++ }
      })
      counts[aba.nome] = { csvRows: rows.length, loaded: n }
    } catch (err) {
      errors.push(`${aba.nome}: ${err.message}`)
      counts[aba.nome] = { error: err.message }
    }
  }

  try {
    const csv  = await fetchSheet(NOME_META)
    const rows = parseCSV(csv)
    rows.forEach(row => {
      const janela = parseDate(get(row, 'JANELA'))
      if (!janela) return
      metas.push({
        janela,
        metaManutencaoPreventiva: parseBRL(get(row, 'META MANUTENÇÃO PREVENTIVA', 'META MANUTENCAO PREVENTIVA')),
        metaConstrucao:           parseBRL(get(row, 'META CONSTRUÇÃO', 'META CONSTRUCAO')),
        metaTotal:                parseBRL(get(row, 'META TOTAL')),
      })
    })
    counts[NOME_META] = { loaded: metas.length }
  } catch (err) {
    errors.push(`META FATURAMENTO: ${err.message}`)
  }

  return res.status(200).json({
    execucoes, metas,
    lastUpdated: new Date().toISOString(),
    counts,
    ...(errors.length > 0 && { errors }),
  })
}
