import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'
import { getAllowedGroups, hasAllowedGroup } from '../auth/access'
import { setPostLoginRedirect } from '../auth/postLoginRedirect'

/**
 * Renders children only when the user is authenticated.
 * Otherwise redirects to Cognito sign-in or to home.
 */
export default function ProtectedRoute({ children, requiredGroups }) {
  const auth = useAuth()
  const location = useLocation()
  const allowedGroups = requiredGroups ?? getAllowedGroups()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
      const returnTo = `${location.pathname}${location.search}`
      setPostLoginRedirect(returnTo)
      auth.signinRedirect({ state: { returnTo } })
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator, auth, location.pathname, location.search])

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
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            const returnTo = `${location.pathname}${location.search}`
            setPostLoginRedirect(returnTo)
            auth.signinRedirect({ state: { returnTo } })
          }}
        >
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

  if (!hasAllowedGroup(auth.user, allowedGroups)) {
    return (
      <div style={{ padding: '2rem', maxWidth: 560, margin: '0 auto', color: 'var(--text)' }}>
        <h2 style={{ marginTop: 0 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Please contact your org lead to get access.
        </p>
        <button type="button" className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    )
  }

  return children
}
