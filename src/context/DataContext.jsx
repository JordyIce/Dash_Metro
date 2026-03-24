import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const Ctx = createContext(null)

const EMPTY = { tipoExecucao: [], statusPagamento: [], janelaEnvio: [], janelaPagamento: [] }

export function DataProvider({ children }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filters, setFilters] = useState(EMPTY)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/sheets')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setFilter = useCallback((key, val) => {
    setFilters(f => ({ ...f, [key]: val }))
  }, [])

  const clearFilters = useCallback(() => setFilters(EMPTY), [])

  return (
    <Ctx.Provider value={{ data, loading, error, filters, setFilter, clearFilters, refresh: load }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData must be inside DataProvider')
  return ctx
}
