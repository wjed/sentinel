import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'
import { getAllowedGroups, hasAllowedGroup } from '../auth/access'

/**
 * Renders children only when the user is authenticated.
 * Otherwise redirects to Cognito sign-in or to home.
 */
export default function ProtectedRoute({ children, requiredGroups }) {
  const auth = useAuth()
  const allowedGroups = requiredGroups ?? getAllowedGroups()

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

  if (!hasAllowedGroup(auth.user, allowedGroups)) {
    return (
      <div style={{ padding: '2rem', maxWidth: 560, margin: '0 auto', color: 'var(--text)' }}>
        <h2 style={{ marginTop: 0 }}>Access pending</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Your sign-in worked, but this account is not assigned to a SentinelNet access group yet.
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          Ask an admin to add you to one of: {allowedGroups.join(', ')}.
        </p>
        <button type="button" className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    )
  }

  return children
}
