export default function Pricing() {
  const tiers = [
    { name: 'Starter', price: '—', features: ['Placeholder feature', 'Placeholder feature'], cta: 'Contact sales' },
    { name: 'Professional', price: '—', features: ['Placeholder feature', 'Placeholder feature', 'Placeholder feature'], cta: 'Contact sales', featured: true },
    { name: 'Enterprise', price: '—', features: ['Placeholder feature', 'Placeholder feature', 'Placeholder feature', 'Placeholder feature'], cta: 'Contact sales' },
  ]

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Pricing</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
        Placeholder pricing tiers. All values are for structure only.
      </p>
      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              padding: '1.5rem',
              background: tier.featured ? 'var(--accent-bg)' : 'var(--surface-card)',
              border: tier.featured ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>{tier.name}</div>
            <div style={{ fontSize: '1.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{tier.price}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {tier.features.map((f) => (
                <li key={f} style={{ marginBottom: '0.5rem' }}>• {f}</li>
              ))}
            </ul>
            <button type="button" style={{ width: '100%', padding: '0.5rem', background: tier.featured ? 'var(--accent)' : 'var(--surface-hover)', border: 'none', borderRadius: 'var(--radius-sm)', color: tier.featured ? '#fff' : 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
      <p className="placeholder-label" style={{ marginTop: '1.5rem' }}>Placeholder — no real pricing</p>
    </div>
  )
}
