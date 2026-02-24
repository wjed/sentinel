export default function Pricing() {
  const tiers = [
    {
      name: 'Starter',
      price: '$0',
      period: 'Free for small teams',
      features: ['Up to 5 users', 'SIEM & log ingestion', 'Basic dashboards', '7-day retention', 'Email support'],
      cta: 'Get started',
    },
    {
      name: 'Professional',
      price: '$299',
      period: 'per month',
      features: ['Up to 25 users', 'Everything in Starter', 'Case management', 'Honeypot analytics', '90-day retention', 'SLA & priority support'],
      cta: 'Start free trial',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'Contact us',
      features: ['Unlimited users', 'Everything in Professional', 'Custom integrations', 'Dedicated success manager', 'On-prem options', 'Custom retention & SLA'],
      cta: 'Contact sales',
    },
  ]

  return (
    <div className="page-wrap">
      <div className="page">
      <h1 style={{ marginBottom: '0.5rem' }}>Pricing</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Start free or scale with your team. All plans include core SOC features.
      </p>
      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="feature-card"
            style={{ padding: '1.5rem' }}
          >
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>{tier.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: tier.price === 'Custom' ? 'var(--text-muted)' : 'var(--text-bright)' }}>{tier.price}</span>
              {tier.period && <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{tier.period}</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {tier.features.map((f) => (
                <li key={f} style={{ marginBottom: '0.4rem' }}>• {f}</li>
              ))}
            </ul>
            <button type="button" className={tier.price === '$0' ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', padding: '0.55rem' }}>
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
