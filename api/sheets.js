const SHEET_ID = '1HfQ2zj0De6gtFS39z-VR8ZCgRjcK5umusRnG_aYbh_4'

// ── CSV parser ────────────────────────────────────────────────────────────────
// NÃO separamos linhas com split('\n') antes de parsear — campos com quebra de
// linha interna (dentro de aspas) seriam cortados, descartando a linha inteira
// por falta de STATUS. O parser lê char-by-char e só quebra fora de aspas.
function parseCSVRaw(text) {
  const rows = []
  let row = [], cur = '', inQ = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"') {
      if (inQ && s[i + 1] === '"') { cur += '"'; i++ }   // escaped quote
      else { inQ = !inQ }
    } else if (c === ',' && !inQ) {
      row.push(cur.trim()); cur = ''
    } else if (c === '\n' && !inQ) {
      row.push(cur.trim()); cur = ''
      if (row.some(v => v !== '')) {
        while (row.length < 39) row.push('')
        rows.push(row)
      }
      row = []
    } else {
      cur += c
    }
  }
  // última linha sem \n terminal
  if (cur || row.length > 0) {
    row.push(cur.trim())
    if (row.some(v => v !== '')) {
      while (row.length < 39) row.push('')
      rows.push(row)
    }
  }
  return rows
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

// [FIX #6] parseDate loga warn em vez de descartar silenciosamente formatos inesperados
function parseDate(s, ctx) {
  if (!s || s === '-') return null
  const trimmed = s.trim()
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) {
    if (trimmed) console.warn(`[sheets] parseDate formato inesperado${ctx ? ` (${ctx})` : ''}: "${trimmed}"`)
    return null
  }
  return `${m[3]}-${m[2]}-${m[1]}`
}

// ── Normalizers (posicionais) ─────────────────────────────────────────────────

// PARCIAL (20 colunas):
// [0]TIPO [1]REGIONAL [2]LCL/OS [3]OT [4]SISTEMA [5]MUNICÍPIO
// [6]WORKFLOW_STATUS  ← era comentado incorretamente como ESTADO
// [11]DATA_ENVIO [12]VL_APONTADO [13]DATA_VALIDACAO [14]JANELA_ENVIO
// [15]VL_PAGO [17]JANELA_PAG [19]STATUS_PAGAMENTO
//
// [FIX #3] PARCIAL não tem coluna DATA_UF — row[13] é DATA_VALIDACAO,
// não dataUF. Campo renomeado para dataValidacao; dataUF permanece null.
// Se o front-end usa dataUF de registros PARCIAL, ajustar os consumers.
function normalizeParcial(row, idx) {
  const sgm = row[2], ot = row[3], id = sgm || ot || `PARCIAL-IDX-${idx}`
  const status = row[19]
  if (!status) return null
  return {
    // [FIX #7] idx agora é o contador sequencial de registros carregados
    _id: `PARCIAL-${idx}`,
    idExecucao: id, sgm, ot,
    tipoExecucao: row[0] || 'PARCIAL',
    regional: row[1] || '',
    municipio: row[5] || '',
    sistema: row[4] || '',
    // [FIX #2] row[6] é WORKFLOW_STATUS nesta aba (comentário anterior dizia ESTADO)
    workflowStatus:  row[6] || '',
    dataEnergizacao: null,
    dataApontamento: parseDate(row[11], 'PARCIAL.dataApontamento'),
    dataUF:          null,
    dataValidacao:   parseDate(row[13], 'PARCIAL.dataValidacao'),
    dataUV:          null,
    dataLiquidacao:  null,
    janelaEnvio:     parseDate(row[14], 'PARCIAL.janelaEnvio'),
    janelaPagamento: parseDate(row[17], 'PARCIAL.janelaPagamento'),
    valorOrcado: 0,
    valorApontado: parseBRL(row[12]),
    valorPago:     parseBRL(row[15]),
    qtdPoste: 0, qtdKLC: 0,
    statusPagamento: status,
    fonte: 'PARCIAL',
  }
}

// MANUTENÇÃO PREVENTIVA / PESADA / MEDIÇÃO GRÁFICA / LINHA VIVA (39 colunas):
// [0]TIPO [1]REGIONAL [2]SGM [3]OT [4]SISTEMA [5]DATA_ENERG [6]MUNICÍPIO
// [9]WORKFLOW_STATUS  ← era comentado como ESTADO
// [15]DATA_APONTAMENTO [16]DATA_LIQUIDACAO [17]DATA_UF
// [18]VL_ORCADO [19]VL_APONTADO [20]DATA_UV [21]JANELA_ENVIO [22]VL_PAGO
// [24]JANELA_PAG [25]QTD_POSTE [26]QTD_KLC [35]STATUS_PAGAMENTO
//
// [FIX #4] normalizeLinhaViva era cópia quase idêntica desta função —
// removida. Usar normalizeManutencao(r, 'MANUTENÇÃO LINHA VIVA', i).
function normalizeManutencao(row, fonte, idx) {
  const sgm = row[2], ot = row[3], id = sgm || ot || `MANUT-IDX-${idx}`
  const status = row[35]
  if (!status) return null
  return {
    _id: `${fonte}-${idx}`,
    idExecucao: id, sgm, ot,
    tipoExecucao: row[0] || fonte,
    regional: row[1] || '',
    municipio: row[6] || '',
    sistema: row[4] || '',
    workflowStatus:  row[9] || '',
    dataEnergizacao: parseDate(row[5],  `${fonte}.dataEnergizacao`),
    dataApontamento: parseDate(row[15], `${fonte}.dataApontamento`),
    dataUF:          parseDate(row[17], `${fonte}.dataUF`),
    dataUV:          parseDate(row[20], `${fonte}.dataUV`),
    dataLiquidacao:  parseDate(row[16], `${fonte}.dataLiquidacao`),
    janelaEnvio:     parseDate(row[21], `${fonte}.janelaEnvio`),
    janelaPagamento: parseDate(row[24], `${fonte}.janelaPagamento`),
    valorOrcado:    parseBRL(row[18]),
    valorApontado:  parseBRL(row[19]),
    valorPago:      parseBRL(row[22]),
    qtdPoste: parseNum(row[25]),
    qtdKLC:   parseNum(row[26]),
    statusPagamento: status,
    fonte,
  }
}

// CONSTRUÇÃO - Metro (38 colunas — tem DATA DE RETIRADA extra em [32]):
// [0]TIPO [1]REGIONAL [2]LCL [3]OT [4]SISTEMA [5]DATA_ENERG [6]MUNICÍPIO
// [9]WORKFLOW_STATUS [15]DATA_APONTAMENTO [16]DATA_LIQUIDACAO [17]DATA_UF
// [18]VL_ORCADO [19]VL_APONTADO [20]DATA_UV [21]JANELA_ENVIO [22]VL_PAGO
// [24]JANELA_PAG [25]QTD_POSTE [26]QTD_KLC
// [36]STATUS_PAGAMENTO (deslocado +1 pela col DATA_RETIRADA em [32])
// fallback row[35] para linhas sem DATA_RETIRADA
function normalizeConstrucao(row, idx) {
  const lcl = row[2], ot = row[3], id = lcl || ot || `CONSTR-IDX-${idx}`
  const status = row[36] || row[35]
  if (!status) return null
  return {
    _id: `CONSTRUCAO-METRO-${idx}`,
    idExecucao: id, sgm: lcl, ot,
    tipoExecucao: 'CONSTRUÇÃO',
    regional: row[1] || '',
    municipio: row[6] || '',
    sistema: row[4] || '',
    workflowStatus:  row[9] || '',
    dataEnergizacao: parseDate(row[5],  'CONSTRUCAO.dataEnergizacao'),
    dataApontamento: parseDate(row[15], 'CONSTRUCAO.dataApontamento'),
    dataUF:          parseDate(row[17], 'CONSTRUCAO.dataUF'),
    dataUV:          parseDate(row[20], 'CONSTRUCAO.dataUV'),
    dataLiquidacao:  parseDate(row[16], 'CONSTRUCAO.dataLiquidacao'),
    janelaEnvio:     parseDate(row[21], 'CONSTRUCAO.janelaEnvio'),
    janelaPagamento: parseDate(row[24], 'CONSTRUCAO.janelaPagamento'),
    valorOrcado:    parseBRL(row[18]),
    valorApontado:  parseBRL(row[19]),
    valorPago:      parseBRL(row[22]),
    qtdPoste: parseNum(row[25]),
    qtdKLC:   parseNum(row[26]),
    statusPagamento: status,
    fonte: 'CONSTRUÇÃO - Metro',
  }
}

// META FATURAMENTO: [0]JANELA [1]META_MANUT [2]META_CONST [3]META_TOTAL
function normalizeMeta(row) {
  const janela = parseDate(row[0], 'META.janela')
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

  // [FIX #1] ?debug=1 continua funcionando; ?debug=<nome_aba> filtra só aquela aba.
  // Ex: ?debug=construcao  ou  ?debug=1  (todas as abas)
  const debugParam = req.query?.debug
  if (debugParam) {
    const abas = [
      { nome: 'PARCIAL',               gid: '1226112246' },
      { nome: 'MANUTENÇÃO PREVENTIVA', gid: '522996516'  },
      { nome: 'MANUTENÇÃO PESADA',     gid: '189511042'  },
      { nome: 'MANUTENÇÃO LINHA VIVA', gid: '444956809'  },
      { nome: 'MEDIÇÃO GRÁFICA',       gid: '889068289'  },
      { nome: 'CONSTRUÇÃO - Metro',    gid: '584650671'  },
      { nome: 'META FATURAMENTO',      gid: '137800100'  },
    ]
    // debug=1 → todas; debug=<slug> → filtra pelo nome (case-insensitive, ignora acentos)
    const slug = debugParam === '1' ? null : debugParam.toLowerCase()
    const alvo = slug
      ? abas.filter(a => a.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\s]/g, '').includes(slug.normalize('NFD').replace(/[\u0300-\u036f\s]/g, '')))
      : abas

    const out = {}
    for (const a of alvo) {
      try {
        const rows = parseCSVRaw(await fetchSheet(a.gid))
        out[a.nome] = {
          totalRows: rows.length,
          row0: rows[0],
          row1: rows[1],
          row2: rows[2],
          // inclui amostra do final para ajudar a detectar linhas dropadas
          lastRow: rows[rows.length - 1],
        }
      } catch (e) { out[a.nome] = { error: e.message } }
    }
    return res.status(200).json(out)
  }

  const execucoes = [], metas = [], errors = [], counts = {}

  // [FIX #5] META FATURAMENTO agora passa pelo helper run() igual às outras abas.
  // target opcional permite redirecionar para o array metas em vez de execucoes.
  // [FIX #7] normFn recebe n (contador sequencial de registros carregados)
  //          em vez de i (índice de linha CSV) → _id sem buracos.
  const run = async (label, gid, startRow, normFn, target = execucoes) => {
    try {
      const rows = parseCSVRaw(await fetchSheet(gid))
      let n = 0
      for (let i = startRow; i < rows.length; i++) {
        const e = normFn(rows[i], n)
        if (e) { target.push(e); n++ }
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
  // [FIX #4] normalizeLinhaViva removida — reutiliza normalizeManutencao
  await run('MANUTENÇÃO LINHA VIVA', '444956809',  2, (r, i) => normalizeManutencao(r, 'MANUTENÇÃO LINHA VIVA', i))
  await run('MEDIÇÃO GRÁFICA',       '889068289',  2, (r, i) => normalizeManutencao(r, 'MEDIÇÃO GRÁFICA', i))
  await run('CONSTRUÇÃO - Metro',    '584650671',  2, (r, i) => normalizeConstrucao(r, i))
  // [FIX #5] META agora usa run() com target=metas (header na linha 0, dados de 1)
  await run('META FATURAMENTO',      '137800100',  1, (r, _i) => normalizeMeta(r), metas)

  return res.status(200).json({
    execucoes, metas,
    lastUpdated: new Date().toISOString(),
    counts,
    ...(errors.length > 0 && { errors }),
  })
}
