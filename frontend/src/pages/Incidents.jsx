import { Link } from 'react-router-dom'

const fakeIncidents = [
  { id: 'INC-001', severity: 'Critical', asset: 'Placeholder host', timestamp: '—', status: 'Open', source: 'SIEM' },
  { id: 'INC-002', severity: 'High', asset: 'Placeholder host', timestamp: '—', status: 'In progress', source: 'EDR' },
  { id: 'INC-003', severity: 'Medium', asset: 'Placeholder host', timestamp: '—', status: 'Open', source: 'Placeholder' },
  { id: 'INC-004', severity: 'Low', asset: 'Placeholder host', timestamp: '—', status: 'Resolved', source: 'Placeholder' },
]

export default function Incidents() {
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Incidents</h1>
        <span className="placeholder-label">Demo data — placeholder</span>
      </div>

      {/* Filter UI (visual only) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
          <option>Severity (placeholder)</option>
        </select>
        <select style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
          <option>Time range (placeholder)</option>
        </select>
        <select style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
          <option>Source (placeholder)</option>
        </select>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Severity</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Asset</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Source</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {fakeIncidents.map((inc) => (
              <tr key={inc.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{inc.id}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className={`badge badge--${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{inc.asset}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{inc.timestamp}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{inc.status}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{inc.source}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <Link to={`/incidents/${inc.id}`} style={{ color: 'var(--text-bright)', fontSize: '0.875rem' }}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
