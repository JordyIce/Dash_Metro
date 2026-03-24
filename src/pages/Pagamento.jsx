import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useData } from '../context/DataContext'
import { applyFilters, fmtBRL, fmtDate, statusBreakdown, avgDesvio, desvioApontadoVsPago, desvioOrcadoVsPago } from '../lib/metrics'
import { STATUS_COLORS, CHART_PALETTE } from '../lib/constants'
import { KPICard, ChartCard, PageHeader, LoadingState, ErrorState, CustomTooltip } from '../components/UI'

const G = { display: 'grid', gap: 16 }

export default function Pagamento() {
  const { data, loading, error, filters, refresh } = useData()
  const execs = useMemo(() => data ? applyFilters(data.execucoes, filters) : [], [data, filters])

  const statusBkdn = useMemo(() => statusBreakdown(execs), [execs])

  const porJanela = useMemo(() => {
    const map = new Map()
    execs.forEach(e => {
      if (!e.janelaPagamento) return
      const cur = map.get(e.janelaPagamento) ?? { qtd: 0, valor: 0 }
      cur.qtd += 1; cur.valor += e.valorPago
      map.set(e.janelaPagamento, cur)
    })
    return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([janela,v]) => ({ janela, label: fmtDate(janela), ...v }))
  }, [execs])

  const devApPago  = useMemo(() => avgDesvio(execs, desvioApontadoVsPago), [execs])
  const devOrcPago = useMemo(() => avgDesvio(execs, desvioOrcadoVsPago),   [execs])

  const totalPago  = statusBkdn.reduce((a,b) => a + b.valor, 0)
  const pagoItem   = statusBkdn.find(s => s.status === 'PAGO')
  const pctPago    = totalPago > 0 && pagoItem ? (pagoItem.valor / totalPago) * 100 : 0

  const desviosPorTipo = useMemo(() => {
    const tipos = [...new Set(execs.map(e => e.tipoExecucao))]
    return tipos.map(tipo => {
      const sub = execs.filter(e => e.tipoExecucao === tipo)
      return {
        name:            tipo,
        desvioApVsPago:  avgDesvio(sub, desvioApontadoVsPago)  ?? 0,
        desvioOrcVsPago: avgDesvio(sub, desvioOrcadoVsPago)    ?? 0,
      }
    })
  }, [execs])

  const devColor = v => v === null ? 'muted' : Math.abs(v) < 5 ? 'emerald' : Math.abs(v) < 15 ? 'amber' : 'rose'

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader title="Pagamento" subtitle="Status, desvios financeiros e gargalos no ciclo de pagamento" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ ...G, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KPICard label="Total Pago"          value={fmtBRL(pagoItem?.valor ?? 0)} sub={`${pctPago.toFixed(1)}% do total`} accent="emerald"/>
          <KPICard label="Qtd. PAGO"           value={(pagoItem?.qtd ?? 0).toLocaleString()} accent="emerald"/>
          <KPICard label="Desvio Apont. vs Pago" value={devApPago  !== null ? `${devApPago.toFixed(1)}%`  : '—'} accent={devColor(devApPago)}/>
          <KPICard label="Desvio Orç. vs Pago"   value={devOrcPago !== null ? `${devOrcPago.toFixed(1)}%` : '—'} accent={devColor(devOrcPago)}/>
        </div>

        <div style={{ ...G, gridTemplateColumns: '1fr 2fr' }}>
          <ChartCard title="Distribuição por Status" subtitle="% do valor total">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusBkdn} dataKey="valor" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                  {statusBkdn.map((s,i) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? CHART_PALETTE[i%CHART_PALETTE.length]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend formatter={v=><span style={{fontSize:10,color:'#94A3B8'}}>{v}</span>} iconType="circle" iconSize={7}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Valor por Janela de Pagamento" subtitle="Total pago por mês">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porJanela} margin={{top:4,right:8,left:0,bottom:0}}>
                <XAxis dataKey="label" tick={{fill:'#94A3B8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="valor" name="Valor Pago" fill="#10B981" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Desvios Financeiros por Tipo" subtitle="% diferença média">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={desviosPorTipo} margin={{top:4,right:8,left:0,bottom:0}}>
              <XAxis dataKey="name" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis unit="%" tick={{fill:'#94A3B8',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip currency={false}/>}/>
              <Bar dataKey="desvioApVsPago"  name="Apontado vs Pago" fill="#6366F1" radius={[4,4,0,0]}/>
              <Bar dataKey="desvioOrcVsPago" name="Orçado vs Pago"   fill="#F59E0B" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tabela */}
        <ChartCard title="Detalhamento por Status">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{color:'#94A3B8',fontSize:10,textTransform:'uppercase',letterSpacing:'.05em'}}>
                <th style={{textAlign:'left', padding:'8px 12px 8px 0',fontWeight:500}}>Status</th>
                <th style={{textAlign:'right',padding:'8px 12px',       fontWeight:500}}>Qtd.</th>
                <th style={{textAlign:'right',padding:'8px 0 8px 12px', fontWeight:500}}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {statusBkdn.map(s => (
                <tr key={s.status} style={{borderTop:'1px solid rgba(28,35,64,.6)'}}>
                  <td style={{padding:'10px 12px 10px 0'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[s.status]??'#94A3B8'}}/>
                      <span style={{color:'#fff'}}>{s.status||'—'}</span>
                    </div>
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",color:'#94A3B8'}}>{s.qtd.toLocaleString('pt-BR')}</td>
                  <td style={{padding:'10px 0 10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:'#fff'}}>{fmtBRL(s.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{borderTop:'1px solid #1C2340'}}>
              <tr>
                <td style={{padding:'10px 12px 10px 0',fontWeight:600,color:'#fff'}}>Total</td>
                <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:'#fff'}}>{statusBkdn.reduce((a,b)=>a+b.qtd,0).toLocaleString()}</td>
                <td style={{padding:'10px 0 10px 12px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:'#F59E0B'}}>{fmtBRL(totalPago)}</td>
              </tr>
            </tfoot>
          </table>
        </ChartCard>

        {/* Gargalos */}
        {(() => {
          const gargalos = statusBkdn.filter(s => s.status !== 'PAGO' && s.valor > 0)
          if (!gargalos.length) return null
          const gc = s => s === 'SEM UV' ? '#F59E0B' : s === 'SEM PAGAMENTO' ? '#6366F1' : '#F43F5E'
          return (
            <ChartCard title="⚠ Gargalos Identificados" subtitle="Execuções com valor sem confirmação de pagamento">
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
                {gargalos.map(g => (
                  <div key={g.status} style={{border:`1px solid ${gc(g.status)}33`,background:`${gc(g.status)}0a`,borderRadius:12,padding:'14px 16px'}}>
                    <p style={{fontSize:11,color:'#94A3B8',marginBottom:4}}>{g.status}</p>
                    <p style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:'#fff'}}>{fmtBRL(g.valor)}</p>
                    <p style={{fontSize:11,color:'#475569',marginTop:3}}>{g.qtd} registros</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          )
        })()}

      </div>
    </div>
  )
}
