import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import TopNav from '../components/TopNav'

export default function Login() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate])

  if (auth.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    )
  }

  if (auth.isAuthenticated) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-bright)', fontSize: '1.35rem' }}>Sign in</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Sign in with your SentinelNet account. You will be redirected to Cognito to authenticate.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '0.7rem' }}
            onClick={() => auth.signinRedirect()}
          >
            Sign in with Cognito
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Go to Dashboard (requires sign-in) →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
