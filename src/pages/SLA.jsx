import { useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  AreaChart, Area, CartesianGrid
} from 'recharts'
import { useData } from '../context/DataContext'
import {
  applyFilters, avgSLA, slaApontamento, slaValidacao, slaLiquidacao, slaSetup,
  slaPorTipo, slaDistribuicao, fmtDate
} from '../lib/metrics'
import { TIPO_COLORS, CHART_PALETTE } from '../lib/constants'
import { ChartCard, PageHeader, LoadingState, ErrorState, SLAFarol, CustomTooltip } from '../components/UI'

const G = { display: 'grid', gap: 16 }

function HBarDiasLabel({ x, y, width, height, value }) {
  if (!value || value === 0) return null
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fill="#94A3B8" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
      {`${value}d`}
    </text>
  )
}

function BarCountLabel({ x, y, width, value }) {
  if (!value || value === 0) return null
  return (
    <text x={x + width / 2} y={y - 5} fill="#94A3B8" textAnchor="middle" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
      {value}
    </text>
  )
}

// SLA por janela de envio (evolução temporal)
function slaEvolucao(data, fn) {
  const map = new Map()
  for (const e of data) {
    const janela = e.janelaEnvio
    if (!janela) continue
    const val = fn(e)
    if (val === null || val < 0) continue
    const cur = map.get(janela) ?? { sum: 0, count: 0 }
    cur.sum += val; cur.count++
    map.set(janela, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([janela, v]) => ({ janela, label: fmtDate(janela), media: Math.round(v.sum / v.count), count: v.count }))
}

export default function SLA() {
  const { data, loading, error, filters, refresh } = useData()
  const execs = useMemo(() => data ? applyFilters(data.execucoes, filters) : [], [data, filters])

  const avgAp  = useMemo(() => avgSLA(execs, slaApontamento), [execs])
  const avgVal = useMemo(() => avgSLA(execs, slaValidacao),   [execs])
  const avgLiq = useMemo(() => avgSLA(execs, slaLiquidacao),  [execs])
  const avgSet = useMemo(() => avgSLA(execs, slaSetup),       [execs])

  const countAp  = useMemo(() => execs.filter(e => slaApontamento(e) !== null).length, [execs])
  const countVal = useMemo(() => execs.filter(e => slaValidacao(e)   !== null).length, [execs])
  const countLiq = useMemo(() => execs.filter(e => slaLiquidacao(e)  !== null).length, [execs])
  const countSet = useMemo(() => execs.filter(e => slaSetup(e)       !== null).length, [execs])

  const porTipo = useMemo(() => slaPorTipo(execs), [execs])

  const distVal = useMemo(() => slaDistribuicao(execs, slaValidacao),   [execs])
  const distAp  = useMemo(() => slaDistribuicao(execs, slaApontamento), [execs])

  const evolVal = useMemo(() => slaEvolucao(execs, slaValidacao).slice(-12), [execs])

  const radarData = [
    { subject: 'Apontamento', value: avgAp  ?? 0 },
    { subject: 'Validação',   value: avgVal ?? 0 },
    { subject: 'Liquidação',  value: avgLiq ?? 0 },
    { subject: 'Setup',       value: avgSet ?? 0 },
  ]

  const slaApTipo  = porTipo.filter(t => t.slaApontamento !== null).map(t => ({ name: t.tipo, value: t.slaApontamento, count: t.countAp  })).sort((a,b)=>a.value-b.value)
  const slaValTipo = porTipo.filter(t => t.slaValidacao   !== null).map(t => ({ name: t.tipo, value: t.slaValidacao,   count: t.countVal })).sort((a,b)=>a.value-b.value)
  const slaSetTipo = porTipo.filter(t => t.slaSetup       !== null).map(t => ({ name: t.tipo, value: t.slaSetup,       count: t.countSet })).sort((a,b)=>a.value-b.value)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader title="SLA" subtitle="Indicadores de prazo operacional e ciclo de pagamento" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Faróis — 4 colunas */}
        <div style={{ ...G, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <SLAFarol label="SLA Médio de Apontamento" value={avgAp}  thresholds={[10, 20]} count={countAp}/>
          <SLAFarol
            label="SLA Médio de Validação"
            value={avgVal}
            thresholds={[15, 30]}
            count={countVal}
            subtitle="Data de UF → Data de UV"
          />
          <SLAFarol label="SLA Médio de Liquidação"  value={avgLiq} thresholds={[20, 45]} count={countLiq}/>
          <SLAFarol
            label="SLA Médio de Setup"
            value={avgSet}
            thresholds={[30, 60]}
            count={countSet}
            subtitle="Energização → Janela de Pagamento"
          />
        </div>

        {/* Evolução SLA Validação + Radar */}
        <div style={{ ...G, gridTemplateColumns: '2fr 1fr' }}>
          <ChartCard title="Evolução do SLA de Validação" subtitle="Média de dias por janela de envio (Data de UF → Data de UV)">
            {evolVal.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={evolVal} margin={{top:16,right:16,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="gradVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C2340" vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip currency={false}/>}/>
                  <Area dataKey="media" name="SLA Médio (dias)" stroke="#6366F1" strokeWidth={2} fill="url(#gradVal)" dot={{fill:'#6366F1',r:3}}>
                    <LabelList dataKey="media" position="top" formatter={v=>`${v}d`}
                      style={{fill:'#6366F1',fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}/>
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height:240,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <p style={{color:'#475569',fontSize:12}}>Sem dados de janela de envio para calcular evolução</p>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Radar SLA Médio" subtitle="Dias por etapa">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="#1C2340"/>
                <PolarAngleAxis dataKey="subject"
                  tick={({ x, y, payload }) => {
                    const val = radarData.find(r => r.subject === payload.value)?.value
                    return (
                      <text x={x} y={y} fill="#94A3B8" fontSize={11} textAnchor="middle">
                        <tspan x={x} dy="0">{payload.value}</tspan>
                        {val > 0 && <tspan x={x} dy="14" fill="#F59E0B" fontWeight={700} fontFamily="'IBM Plex Mono',monospace">{val}d</tspan>}
                      </text>
                    )
                  }}
                />
                <Radar name="SLA Médio" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tabela por tipo */}
        <ChartCard title="SLA por Tipo de Execução" subtitle="Dias médios e quantidade de registros com dados disponíveis">
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{color:'#94A3B8',fontSize:10,textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #1C2340'}}>
                  <th style={{textAlign:'left', padding:'8px 12px 8px 0',fontWeight:500}}>Tipo</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Apontamento</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500,color:'#475569',fontSize:9}}>regs</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Validação <span style={{fontSize:9,color:'#475569',fontWeight:400}}>UF→UV</span></th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500,color:'#475569',fontSize:9}}>regs</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Liquidação</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500,color:'#475569',fontSize:9}}>regs</th>
                  <th style={{textAlign:'right',padding:'8px 0 8px 12px',fontWeight:500}}>Setup <span style={{fontSize:9,color:'#475569',fontWeight:400}}>Energ→JanPag</span></th>
                  <th style={{textAlign:'right',padding:'8px 0 8px 4px',fontWeight:500,color:'#475569',fontSize:9}}>regs</th>
                </tr>
              </thead>
              <tbody>
                {porTipo.map(t => (
                  <tr key={t.tipo} style={{borderTop:'1px solid rgba(28,35,64,.5)'}}>
                    <td style={{padding:'10px 12px 10px 0',color:'#fff',fontWeight:500}}>{t.tipo}</td>
                    <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color: t.slaApontamento !== null ? '#F59E0B' : '#475569'}}>
                      {t.slaApontamento !== null ? `${t.slaApontamento}d` : '—'}
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'right',color:'#475569',fontSize:11}}>{t.countAp}</td>
                    <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color: t.slaValidacao !== null ? '#6366F1' : '#475569'}}>
                      {t.slaValidacao !== null ? `${t.slaValidacao}d` : '—'}
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'right',color:'#475569',fontSize:11}}>{t.countVal}</td>
                    <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color: t.slaLiquidacao !== null ? '#10B981' : '#475569'}}>
                      {t.slaLiquidacao !== null ? `${t.slaLiquidacao}d` : '—'}
                    </td>
                    <td style={{padding:'10px 12px',textAlign:'right',color:'#475569',fontSize:11}}>{t.countLiq}</td>
                    <td style={{padding:'10px 0 10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color: t.slaSetup !== null ? '#06B6D4' : '#475569'}}>
                      {t.slaSetup !== null ? `${t.slaSetup}d` : '—'}
                    </td>
                    <td style={{padding:'10px 0 10px 4px',textAlign:'right',color:'#475569',fontSize:11}}>{t.countSet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {porTipo.length === 0 && <p style={{textAlign:'center',color:'#94A3B8',padding:24}}>Sem dados</p>}
          </div>
        </ChartCard>

        {/* Distribuição Validação + Apontamento por tipo */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="Distribuição SLA de Validação" subtitle="Quantidade de registros por faixa de dias (Data de UF → Data de UV)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distVal} margin={{top:24,right:8,left:0,bottom:0}}>
                <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip currency={false}/>}/>
                <Bar dataKey="count" name="Registros" fill="#6366F1" radius={[4,4,0,0]}>
                  <LabelList content={<BarCountLabel/>}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="SLA Apontamento por Tipo" subtitle="Dias médios (somente tipos com dados)">
            {slaApTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={slaApTipo} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
                  <XAxis type="number" unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={140} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip currency={false}/>}/>
                  <Bar dataKey="value" name="SLA (dias)" radius={[0,4,4,0]}>
                    <LabelList content={<HBarDiasLabel/>}/>
                    {slaApTipo.map((t,i) => <Cell key={t.name} fill={TIPO_COLORS[t.name] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center'}}>
                  <p style={{color:'#475569',fontSize:12}}>Sem dados de apontamento</p>
                  <p style={{color:'#334155',fontSize:11,marginTop:4}}>Requer Data de Energização + Data de Apontamento</p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* SLA Validação por tipo + Setup por tipo */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          {slaValTipo.length > 0 && (
            <ChartCard title="SLA Validação por Tipo" subtitle="Dias: Data de UF → Data de UV">
              <ResponsiveContainer width="100%" height={Math.max(180, slaValTipo.length * 44)}>
                <BarChart data={slaValTipo} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
                  <XAxis type="number" unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={160} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip currency={false}/>}/>
                  <Bar dataKey="value" name="SLA (dias)" radius={[0,4,4,0]}>
                    <LabelList content={<HBarDiasLabel/>}/>
                    {slaValTipo.map((t,i) => <Cell key={t.name} fill={TIPO_COLORS[t.name] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {slaSetTipo.length > 0 && (
            <ChartCard title="SLA Setup por Tipo" subtitle="Dias: Energização → Janela de Pagamento">
              <ResponsiveContainer width="100%" height={Math.max(180, slaSetTipo.length * 44)}>
                <BarChart data={slaSetTipo} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
                  <XAxis type="number" unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={160} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip currency={false}/>}/>
                  <Bar dataKey="value" name="SLA (dias)" fill="#06B6D4" radius={[0,4,4,0]}>
                    <LabelList content={<HBarDiasLabel/>}/>
                    {slaSetTipo.map((t,i) => <Cell key={t.name} fill={CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

      </div>
    </div>
  )
}
