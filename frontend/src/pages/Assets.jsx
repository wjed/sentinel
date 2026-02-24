import DevAdvice from '../components/DevAdvice'

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

        <DevAdvice
          title="How to build this"
          items={[
            'Inventory: keep a registry of hosts/endpoints (DB table or API-backed list) with hostname, IP, type, tags, last_seen; update via manual entry, import (CSV), or discovery.',
            'Discovery: optional—run a scanner (e.g. nmap), use cloud APIs (EC2, asset APIs), or deploy a light agent that phones home; normalize and upsert into your inventory.',
            'API: list (with search/filter), get by id, create/update/delete; consider soft-delete and audit log for who changed what.',
            'Frontend: table or card list; link to asset detail if you add it; use last_seen to show “stale” or “offline” state.',
          ]}
        />
      </div>
    </div>
  )
}
