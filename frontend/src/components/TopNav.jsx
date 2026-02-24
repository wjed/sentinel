import { Link, NavLink } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
)

const publicNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/product', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
]

const appNavLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/assets', label: 'Assets' },
  { to: '/reports', label: 'Reports' },
  { to: '/account', label: 'Account' },
  { to: '/settings', label: 'Settings' },
]

export default function TopNav() {
  const auth = useAuth()

  const navLinks = auth.isAuthenticated
    ? [...publicNavLinks, ...appNavLinks]
    : publicNavLinks

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
        <span style={{ color: 'var(--text)', opacity: 0.9 }}><ShieldIcon /></span>
        SentinelNet
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-active' : ''}
            style={({ isActive }) => ({
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.9rem',
              transition: 'color 0.2s',
            })}
          >
            {label}
          </NavLink>
        ))}
        {auth.isLoading ? (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>…</span>
        ) : auth.isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={auth.user?.profile?.email}>
              {auth.user?.profile?.email ?? auth.user?.profile?.sub ?? 'Signed in'}
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => signOut(auth)}
            >
              Sign out
            </button>
          </div>
        ) : (
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
