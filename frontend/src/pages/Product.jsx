export default function Product() {
  const modules = [
    { title: 'SIEM Monitoring View', desc: 'Centralized view of logs, alerts, and correlated events from your infrastructure and security tools.' },
    { title: 'Case Management Interface', desc: 'Incident cases with status, assignments, notes, and remediation tracking.' },
    { title: 'Honeypot Intelligence Feed', desc: 'Attack analytics from deception assets: source IPs, protocols, and geographic distribution.' },
    { title: 'Executive Reporting Dashboard', desc: 'KPIs, trend charts, and summary reports for leadership and stakeholders.' },
  ]

  return (
    <div className="page-wrap">
      <div className="page">
      <h1 style={{ marginBottom: '0.5rem' }}>Product</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
        SentinelNet unifies ingestion, triage, escalation, and reporting in one platform. Below are the major modules.
      </p>

      {modules.map(({ title, desc }) => (
        <section key={title} style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{desc}</p>
          <div
            style={{
              aspectRatio: '16/9',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.9rem',
            }}
          >
            {title} — coming soon
          </div>
        </section>
      ))}
      </div>
    </div>
  )
}
