import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      {/* Hero */}
      <section style={{ padding: '4rem 1.5rem 5rem', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.2 }}>
          Security operations that scale with your threat landscape
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          SentinelNet is a managed SOC and threat monitoring platform. We ingest, triage, and escalate security events so your team gets clear, actionable intelligence—and your executives get a single pane of glass.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            View Demo Dashboard
          </Link>
          <Link to="/login" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Request Access
          </Link>
        </div>
      </section>

      {/* Social proof */}
      <section style={{ padding: '2rem 1.5rem', borderTop: '1px solid var(--border)' }}>
        <p className="placeholder-label" style={{ textAlign: 'center', marginBottom: '1rem' }}>Trusted by security teams</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {['Company A', 'Company B', 'Company C', 'Company D'].map((name) => (
            <div key={name} style={{ padding: '0.75rem 1.5rem', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Placeholder: {name}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '1.5rem' }}>How It Works</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '0.5rem 1rem' }}>
          {['Ingestion', 'Internal Triage', 'Escalation', 'Client Reporting'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 48, height: 48, flexShrink: 0, background: 'var(--accent-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{step}</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Placeholder</p>
              </div>
              {i < 3 && <span style={{ color: 'var(--border)', marginLeft: '0.25rem' }}>→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--surface)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '1.5rem' }}>Platform capabilities</h2>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            'SIEM monitoring & correlation',
            'Case management & workflow',
            'Deception & honeypot telemetry',
            'Automation & playbooks',
            'Executive reporting & dashboards',
            'Multi-tenant client portals',
          ].map((title) => (
            <div key={title} style={{ padding: '1.5rem', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{title}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Placeholder description.</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '1.5rem' }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {[
            { name: 'Starter', price: '—', desc: 'Placeholder tier' },
            { name: 'Professional', price: '—', desc: 'Placeholder tier', featured: true },
            { name: 'Enterprise', price: '—', desc: 'Placeholder tier' },
          ].map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '1.5rem',
                background: tier.featured ? 'var(--accent-bg)' : 'var(--surface-card)',
                border: tier.featured ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{tier.name}</div>
              <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{tier.price}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{tier.desc}</p>
            </div>
          ))}
        </div>
        <p className="placeholder-label" style={{ textAlign: 'center', marginTop: '1rem' }}>Placeholder pricing — see Pricing page for details</p>
      </section>
    </div>
  )
}
