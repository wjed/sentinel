import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─── Mock data — realistic TheHive v5 case shapes ─────────────────────────────

const MOCK_CASES = [
  {
    id: 'CS-2024-047',
    title: 'SSH Brute-Force Campaign — prod-web-01',
    severity: 'High',
    status: 'In Progress',
    assignee: 'n.reed',
    createdAt: '2024-04-08T14:52:00Z',
    updatedAt: '2024-04-08T15:30:00Z',
    tags: ['ssh', 'brute-force'],
  },
  {
    id: 'CS-2024-046',
    title: 'Malware beacon detected — fin-srv-03',
    severity: 'Critical',
    status: 'Open',
    assignee: 'unassigned',
    createdAt: '2024-04-08T13:11:00Z',
    updatedAt: '2024-04-08T13:11:00Z',
    tags: ['malware', 'c2'],
  },
  {
    id: 'CS-2024-045',
    title: 'Privilege escalation via sudo exploit',
    severity: 'High',
    status: 'Open',
    assignee: 'd.patel',
    createdAt: '2024-04-07T22:04:00Z',
    updatedAt: '2024-04-08T09:17:00Z',
    tags: ['privesc', 'sudo'],
  },
  {
    id: 'CS-2024-044',
    title: 'Lateral movement attempt — DMZ segment',
    severity: 'High',
    status: 'In Progress',
    assignee: 'j.warren',
    createdAt: '2024-04-07T18:30:00Z',
    updatedAt: '2024-04-08T11:45:00Z',
    tags: ['lateral-movement'],
  },
  {
    id: 'CS-2024-043',
    title: 'Suspicious outbound DNS — possible C2 beacon',
    severity: 'High',
    status: 'Open',
    assignee: 'unassigned',
    createdAt: '2024-04-07T14:55:00Z',
    updatedAt: '2024-04-07T14:55:00Z',
    tags: ['dns', 'c2'],
  },
  {
    id: 'CS-2024-042',
    title: 'SQL injection attempt on login endpoint',
    severity: 'Medium',
    status: 'Resolved',
    assignee: 'n.reed',
    createdAt: '2024-04-06T10:22:00Z',
    updatedAt: '2024-04-06T12:48:00Z',
    tags: ['sqli', 'web'],
  },
  {
    id: 'CS-2024-041',
    title: 'Unauthorized access to /admin panel',
    severity: 'Medium',
    status: 'Resolved',
    assignee: 'd.patel',
    createdAt: '2024-04-05T16:07:00Z',
    updatedAt: '2024-04-05T18:33:00Z',
    tags: ['web', 'authz'],
  },
  {
    id: 'CS-2024-040',
    title: 'Crypto miner detected on k8s-node-01',
    severity: 'High',
    status: 'Resolved',
    assignee: 'j.warren',
    createdAt: '2024-04-04T08:15:00Z',
    updatedAt: '2024-04-04T14:02:00Z',
    tags: ['cryptominer', 'k8s'],
  },
  {
    id: 'CS-2024-039',
    title: 'Phishing link clicked — user workstation',
    severity: 'Medium',
    status: 'Resolved',
    assignee: 'n.reed',
    createdAt: '2024-04-03T11:44:00Z',
    updatedAt: '2024-04-03T15:20:00Z',
    tags: ['phishing'],
  },
  {
    id: 'CS-2024-038',
    title: 'Port scan from internal host — possible pivot',
    severity: 'Low',
    status: 'Resolved',
    assignee: 'd.patel',
    createdAt: '2024-04-02T09:30:00Z',
    updatedAt: '2024-04-02T10:05:00Z',
    tags: ['recon'],
  },
]

const SEV_COLORS = {
  Critical: '#ef4444',
  High:     '#eab308',
  Medium:   '#a78bfa',
  Low:      '#22c55e',
}

const STATUS_COLORS = {
  'Open':        '#ef4444',
  'In Progress': '#eab308',
  'Resolved':    '#22c55e',
}

const ASSIGNEES = ['All Assignees', 'n.reed', 'd.patel', 'j.warren', 'unassigned']

// ─── Sub-components ───────────────────────────────────────────────────────────

function SevBadge({ sev }) {
  const color = SEV_COLORS[sev] || 'var(--text-dim)'
  return (
    <span style={{
      fontSize: '0.55rem', padding: '0.1rem 0.4rem', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>{sev.toUpperCase()}</span>
  )
}

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || 'var(--text-dim)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}33`,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {status}
    </span>
  )
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function fmt(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Incidents() {
  const [filters, setFilters] = useState({
    status:   'All Statuses',
    severity: 'All Severities',
    assignee: 'All Assignees',
    range:    'Last 30d',
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

  const filtered = MOCK_CASES.filter(c => {
    if (filters.status   !== 'All Statuses'   && c.status   !== filters.status)   return false
    if (filters.severity !== 'All Severities' && c.severity !== filters.severity) return false
    if (filters.assignee !== 'All Assignees'  && c.assignee !== filters.assignee) return false
    return true
  })

  const counts = {
    open:       MOCK_CASES.filter(c => c.status === 'Open').length,
    inProgress: MOCK_CASES.filter(c => c.status === 'In Progress').length,
    resolved:   MOCK_CASES.filter(c => c.status === 'Resolved').length,
    total:      MOCK_CASES.length,
  }

  const hasActiveFilter = filters.status !== 'All Statuses' || filters.severity !== 'All Severities' || filters.assignee !== 'All Assignees'

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Incidents</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              TheHive case management · mock data
            </p>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.25rem 0.6rem',
            background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--accent)',
          }}>
            MOCK · THEHIVE API NOT CONNECTED
          </span>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}
          className="dashboard-kpi-grid">
          <SummaryCard label="Open"        value={counts.open}       color="#ef4444" sub="Needs triage" />
          <SummaryCard label="In Progress" value={counts.inProgress} color="#eab308" sub="Under investigation" />
          <SummaryCard label="Resolved"    value={counts.resolved}   color="#22c55e" sub="This month" />
          <SummaryCard label="Total"       value={counts.total}      sub="All cases loaded" />
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select style={inputStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            {['All Statuses', 'Open', 'In Progress', 'Resolved'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={inputStyle} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
            {['All Severities', 'Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={inputStyle} value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}>
            {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
          </select>
          <select style={inputStyle} value={filters.range} onChange={e => setFilters(f => ({ ...f, range: e.target.value }))}>
            {['Last 7d', 'Last 30d', 'Last 90d', 'All time'].map(r => <option key={r}>{r}</option>)}
          </select>
          {hasActiveFilter && (
            <button
              style={{ ...inputStyle, color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-bg)', cursor: 'pointer' }}
              onClick={() => setFilters({ status: 'All Statuses', severity: 'All Severities', assignee: 'All Assignees', range: 'Last 30d' })}
            >
              Clear
            </button>
          )}
        </div>

        {/* Case table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Cases
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
              {filtered.length} of {MOCK_CASES.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th style={{ minWidth: 240 }}>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Created</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>{c.id}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>{c.title}</div>
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        {c.tags.map(t => (
                          <span key={t} style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                            padding: '0.05rem 0.35rem', borderRadius: 3,
                            background: 'var(--primary-bg)', border: '1px solid var(--border)', color: 'var(--text-dim)',
                          }}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td><SevBadge sev={c.severity} /></td>
                    <td><StatusPill status={c.status} /></td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: c.assignee === 'unassigned' ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                        {c.assignee}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>{fmt(c.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>{fmt(c.updatedAt)}</td>
                    <td>
                      <Link to={`/incidents/${c.id}`} style={{ color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      NO CASES MATCH CURRENT FILTERS
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
