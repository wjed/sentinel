import { useState } from 'react'

// Settings sections
const sections = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'integrations', label: 'Integrations', icon: 'link' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'team', label: 'Team', icon: 'users' },
]

const icons = {
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

// Toggle Switch Component
function Toggle({ enabled, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div
        onClick={() => onChange(!enabled)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: enabled ? 'var(--accent)' : 'var(--bg-secondary)',
          border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
          position: 'relative',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: enabled ? 'var(--bg-primary)' : 'var(--text-muted)',
          position: 'absolute',
          top: 2,
          left: enabled ? 22 : 2,
          transition: 'all 0.2s ease',
        }} />
      </div>
    </label>
  )
}

// General Settings
function GeneralSettings() {
  const [orgName, setOrgName] = useState('Acme Corporation')
  const [timezone, setTimezone] = useState('America/New_York')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        General Settings
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label>Organization Name</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
          />
        </div>

        <div>
          <label>Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div>
          <label>Date Format</label>
          <select value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <button className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// Notification Settings
function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    slackIntegration: true,
    criticalOnly: false,
    dailyDigest: true,
    weeklyReport: true,
  })

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Notification Preferences
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Toggle
          label="Email Alerts"
          enabled={settings.emailAlerts}
          onChange={() => toggle('emailAlerts')}
        />
        <Toggle
          label="Slack Integration"
          enabled={settings.slackIntegration}
          onChange={() => toggle('slackIntegration')}
        />
        <Toggle
          label="Critical Incidents Only"
          enabled={settings.criticalOnly}
          onChange={() => toggle('criticalOnly')}
        />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Reports
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Toggle
              label="Daily Digest"
              enabled={settings.dailyDigest}
              onChange={() => toggle('dailyDigest')}
            />
            <Toggle
              label="Weekly Security Report"
              enabled={settings.weeklyReport}
              onChange={() => toggle('weeklyReport')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Integrations Settings
function IntegrationSettings() {
  const integrations = [
    { name: 'Slack', status: 'connected', icon: '#4A154B' },
    { name: 'Microsoft Teams', status: 'disconnected', icon: '#6264A7' },
    { name: 'PagerDuty', status: 'connected', icon: '#06AC38' },
    { name: 'Jira', status: 'disconnected', icon: '#0052CC' },
    { name: 'ServiceNow', status: 'connected', icon: '#81B5A1' },
  ]

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Connected Integrations
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {integrations.map(int => (
          <div
            key={int.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: int.icon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}>
                {int.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{int.name}</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: int.status === 'connected' ? 'var(--success)' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}>
                  {int.status}
                </div>
              </div>
            </div>
            <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
              {int.status === 'connected' ? 'Configure' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Security Settings
function SecuritySettings() {
  const [twoFactor, setTwoFactor] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('30')

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Security Settings
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Toggle
          label="Two-Factor Authentication"
          enabled={twoFactor}
          onChange={setTwoFactor}
        />

        <div>
          <label>Session Timeout (minutes)</label>
          <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            API Keys
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            marginBottom: '0.75rem',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                sk-****************************a3f2
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created Jan 10, 2024</div>
            </div>
            <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', color: 'var(--critical)', borderColor: 'var(--critical)' }}>
              Revoke
            </button>
          </div>
          <button className="btn">Generate New API Key</button>
        </div>
      </div>
    </div>
  )
}

// Team Settings
function TeamSettings() {
  const teamMembers = [
    { name: 'Sarah Chen', email: 'schen@acme.com', role: 'Admin', status: 'active' },
    { name: 'Marcus Johnson', email: 'mjohnson@acme.com', role: 'Analyst', status: 'active' },
    { name: 'Alex Rivera', email: 'arivera@acme.com', role: 'Analyst', status: 'active' },
    { name: 'Jordan Lee', email: 'jlee@acme.com', role: 'Viewer', status: 'pending' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Team Members
        </h3>
        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Invite Member
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(member => (
              <tr key={member.email}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{member.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{member.email}</td>
                <td>{member.role}</td>
                <td>
                  <span style={{
                    color: member.status === 'active' ? 'var(--success)' : 'var(--medium)',
                    textTransform: 'capitalize',
                  }}>
                    {member.status}
                  </span>
                </td>
                <td>
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('general')

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSettings />
      case 'notifications': return <NotificationSettings />
      case 'integrations': return <IntegrationSettings />
      case 'security': return <SecuritySettings />
      case 'team': return <TeamSettings />
      default: return <GeneralSettings />
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure platform and account settings</p>
        </div>
      </div>

      {/* Settings Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem' }}>
        {/* Sidebar Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: activeSection === section.id ? 'var(--accent-bg)' : 'transparent',
                color: activeSection === section.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              {icons[section.icon]}
              {section.label}
            </button>
          ))}
        </nav>

        {/* Settings Content */}
        <div className="card">
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
