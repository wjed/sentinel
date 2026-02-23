import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import TopNav from './TopNav'
import Footer from './Footer'

export default function PublicLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && location.pathname === '/') {
      navigate('/dashboard', { replace: true })
    }
  }, [auth.isLoading, auth.isAuthenticated, location.pathname, navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
