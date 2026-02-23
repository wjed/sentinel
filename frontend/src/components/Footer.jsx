import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '3rem 1.5rem 2rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-bright)', fontSize: '0.95rem' }}>SentinelNet</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Enterprise security operations and threat monitoring.</p>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            <li><Link to="/product" style={{ color: 'var(--text-muted)' }}>Platform</Link></li>
            <li><Link to="/pricing" style={{ color: 'var(--text-muted)' }}>Pricing</Link></li>
            <li><Link to="/dashboard" style={{ color: 'var(--text-muted)' }}>Demo</Link></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            <li><Link to="/about" style={{ color: 'var(--text-muted)' }}>About</Link></li>
            <li><a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>Contact</a></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>jedrzewj@dukes.jmu.edu</a>
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} SentinelNet. JMU university project.
      </div>
    </footer>
  )
}
