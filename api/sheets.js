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

// Returns array-of-arrays (positional, no header)
function parseCSVRaw(text) {
  return text
    .split('\n')
    .map(l => l.replace(/\r$/, ''))
    .filter(l => l.trim())
    .map(parseCSVLine)
    .map(row => row.map(v => v.trim()))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseBRL(s) {
  if (!s || s === '-') return 0
  let v = s.replace(/R\$\s*/gi, '').replace(/['"]/g, '').trim()
  if (!v) return 0
  // pt-BR: "1.234,56" → remove dots, swap comma
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

// ── Column maps (positional) ──────────────────────────────────────────────────
// PARCIAL: 20 cols
// [0]TIPO [1]REGIONAL [2]LCL/OS [3]OT [4]SISTEMA [5]MUNICÍPIO [6]ESTADO
// [7]TAREFA [8]CERT [9]CONTRATO [10]RESP_ENVIO [11]DATA_ENVIO
// [12]VL_APONTADO [13]DATA_VALIDACAO [14]JANELA_ENVIO [15]VL_PAGO
// [16]NUM_CONFORM [17]JANELA_PAG [18]OBS [19]STATUS

function normalizeParcial(row, idx) {
  if (row.length < 20) return null
  const sgm    = row[2]
  const ot     = row[3]
  const id     = sgm || ot
  const status = row[19]
  if (!id || !status) return null
  return {
    _id: `PARCIAL-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao:    row[0]  || 'PARCIAL',
    regional:        row[1]  || '',
    municipio:       row[5]  || '',
    sistema:         row[4]  || '',
    workflowStatus:  row[6]  || '',
    dataEnergizacao: null,
    dataApontamento: parseDate(row[11]),
    dataUF:          parseDate(row[13]),
    dataUV:          null,
    dataLiquidacao:  null,
    janelaEnvio:     parseDate(row[14]),
    janelaPagamento: parseDate(row[17]),
    valorOrcado:    0,
    valorApontado:  parseBRL(row[12]),
    valorPago:      parseBRL(row[15]),
    qtdPoste: 0, qtdKLC: 0,
    statusPagamento: status,
    fonte: 'PARCIAL',
  }
}

// MANUTENÇÃO PREVENTIVA / PESADA / MEDIÇÃO GRÁFICA: 39 cols
// [0]TIPO [1]REGIONAL [2]SGM [3]OT [4]SISTEMA [5]DATA_ENERG [6]MUNICÍPIO
// [7]SUPERVISOR [8]CHEFE [9]ESTADO [10]IMPRESSO [11]RESP_FISC [12]FISC_SN
// [13]DATA_FISC [14]RESP_UF [15]DATA_APONTAMENTO [16]DATA_LIQUIDACAO
// [17]DATA_UF [18]VL_ORCADO [19]VL_APONTADO [20]DATA_UV
// [21]JANELA_ENVIO [22]VL_PAGO [23]NUM_CONFORM [24]JANELA_PAG
// [25]QTD_POSTE [26]QTD_KLC [27-34]outros [35]STATUS

function normalizeManutencao(row, fonte, idx) {
  if (row.length < 36) return null
  const sgm    = row[2]
  const ot     = row[3]
  const id     = sgm || ot
  const status = row[35]
  if (!id || !status) return null
  return {
    _id: `${fonte}-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao:    row[0]  || fonte,
    regional:        row[1]  || '',
    municipio:       row[6]  || '',
    sistema:         row[4]  || '',
    workflowStatus:  row[9]  || '',
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
    qtdPoste: parseNum(row[25]),
    qtdKLC:   parseNum(row[26]),
    statusPagamento: status,
    fonte,
  }
}

// MANUTENÇÃO LINHA VIVA: 39 cols — igual à manutencao, mas
// [3] = N° INCIDÊNCIA (em vez de OT), resto igual
function normalizeLinhaViva(row, idx) {
  if (row.length < 36) return null
  const sgm    = row[2]
  const ot     = row[3]   // N° INCIDÊNCIA
  const id     = sgm || ot
  const status = row[35]
  if (!id || !status) return null
  return {
    _id: `MANUTENÇÃO LINHA VIVA-${idx}`, idExecucao: id, sgm, ot,
    tipoExecucao:    row[0]  || 'MANUTENÇÃO LINHA VIVA',
    regional:        row[1]  || '',
    municipio:       row[6]  || '',
    sistema:         row[4]  || '',
    workflowStatus:  row[9]  || '',
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
    qtdPoste: parseNum(row[25]),
    qtdKLC:   parseNum(row[26]),
    statusPagamento: status,
    fonte: 'MANUTENÇÃO LINHA VIVA',
  }
}

// META FATURAMENTO: header na linha 0, dados a partir de linha 1
// [0]JANELA [1]META_MANUT_PREV [2]META_CONSTRUCAO [3]META_TOTAL
function normalizeMeta(row) {
  if (row.length < 4) return null
  const janela = parseDate(row[0])
  if (!janela) return null
  return {
    janela,
    metaManutencaoPreventiva: parseBRL(row[1]),
    metaConstrucao:           parseBRL(row[2]),
    metaTotal:                parseBRL(row[3]),
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  const r = await fetch(url, { headers: { Accept: 'text/csv,text/plain,*/*' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ?debug=1 → mostra linhas cruas de cada aba
  if (req.query?.debug === '1') {
    const abas = ['PARCIAL','MANUTENÇÃO PREVENTIVA','MANUTENÇÃO PESADA','MANUTENÇÃO LINHA VIVA','MEDIÇÃO GRÁFICA','META FATURAMENTO']
    const out = {}
    for (const nome of abas) {
      try {
        const csv  = await fetchSheet(nome)
        const rows = parseCSVRaw(csv)
        out[nome]  = { totalRows: rows.length, row0: rows[0], row1: rows[1], row2: rows[2] }
      } catch (e) { out[nome] = { error: e.message } }
    }
    return res.status(200).json(out)
  }

  const execucoes = [], metas = [], errors = [], counts = {}

  // PARCIAL — skip row 0 (totais) + row 1 (header), dados a partir de row 2
  try {
    const csv  = await fetchSheet('PARCIAL')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 2; i < rows.length; i++) {
      const e = normalizeParcial(rows[i], i)
      if (e) { execucoes.push(e); n++ }
    }
    counts['PARCIAL'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`PARCIAL: ${err.message}`); counts['PARCIAL'] = { error: err.message } }

  // MANUTENÇÃO PREVENTIVA — skip row 0 (totais) + row 1 (header)
  try {
    const csv  = await fetchSheet('MANUTENÇÃO PREVENTIVA')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 2; i < rows.length; i++) {
      const e = normalizeManutencao(rows[i], 'MANUTENÇÃO PREVENTIVA', i)
      if (e) { execucoes.push(e); n++ }
    }
    counts['MANUTENÇÃO PREVENTIVA'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`MANUTENÇÃO PREVENTIVA: ${err.message}`); counts['MANUTENÇÃO PREVENTIVA'] = { error: err.message } }

  // MANUTENÇÃO PESADA
  try {
    const csv  = await fetchSheet('MANUTENÇÃO PESADA')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 2; i < rows.length; i++) {
      const e = normalizeManutencao(rows[i], 'MANUTENÇÃO PESADA', i)
      if (e) { execucoes.push(e); n++ }
    }
    counts['MANUTENÇÃO PESADA'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`MANUTENÇÃO PESADA: ${err.message}`); counts['MANUTENÇÃO PESADA'] = { error: err.message } }

  // MANUTENÇÃO LINHA VIVA
  try {
    const csv  = await fetchSheet('MANUTENÇÃO LINHA VIVA')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 2; i < rows.length; i++) {
      const e = normalizeLinhaViva(rows[i], i)
      if (e) { execucoes.push(e); n++ }
    }
    counts['MANUTENÇÃO LINHA VIVA'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`MANUTENÇÃO LINHA VIVA: ${err.message}`); counts['MANUTENÇÃO LINHA VIVA'] = { error: err.message } }

  // MEDIÇÃO GRÁFICA
  try {
    const csv  = await fetchSheet('MEDIÇÃO GRÁFICA')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 2; i < rows.length; i++) {
      const e = normalizeManutencao(rows[i], 'MEDIÇÃO GRÁFICA', i)
      if (e) { execucoes.push(e); n++ }
    }
    counts['MEDIÇÃO GRÁFICA'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`MEDIÇÃO GRÁFICA: ${err.message}`); counts['MEDIÇÃO GRÁFICA'] = { error: err.message } }

  // META FATURAMENTO — header na linha 0, dados a partir de linha 1
  try {
    const csv  = await fetchSheet('META FATURAMENTO')
    const rows = parseCSVRaw(csv)
    let n = 0
    for (let i = 1; i < rows.length; i++) {
      const m = normalizeMeta(rows[i])
      if (m) { metas.push(m); n++ }
    }
    counts['META FATURAMENTO'] = { totalRows: rows.length, loaded: n }
  } catch (err) { errors.push(`META FATURAMENTO: ${err.message}`); counts['META FATURAMENTO'] = { error: err.message } }

  return res.status(200).json({
    execucoes, metas,
    lastUpdated: new Date().toISOString(),
    counts,
    ...(errors.length > 0 && { errors }),
  })
}
