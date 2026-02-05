import { useState } from 'react'

// Mock incident data
const mockIncidents = [
  {
    id: 'INC-2024-0892',
    title: 'Ransomware Attack Attempt',
    severity: 'critical',
    status: 'open',
    assignee: 'Sarah Chen',
    source: '192.168.1.105',
    created: '2024-01-15 14:32:00',
    updated: '5 min ago',
    description: 'Detected ransomware signature attempting to encrypt files on workstation WS-FIN-042.',
    events: 47,
  },
  {
    id: 'INC-2024-0891',
    title: 'Suspicious PowerShell Execution',
    severity: 'high',
    status: 'investigating',
    assignee: 'Marcus Johnson',
    source: 'srv-app-12',
    created: '2024-01-15 13:18:00',
    updated: '12 min ago',
    description: 'Obfuscated PowerShell command detected attempting to download external payload.',
    events: 23,
  },
  {
    id: 'INC-2024-0890',
    title: 'Brute Force SSH Attack',
    severity: 'high',
    status: 'investigating',
    assignee: 'Sarah Chen',
    source: '103.45.67.89',
    created: '2024-01-15 12:45:00',
    updated: '28 min ago',
    description: 'Multiple failed SSH authentication attempts from external IP targeting production servers.',
    events: 1847,
  },
  {
    id: 'INC-2024-0889',
    title: 'Data Exfiltration Attempt',
    severity: 'critical',
    status: 'contained',
    assignee: 'Alex Rivera',
    source: 'ws-hr-007',
    created: '2024-01-15 11:22:00',
    updated: '1 hr ago',
    description: 'Large volume of data transfer to unknown external endpoint detected and blocked.',
    events: 156,
  },
  {
    id: 'INC-2024-0888',
    title: 'Phishing Email Campaign',
    severity: 'medium',
    status: 'resolved',
    assignee: 'Marcus Johnson',
    source: 'mail-gateway',
    created: '2024-01-15 09:15:00',
    updated: '3 hr ago',
    description: 'Coordinated phishing campaign targeting finance department identified and mitigated.',
    events: 342,
  },
  {
    id: 'INC-2024-0887',
    title: 'Unauthorized Access Attempt',
    severity: 'medium',
    status: 'resolved',
    assignee: 'Sarah Chen',
    source: 'vpn-gateway',
    created: '2024-01-15 08:30:00',
    updated: '4 hr ago',
    description: 'Failed VPN authentication from terminated employee credentials.',
    events: 12,
  },
  {
    id: 'INC-2024-0886',
    title: 'Cryptomining Malware Detection',
    severity: 'low',
    status: 'resolved',
    assignee: 'Alex Rivera',
    source: 'ws-dev-023',
    created: '2024-01-14 16:45:00',
    updated: '1 day ago',
    description: 'Cryptomining software detected on developer workstation, removed successfully.',
    events: 8,
  },
]

const statusConfig = {
  open: { color: 'var(--critical)', bg: 'var(--critical-bg)', label: 'Open' },
  investigating: { color: 'var(--medium)', bg: 'var(--medium-bg)', label: 'Investigating' },
  contained: { color: 'var(--high)', bg: 'var(--high-bg)', label: 'Contained' },
  resolved: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Resolved' },
}

function IncidentRow({ incident, isSelected, onClick }) {
  const status = statusConfig[incident.status]

  return (
    <tr
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-bg)' : 'transparent',
      }}
    >
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>
        {incident.id}
      </td>
      <td>
        <span className={`badge badge-${incident.severity}`}>
          {incident.severity}
        </span>
      </td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{incident.title}</td>
      <td>
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.75rem',
          background: status.bg,
          color: status.color,
        }}>
          {status.label}
        </span>
      </td>
      <td style={{ color: 'var(--text-secondary)' }}>{incident.assignee}</td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {incident.source}
      </td>
      <td style={{ color: 'var(--text-muted)' }}>{incident.updated}</td>
    </tr>
  )
}

function IncidentDetail({ incident }) {
  if (!incident) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>Select an incident to view details</p>
        </div>
      </div>
    )
  }

  const status = statusConfig[incident.status]

  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.875rem' }}>
            {incident.id}
          </span>
          <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.75rem',
            background: status.bg,
            color: status.color,
          }}>
            {status.label}
          </span>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {incident.title}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Assignee
          </div>
          <div style={{ color: 'var(--text-primary)' }}>{incident.assignee}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Source
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{incident.source}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Created
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{incident.created}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Related Events
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{incident.events.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Description
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {incident.description}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <button className="btn btn-primary" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Investigate
        </button>
        <button className="btn" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Resolve
        </button>
        <button className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Incidents() {
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [filter, setFilter] = useState('all')

  const filteredIncidents = mockIncidents.filter(incident => {
    if (filter === 'all') return true
    if (filter === 'active') return ['open', 'investigating', 'contained'].includes(incident.status)
    return incident.status === filter
  })

  const counts = {
    all: mockIncidents.length,
    active: mockIncidents.filter(i => ['open', 'investigating', 'contained'].includes(i.status)).length,
    open: mockIncidents.filter(i => i.status === 'open').length,
    resolved: mockIncidents.filter(i => i.status === 'resolved').length,
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Incidents</h1>
          <p className="page-subtitle">Manage and track security incidents</p>
        </div>
        <button className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Incident
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'open', label: 'Open' },
          { key: 'resolved', label: 'Resolved' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 6,
              border: '1px solid',
              borderColor: filter === tab.key ? 'var(--accent)' : 'var(--border)',
              background: filter === tab.key ? 'var(--accent-bg)' : 'transparent',
              color: filter === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {tab.label}
            <span style={{
              background: filter === tab.key ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: filter === tab.key ? 'var(--bg-primary)' : 'var(--text-muted)',
              padding: '0.125rem 0.5rem',
              borderRadius: 10,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Incidents Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Source</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(incident => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                    isSelected={selectedIncident?.id === incident.id}
                    onClick={() => setSelectedIncident(incident)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incident Detail */}
        <IncidentDetail incident={selectedIncident} />
      </div>
    </div>
  )
}
