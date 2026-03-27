import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, LabelList
} from 'recharts'
import { useData } from '../context/DataContext'
import { applyFilters, fmtBRL, fmtDate, faturamentoPorJanela, acumuladoFaturamento, metaVsReal, groupByEstado } from '../lib/metrics'
import { KPICard, ChartCard, PageHeader, LoadingState, ErrorState, CustomTooltip } from '../components/UI'

const G = { display: 'grid', gap: 16 }

function BarLabel({ x, y, width, value }) {
  if (!value || value === 0) return null
  const label = value >= 1e6 ? `${(value/1e6).toFixed(1)}M` : `${(value/1e3).toFixed(0)}k`
  return (
    <text x={x + width / 2} y={y - 5} fill="#94A3B8" textAnchor="middle" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
      {label}
    </text>
  )
}

function PctLabel({ x, y, width, value }) {
  if (!value || value === 0) return null
  return (
    <text x={x + width / 2} y={y - 5} fill="#F59E0B" textAnchor="middle" fontSize={10} fontFamily="'IBM Plex Mono', monospace" fontWeight={600}>
      {`${value.toFixed(0)}%`}
    </text>
  )
}

export default function Faturamento() {
  const { data, loading, error, filters, refresh } = useData()
  const execs = useMemo(() => data ? applyFilters(data.execucoes, filters) : [], [data, filters])

  const fatJanela = useMemo(() => faturamentoPorJanela(execs), [execs])
  const acum      = useMemo(() => acumuladoFaturamento(execs), [execs])
  const mvr       = useMemo(() => data ? metaVsReal(execs, data.metas) : [], [execs, data])

  const lineData = useMemo(() =>
    fatJanela.map((f, i) => ({ ...f, acumulado: acum[i]?.acumulado ?? 0 }))
  , [fatJanela, acum])

  const porEstado = useMemo(() => groupByEstado(execs), [execs])

  const lastN = fatJanela.slice(-2)
  const trend = lastN.length === 2 && lastN[0].valorPago > 0
    ? ((lastN[1].valorPago - lastN[0].valorPago) / lastN[0].valorPago) * 100 : null

  const totalPago  = fatJanela.reduce((a, b) => a + b.valorPago, 0)
  const totalApont = fatJanela.reduce((a, b) => a + b.valorApontado, 0)
  const best       = [...fatJanela].sort((a,b) => b.valorPago - a.valorPago)[0]

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader title="Faturamento" subtitle="Análise por janela de envio e metas" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ ...G, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPICard label="Total Faturado"    value={fmtBRL(totalPago)}  accent="emerald" trend={trend !== null ? {value:trend, label:'vs mês anterior'} : undefined}/>
          <KPICard label="Total Apontado"    value={fmtBRL(totalApont)} accent="indigo"/>
          <KPICard label="Melhor Janela"     value={best ? fmtBRL(best.valorPago) : '—'} sub={best?.label} accent="amber"/>
          <KPICard label="Qtd. Obras" value={new Set(execs.map(e => e.idExecucao)).size.toLocaleString('pt-BR')} accent="muted"/>
        </div>

        {/* Janela de Envio × Apontado + curva acumulada */}
        <ChartCard title="Evolução do Faturamento" subtitle="Valor apontado por janela de envio + curva acumulada">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={lineData} margin={{top:28,right:20,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2340" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="bar"  tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="line" orientation="right" tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar yAxisId="bar" dataKey="valorApontado" name="Valor Apontado" fill="#F59E0B" radius={[4,4,0,0]} opacity={0.85}>
                <LabelList content={<BarLabel/>} />
              </Bar>
              <Line yAxisId="line" dataKey="acumulado" name="Acumulado" stroke="#6366F1" strokeWidth={2} dot={{fill:'#6366F1',r:3}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Faturamento vs Meta" subtitle="Valor apontado por janela de envio × meta × % atingimento">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={mvr} margin={{top:28,right:60,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2340" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="bar" tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="pct" orientation="right" tickFormatter={v=>`${v.toFixed(0)}%`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <ReferenceLine yAxisId="pct" y={100} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar yAxisId="bar" dataKey="apontado" name="Apontado" fill="#6366F1" radius={[4,4,0,0]}>
                <LabelList content={<BarLabel/>} />
              </Bar>
              <Bar yAxisId="bar" dataKey="meta" name="Meta" fill="#1C2340" radius={[4,4,0,0]}>
                <LabelList content={<BarLabel/>} />
              </Bar>
              <Line yAxisId="pct" dataKey="pctApontado" name="% Atingimento (Apontado)" stroke="#F59E0B" strokeWidth={2} dot={{fill:'#F59E0B',r:4}}>
                <LabelList dataKey="pctApontado" position="top" formatter={v=>`${v.toFixed(0)}%`}
                  style={{fill:'#F59E0B',fontSize:10,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}/>
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tabela */}
        <ChartCard title="Detalhe por Janela de Envio">
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{color:'#94A3B8',fontSize:10,textTransform:'uppercase',letterSpacing:'.05em'}}>
                  <th style={{textAlign:'left', padding:'8px 12px 8px 0',fontWeight:500}}>Janela</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Apontado</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>vs mês ant.</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Pago</th>
                  <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Meta</th>
                  <th style={{textAlign:'right',padding:'8px 0 8px 12px',fontWeight:500}}>% Meta</th>
                </tr>
              </thead>
              <tbody>
                {mvr.map((r, i) => {
                  const fat     = fatJanela.find(f => f.janela === r.janela)
                  const fatPrev = i > 0 ? fatJanela.find(f => f.janela === mvr[i-1].janela) : null
                  const apont      = fat?.valorApontado ?? 0
                  const apontPrev  = fatPrev?.valorApontado ?? 0
                  const deltaPct   = apontPrev > 0 ? ((apont - apontPrev) / apontPrev) * 100 : null
                  const pct     = r.pctApontado ?? 0
                  const Icon    = pct >= 100 ? TrendingUp : pct >= 70 ? Minus : TrendingDown
                  const color   = pct >= 100 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#F43F5E'
                  const DeltaIcon = deltaPct === null ? null : deltaPct >= 0 ? TrendingUp : TrendingDown
                  const deltaColor = deltaPct === null ? '#475569' : deltaPct >= 0 ? '#10B981' : '#F43F5E'
                  return (
                    <tr key={r.janela} style={{borderTop:'1px solid rgba(28,35,64,.6)'}}>
                      <td style={{padding:'10px 12px 10px 0',fontWeight:500,color:'#fff'}}>{r.label}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#94A3B8'}}>{fmtBRL(apont)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right'}}>
                        {deltaPct !== null
                          ? <span style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:3,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:600,color:deltaColor}}>
                              <DeltaIcon size={10}/> {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                            </span>
                          : <span style={{color:'#334155',fontSize:11}}>—</span>}
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#fff',fontWeight:600}}>{fmtBRL(r.real)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#475569'}}>{fmtBRL(r.meta)}</td>
                      <td style={{padding:'10px 0 10px 12px',textAlign:'right'}}>
                        <span style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,fontFamily:"'IBM Plex Mono',monospace",color}}>
                          <Icon size={11}/> {pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {mvr.length === 0 && <p style={{textAlign:'center',color:'#94A3B8',padding:32}}>Sem dados</p>}
          </div>
        </ChartCard>


        {/* Estado — tabela meia largura */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="Detalhe por Estado">
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{color:'#94A3B8',fontSize:10,textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #1C2340'}}>
                    <th style={{textAlign:'left', padding:'8px 12px 8px 0',fontWeight:500}}>Estado</th>
                    <th style={{textAlign:'right',padding:'8px 12px',fontWeight:500}}>Qtd Obras</th>
                    <th style={{textAlign:'right',padding:'8px 0 8px 12px',fontWeight:500}}>Valor Apontado</th>
                  </tr>
                </thead>
                <tbody>
                  {porEstado.map(e => (
                    <tr key={e.estado} style={{borderTop:'1px solid rgba(28,35,64,.6)'}}>
                      <td style={{padding:'9px 12px 9px 0',color:'#fff',fontWeight:500}}>{e.estado}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#94A3B8'}}>{e.qtdObras}</td>
                      <td style={{padding:'9px 0 9px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#6366F1',fontWeight:600}}>{fmtBRL(e.valorApontado)}</td>
                    </tr>
                  ))}
                  {porEstado.length === 0 && (
                    <tr><td colSpan={3} style={{padding:24,textAlign:'center',color:'#475569'}}>Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

      </div>
    </div>
  )
}
