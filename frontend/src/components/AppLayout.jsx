import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
  </svg>
)

const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  alerts: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  incidents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  assets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  collapse: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  expand: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
}

const sidebarLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts' },
  { to: '/incidents', label: 'Incidents', icon: 'incidents' },
  { to: '/assets', label: 'Assets', icon: 'assets' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarW = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'hidden',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            height: 'var(--nav-height)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: collapsed ? '0 1rem' : '0 0.85rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 229, 255, 0.06)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(0, 229, 255, 0.1)',
            flexShrink: 0,
          }}>
            <ShieldIcon />
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--text-bright)',
                letterSpacing: '0.04em',
              }}>
                SENTINEL
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                color: 'var(--text-dim)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                NET // SOC v2.1
              </span>
            </div>
          )}
        </div>

        {/* Section label */}
        {!collapsed && (
          <div style={{
            padding: '0.75rem 0.85rem 0.35rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'var(--text-dim)',
          }}>
            Operations
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' }}>
          {sidebarLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: collapsed ? '0.5rem 0' : '0.45rem 0.6rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.7rem',
                letterSpacing: '0.04em',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                textTransform: 'uppercase',
              })}
            >
              {icons[icon]}
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* System status */}
        {!collapsed && (
          <div style={{
            padding: '0.6rem 0.85rem',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            color: 'var(--text-dim)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="live-dot" />
              <span style={{ color: 'var(--success)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>SYSTEM ONLINE</span>
            </div>
            <div style={{ letterSpacing: '0.06em' }}>
              UPTIME: 99.97% | NODES: 12
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '0 0.5rem 0.5rem',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          {collapsed ? icons.expand : icons.collapse}
          {!collapsed && 'Collapse'}
        </button>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, marginLeft: sidebarW, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.2s ease' }}>
        {/* Top nav */}
        <header
          style={{
            height: 'var(--nav-height)',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}>
              Security Operations Center
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.15rem 0.5rem',
              background: 'rgba(0, 255, 136, 0.06)',
              border: '1px solid rgba(0, 255, 136, 0.15)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <span className="live-dot" />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                fontWeight: 600,
                color: 'var(--success)',
                letterSpacing: '0.1em',
              }}>LIVE</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Threat level indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.55rem',
              background: 'rgba(255, 184, 0, 0.06)',
              border: '1px solid rgba(255, 184, 0, 0.15)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--warning)' }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                fontWeight: 600,
                color: 'var(--warning)',
                letterSpacing: '0.08em',
              }}>ELEVATED</span>
            </div>

            {/* Time range */}
            <div style={{
              padding: '0.2rem 0.55rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              cursor: 'default',
              letterSpacing: '0.04em',
            }}>
              24H
            </div>

            {/* User avatar */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-bg)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '0.04em',
            }}>
              OP
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
