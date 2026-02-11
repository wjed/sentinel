import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '3rem 1.5rem 2rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>SentinelNet</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Enterprise security operations and threat monitoring.</p>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)', fontSize: '0.875rem' }}>Product</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
            <li><Link to="/product" style={{ color: 'var(--text-muted)' }}>Platform</Link></li>
            <li><Link to="/pricing" style={{ color: 'var(--text-muted)' }}>Pricing</Link></li>
            <li><Link to="/dashboard" style={{ color: 'var(--text-muted)' }}>Demo</Link></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)', fontSize: '0.875rem' }}>Company</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
            <li><Link to="/about" style={{ color: 'var(--text-muted)' }}>About</Link></li>
            <li><a href="#contact" style={{ color: 'var(--text-muted)' }}>Contact</a></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)', fontSize: '0.875rem' }}>Contact</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Placeholder: contact@sentinelnet.io</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Placeholder: Support portal</p>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} SentinelNet. Placeholder — university project.
      </div>
    </footer>
  )
}
