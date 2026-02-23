import { Link } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'

export default function Account() {
  const auth = useAuth()
  const profile = auth.user?.profile ?? {}
  const email = profile.email ?? profile.sub ?? '—'

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', marginBottom: '0.1rem' }}>Account</h1>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          You're signed in. Manage your profile and access your dashboard.
        </p>
      </div>

      <div
        className="panel"
        style={{ maxWidth: 420 }}
      >
        <div className="panel-header">Signed in</div>
        <div className="panel-body" style={{ minHeight: 'auto', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              {String(email).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>
                {email}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.04em', marginTop: 2 }}>
                Cognito account
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <Link
              to="/dashboard"
              className="btn-primary"
              style={{ display: 'inline-block', textAlign: 'center', padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              Open your dashboard
            </Link>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => signOut(auth)}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
