import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import Sidebar    from './components/Sidebar'
import Executivo  from './pages/Executivo'
import Faturamento from './pages/Faturamento'
import SLA        from './pages/SLA'
import Pagamento  from './pages/Pagamento'

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/"            element={<Navigate to="/executivo" replace />} />
              <Route path="/executivo"   element={<Executivo   />} />
              <Route path="/faturamento" element={<Faturamento />} />
              <Route path="/sla"         element={<SLA         />} />
              <Route path="/pagamento"   element={<Pagamento   />} />
            </Routes>
          </main>
        </div>
      </DataProvider>
    </BrowserRouter>
  )
}
