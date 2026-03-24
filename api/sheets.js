const SHEET_ID = '1HfQ2zj0De6gtFS39z-VR8ZCgRjcK5umusRnG_aYbh_4'

// ── CSV parser ────────────────────────────────────────────────────────────────
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

function parseCSVRaw(text) {
  return text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim())
    .map(parseCSVLine)
    .map(row => {
      const trimmed = row.map(v => v.trim())
      // Pad to 39 columns so trailing empty cells never cause index misses
      while (trimmed.length < 39) trimmed.push('')
      return trimmed
    })
}

// ── Value helpers ─────────────────────────────────────────────────────────────
function parseBRL(s) {
  if (!s || s === '-') return 0
  let v = s.replace(/R\$\s*/gi, '').replace(/['"]/g, '').trim()
  if (!v) return 0
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.')
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

// ── Normalizers (posicionais) ─────────────────────────────────────────────────

// PARCIAL (20 colunas):
// [0]TIPO [1]REGIONAL [2]LCL/OS [3]OT [4]SISTEMA [5]MUNICÍPIO [6]ESTADO
// [11]DATA_ENVIO [12]VL_APONTADO [13]DATA_VALIDACAO [14]JANELA_ENVIO
// [15]VL_PAGO [17]JANELA_PAG [19]STATUS
function normalizeParcial(row, idx) {
  const sgm = row[2], ot = row[3], id = sgm || ot || `PARCIAL-IDX-${idx}`
  const status = row[19]
  if (!status) return null
  return {
    _id: `PARCIAL-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao: row[0] || 'PARCIAL',
    regional: row[1] || '', municipio: row[5] || '', sistema: row[4] || '',
    workflowStatus: row[6] || '',
    dataEnergizacao: null,
    dataApontamento: parseDate(row[11]),
    dataUF:          parseDate(row[13]),
    dataUV:          null, dataLiquidacao: null,
    janelaEnvio:     parseDate(row[14]),
    janelaPagamento: parseDate(row[17]),
    valorOrcado: 0, valorApontado: parseBRL(row[12]), valorPago: parseBRL(row[15]),
    qtdPoste: 0, qtdKLC: 0,
    statusPagamento: status, fonte: 'PARCIAL',
  }
}

// MANUTENÇÃO PREVENTIVA / PESADA / MEDIÇÃO GRÁFICA (39 colunas):
// [0]TIPO [1]REGIONAL [2]SGM [3]OT [4]SISTEMA [5]DATA_ENERG [6]MUNICÍPIO
// [9]ESTADO [15]DATA_APONTAMENTO [16]DATA_LIQUIDACAO [17]DATA_UF
// [18]VL_ORCADO [19]VL_APONTADO [20]DATA_UV [21]JANELA_ENVIO [22]VL_PAGO
// [24]JANELA_PAG [25]QTD_POSTE [26]QTD_KLC [35]STATUS
function normalizeManutencao(row, fonte, idx) {
  const sgm = row[2], ot = row[3], id = sgm || ot || `MANUT-IDX-${idx}`
  const status = row[35]
  if (!status) return null
  return {
    _id: `${fonte}-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao: row[0] || fonte,
    regional: row[1] || '', municipio: row[6] || '', sistema: row[4] || '',
    workflowStatus: row[9] || '',
    dataEnergizacao: parseDate(row[5]),
    dataApontamento: parseDate(row[15]),
    dataUF:          parseDate(row[17]),
    dataUV:          parseDate(row[20]),
    dataLiquidacao:  parseDate(row[16]),
    janelaEnvio:     parseDate(row[21]),
    janelaPagamento: parseDate(row[24]),
    valorOrcado:    parseBRL(row[18]),
    valorApontado:  parseBRL(row[19]),
    valorPago:      parseBRL(row[22]),
    qtdPoste: parseNum(row[25]), qtdKLC: parseNum(row[26]),
    statusPagamento: status, fonte,
  }
}

// MANUTENÇÃO LINHA VIVA (39 colunas — [3] = N° INCIDÊNCIA):
function normalizeLinhaViva(row, idx) {
  const sgm = row[2], ot = row[3], id = sgm || ot || `LV-IDX-${idx}`
  const status = row[35]
  if (!status) return null
  return {
    _id: `MANUTENCAO LINHA VIVA-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao: row[0] || 'MANUTENÇÃO LINHA VIVA',
    regional: row[1] || '', municipio: row[6] || '', sistema: row[4] || '',
    workflowStatus: row[9] || '',
    dataEnergizacao: parseDate(row[5]),
    dataApontamento: parseDate(row[15]),
    dataUF:          parseDate(row[17]),
    dataUV:          parseDate(row[20]),
    dataLiquidacao:  parseDate(row[16]),
    janelaEnvio:     parseDate(row[21]),
    janelaPagamento: parseDate(row[24]),
    valorOrcado:    parseBRL(row[18]),
    valorApontado:  parseBRL(row[19]),
    valorPago:      parseBRL(row[22]),
    qtdPoste: parseNum(row[25]), qtdKLC: parseNum(row[26]),
    statusPagamento: status,
    fonte: 'MANUTENÇÃO LINHA VIVA',
  }
}

// CONSTRUÇÃO - Metro (38 colunas — tem DATA DE RETIRADA extra em [32]):
// [0]TIPO [1]REGIONAL [2]LCL [3]OT [4]SISTEMA [5]DATA_ENERG [6]MUNICÍPIO
// [9]ESTADO [15]DATA_APONTAMENTO [16]DATA_LIQUIDACAO [17]DATA_UF
// [18]VL_ORCADO [19]VL_APONTADO [20]DATA_UV [21]JANELA_ENVIO [22]VL_PAGO
// [24]JANELA_PAG [25]QTD_POSTE [26]QTD_KLC [36]STATUS (deslocado +1)
function normalizeConstrucao(row, idx) {
  // Aceita linhas com pelo menos 23 colunas (até VALOR PAGO)
  const lcl = row[2], ot = row[3], id = lcl || ot || `CONSTR-IDX-${idx}`
  const status = row[36] || row[35] || ''
  if (!status) return null
  return {
    _id: `CONSTRUCAO-METRO-${idx}`, idExecucao: id, sgm: lcl, ot,
    tipoExecucao: 'CONSTRUÇÃO',
    regional: row[1] || '', municipio: row[6] || '', sistema: row[4] || '',
    workflowStatus: row[9] || '',
    dataEnergizacao: parseDate(row[5]),
    dataApontamento: parseDate(row[15]),
    dataUF:          parseDate(row[17]),
    dataUV:          parseDate(row[20]),
    dataLiquidacao:  parseDate(row[16]),
    janelaEnvio:     parseDate(row[21]),
    janelaPagamento: parseDate(row[24]),
    valorOrcado:    parseBRL(row[18]),
    valorApontado:  parseBRL(row[19]),
    valorPago:      parseBRL(row[22]),
    qtdPoste: parseNum(row[25]), qtdKLC: parseNum(row[26]),
    statusPagamento: status,
    fonte: 'CONSTRUÇÃO - Metro',
  }
}

// META FATURAMENTO: [0]JANELA [1]META_MANUT [2]META_CONST [3]META_TOTAL
function normalizeMeta(row) {
  const janela = parseDate(row[0])
  if (!janela) return null
  return {
    janela,
    metaManutencaoPreventiva: parseBRL(row[1]),
    metaConstrucao:           parseBRL(row[2]),
    metaTotal:                parseBRL(row[3]),
  }
}

// ── Fetch — /export ignora filtros ativos da planilha ─────────────────────────
async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
  const r = await fetch(url, {
    headers: { 'Accept': 'text/csv,text/plain,*/*', 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow',
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ?debug=1
  if (req.query?.debug === '1') {
    const abas = [
      { nome: 'PARCIAL',               gid: '1226112246' },
      { nome: 'MANUTENÇÃO PREVENTIVA', gid: '522996516'  },
      { nome: 'MANUTENÇÃO PESADA',     gid: '189511042'  },
      { nome: 'MANUTENÇÃO LINHA VIVA', gid: '444956809'  },
      { nome: 'MEDIÇÃO GRÁFICA',       gid: '889068289'  },
      { nome: 'CONSTRUÇÃO - Metro',    gid: '584650671'  },
      { nome: 'META FATURAMENTO',      gid: '137800100'  },
    ]
    const out = {}
    for (const a of abas) {
      try {
        const rows = parseCSVRaw(await fetchSheet(a.gid))
        out[a.nome] = { totalRows: rows.length, row0: rows[0], row1: rows[1], row2: rows[2] }
      } catch (e) { out[a.nome] = { error: e.message } }
    }
    return res.status(200).json(out)
  }

  const execucoes = [], metas = [], errors = [], counts = {}

  const run = async (label, gid, startRow, normFn) => {
    try {
      const rows = parseCSVRaw(await fetchSheet(gid))
      let n = 0
      for (let i = startRow; i < rows.length; i++) {
        const e = normFn(rows[i], i)
        if (e) { execucoes.push(e); n++ }
      }
      counts[label] = { totalRows: rows.length, loaded: n }
    } catch (err) {
      errors.push(`${label}: ${err.message}`)
      counts[label] = { error: err.message }
    }
  }

  await run('PARCIAL',               '1226112246', 2, (r, i) => normalizeParcial(r, i))
  await run('MANUTENÇÃO PREVENTIVA', '522996516',  2, (r, i) => normalizeManutencao(r, 'MANUTENÇÃO PREVENTIVA', i))
  await run('MANUTENÇÃO PESADA',     '189511042',  2, (r, i) => normalizeManutencao(r, 'MANUTENÇÃO PESADA', i))
  await run('MANUTENÇÃO LINHA VIVA', '444956809',  2, (r, i) => normalizeLinhaViva(r, i))
  await run('MEDIÇÃO GRÁFICA',       '889068289',  2, (r, i) => normalizeManutencao(r, 'MEDIÇÃO GRÁFICA', i))
  await run('CONSTRUÇÃO - Metro',    '584650671',  2, (r, i) => normalizeConstrucao(r, i))

  // META FATURAMENTO — header na linha 0, dados a partir de 1
  try {
    const rows = parseCSVRaw(await fetchSheet('137800100'))
    let n = 0
    for (let i = 1; i < rows.length; i++) {
      const m = normalizeMeta(rows[i])
      if (m) { metas.push(m); n++ }
    }
    counts['META FATURAMENTO'] = { totalRows: rows.length, loaded: n }
  } catch (err) {
    errors.push(`META FATURAMENTO: ${err.message}`)
    counts['META FATURAMENTO'] = { error: err.message }
  }

  return res.status(200).json({
    execucoes, metas,
    lastUpdated: new Date().toISOString(),
    counts,
    ...(errors.length > 0 && { errors }),
  })
}
