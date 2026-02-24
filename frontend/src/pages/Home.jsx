import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <h1>Security operations that scale with your threat landscape</h1>
        <p>
          SentinelNet is a managed SOC and threat monitoring platform. We ingest, triage, and escalate security events so your team gets clear, actionable intelligence.
        </p>
        <div className="hero-ctas">
          <Link to="/product" className="btn-primary">View product demo</Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '3rem', paddingBottom: '3rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Built for security teams</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', maxWidth: 720, margin: '0 auto' }}>
          {['SIEM & log analysis', 'Threat intelligence', 'Incident response', 'Compliance reporting'].map((name) => (
            <span key={name} className="pill">{name}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How it works</h2>
        <div className="how-it-works">
          {[
            { step: 'Ingestion', desc: 'Logs and events from your infrastructure and security tools' },
            { step: 'Internal Triage', desc: 'Deduplication, enrichment, and prioritization' },
            { step: 'Escalation', desc: 'Cases and workflows with clear ownership' },
            { step: 'Client Reporting', desc: 'Dashboards and reports for stakeholders' },
          ].map(({ step, desc }, i) => (
            <div key={step} className="how-it-works-step">
              <div className="how-it-works-num">{i + 1}</div>
              <div className="how-it-works-content">
                <div className="how-it-works-title">{step}</div>
                <p className="how-it-works-desc">{desc}</p>
              </div>
              {i < 3 && <div className="how-it-works-arrow" aria-hidden>↓</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <h2 className="section-title">Platform capabilities</h2>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[
            { title: 'SIEM monitoring & correlation', desc: 'Centralized logs and security events with correlation rules.' },
            { title: 'Case management & workflow', desc: 'Track incidents from detection through resolution.' },
            { title: 'Deception & honeypot telemetry', desc: 'Honeypot data and attack analytics in one view.' },
            { title: 'Automation & playbooks', desc: 'Runbooks and automated response where it makes sense.' },
            { title: 'Executive reporting & dashboards', desc: 'Clear metrics and reports for leadership.' },
            { title: 'Multi-tenant client portals', desc: 'Dedicated views and access per client or team.' },
          ].map(({ title, desc }) => (
            <div key={title} className="feature-card">
              <div className="title">{title}</div>
              <p className="desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', maxWidth: 900, margin: '0 auto' }}>
          {[
            { name: 'Starter', price: '$0', desc: 'Free for small teams — up to 5 users' },
            { name: 'Professional', price: '$299/mo', desc: 'Growing teams — case management & honeypot' },
            { name: 'Enterprise', price: 'Custom', desc: 'Full SOC, custom integrations & SLA' },
          ].map((tier) => (
            <div key={tier.name} className="feature-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '0.35rem', color: 'var(--text-bright)' }}>{tier.name}</div>
              <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>{tier.price}</div>
              <p className="desc">{tier.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>Contact us</a> for quotes — see <Link to="/pricing" style={{ color: 'var(--text-muted)' }}>Pricing</Link> for details.
        </p>
      </section>
    </div>
  )
}
