import { useState } from 'react'
import { useDashboardData } from '../contexts/DashboardDataContext'

const OS_GROUPS = ['All OS', 'Ubuntu', 'Debian', 'CentOS', 'Windows', 'macOS']
const STATUS_OPTS = ['All Statuses', 'active', 'disconnected', 'never_connected']
const GROUP_OPTS  = ['All Groups', 'web', 'db', 'windows', 'linux', 'k8s', 'dmz', 'finance', 'legacy']

const STATUS_META = {
  active:          { color: '#22c55e', label: 'Active' },
  disconnected:    { color: '#ef4444', label: 'Disconnected' },
  never_connected: { color: '#71717a', label: 'Never Connected' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const { color, label } = STATUS_META[status] || { color: 'var(--text-dim)', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}33`,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: color,
        boxShadow: status === 'active' ? `0 0 5px ${color}` : 'none',
        display: 'inline-block',
      }} />
      {label}
    </span>
  )
}

function OsBadge({ os }) {
  let icon = '🐧'
  if (os.toLowerCase().includes('windows')) icon = '⊞'
  if (os.toLowerCase().includes('macos'))   icon = ''
  return (
    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
      {icon} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{os}</span>
    </span>
  )
}

function fmtRelative(isoStr) {
  if (!isoStr) return '—'
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Assets() {
  const { data, errors } = useDashboardData()
  const agents = data.agents?.agents || []
  const error = errors.agents
  const loading = data.agents === undefined && !error
  const [filters, setFilters] = useState({
    status: 'All Statuses',
    os:     'All OS',
    group:  'All Groups',
    search: '',
  })

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

  const filtered = agents.filter(a => {
    if (filters.status !== 'All Statuses' && a.status !== filters.status) return false
    if (filters.os     !== 'All OS'       && !a.os.toLowerCase().includes(filters.os.toLowerCase())) return false
    if (filters.group  !== 'All Groups'   && !a.groups.includes(filters.group)) return false
    if (filters.search && !a.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !a.ip.includes(filters.search)) return false
    return true
  })

  const counts = {
    total:        agents.length,
    active:       agents.filter(a => a.status === 'active').length,
    disconnected: agents.filter(a => a.status === 'disconnected').length,
    never:        agents.filter(a => a.status === 'never_connected').length,
  }

  const hasFilter = filters.status !== 'All Statuses' || filters.os !== 'All OS' || filters.group !== 'All Groups' || filters.search

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Assets</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Wazuh agent inventory — monitored endpoints
            </p>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.25rem 0.6rem',
            background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: error ? '#ef4444' : 'var(--accent)',
          }}>
            {error ? `OFFLINE · ${error}` : (loading ? 'LOADING...' : `LIVE · ${agents.length} AGENTS`)}
          </span>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}
          className="dashboard-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Agents</div>
            <div className="kpi-value">{counts.total}</div>
            <div className="kpi-sub">registered</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active</div>
            <div className="kpi-value" style={{ color: '#22c55e' }}>{counts.active}</div>
            <div className="kpi-sub">reporting now</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Disconnected</div>
            <div className="kpi-value" style={{ color: '#ef4444' }}>{counts.disconnected}</div>
            <div className="kpi-sub">check required</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Never Connected</div>
            <div className="kpi-value" style={{ color: 'var(--text-dim)' }}>{counts.never}</div>
            <div className="kpi-sub">enrollment pending</div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search name or IP…"
            style={{ ...inputStyle, width: 200, cursor: 'text' }}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <select style={inputStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={inputStyle} value={filters.os} onChange={e => setFilters(f => ({ ...f, os: e.target.value }))}>
            {OS_GROUPS.map(o => <option key={o}>{o}</option>)}
          </select>
          <select style={inputStyle} value={filters.group} onChange={e => setFilters(f => ({ ...f, group: e.target.value }))}>
            {GROUP_OPTS.map(g => <option key={g}>{g}</option>)}
          </select>
          {hasFilter && (
            <button
              style={{ ...inputStyle, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-bg)', cursor: 'pointer' }}
              onClick={() => setFilters({ status: 'All Statuses', os: 'All OS', group: 'All Groups', search: '' })}
            >
              Clear
            </button>
          )}
        </div>

        {/* Agent table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Agent Inventory
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
              {filtered.length} of {agents.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Agent ID</th>
                  <th>Hostname</th>
                  <th>IP Address</th>
                  <th>OS</th>
                  <th>Version</th>
                  <th>Groups</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>
                        {agent.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.8rem' }}>
                      {agent.name}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {agent.ip}
                      </span>
                    </td>
                    <td><OsBadge os={agent.os} /></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                        {agent.version}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {agent.groups.length === 0
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>—</span>
                          : agent.groups.map(g => (
                              <span key={g} style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                                padding: '0.05rem 0.35rem', borderRadius: 3,
                                background: 'var(--primary-bg)', border: '1px solid var(--border)', color: 'var(--text-dim)',
                                whiteSpace: 'nowrap',
                              }}>{g}</span>
                            ))
                        }
                      </div>
                    </td>
                    <td><StatusBadge status={agent.status} /></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: agent.status === 'active' ? '#22c55e' : 'var(--text-dim)' }}>
                        {fmtRelative(agent.lastSeen)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      NO AGENTS MATCH CURRENT FILTERS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
