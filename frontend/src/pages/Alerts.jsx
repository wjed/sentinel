import React, { useState, useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { getResolvedConfig } from '../auth/resolvedConfig'
import { hasAllowedGroup } from '../auth/access'

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityLabel(level) {
  if (level >= 12) return { label: 'Critical', color: '#ef4444' }
  if (level >= 7)  return { label: 'High',     color: '#eab308' }
  if (level >= 3)  return { label: 'Medium',   color: '#a78bfa' }
  return                  { label: 'Low',      color: '#22c55e' }
}

function SeverityBadge({ level }) {
  const { label, color } = severityLabel(level)
  return (
    <span style={{
      fontSize: '0.55rem',
      padding: '0.1rem 0.4rem',
      borderRadius: '4px',
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {label} (L{level})
    </span>
  )
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Realistic Wazuh alert shapes. In production these come from GET /alerts.

const MOCK_ALERTS = [
  { sk: 'alert-001', timestamp: '2024-04-08T14:52:11.000Z', agent: { id: '003', name: 'prod-web-01' }, rule: { id: '5710', description: 'SSH brute force: multiple authentication failures', level: 10 }, data: { srcip: '185.220.101.47' } },
  { sk: 'alert-002', timestamp: '2024-04-08T14:51:04.000Z', agent: { id: '007', name: 'fin-srv-03'   }, rule: { id: '87105', description: 'Malware - EICAR test file detected', level: 14 }, data: { srcip: null } },
  { sk: 'alert-003', timestamp: '2024-04-08T14:49:37.000Z', agent: { id: '003', name: 'prod-web-01' }, rule: { id: '5710', description: 'SSH brute force: multiple authentication failures', level: 10 }, data: { srcip: '185.220.101.47' } },
  { sk: 'alert-004', timestamp: '2024-04-08T14:47:19.000Z', agent: { id: '011', name: 'dmz-proxy-02' }, rule: { id: '80792', description: 'sudo: command execution by non-root user', level: 6 }, data: { srcip: null } },
  { sk: 'alert-005', timestamp: '2024-04-08T14:45:02.000Z', agent: { id: '005', name: 'db-primary'  }, rule: { id: '554',   description: 'File modified in /etc directory', level: 5 }, data: { srcip: null } },
  { sk: 'alert-006', timestamp: '2024-04-08T14:43:55.000Z', agent: { id: '003', name: 'prod-web-01' }, rule: { id: '5503',  description: 'SSH login success from unknown IP address', level: 9 }, data: { srcip: '91.108.56.130' } },
  { sk: 'alert-007', timestamp: '2024-04-08T14:41:22.000Z', agent: { id: '002', name: 'jump-host'   }, rule: { id: '530',   description: 'Attempt to login using a non-existent user', level: 5 }, data: { srcip: '45.83.66.200' } },
  { sk: 'alert-008', timestamp: '2024-04-08T14:38:11.000Z', agent: { id: '009', name: 'k8s-node-01' }, rule: { id: '31103', description: 'Web attack: SQL injection attempt detected', level: 12 }, data: { srcip: '103.27.228.11' } },
  { sk: 'alert-009', timestamp: '2024-04-08T14:36:48.000Z', agent: { id: '007', name: 'fin-srv-03'  }, rule: { id: '510',   description: 'Host-based anomaly detection event', level: 7 }, data: { srcip: null } },
  { sk: 'alert-010', timestamp: '2024-04-08T14:34:03.000Z', agent: { id: '011', name: 'dmz-proxy-02'}, rule: { id: '31151', description: 'Web attack: XSS attempt in HTTP request', level: 8 }, data: { srcip: '62.204.41.183' } },
  { sk: 'alert-011', timestamp: '2024-04-08T14:31:57.000Z', agent: { id: '003', name: 'prod-web-01' }, rule: { id: '5710',  description: 'SSH brute force: multiple authentication failures', level: 10 }, data: { srcip: '185.220.101.47' } },
  { sk: 'alert-012', timestamp: '2024-04-08T14:29:14.000Z', agent: { id: '005', name: 'db-primary'  }, rule: { id: '31108', description: 'Web attack: Remote file inclusion attempt', level: 11 }, data: { srcip: '194.165.16.78' } },
  { sk: 'alert-013', timestamp: '2024-04-08T14:26:30.000Z', agent: { id: '002', name: 'jump-host'   }, rule: { id: '5503',  description: 'SSH login success from unknown IP address', level: 9 }, data: { srcip: '77.83.142.22' } },
  { sk: 'alert-014', timestamp: '2024-04-08T14:22:07.000Z', agent: { id: '009', name: 'k8s-node-01' }, rule: { id: '80792', description: 'sudo: command execution by non-root user', level: 6 }, data: { srcip: null } },
  { sk: 'alert-015', timestamp: '2024-04-08T14:18:44.000Z', agent: { id: '007', name: 'fin-srv-03'  }, rule: { id: '554',   description: 'File modified in /etc directory', level: 5 }, data: { srcip: null } },
]

// Hourly alert counts for the last 24h (index 0 = 00:00, index 23 = 23:00)
const HOURLY_COUNTS = [18,12,8,6,14,22,45,92,110,88,74,63,58,71,84,99,87,76,68,55,48,42,37,31]

const AGENTS = ['All Agents', 'prod-web-01', 'fin-srv-03', 'dmz-proxy-02', 'db-primary', 'jump-host', 'k8s-node-01']
const SEVERITIES = ['All Severities', 'Critical', 'High', 'Medium', 'Low']

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({ filters, onChange }) {
  const inputStyle = {
    padding: '0.45rem 0.75rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    cursor: 'pointer',
  }
  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <select style={inputStyle} value={filters.severity} onChange={e => onChange({ ...filters, severity: e.target.value })}>
        {SEVERITIES.map(s => <option key={s}>{s}</option>)}
      </select>
      <select style={inputStyle} value={filters.agent} onChange={e => onChange({ ...filters, agent: e.target.value })}>
        {AGENTS.map(a => <option key={a}>{a}</option>)}
      </select>
      <input
        type="text"
        placeholder="Rule ID search…"
        style={{ ...inputStyle, width: 160, cursor: 'text' }}
        value={filters.ruleId}
        onChange={e => onChange({ ...filters, ruleId: e.target.value })}
      />
      <select style={inputStyle} value={filters.range} onChange={e => onChange({ ...filters, range: e.target.value })}>
        {['Last 24h', 'Last 6h', 'Last 1h', 'Last 7d'].map(r => <option key={r}>{r}</option>)}
      </select>
      {(filters.severity !== 'All Severities' || filters.agent !== 'All Agents' || filters.ruleId) && (
        <button
          style={{ ...inputStyle, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-bg)', cursor: 'pointer' }}
          onClick={() => onChange({ severity: 'All Severities', agent: 'All Agents', ruleId: '', range: 'Last 24h' })}
        >
          Clear
        </button>
      )}
    </div>
  )
}

function AlertVolumeChart({ counts }) {
  const max = Math.max(...counts)
  const now = new Date().getHours()
  return (
    <div style={{ padding: '0.75rem 1rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
        {counts.map((c, i) => {
          const isNow = i === now
          const h = Math.round((c / max) * 100)
          return (
            <div
              key={i}
              title={`${String(i).padStart(2,'0')}:00 — ${c} alerts`}
              style={{
                flex: 1,
                height: `${h}%`,
                minHeight: 2,
                background: isNow ? 'var(--accent)' : c > 80 ? '#ef444466' : 'var(--border)',
                borderRadius: '1px 1px 0 0',
                transition: 'height 0.3s',
                cursor: 'default',
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
        {['00:00', '06:00', '12:00', '18:00', '23:00'].map(t => (
          <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)' }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Alerts() {
<<<<<<< HEAD
  const [liveAlerts, setLiveAlerts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filters, setFilters]       = useState({
    severity: 'All Severities',
    agent:    'All Agents',
    ruleId:   '',
    range:    'Last 24h',
  })
=======
  const auth = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
>>>>>>> 205ccb0b90376f5a19c8ece78ac68459c44db6ae

  const fetchAlerts = async () => {
    const config = getResolvedConfig()
    const apiUrl = config?.telemetryApiUrl
<<<<<<< HEAD
    if (!apiUrl) { setLoading(false); return }
    try {
      const res = await fetch(`${apiUrl}/alerts`)
      if (!res.ok) throw new Error('Failed to fetch alerts')
      const data = await res.json()
      setLiveAlerts(Array.isArray(data) ? data : [])
=======
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
>>>>>>> 205ccb0b90376f5a19c8ece78ac68459c44db6ae
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
<<<<<<< HEAD
    const iv = setInterval(fetchAlerts, 10000)
    return () => clearInterval(iv)
  }, [])
=======
    const interval = setInterval(fetchAlerts, 10000) // Polling every 10s for POC
    return () => clearInterval(interval)
  }, [auth.isAuthenticated, auth.user])
>>>>>>> 205ccb0b90376f5a19c8ece78ac68459c44db6ae

  // Use live data when available, fall back to mock
  const source = liveAlerts.length > 0 ? liveAlerts : MOCK_ALERTS

  const filtered = source.filter(a => {
    const level = a.level || a.rule?.level || 0
    if (filters.severity !== 'All Severities' && severityLabel(level).label !== filters.severity) return false
    if (filters.agent !== 'All Agents' && a.agent?.name !== filters.agent) return false
    if (filters.ruleId && !(a.rule?.id || '').includes(filters.ruleId)) return false
    return true
  })

  const totalToday = HOURLY_COUNTS.reduce((a, b) => a + b, 0)

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Alerts</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Wazuh detections — real-time security event stream
            </p>
          </div>
          {error && <span style={{ color: '#ff4d4d', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{error}</span>}
        </div>

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}
          className="dashboard-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Alerts (24h)</div>
            <div className="kpi-value">{totalToday.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Critical</div>
            <div className="kpi-value" style={{ color: '#ef4444' }}>
              {source.filter(a => (a.level || a.rule?.level || 0) >= 12).length}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">High</div>
            <div className="kpi-value" style={{ color: '#eab308' }}>
              {source.filter(a => { const l = a.level || a.rule?.level || 0; return l >= 7 && l < 12 }).length}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Showing</div>
            <div className="kpi-value">{filtered.length}</div>
            <div className="kpi-sub">after filters</div>
          </div>
        </div>

        {/* Alert Volume mini chart */}
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <div className="panel-header">
            <span>Alert Volume — Last 24h</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
              {totalToday.toLocaleString()} TOTAL · PURPLE BAR = CURRENT HOUR
            </span>
          </div>
          <AlertVolumeChart counts={HOURLY_COUNTS} />
        </div>

        {/* Filter bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Alert table */}
        <div className="panel">
          <div className="panel-header">
            <span>Live Alert Feed</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
              {liveAlerts.length > 0 ? 'LIVE · POLLING 10s' : 'MOCK DATA · CONNECT API TO GO LIVE'}
            </span>
          </div>
          <div className="panel-body" style={{ minHeight: 400, flexDirection: 'column', padding: 0 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                INITIALIZING STREAM...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                NO ALERTS MATCH CURRENT FILTERS
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Agent</th>
                      <th>Rule ID</th>
                      <th style={{ minWidth: 260 }}>Description</th>
                      <th>Severity</th>
                      <th>Source IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((alert, idx) => {
                      const level = alert.level || alert.rule?.level || 0
                      const ts    = alert.timestamp
                      const date  = ts ? new Date(ts) : null
                      const timeStr = date
                        ? date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'
                      const dateStr = date
                        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : ''
                      return (
                        <tr key={alert.sk || idx}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{timeStr}</span>
                            {dateStr && <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', marginLeft: 4 }}>{dateStr}</span>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--text)', fontSize: '0.72rem' }}>{alert.agent?.name || 'manager'}</span>
                            <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', marginLeft: 6 }}>
                              #{alert.agent?.id || '000'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>
                              {alert.rule?.id || '—'}
                            </span>
                          </td>
                          <td style={{ maxWidth: 280 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
                              {alert.rule?.description || 'Unknown event'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <SeverityBadge level={level} />
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: alert.data?.srcip ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                              {alert.data?.srcip || '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
