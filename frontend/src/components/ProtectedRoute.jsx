import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'

/**
 * Renders children only when the user is authenticated.
 * Otherwise redirects to Cognito sign-in or to home.
 */
export default function ProtectedRoute({ children }) {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
      auth.signinRedirect()
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator, auth])

  if (auth.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  if (auth.error) {
    return (
      <div style={{ padding: '2rem', maxWidth: 480, margin: '0 auto', color: 'var(--text)' }}>
        <h2 style={{ marginTop: 0 }}>Authentication error</h2>
        <p style={{ color: 'var(--text-muted)' }}>{auth.error.message}</p>
        <button type="button" className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => auth.signinRedirect()}>
          Try again
        </button>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
        Redirecting to sign in…
      </div>
    )
  }

  return children
}
