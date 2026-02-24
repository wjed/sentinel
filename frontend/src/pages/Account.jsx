import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { signOut } from '../auth/signOut'
import { getProfileApiUrl } from '../auth/config'
import { getProfile, updateProfile } from '../api/profile'

// Avatar icons for users to pick (no uploads, no CORS)
const AVATAR_ICONS = [
  '🛡️', '🔒', '👤', '🎯', '🔐', '⚡', '🚀', '💼', '📊', '🔔', '🛠️', '⚙️', '🌐', '📈', '📁', '🏠',
  '🖥️', '🔑', '📧', '📱', '🛡', '⭐', '🌟', '💡', '🔥', '🎖️', '🏆', '🔔', '📌', '📍', '🕵️', '👁️',
  '🦅', '🐺', '🦊', '🐻', '🦁', '🐯', '🐍', '🦂', '🐢', '🐳', '🦈', '🐙', '🦀', '🐝', '🦋', '🐞',
]

export default function Account() {
  const auth = useAuth()
  const profile = auth.user?.profile ?? {}
  const email = profile.email ?? profile.sub ?? '—'
  const [backendProfile, setBackendProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [jobFunction, setJobFunction] = useState('')
  const [bio, setBio] = useState('')
  const [avatarIcon, setAvatarIcon] = useState('🛡️')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const hasProfileApi = !!getProfileApiUrl()

  useEffect(() => {
    if (!hasProfileApi || !auth.user) return
    getProfile(auth.user).then((p) => {
      if (p) {
        setBackendProfile(p)
        setDisplayName(p.displayName ?? '')
        setJobFunction(p.jobFunction ?? '')
        setBio(p.bio ?? '')
        if (p.avatarIcon) setAvatarIcon(p.avatarIcon)
      }
    })
  }, [hasProfileApi, auth.user])

  const displayLabel = displayName || email
  const initials = displayLabel.slice(0, 2).toUpperCase()

  const handleSave = async () => {
    if (!hasProfileApi || !auth.user) return
    setSaving(true)
    setMessage(null)
    try {
      await updateProfile(auth.user, {
        displayName: displayName.trim(),
        jobFunction: jobFunction.trim(),
        bio: bio.trim(),
        avatarIcon,
      })
      setBackendProfile((prev) => ({
        ...prev,
        displayName: displayName.trim(),
        jobFunction: jobFunction.trim(),
        bio: bio.trim(),
        avatarIcon,
      }))
      setMessage('Saved')
    } catch (e) {
      setMessage(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: '0.9rem',
  }

  return (
    <div className="page-wrap">
      <div className="page" style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 'var(--space-block)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>Account</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your profile and sign-in details.
          </p>
        </div>

        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-body" style={{ minHeight: 'auto', flexDirection: 'column', gap: 0, padding: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.5rem',
                background: 'var(--bg-hover)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius)',
                  background: 'var(--primary-bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                }}
              >
                {avatarIcon}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-bright)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayLabel}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>{email}</div>
              </div>
            </div>

            {hasProfileApi && (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Avatar icon</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {AVATAR_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setAvatarIcon(icon)}
                        style={{
                          width: 40,
                          height: 40,
                          padding: 0,
                          border: avatarIcon === icon ? '2px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: avatarIcon === icon ? 'var(--accent-bg)' : 'transparent',
                          fontSize: '1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Job / function</label>
                  <input
                    type="text"
                    value={jobFunction}
                    onChange={(e) => setJobFunction(e.target.value)}
                    placeholder="e.g. Security Analyst, DevOps"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio (optional)"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button type="button" className="btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                  {message && (
                    <span style={{ fontSize: '0.85rem', color: message === 'Saved' ? 'var(--success)' : 'var(--danger)' }}>{message}</span>
                  )}
                </div>
              </div>
            )}

            {!hasProfileApi && (
              <div style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Deploy the website stack with the User Data stack to edit your profile.
              </div>
            )}

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/dashboard" className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}>
                  Dashboard
                </Link>
                <Link to="/settings" className="btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}>
                  Settings
                </Link>
              </div>
              <button
                type="button"
                className="account-signout"
                style={{
                  padding: '0.5rem 0',
                  fontSize: '0.85rem',
                  color: 'var(--text-dim)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  alignSelf: 'flex-start',
                  transition: 'color 0.15s',
                }}
                onClick={() => signOut(auth)}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
