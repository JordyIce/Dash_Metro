import { NavLink } from 'react-router-dom'
import { BarChart3, TrendingUp, Clock, CreditCard, RefreshCw } from 'lucide-react'
import { useData } from '../context/DataContext'

const NAV = [
  { to: '/executivo',   label: 'Executivo',   Icon: BarChart3  },
  { to: '/faturamento', label: 'Faturamento', Icon: TrendingUp },
  { to: '/sla',         label: 'SLA',         Icon: Clock      },
  { to: '/pagamento',   label: 'Pagamento',   Icon: CreditCard },
]

export default function Sidebar() {
  const { refresh, loading, data } = useData()
  return (
    <aside style={{
      width: 224, minWidth: 224, display: 'flex', flexDirection: 'column',
      background: '#0E1225', borderRight: '1px solid #1C2340', height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1C2340' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 48, height: 36, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', padding: 0,
          }}>
            <img src="data:image/png;base64,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" alt="BeQ" style={{ width: 52, height: 40, objectFit: 'contain', display: 'block', mixBlendMode: 'screen', filter: 'brightness(2) saturate(0.6)' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1 }}>Metropolitana</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
            fontSize: 13, fontWeight: isActive ? 600 : 400, transition: 'all .15s',
            background: isActive ? 'rgba(245,158,11,.1)' : 'transparent',
            color: isActive ? '#F59E0B' : '#94A3B8',
            border: isActive ? '1px solid rgba(245,158,11,.2)' : '1px solid transparent',
          })}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid #1C2340', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data && (
          <p style={{ fontSize: 10, color: '#475569', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
            Atualizado {new Date(data.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 12px', borderRadius: 10, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
            background: 'transparent', border: '1px solid #1C2340', color: '#94A3B8',
            opacity: loading ? 0.5 : 1, transition: 'all .15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (!loading) { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(245,158,11,.4)' }}}
          onMouseLeave={e => { e.target.style.color = '#94A3B8'; e.target.style.borderColor = '#1C2340' }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
        {data && (
          <p style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
            {data.execucoes?.length ?? 0} registros
          </p>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </aside>
  )
}
