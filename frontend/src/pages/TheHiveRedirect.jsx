import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { hasAllowedGroup } from '../auth/access'

const ALB_THEHIVE = 'https://api.sentinelnetsolutions.com/thehive/'

export default function TheHiveRedirect() {
  const auth = useAuth()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (auth.isLoading) return

    if (!auth.isAuthenticated) {
      return // ProtectedRoute will handle redirect to login
    }

    if (!hasAllowedGroup(auth.user)) {
      setError(true)
      return
    }

    // User is authenticated with permissions - redirect to TheHive
    window.location.href = ALB_THEHIVE
  }, [auth.isAuthenticated, auth.isLoading, auth.user])

  if (auth.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Redirecting to TheHive...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)' }}>You don't have permission to access TheHive.</p>
        </div>
      </div>
    )
  }

  return null
}
