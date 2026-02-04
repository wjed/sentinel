import { Outlet, NavLink } from 'react-router-dom'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/data', label: 'Data' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        className="sidebar"
        style={{
          width: 200,
          padding: '1rem',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text)' }}>
          SentinelNet
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                padding: '0.5rem',
                borderRadius: 6,
                background: isActive ? 'var(--accent-bg)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '1.5rem', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
