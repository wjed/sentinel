import { Outlet, NavLink, useLocation } from 'react-router-dom'

// SVG Icons as components
const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  incidents: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  data: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  shield: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" stroke="var(--accent)" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/incidents', label: 'Incidents', icon: 'incidents' },
  { to: '/data', label: 'Data Streams', icon: 'data' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 100,
  },
  logo: {
    padding: '1.5rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  logoSubtitle: {
    fontSize: '0.65rem',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontWeight: 500,
  },
  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  navLinkActive: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    borderColor: 'var(--accent-dim)',
  },
  navLinkHover: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  statusSection: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid var(--border)',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.5rem',
  },
  statusValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    margin: '0 0.75rem 1rem',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid var(--border)',
    background: 'transparent',
    width: 'calc(100% - 1.5rem)',
  },
  main: {
    flex: 1,
    marginLeft: 'var(--sidebar-width)',
    background: 'var(--bg-primary)',
    minHeight: '100vh',
  },
  header: {
    height: 'var(--header-height)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    background: 'var(--bg-secondary)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  breadcrumb: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  systemStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'var(--success-bg)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--success)',
  },
  time: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  content: {
    padding: '1.5rem',
  },
}

function CurrentTime() {
  const now = new Date()
  return (
    <span style={styles.time}>
      {now.toLocaleTimeString('en-US', { hour12: false })} UTC
    </span>
  )
}

export default function Layout() {
  const location = useLocation()
  const currentPage = nav.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          {Icons.shield}
          <div style={styles.logoText}>
            <span style={styles.logoTitle}>SentinelNet</span>
            <span style={styles.logoSubtitle}>Security Operations</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {Icons[icon]}
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.statusSection}>
          <div style={styles.statusItem}>
            <span>System Status</span>
            <span style={styles.statusValue}>
              <span className="status-dot online"></span>
              Operational
            </span>
          </div>
          <div style={styles.statusItem}>
            <span>Data Pipeline</span>
            <span style={styles.statusValue}>
              <span className="status-dot online"></span>
              Active
            </span>
          </div>
          <div style={styles.statusItem}>
            <span>Threat Level</span>
            <span style={{ ...styles.statusValue, color: 'var(--medium)' }}>
              Elevated
            </span>
          </div>
        </div>

        <button
          style={styles.logoutBtn}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = 'var(--critical)'
            e.currentTarget.style.color = 'var(--critical)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {Icons.logout}
          Sign Out
        </button>
      </aside>

      {/* Main content area */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.breadcrumb}>
              SOC / {currentPage}
            </span>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.systemStatus}>
              <span className="status-dot online"></span>
              All Systems Operational
            </div>
            <CurrentTime />
          </div>
        </header>

        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
