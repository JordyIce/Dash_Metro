import { useMemo } from 'react'
import { DollarSign, Layers, MapPin, Target, Hash, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import { useData } from '../context/DataContext'
import { applyFilters, sumField, fmtBRL, faturamentoPorJanela, statusBreakdown, topMunicipios, metaVsReal } from '../lib/metrics'
import { STATUS_COLORS, TIPO_COLORS, CHART_PALETTE } from '../lib/constants'
import { KPICard, ChartCard, PageHeader, LoadingState, ErrorState, CustomTooltip } from '../components/UI'

const G = { display: 'grid', gap: 16 }

// Rótulo customizado para barras
function BarLabel({ x, y, width, value, currency = true }) {
  if (!value || value === 0) return null
  const label = currency
    ? (value >= 1e6 ? `${(value/1e6).toFixed(1)}M` : `${(value/1e3).toFixed(0)}k`)
    : value.toLocaleString('pt-BR')
  return (
    <text x={x + width / 2} y={y - 5} fill="#94A3B8" textAnchor="middle" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
      {label}
    </text>
  )
}

// Rótulo customizado para barras horizontais
function HBarLabel({ x, y, width, height, value }) {
  if (!value || value === 0) return null
  const label = value >= 1e6 ? `${(value/1e6).toFixed(1)}M` : `${(value/1e3).toFixed(0)}k`
  return (
    <text x={x + width + 5} y={y + height / 2 + 4} fill="#94A3B8" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
      {label}
    </text>
  )
}

// Rótulo customizado para Pie
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Executivo() {
  const { data, loading, error, filters, refresh } = useData()
  const execs = useMemo(() => data ? applyFilters(data.execucoes, filters) : [], [data, filters])

  const totalOrcado   = useMemo(() => sumField(execs, 'valorOrcado'),   [execs])
  const totalApontado = useMemo(() => sumField(execs, 'valorApontado'), [execs])
  const totalPago     = useMemo(() => sumField(execs, 'valorPago'),     [execs])
  const qtdObras      = useMemo(() => new Set(execs.map(e => e.idExecucao)).size, [execs])
  const qtdMunis      = useMemo(() => new Set(execs.map(e => e.municipio).filter(Boolean)).size, [execs])

  const metaAtual = useMemo(() => {
    if (!data?.metas?.length) return null
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    return data.metas.find(m => m.janela === key) ?? data.metas[data.metas.length - 1]
  }, [data])

  const pctMeta = metaAtual?.metaTotal > 0 ? (totalPago / metaAtual.metaTotal) * 100 : null

  const fatJanela  = useMemo(() => faturamentoPorJanela(execs).slice(-12), [execs])
  const statusBkdn = useMemo(() => statusBreakdown(execs), [execs])
  const topMuni    = useMemo(() => topMunicipios(execs, 8), [execs])
  const mvr        = useMemo(() => data ? metaVsReal(execs, data.metas).slice(-6) : [], [execs, data])

  const porTipo = useMemo(() => {
    const map = new Map()
    execs.forEach(e => map.set(e.tipoExecucao, (map.get(e.tipoExecucao) ?? 0) + e.valorPago))
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [execs])

  const metaColor = pctMeta === null ? 'muted' : pctMeta >= 90 ? 'emerald' : pctMeta >= 70 ? 'amber' : 'rose'

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader title="Dashboard Executivo" subtitle="Visão consolidada de todas as execuções" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPIs */}
        <div style={{ ...G, gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <KPICard label="Total Orçado"   value={fmtBRL(totalOrcado)}      icon={<Target     size={14}/>} accent="muted"   />
          <KPICard label="Total Apontado" value={fmtBRL(totalApontado)}    icon={<Zap        size={14}/>} accent="indigo"  />
          <KPICard label="Total Pago"     value={fmtBRL(totalPago)}        icon={<DollarSign size={14}/>} accent="emerald" />
          <KPICard label="Qtd. Obras"     value={qtdObras.toLocaleString()} icon={<Layers    size={14}/>} accent="amber"   />
          <KPICard label="Municípios"     value={qtdMunis.toString()}       icon={<MapPin    size={14}/>} accent="muted"   />
          <KPICard
            label="% Ating. Meta"
            value={pctMeta !== null ? `${pctMeta.toFixed(1)}%` : '—'}
            sub={metaAtual ? `Meta: ${fmtBRL(metaAtual.metaTotal)}` : undefined}
            icon={<Hash size={14}/>}
            accent={metaColor}
          />
        </div>

        {/* Row 1 */}
        <div style={{ ...G, gridTemplateColumns: '2fr 1fr' }}>
          <ChartCard title="Faturamento por Janela de Envio" subtitle="Valor pago por mês">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fatJanela} margin={{top:24,right:8,left:0,bottom:0}}>
                <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="valorPago" name="Valor Pago" fill="#F59E0B" radius={[4,4,0,0]}>
                  <LabelList content={<BarLabel currency />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Status de Pagamento" subtitle="Distribuição por valor">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusBkdn} dataKey="valor" nameKey="status"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} strokeWidth={0}
                  labelLine={false} label={<PieLabel/>}
                >
                  {statusBkdn.map((s,i) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend formatter={v=><span style={{fontSize:10,color:'#94A3B8'}}>{v}</span>} iconType="circle" iconSize={7}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2 */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="Faturamento vs Meta" subtitle="Últimos 6 meses">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mvr} margin={{top:24,right:8,left:0,bottom:0}}>
                <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="real" name="Realizado" fill="#10B981" radius={[4,4,0,0]}>
                  <LabelList content={<BarLabel currency />} />
                </Bar>
                <Bar dataKey="meta" name="Meta" fill="#1C2340" radius={[4,4,0,0]}>
                  <LabelList content={<BarLabel currency />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Municípios" subtitle="Por valor pago">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topMuni} layout="vertical" margin={{top:0,right:60,left:0,bottom:0}}>
                <XAxis type="number" tickFormatter={v=>`${(v/1e3).toFixed(0)}k`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="municipio" width={160} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v => v.length > 20 ? v.slice(0,18)+"…" : v}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="valor" name="Valor Pago" radius={[0,4,4,0]}>
                  <LabelList content={<HBarLabel/>} />
                  {topMuni.map((_,i) => <Cell key={i} fill={CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3 */}
        <div style={{ ...G, gridTemplateColumns: '1fr 1fr' }}>
          <ChartCard title="Distribuição por Tipo" subtitle="Valor pago">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={porTipo} dataKey="value" nameKey="name"
                  cx="40%" cy="50%" outerRadius={85} strokeWidth={0}
                  labelLine={false} label={<PieLabel/>}
                >
                  {porTipo.map((t,i) => <Cell key={t.name} fill={TIPO_COLORS[t.name] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  formatter={v=><span style={{fontSize:10,color:'#94A3B8'}}>{v}</span>} iconType="circle" iconSize={7}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Resumo por Status">
            <div>
              {statusBkdn.map(s => (
                <div key={s.status} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(28,35,64,.6)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[s.status]??'#94A3B8',flexShrink:0}}/>
                  <span style={{fontSize:12,color:'#94A3B8',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.status||'—'}</span>
                  <span style={{fontSize:11,color:'#475569',fontFamily:"'IBM Plex Mono',monospace"}}>{s.qtd}x</span>
                  <span style={{fontSize:12,fontWeight:600,color:'#fff',fontFamily:"'IBM Plex Mono',monospace"}}>{fmtBRL(s.valor)}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

      </div>
    </div>
  )
}
