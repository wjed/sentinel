/**
 * Single polling source for all dashboard-api data, shared across pages.
 *
 * Without this, each page mounts its own useEffect + fetch, so navigating
 * between tabs causes the whole panel to flicker back to a loading state.
 * Here we poll once at the layout level, cache the responses, and pages
 * just read from context — switching tabs is instant with stale-while-
 * revalidate behavior.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from 'react-oidc-context'

const Ctx = createContext(null)

const ENDPOINTS = {
  kpis:      { url: '/api/dashboard/kpis',       interval: 30000 },
  health:    { url: '/api/dashboard/health',     interval: 30000 },
  alerts:    { url: '/api/dashboard/alerts',     interval: 10000 },
  cases:     { url: '/api/dashboard/cases',      interval: 30000 },
  agents:    { url: '/api/dashboard/agents',     interval: 30000 },
  agentInfo: { url: '/api/dashboard/agent-info', interval: 300000 },
}

export function DashboardDataProvider({ children }) {
  const auth = useAuth()
  const [data, setData] = useState({})
  const [errors, setErrors] = useState({})
  const timersRef = useRef({})

  const fetchOne = useCallback(async (key, url) => {
    const token = auth.user?.access_token ?? auth.user?.id_token
    if (!token) return
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(d => ({ ...d, [key]: json }))
      setErrors(e => ({ ...e, [key]: null }))
    } catch (err) {
      setErrors(e => ({ ...e, [key]: err.message }))
    }
  }, [auth.user])

  useEffect(() => {
    if (!auth.isAuthenticated) return
    // Kick all fetches once, then schedule per-key intervals.
    Object.entries(ENDPOINTS).forEach(([key, { url, interval }]) => {
      fetchOne(key, url)
      timersRef.current[key] = setInterval(() => fetchOne(key, url), interval)
    })
    return () => {
      Object.values(timersRef.current).forEach(clearInterval)
      timersRef.current = {}
    }
  }, [auth.isAuthenticated, auth.user, fetchOne])

  const refresh = useCallback((key) => {
    if (!key) {
      Object.entries(ENDPOINTS).forEach(([k, { url }]) => fetchOne(k, url))
      return
    }
    const e = ENDPOINTS[key]
    if (e) fetchOne(key, e.url)
  }, [fetchOne])

  return (
    <Ctx.Provider value={{ data, errors, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider')
  return ctx
}
