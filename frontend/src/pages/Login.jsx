import { Link } from 'react-router-dom'
import TopNav from '../components/TopNav'

export default function Login() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '2rem',
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Request Access</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Placeholder: Contact your administrator or use the form below to request access to SentinelNet.
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Email (placeholder)</label>
            <input type="email" placeholder="you@company.com" style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Organization (placeholder)</label>
            <input type="text" placeholder="Your organization" style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }} />
          </div>
          <button type="button" style={{ width: '100%', padding: '0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}>
            Submit request (placeholder)
          </button>
          <p className="placeholder-label" style={{ marginTop: '1rem' }}>Placeholder — no backend</p>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            <Link to="/dashboard" style={{ color: 'var(--accent)' }}>View Demo Dashboard →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
