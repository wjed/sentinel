import { Outlet, NavLink } from 'react-router-dom'
import TopNav from './TopNav'

const sidebarLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
]

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          style={{
            width: 'var(--sidebar-width)',
            padding: '1rem 0',
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
            {sidebarLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--accent-bg)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main style={{ flex: 1, padding: '1.5rem', background: 'var(--bg)', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
