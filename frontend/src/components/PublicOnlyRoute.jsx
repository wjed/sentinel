import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

/**
 * Renders children only when the user is NOT authenticated.
 * Otherwise redirects to the dashboard.
 */
export default function PublicOnlyRoute({ children }) {
    const auth = useAuth()

    if (auth.isLoading) {
        // We could render a skeleton loader here, but generally topnav covers it
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
                Loading…
            </div>
        )
    }

    if (auth.isAuthenticated) {
        // If user is already signed in, kick them to dashboard
        return <Navigate to="/dashboard" replace />
    }

    // Not signed in -> render the public page
    return children
}
