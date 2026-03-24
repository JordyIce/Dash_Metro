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
            width: 44, height: 44, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', padding: 4,
          }}>
            <img src="/logo-beq.png" alt="BeQ" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1 }}>BeQ</p>
            <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 3, lineHeight: 1 }}>Metropolitana</p>
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
