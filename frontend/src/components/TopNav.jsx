import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'
import { getProfile } from '../api/profile'

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.25rem', opacity: 0.8 }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const publicNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/product', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
]

const consoleNavLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/assets', label: 'Assets' },
  { to: '/reports', label: 'Reports' },
]

const accountNavLinks = [
  { to: '/account', label: 'Account' },
  { to: '/settings', label: 'Settings' },
]

const navDropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '0.25rem',
  minWidth: '180px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  padding: '0.35rem',
  zIndex: 200,
}

const navDropdownItemStyle = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontWeight: 500,
  textAlign: 'left',
  textDecoration: 'none',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
}

export default function TopNav() {
  const auth = useAuth()
  const location = useLocation()
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [profileIcon, setProfileIcon] = useState(null)
  const consoleRef = useRef(null)
  const accountRef = useRef(null)

  const isConsolePath = consoleNavLinks.some(({ to }) => location.pathname === to || location.pathname.startsWith(to + '/'))

  useEffect(() => {
    if (!auth.user) return
    getProfile(auth.user).then((p) => {
      if (p?.avatarIcon) setProfileIcon(p.avatarIcon)
    })
  }, [auth.user])

  useEffect(() => {
    function handleClickOutside(e) {
      if (consoleRef.current && !consoleRef.current.contains(e.target)) setConsoleOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const linkStyle = (isActive) => ({
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: isActive ? 600 : 500,
    fontSize: '0.9rem',
    transition: 'color 0.2s',
  })

  return (
    <header
      className="top-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 'var(--nav-height)',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-bright)',
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: 'var(--text)', opacity: 0.9, display: 'flex', alignItems: 'center', marginTop: '2px' }}><ShieldIcon /></span>
        SentinelNet
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {publicNavLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-active' : ''}
            style={({ isActive }) => linkStyle(isActive)}
          >
            {label}
          </NavLink>
        ))}
        {!auth.isLoading && auth.isAuthenticated && (
          <>
            <div ref={consoleRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                type="button"
                className={isConsolePath ? 'nav-active' : ''}
                onClick={() => { setAccountOpen(false); setConsoleOpen((o) => !o) }}
                style={{
                  ...linkStyle(isConsolePath),
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '5.5rem',
                }}
              >
                Console
                <ChevronDown />
              </button>
              {consoleOpen && (
                <div data-nav-dropdown style={navDropdownStyle}>
                  {consoleNavLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      style={{
                        ...navDropdownItemStyle,
                        color: location.pathname === to ? 'var(--accent)' : undefined,
                        fontWeight: location.pathname === to ? 600 : 500,
                      }}
                      onClick={() => setConsoleOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div ref={accountRef} style={{ position: 'relative', display: 'inline-block', marginLeft: '0.25rem' }}>
              <button
                type="button"
                onClick={() => { setConsoleOpen(false); setAccountOpen((o) => !o) }}
                className="top-nav-account-trigger"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.6rem 0.35rem 0.5rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: accountOpen ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-bg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: profileIcon ? 'inherit' : 'var(--font-mono)',
                    fontSize: profileIcon ? '1.1rem' : '0.7rem',
                    fontWeight: profileIcon ? 400 : 700,
                    color: 'var(--accent)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {profileIcon || String(auth.user?.profile?.email ?? auth.user?.profile?.sub ?? '?').slice(0, 2).toUpperCase()}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Account
                </span>
                <ChevronDown />
              </button>
              {accountOpen && (
                <div data-nav-dropdown style={{ ...navDropdownStyle, minWidth: '220px', right: 0, left: 'auto' }}>
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Signed in</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }} title={auth.user?.profile?.email}>
                      {auth.user?.profile?.email ?? auth.user?.profile?.sub ?? '—'}
                    </div>
                  </div>
                  {accountNavLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      style={{
                        ...navDropdownItemStyle,
                        color: location.pathname === to ? 'var(--accent)' : undefined,
                        fontWeight: location.pathname === to ? 600 : 500,
                      }}
                      onClick={() => setAccountOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                  <div style={{ height: 1, background: 'var(--border)', margin: '0.35rem 0' }} />
                  <button
                    type="button"
                    style={{ ...navDropdownItemStyle, color: 'var(--text-muted)' }}
                    onClick={() => { signOut(auth); setAccountOpen(false) }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {!auth.isLoading && !auth.isAuthenticated && (
          <NavLink
            to="/login"
            className="btn-primary"
            style={{
              marginLeft: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Sign in
          </NavLink>
        )}
      </nav>
    </header>
  )
}
