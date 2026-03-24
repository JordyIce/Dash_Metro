import { useMemo } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useData } from '../context/DataContext'
import { applyFilters, avgSLA, slaApontamento, slaValidacao, slaLiquidacao, slaPorTipo } from '../lib/metrics'
import { TIPO_COLORS, CHART_PALETTE } from '../lib/constants'
import { ChartCard, PageHeader, LoadingState, ErrorState, SLAFarol, CustomTooltip } from '../components/UI'

const G = { display: 'grid', gap: 16 }

export default function SLA() {
  const { data, loading, error, filters, refresh } = useData()
  const execs = useMemo(() => data ? applyFilters(data.execucoes, filters) : [], [data, filters])

  const avgAp  = useMemo(() => avgSLA(execs, slaApontamento), [execs])
  const avgVal = useMemo(() => avgSLA(execs, slaValidacao),   [execs])
  const avgLiq = useMemo(() => avgSLA(execs, slaLiquidacao),  [execs])

  const porTipo = useMemo(() => slaPorTipo(execs), [execs])

  const radarData = [
    { subject: 'Apontamento', value: avgAp  ?? 0 },
    { subject: 'Validação',   value: avgVal ?? 0 },
    { subject: 'Liquidação',  value: avgLiq ?? 0 },
  ]

  const slaApTipo  = porTipo.filter(t => t.slaApontamento !== null).map(t => ({ name: t.tipo, value: t.slaApontamento })).sort((a,b) => a.value - b.value)
  const slaValTipo = porTipo.filter(t => t.slaValidacao   !== null).map(t => ({ name: t.tipo, value: t.slaValidacao   })).sort((a,b) => a.value - b.value)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader title="SLA" subtitle="Indicadores de prazo operacional e ciclo de pagamento" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Farois */}
        <div style={{ ...G, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <SLAFarol label="SLA Médio de Apontamento" value={avgAp}  thresholds={[10, 20]}/>
          <SLAFarol label="SLA Médio de Validação"   value={avgVal} thresholds={[15, 30]}/>
          <SLAFarol label="SLA Médio de Liquidação"  value={avgLiq} thresholds={[20, 45]}/>
        </div>

        {/* Radar + Tabela */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="Visão Geral SLA" subtitle="Dias médios por etapa">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#1C2340"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:'#94A3B8',fontSize:12}}/>
                <Radar name="SLA Médio" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="SLA por Tipo de Execução" subtitle="Dias médios">
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 80px',fontSize:10,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'.05em',paddingBottom:8,borderBottom:'1px solid #1C2340'}}>
                <span>Tipo</span>
                <span style={{textAlign:'right'}}>Apont.</span>
                <span style={{textAlign:'right'}}>Valid.</span>
                <span style={{textAlign:'right'}}>Liquid.</span>
              </div>
              {porTipo.map(t => (
                <div key={t.tipo} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 80px',fontSize:12,padding:'9px 0',borderBottom:'1px solid rgba(28,35,64,.5)'}}>
                  <span style={{color:'#fff',fontWeight:500,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>{t.tipo}</span>
                  <span style={{textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#F59E0B'}}>{t.slaApontamento !== null ? `${t.slaApontamento}d` : '—'}</span>
                  <span style={{textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#6366F1'}}>{t.slaValidacao   !== null ? `${t.slaValidacao}d`   : '—'}</span>
                  <span style={{textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#10B981'}}>{t.slaLiquidacao  !== null ? `${t.slaLiquidacao}d`  : '—'}</span>
                </div>
              ))}
              {porTipo.length === 0 && <p style={{textAlign:'center',color:'#94A3B8',padding:24,fontSize:12}}>Sem dados</p>}
            </div>
          </ChartCard>
        </div>

        {/* Charts por tipo */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="SLA Apontamento por Tipo" subtitle="Dias: Data Energização → Data Apontamento">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={slaApTipo} layout="vertical" margin={{top:0,right:40,left:0,bottom:0}}>
                <XAxis type="number" unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={130} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip currency={false}/>}/>
                <Bar dataKey="value" name="SLA (dias)" radius={[0,4,4,0]}>
                  {slaApTipo.map((t,i) => <Cell key={t.name} fill={TIPO_COLORS[t.name] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="SLA Validação por Tipo" subtitle="Dias: Janela Envio → Janela Pagamento">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={slaValTipo} layout="vertical" margin={{top:0,right:40,left:0,bottom:0}}>
                <XAxis type="number" unit="d" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={130} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip currency={false}/>}/>
                <Bar dataKey="value" name="SLA (dias)" radius={[0,4,4,0]}>
                  {slaValTipo.map((t,i) => <Cell key={t.name} fill={TIPO_COLORS[t.name] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  )
}
