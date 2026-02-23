import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Footer from './Footer'

export default function PublicLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <main style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
