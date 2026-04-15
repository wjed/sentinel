import React, { useState, useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { getResolvedConfig } from '../auth/resolvedConfig'
import { hasAllowedGroup } from '../auth/access'

function SeverityBadge({ level }) {
  let color = 'var(--text-dim)'
  let label = 'Low'
  if (level >= 12) { color = '#ff4d4d'; label = 'Critical' }
  else if (level >= 7) { color = '#ffa500'; label = 'High' }
  else if (level >= 3) { color = 'var(--primary)'; label = 'Medium' }

  return (
    <span style={{
      fontSize: '0.55rem',
      padding: '0.1rem 0.4rem',
      borderRadius: '4px',
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}44`,
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label} (L{level})
    </span>
  )
}

export default function Alerts() {
  const auth = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAlerts = async () => {
    const config = getResolvedConfig()
    const apiUrl = config?.telemetryApiUrl
    const token = auth.user?.access_token ?? auth.user?.id_token
    if (!apiUrl || !token || !hasAllowedGroup(auth.user)) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${apiUrl}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 403) throw new Error('Access denied')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Connection lost. Retrying...')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auth.isAuthenticated) return
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000) // Polling every 10s for POC
    return () => clearInterval(interval)
  }, [auth.isAuthenticated, auth.user])

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Alerts</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Real-time security detections from your fleet
            </p>
          </div>
          {error && <span style={{ color: '#ff4d4d', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{error}</span>}
        </div>

        <div className="panel">
          <div className="panel-header">Live Alert Feed</div>
          <div className="panel-body" style={{ minHeight: 400, flexDirection: 'column', padding: 0 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                INITIALIZING STREAM...
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                NO ALERTS RECORDED IN CURRENT SESSION
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                {alerts.map((alert, idx) => (
                  <div key={alert.sk || idx} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 100px',
                    gap: '1rem',
                    alignItems: 'center',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {alert.timestamp?.split('T')[1]?.split('.')[0] || '00:00:00'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 500, marginBottom: '0.1rem' }}>
                        {alert.rule?.description || 'Unknown event'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        AGENT: {alert.agent?.name || 'Manager'} • {alert.rule?.id || '000'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <SeverityBadge level={alert.level || alert.rule?.level || 0} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
