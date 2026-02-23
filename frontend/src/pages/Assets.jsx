export default function Assets() {
  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Assets</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Monitored hosts, endpoints, and infrastructure
          </p>
        </div>
      <div className="panel">
        <div className="panel-header">Asset Inventory</div>
        <div className="panel-body" style={{ minHeight: 300, flexDirection: 'column', gap: '0.5rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" style={{ opacity: 0.25 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Asset discovery in progress
          </span>
        </div>
      </div>
      </div>
    </div>
  )
}
