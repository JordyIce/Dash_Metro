const SHEET_ID = '1HfQ2zj0De6gtFS39z-VR8ZCgRjcK5umusRnG_aYbh_4'

const ABAS = [
  { gid: '1226112246', nome: 'PARCIAL',               tipo: 'parcial'    },
  { gid: '522996516',  nome: 'MANUTENÇÃO PREVENTIVA', tipo: 'manutencao' },
  { gid: '189511042',  nome: 'MANUTENÇÃO PESADA',     tipo: 'manutencao' },
  { gid: '444956809',  nome: 'MANUTENÇÃO LINHA VIVA', tipo: 'manutencao' },
  { gid: '889068289',  nome: 'MEDIÇÃO GRÁFICA',       tipo: 'manutencao' },
]
const GID_META = '137800100'

// ── CSV ────────────────────────────────────────────────────────────────────────
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

function parseCSV(text, headerRowIndex = 1) {
  const lines = text.split('\n').map(l => l.replace(/\r$/, ''))
  if (lines.length <= headerRowIndex) return []
  const headers = parseCSVLine(lines[headerRowIndex]).map(h => h.trim())
  const rows = []
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = parseCSVLine(line)
    if (vals.every(v => !v.trim())) continue
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (vals[idx] ?? '').trim() })
    rows.push(obj)
  }
  return rows
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseBRL(s) {
  if (!s) return 0
  const n = parseFloat(s.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.'))
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

// ── Normalizers ────────────────────────────────────────────────────────────────
function normalizeParcial(row, idx) {
  const sgm = row['LCL/OS']?.trim() || ''
  const ot  = row['OT']?.trim()     || ''
  const id  = sgm || ot
  if (!id || !row['STATUS PAGAMENTO']) return null
  return {
    _id:            `PARCIAL-${idx}`,
    idExecucao:     id,
    sgm, ot,
    tipoExecucao:   row['TIPO DE EXECUÇÃO'] || 'PARCIAL',
    regional:       row['REGIONAL'] || '',
    municipio:      row['MUNICÍPIO'] || row['MUNICIPIO'] || '',
    sistema:        row['SISTEMA'] || '',
    workflowStatus: row['TAREFA'] || '',
    dataEnergizacao: null,
    dataApontamento: parseDate(row['DATA DE ENVIO']),
    dataUF:          parseDate(row['DATA DE VALIDAÇÃO']),
    dataUV:          null,
    dataLiquidacao:  null,
    janelaEnvio:     parseDate(row['JANELA DE ENVIO']),
    janelaPagamento: parseDate(row['JANELA DE PAGAMENTO']),
    valorOrcado:    0,
    valorApontado:  parseBRL(row['VALOR APONTADO']),
    valorPago:      parseBRL(row['VALOR PAGO']),
    qtdPoste: 0, qtdKLC: 0,
    statusPagamento: row['STATUS PAGAMENTO']?.trim() || '',
    fonte: 'PARCIAL',
  }
}

function normalizeManutencao(row, fonte, idx) {
  const sgm = row['SGM']?.trim() || ''
  const ot  = (row['OT'] || row['N° INCIDÊNCIA'])?.trim() || ''
  const id  = sgm || ot
  if (!id || !row['STATUS PAGAMENTO']) return null
  return {
    _id:            `${fonte}-${idx}`,
    idExecucao:     id,
    sgm, ot,
    tipoExecucao:   row['TIPO DE EXECUÇÃO'] || fonte,
    regional:       row['REGIONAL'] || '',
    municipio:      row['MUNICÍPIO'] || row['MUNICIPIO'] || '',
    sistema:        row['SISTEMA'] || '',
    workflowStatus: row['ESTADO'] || '',
    dataEnergizacao: parseDate(row['DATA DE ENERGIZAÇÃO']),
    dataApontamento: parseDate(row['DATA DO APONTAMENTO']),
    dataUF:          parseDate(row['DATA DE UF']),
    dataUV:          parseDate(row['DATA DE UV']),
    dataLiquidacao:  parseDate(row['DATA DA LIQUIDAÇÃO']),
    janelaEnvio:     parseDate(row['JANELA DE ENVIO']),
    janelaPagamento: parseDate(row['JANELA DE PAGAMENTO']),
    valorOrcado:    parseBRL(row['VALOR ORÇADO']),
    valorApontado:  parseBRL(row['VALOR APONTADO']),
    valorPago:      parseBRL(row['VALOR PAGO']),
    qtdPoste: parseNum(row['QUANTIDADE POSTE']),
    qtdKLC:   parseNum(row['QUANTIDADE KLC']),
    statusPagamento: row['STATUS PAGAMENTO']?.trim() || '',
    fonte,
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const execucoes = []
  const metas     = []
  const errors    = []

  async function fetchGid(gid) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.text()
  }

  // Execuções
  for (const aba of ABAS) {
    try {
      const csv  = await fetchGid(aba.gid)
      const rows = parseCSV(csv, 1)
      rows.forEach((row, i) => {
        const e = aba.tipo === 'parcial'
          ? normalizeParcial(row, i)
          : normalizeManutencao(row, aba.nome, i)
        if (e) execucoes.push(e)
      })
    } catch (err) {
      errors.push(`${aba.nome}: ${err.message}`)
    }
  }

  // Metas
  try {
    const csv  = await fetchGid(GID_META)
    const rows = parseCSV(csv, 0)
    rows.forEach(row => {
      const janela = parseDate(row['JANELA'])
      if (!janela) return
      metas.push({
        janela,
        metaManutencaoPreventiva: parseBRL(row['META MANUTENÇÃO PREVENTIVA']),
        metaConstrucao:           parseBRL(row['META CONSTRUÇÃO']),
        metaTotal:                parseBRL(row['META TOTAL']),
      })
    })
  } catch (err) {
    errors.push(`META FATURAMENTO: ${err.message}`)
  }

  res.status(200).json({
    execucoes,
    metas,
    lastUpdated: new Date().toISOString(),
    ...(errors.length > 0 && { errors }),
  })
}
