export default function Product() {
  const placeholders = [
    'SIEM Monitoring View',
    'Case Management Interface',
    'Honeypot Intelligence Feed',
    'Executive Reporting Dashboard',
  ]

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Product</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
        SentinelNet unifies ingestion, triage, escalation, and reporting in one platform. Below are the major modules—screens are placeholders for future integration.
      </p>

      {placeholders.map((label) => (
        <section key={label} style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Placeholder: {label}</h2>
          <div
            style={{
              aspectRatio: '16/9',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '1rem',
            }}
          >
            Placeholder: {label}
          </div>
        </section>
      ))}
    </div>
  )
}
