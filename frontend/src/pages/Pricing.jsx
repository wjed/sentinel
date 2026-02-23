export default function Pricing() {
  const tiers = [
    { name: 'Starter', price: 'Contact us', features: ['SIEM & log ingestion', 'Basic dashboards', 'Email support'], cta: 'Contact sales' },
    { name: 'Professional', price: 'Contact us', features: ['Everything in Starter', 'Case management', 'Honeypot analytics', 'SLA & priority support'], cta: 'Contact sales', featured: true },
    { name: 'Enterprise', price: 'Contact us', features: ['Everything in Professional', 'Custom integrations', 'Dedicated success manager', 'On-prem options'], cta: 'Contact sales' },
  ]

  return (
    <div className="page-wrap">
      <div className="page">
      <h1 style={{ marginBottom: '0.5rem' }}>Pricing</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Flexible tiers for teams and enterprises. Contact us for a quote.
      </p>
      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              padding: '1.5rem',
              background: tier.featured ? 'var(--primary-bg)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>{tier.name}</div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{tier.price}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {tier.features.map((f) => (
                <li key={f} style={{ marginBottom: '0.4rem' }}>• {f}</li>
              ))}
            </ul>
            <button type="button" className={tier.featured ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', padding: '0.55rem' }}>
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        Questions? Email <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>jedrzewj@dukes.jmu.edu</a>.
      </p>
      </div>
    </div>
  )
}
