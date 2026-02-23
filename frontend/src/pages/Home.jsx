import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      {/* Hero */}
      <section style={{ padding: '5rem 1.5rem 6rem', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.25, color: 'var(--text-bright)', letterSpacing: '-0.03em' }}>
          Security operations that scale with your threat landscape
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          SentinelNet is a managed SOC and threat monitoring platform. We ingest, triage, and escalate security events so your team gets clear, actionable intelligence.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn-primary">
            View Demo Dashboard
          </Link>
          <Link to="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>
      </section>

      {/* Social proof */}
      <section style={{ padding: '2.5rem 1.5rem', borderTop: '1px solid var(--border)' }}>
        <p className="placeholder-label" style={{ textAlign: 'center', marginBottom: '1rem' }}>Trusted by security teams</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', maxWidth: 700, margin: '0 auto' }}>
          {['Company A', 'Company B', 'Company C', 'Company D'].map((name) => (
            <div key={name} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Placeholder: {name}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>How it works</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '0.5rem 1.5rem' }}>
          {['Ingestion', 'Internal Triage', 'Escalation', 'Client Reporting'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, background: 'var(--primary-bg)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text)' }}>{step}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Placeholder</p>
              </div>
              {i < 3 && <span style={{ color: 'var(--border)', marginLeft: '0.25rem', fontSize: '0.9rem' }}>→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Platform capabilities</h2>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {[
            'SIEM monitoring & correlation',
            'Case management & workflow',
            'Deception & honeypot telemetry',
            'Automation & playbooks',
            'Executive reporting & dashboards',
            'Multi-tenant client portals',
          ].map((title) => (
            <div key={title} style={{ padding: '1.25rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text)' }}>{title}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Placeholder description.</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { name: 'Starter', price: '—', desc: 'Placeholder tier' },
            { name: 'Professional', price: '—', desc: 'Placeholder tier', featured: true },
            { name: 'Enterprise', price: '—', desc: 'Placeholder tier' },
          ].map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '1.25rem',
                background: tier.featured ? 'var(--primary-bg)' : 'var(--bg-card)',
                border: tier.featured ? '1px solid var(--border)' : '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--text-bright)' }}>{tier.name}</div>
              <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{tier.price}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{tier.desc}</p>
            </div>
          ))}
        </div>
        <p className="placeholder-label" style={{ textAlign: 'center', marginTop: '1rem' }}>Placeholder pricing — see Pricing page</p>
      </section>
    </div>
  )
}
