import { useAuth } from 'react-oidc-context'
import { useState } from 'react'
import TopNav from '../components/TopNav'

const ALB_THEHIVE = 'https://api.sentinelnetsolutions.com/thehive/'

export default function TheHiveGateway() {
  const auth = useAuth()
  const [showNoAccess, setShowNoAccess] = useState(false)

  const handleLaunch = () => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect({ state: { returnTo: '/thehive' } })
      return
    }

    const groups = auth.user?.profile?.['cognito:groups'] || []
    if (groups.length === 0) {
      setShowNoAccess(true)
      return
    }

    window.open(ALB_THEHIVE, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            padding: '2.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* TheHive icon */}
          <div style={{
            width: 64, height: 64, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, #FFB300 0%, #FF8F00 100%)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 700, color: '#fff',
            boxShadow: '0 8px 32px rgba(255, 179, 0, 0.25)',
          }}>
            🐝
          </div>

          <h1 style={{
            color: 'var(--text-bright)', fontSize: '1.5rem',
            fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em',
          }}>
            TheHive
          </h1>

          <p style={{
            color: 'var(--text-muted)', fontSize: '0.9rem',
            lineHeight: 1.6, marginBottom: '1.75rem',
          }}>
            Incident response and case management platform.
            <br />Sign in with your <strong style={{ color: 'var(--accent)' }}>SentinelNet</strong> account via Cognito.
          </p>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', gap: '0.5rem' }}
            onClick={handleLaunch}
          >
            🔐 Sign in with Cognito
          </button>

          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            You'll be authenticated through AWS Cognito
          </p>
        </div>
      </div>

      {/* No Access Modal */}
      {showNoAccess && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowNoAccess(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 2.5rem',
              maxWidth: 400,
              textAlign: 'center',
              boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: 56, height: 56, margin: '0 auto 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
            }}>
              🚫
            </div>
            <h2 style={{ color: 'var(--text-bright)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              No Access
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              You don't have permission to access TheHive.
              Contact your administrator to request access.
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.6rem 1.5rem' }}
              onClick={() => setShowNoAccess(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
