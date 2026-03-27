import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, SlidersHorizontal, Zap, AlertTriangle, RefreshCw, Calendar } from 'lucide-react'
import { useData } from '../context/DataContext'

// ── KPI Card ──────────────────────────────────────────────────────────────────
const ACCENT = {
  amber:   { border: 'rgba(245,158,11,.2)',  icon: 'rgba(245,158,11,.1)',  iconC: '#F59E0B', shadow: 'rgba(245,158,11,.05)' },
  indigo:  { border: 'rgba(99,102,241,.2)',  icon: 'rgba(99,102,241,.1)',  iconC: '#6366F1', shadow: 'rgba(99,102,241,.05)' },
  emerald: { border: 'rgba(16,185,129,.2)',  icon: 'rgba(16,185,129,.1)',  iconC: '#10B981', shadow: 'rgba(16,185,129,.05)' },
  rose:    { border: 'rgba(244,63,94,.2)',   icon: 'rgba(244,63,94,.1)',   iconC: '#F43F5E', shadow: 'rgba(244,63,94,.05)'  },
  muted:   { border: '#1C2340',             icon: '#131829',              iconC: '#94A3B8', shadow: 'transparent'          },
}

export function KPICard({ label, value, sub, icon, accent = 'muted', trend, compact = false }) {
  const a = ACCENT[accent] ?? ACCENT.muted
  return (
    <div style={{
      background: '#0E1225', borderRadius: 12, border: `1px solid ${a.border}`,
      padding: compact ? '12px 14px' : '18px 20px',
      display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12,
      boxShadow: `0 0 20px ${a.shadow}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* [FIX] label não quebra linha no modo compact */}
        <p style={{
          fontSize: 10, color: '#94A3B8', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</p>
        {icon && (
          <div style={{ width: 30, height: 30, borderRadius: 8, background: a.icon, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.iconC, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        {/* [FIX] fonte 14px no modo compact + truncamento com ellipsis */}
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: compact ? 14 : 22,
          fontWeight: 700, color: '#fff', lineHeight: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{sub}</p>}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: trend.value >= 0 ? '#10B981' : '#F43F5E' }}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ── Chart Card ────────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, children, style, action }) {
  return (
    <div style={{ background: '#0E1225', borderRadius: 12, border: '1px solid #1C2340', padding: 20, ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(8,11,24,.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1C2340', padding: '16px 24px',
    }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{subtitle}</p>}
      </div>
      <FilterBar />
    </div>
  )
}

// ── Multi Select ──────────────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = v => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          borderRadius: 8, border: selected.length > 0 ? '1px solid rgba(245,158,11,.4)' : '1px solid #1C2340',
          background: selected.length > 0 ? 'rgba(245,158,11,.1)' : '#131829',
          color: selected.length > 0 ? '#F59E0B' : '#94A3B8',
          fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
        }}
      >
        {label}
        {selected.length > 0 && (
          <span style={{
            background: '#F59E0B', color: '#080B18', borderRadius: '50%',
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700,
          }}>{selected.length}</span>
        )}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: '#0E1225', border: '1px solid #1C2340', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,.5)', padding: 4,
          minWidth: 220, maxHeight: 260, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                background: selected.includes(opt) ? 'rgba(245,158,11,.1)' : 'transparent',
                color: selected.includes(opt) ? '#F59E0B' : '#94A3B8',
                border: 'none', fontFamily: 'inherit', transition: 'all .1s',
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                border: selected.includes(opt) ? '1px solid #F59E0B' : '1px solid #475569',
                background: selected.includes(opt) ? '#F59E0B' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {selected.includes(opt) && <span style={{ fontSize: 8, color: '#080B18', fontWeight: 700 }}>✓</span>}
              </div>
              {opt}
            </button>
          ))}
          {options.length === 0 && <p style={{ fontSize: 11, color: '#94A3B8', padding: '8px 12px' }}>Sem opções</p>}
        </div>
      )}
    </div>
  )
}

// ── Date Range Picker ─────────────────────────────────────────────────────────
function DateRangePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const hasValue = dateFrom || dateTo

  const fmtDisplay = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const label = hasValue
    ? `${fmtDisplay(dateFrom) || '∞'} → ${fmtDisplay(dateTo) || '∞'}`
    : 'Período'

  const quickSelect = (months) => {
    const now = new Date()
    const from = new Date(now)
    from.setMonth(from.getMonth() - months + 1)
    from.setDate(1)
    const toIso  = now.toISOString().slice(0, 10)
    const fromIso = from.toISOString().slice(0, 10)
    onChange(fromIso, toIso)
    setOpen(false)
  }

  const quickYear = () => {
    const now = new Date()
    const from = `${now.getFullYear()}-01-01`
    const to   = now.toISOString().slice(0, 10)
    onChange(from, to)
    setOpen(false)
  }

  const inputStyle = {
    background: '#080B18', border: '1px solid #1C2340', borderRadius: 8,
    color: '#fff', padding: '6px 10px', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', width: '100%', colorScheme: 'dark',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          borderRadius: 8, border: hasValue ? '1px solid rgba(245,158,11,.4)' : '1px solid #1C2340',
          background: hasValue ? 'rgba(245,158,11,.1)' : '#131829',
          color: hasValue ? '#F59E0B' : '#94A3B8',
          fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          whiteSpace: 'nowrap',
        }}
      >
        <Calendar size={11} />
        {label}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: '#0E1225', border: '1px solid #1C2340', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,.6)', padding: 16, minWidth: 280,
        }}>
          <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Atalhos</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Último mês',  fn: () => quickSelect(1)  },
              { label: 'Últimos 3m',  fn: () => quickSelect(3)  },
              { label: 'Últimos 6m',  fn: () => quickSelect(6)  },
              { label: 'Último ano',  fn: () => quickSelect(12) },
              { label: 'Este ano',    fn: quickYear              },
            ].map(q => (
              <button
                key={q.label}
                onClick={q.fn}
                style={{
                  padding: '5px 10px', borderRadius: 7, border: '1px solid #1C2340',
                  background: '#131829', color: '#94A3B8', fontSize: 10, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all .1s',
                }}
                onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(245,158,11,.3)' }}
                onMouseLeave={e => { e.target.style.color = '#94A3B8'; e.target.style.borderColor = '#1C2340' }}
              >
                {q.label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Personalizado</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>De</p>
              <input type="date" value={dateFrom} onChange={e => onChange(e.target.value, dateTo)} style={inputStyle} />
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Até</p>
              <input type="date" value={dateTo} onChange={e => onChange(dateFrom, e.target.value)} style={inputStyle} />
            </div>
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={() => { onChange('', ''); setOpen(false) }}
              style={{
                marginTop: 12, width: '100%', padding: '7px', borderRadius: 8,
                border: '1px solid rgba(244,63,94,.3)', background: 'transparent',
                color: '#F43F5E', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <X size={10} /> Limpar período
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
export function FilterBar() {
  const { data, filters, setFilter, clearFilters } = useData()
  if (!data) return null

  const ex      = data.execucoes
  const tipos   = [...new Set(ex.map(e => e.tipoExecucao))].filter(Boolean).sort()
  const status  = [...new Set(ex.map(e => e.statusPagamento))].filter(Boolean).sort()
  const estados = [...new Set(ex.map(e => e.workflowStatus))].filter(Boolean).sort()

  const hasActive = filters.tipoExecucao.length > 0 ||
                    filters.statusPagamento.length > 0 ||
                    filters.estado.length > 0 ||
                    filters.dateFrom || filters.dateTo ||
                    filters.payFrom  || filters.payTo

  const divider = (
    <div style={{ width: 1, height: 24, background: '#1C2340', flexShrink: 0 }} />
  )

  const groupLabel = (txt) => (
    <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>
      {txt}
    </span>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

      {/* ── Tipo / Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 11 }}>
        <SlidersHorizontal size={11} />
        <span>Filtros</span>
      </div>
      <MultiSelect
        label="Tipo"
        options={tipos}
        selected={filters.tipoExecucao}
        onChange={v => setFilter('tipoExecucao', v)}
      />
      <MultiSelect
        label="Status"
        options={status}
        selected={filters.statusPagamento}
        onChange={v => setFilter('statusPagamento', v)}
      />
      <MultiSelect
        label="Estado"
        options={estados}
        selected={filters.estado}
        onChange={v => setFilter('estado', v)}
      />

      {divider}

      {/* ── Janela de Envio ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {groupLabel('Janela de envio')}
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(from, to) => { setFilter('dateFrom', from); setFilter('dateTo', to) }}
        />
      </div>

      {divider}

      {/* ── Janela de Pagamento ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {groupLabel('Janela de pagamento')}
        <DateRangePicker
          dateFrom={filters.payFrom}
          dateTo={filters.payTo}
          onChange={(from, to) => { setFilter('payFrom', from); setFilter('payTo', to) }}
        />
      </div>

      {hasActive && (
        <button
          onClick={clearFilters}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
            borderRadius: 8, border: '1px solid rgba(244,63,94,.3)', background: 'transparent',
            color: '#F43F5E', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <X size={10} /> Limpar
        </button>
      )}
    </div>
  )
}

// ── Loading / Error ───────────────────────────────────────────────────────────
export function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="#F59E0B" fill="#F59E0B" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#fff', fontWeight: 500 }}>Carregando dados…</p>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Buscando planilhas do Google Sheets</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', animation: `bounce 1s ${i * 0.15}s ease-in-out infinite` }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={20} color="#F43F5E" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#fff', fontWeight: 500 }}>Erro ao carregar dados</p>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, maxWidth: 300 }}>{message}</p>
      </div>
      <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: '1px solid #1C2340', background: '#131829', color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
        <RefreshCw size={13} /> Tentar novamente
      </button>
    </div>
  )
}

// ── SLA Farol ─────────────────────────────────────────────────────────────────
export function SLAFarol({ label, value, thresholds = [7, 15], count, subtitle }) {
  const status = value === null ? 'none' : value <= thresholds[0] ? 'ok' : value <= thresholds[1] ? 'warn' : 'crit'
  const S = {
    none: { dot: '#475569', text: '#94A3B8', badge: '#1C2340',               bdg: '#475569',               lbl: '—'       },
    ok:   { dot: '#10B981', text: '#10B981', badge: 'rgba(16,185,129,.1)',   bdg: 'rgba(16,185,129,.3)',   lbl: 'Ótimo'   },
    warn: { dot: '#F59E0B', text: '#F59E0B', badge: 'rgba(245,158,11,.1)',   bdg: 'rgba(245,158,11,.3)',   lbl: 'Alerta'  },
    crit: { dot: '#F43F5E', text: '#F43F5E', badge: 'rgba(244,63,94,.1)',    bdg: 'rgba(244,63,94,.3)',    lbl: 'Crítico' },
  }[status]

  return (
    <div style={{ background: '#131829', border: '1px solid #1C2340', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: S.dot, flexShrink: 0, boxShadow: status !== 'none' ? `0 0 8px ${S.dot}` : 'none' }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>{label}</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: S.text, lineHeight: 1.2, marginTop: 3 }}>
          {value !== null ? `${value} dias` : '—'}
        </p>
        {count !== undefined && count > 0 && (
          <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{count} registros com dados</p>
        )}
        {subtitle && (
          <p style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: S.badge, border: `1px solid ${S.bdg}`, color: S.text, whiteSpace: 'nowrap' }}>
        {S.lbl}
      </span>
    </div>
  )
}

// ── Recharts Custom Tooltip ───────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, currency = true }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0E1225', border: '1px solid #1C2340', borderRadius: 10, padding: '10px 14px', fontSize: 11, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
      {label && <p style={{ color: '#94A3B8', marginBottom: 8, fontWeight: 500 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: i > 0 ? 4 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color ?? '#6366F1' }} />
            <span style={{ color: '#94A3B8' }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#fff' }}>
            {currency
              ? (p.value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : (p.value ?? 0).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}
