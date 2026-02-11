export default function Dashboard() {
  const kpis = [
    { label: 'Threats Blocked', value: '—', sub: 'Demo data' },
    { label: 'Open Cases', value: '—', sub: 'Demo data' },
    { label: 'Assets Monitored', value: '—', sub: 'Demo data' },
    { label: 'Risk Score', value: '—', sub: 'Demo data' },
  ]

  const alertRows = [
    { time: '—', source: 'Placeholder', severity: 'High', rule: 'Placeholder rule' },
    { time: '—', source: 'Placeholder', severity: 'Medium', rule: 'Placeholder rule' },
    { time: '—', source: 'Placeholder', severity: 'Low', rule: 'Placeholder rule' },
  ]

  const caseQueue = [
    { id: '—', summary: 'Placeholder case', severity: 'Critical', status: 'Open' },
    { id: '—', summary: 'Placeholder case', severity: 'High', status: 'In progress' },
  ]

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <span className="placeholder-label">Demo data — placeholder</span>
      </div>

      {/* KPI cards */}
      <div className="dashboard-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ padding: '1rem', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div className="placeholder-label">{k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{k.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Alerts table */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Alerts</div>
          <div className="placeholder-label" style={{ padding: '0 1rem 0.25rem' }}>Demo data</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Time</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Source</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Severity</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Rule</th>
              </tr>
            </thead>
            <tbody>
              {alertRows.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{row.time}</td>
                  <td style={{ padding: '0.5rem 1rem' }}>{row.source}</td>
                  <td style={{ padding: '0.5rem 1rem' }}>
                    <span className={`badge badge--${row.severity.toLowerCase()}`}>{row.severity}</span>
                  </td>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{row.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Case queue */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Case queue</div>
          <div className="placeholder-label" style={{ padding: '0 1rem 0.25rem' }}>Demo data</div>
          <ul style={{ listStyle: 'none', padding: '0.5rem 1rem', margin: 0 }}>
            {caseQueue.map((c, i) => (
              <li key={i} style={{ padding: '0.5rem 0', borderBottom: i < caseQueue.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 500 }}>{c.summary}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {c.id} · <span className={`badge badge--${c.severity.toLowerCase()}`}>{c.severity}</span> · {c.status}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risk heatmap + map */}
      <div className="dashboard-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Risk heatmap</div>
          <div className="placeholder-label" style={{ padding: '0 1rem 0.25rem' }}>Placeholder</div>
          <div style={{ aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            Placeholder: Risk heatmap
          </div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Attack origin map</div>
          <div className="placeholder-label" style={{ padding: '0 1rem 0.25rem' }}>Placeholder</div>
          <div style={{ aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            Placeholder: Attack origin map
          </div>
        </div>
      </div>
    </div>
  )
}
