import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '4rem 1.5rem 2.5rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-bright)', fontSize: '1rem', letterSpacing: '-0.02em' }}>SentinelNet</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>Enterprise security operations and threat monitoring.</p>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Product</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/product" style={{ color: 'var(--text-muted)' }}>Platform</Link></li>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/pricing" style={{ color: 'var(--text-muted)' }}>Pricing</Link></li>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/dashboard" style={{ color: 'var(--text-muted)' }}>Demo</Link></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '0.5rem' }}><Link to="/about" style={{ color: 'var(--text-muted)' }}>About</Link></li>
            <li style={{ marginBottom: '0.5rem' }}><a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>Contact</a></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contact</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>jedrzewj@dukes.jmu.edu</a>
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '2.5rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} SentinelNet. JMU university project.
      </div>
    </footer>
  )
}
