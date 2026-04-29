import { Outlet } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import TopNav from './TopNav'
import Footer from './Footer'
import { DashboardDataProvider } from '../contexts/DashboardDataContext'
import { hasAllowedGroup } from '../auth/access'

export default function PublicLayout() {
  const auth = useAuth()
  const isOperator = auth.isAuthenticated && hasAllowedGroup(auth.user)

  // Wrap the outlet in the dashboard data provider only for authenticated
  // users — public pages don't need it, and the polling shouldn't fire for
  // unauthenticated visitors. Lives at this level so its state survives
  // navigation between Dashboard/Alerts/Incidents/etc.
  const content = isOperator
    ? <DashboardDataProvider><Outlet /></DashboardDataProvider>
    : <Outlet />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <main style={{ flex: 1, minHeight: 0 }}>
        {content}
      </main>
      <Footer />
    </div>
  )
}
