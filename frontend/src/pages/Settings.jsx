import DevAdvice from '../components/DevAdvice'
import { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'

// ─── Reusable form primitives ─────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-dim)',
  marginBottom: '0.4rem',
  fontFamily: 'var(--font-mono)',
}

const hintStyle = {
  fontSize: '0.65rem',
  color: 'var(--text-dim)',
  marginTop: '0.3rem',
  fontFamily: 'var(--font-mono)',
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, marginBottom: '0.15rem' }}>{label}</div>
        {description && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 40, height: 22, borderRadius: 11,
          border: 'none', background: checked ? 'var(--accent)' : 'var(--border)',
          cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, marginLeft: '1rem',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </button>
    </div>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.25rem' }}>{title}</h2>
      {description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</p>}
    </div>
  )
}

function SettingsCard({ children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.25rem',
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '1.25rem',
    }}>
      {children}
    </div>
  )
}

function SaveButton({ onClick, saved }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.5rem 1.25rem',
      background: saved ? 'rgba(34,197,94,0.15)' : 'var(--accent-bg)',
      border: `1px solid ${saved ? '#22c55e55' : 'var(--accent)'}`,
      borderRadius: 'var(--radius-sm)',
      color: saved ? '#22c55e' : 'var(--accent)',
      fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
      letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase',
    }}>
      {saved ? '✓ Saved' : 'Save Changes'}
    </button>
  )
}

function DangerButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.5rem 1.25rem',
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: 'var(--radius-sm)', color: '#ef4444',
      fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
      letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase',
    }}>
      {children}
    </button>
  )
}

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: ok ? '#22c55e' : '#ef4444',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#22c55e' : '#ef4444',
        boxShadow: ok ? '0 0 5px #22c55e' : 'none',
      }} />
      {ok ? 'CONNECTED' : 'NOT CONNECTED'}
    </span>
  )
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const { settings, updateSetting } = useSettings()
  const form = settings.general
  const [saved, setSaved] = useState(false)
  const set = (key) => (e) => { updateSetting('general', key, e.target.value); setSaved(false) }
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <>
      <SectionHeader title="General Settings" description="Core platform configuration and data preferences." />

      <SettingsCard>
        <CardLabel>Organization</CardLabel>
        <Field label="Organization Name" hint="Displayed in the header and on exported reports.">
          <input style={inputStyle} value={form.orgName} onChange={set('orgName')}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </Field>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Display & Locale</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Timezone" hint="Used for all timestamps in the UI.">
            <select style={selectStyle} value={form.timezone} onChange={set('timezone')}>
              {['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo']
                .map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Date Format">
            <select style={selectStyle} value={form.dateFormat} onChange={set('dateFormat')}>
              {['YYYY-MM-DD','MM/DD/YYYY','DD/MM/YYYY'].map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Data</CardLabel>
        <Field label="Log Retention (days)" hint="Logs older than this will be automatically purged.">
          <select style={selectStyle} value={form.dataRetention} onChange={set('dataRetention')}>
            {['30','60','90','180','365'].map(d => <option key={d}>{d} days</option>)}
          </select>
        </Field>
        <Field label="Telemetry API URL" hint="Base URL for your live data feed. Leave blank to use mock data.">
          <input style={inputStyle} placeholder="https://..." value={form.telemetryUrl} onChange={set('telemetryUrl')}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </Field>
      </SettingsCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={handleSave} saved={saved} />
      </div>
    </>
  )
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const { settings, updateSetting } = useSettings()
  const prefs = settings.notifications
  const [saved, setSaved] = useState(false)
  const toggle = (key) => updateSetting('notifications', key, !prefs[key])
  const set = (key) => (e) => { updateSetting('notifications', key, e.target.value); setSaved(false) }
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <>
      <SectionHeader title="Notifications" description="Configure how and when you receive security alerts." />

      <SettingsCard>
        <CardLabel>Alert Preferences</CardLabel>
        <Toggle checked={prefs.alertsEnabled} onChange={() => toggle('alertsEnabled')}
          label="Enable Alert Notifications" description="Receive notifications when new alerts are generated." />
        <Toggle checked={prefs.digestEnabled} onChange={() => toggle('digestEnabled')}
          label="Daily Digest" description="Receive a summarized report instead of per-alert pings." />
        <div style={{ paddingTop: '0.75rem' }}>
          <Field label="Minimum Severity Level" hint="Only alerts at or above this level will trigger notifications.">
            <select style={selectStyle} value={prefs.minSeverity} onChange={set('minSeverity')}>
              <option value="3">Medium (L3+)</option>
              <option value="7">High (L7+)</option>
              <option value="12">Critical only (L12+)</option>
            </select>
          </Field>
          {prefs.digestEnabled && (
            <Field label="Digest Frequency">
              <select style={selectStyle} value={prefs.digestFrequency} onChange={set('digestFrequency')}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </Field>
          )}
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Email</CardLabel>
        <Toggle checked={prefs.emailEnabled} onChange={() => toggle('emailEnabled')}
          label="Email Alerts" description="Send alert notifications to an email address." />
        {prefs.emailEnabled && (
          <div style={{ paddingTop: '0.75rem' }}>
            <Field label="Recipient Email">
              <input style={inputStyle} type="email" placeholder="soc-team@yourorg.com"
                value={prefs.emailAddress} onChange={set('emailAddress')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </Field>
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Slack</CardLabel>
        <Toggle checked={prefs.slackEnabled} onChange={() => toggle('slackEnabled')}
          label="Slack Alerts" description="Post alert notifications to a Slack channel via incoming webhook." />
        {prefs.slackEnabled && (
          <div style={{ paddingTop: '0.75rem' }}>
            <Field label="Slack Webhook URL" hint="Create an incoming webhook in your Slack workspace settings.">
              <input style={inputStyle} type="url" placeholder="https://hooks.slack.com/services/..."
                value={prefs.slackWebhook} onChange={set('slackWebhook')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </Field>
          </div>
        )}
      </SettingsCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={handleSave} saved={saved} />
      </div>
    </>
  )
}

// ─── Tab: Integrations ────────────────────────────────────────────────────────

function IntegrationsTab() {
  const { settings, setCategoryConfig } = useSettings()
  const wazuh = settings.integrations.wazuh
  const grafana = settings.integrations.grafana
  const geoip = settings.integrations.geoip
  const [saved, setSaved] = useState(false)

  const updateWazuh = (updater) => setCategoryConfig('integrations', i => ({ ...i, wazuh: typeof updater === 'function' ? updater(i.wazuh) : updater }))
  const updateGrafana = (updater) => setCategoryConfig('integrations', i => ({ ...i, grafana: typeof updater === 'function' ? updater(i.grafana) : updater }))
  const updateGeoip = (updater) => setCategoryConfig('integrations', i => ({ ...i, geoip: typeof updater === 'function' ? updater(i.geoip) : updater }))

  const testWazuh = () => {
    updateWazuh(w => ({ ...w, testing: true }))
    setTimeout(() => updateWazuh(w => ({ ...w, testing: false, connected: !!w.url })), 1400)
  }

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  function IntegrationCard({ name, description, logo, connected, onTest, testing, children }) {
    return (
      <SettingsCard>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: children ? '1.25rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>{logo}</div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.15rem' }}>{name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{description}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusDot ok={connected} />
            {onTest && (
              <button onClick={onTest} disabled={testing} style={{
                padding: '0.3rem 0.75rem', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: testing ? 'var(--text-dim)' : 'var(--text-muted)',
                fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                letterSpacing: '0.06em', cursor: testing ? 'default' : 'pointer', textTransform: 'uppercase',
              }}>
                {testing ? 'Testing…' : 'Test'}
              </button>
            )}
          </div>
        </div>
        {children}
      </SettingsCard>
    )
  }

  return (
    <>
      <SectionHeader title="Integrations" description="Connect external services and data sources to the platform." />

      <IntegrationCard name="Wazuh Manager" description="SIEM / HIDS — agent management and alert source"
        logo="🛡️" connected={wazuh.connected} onTest={testWazuh} testing={wazuh.testing}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Manager URL">
            <input style={inputStyle} placeholder="https://wazuh.yourorg.com"
              value={wazuh.url} onChange={e => updateWazuh(w => ({ ...w, url: e.target.value, connected: false }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Field>
          <Field label="API Username">
            <input style={inputStyle} placeholder="wazuh-api"
              value={wazuh.user} onChange={e => updateWazuh(w => ({ ...w, user: e.target.value }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Field>
          <Field label="API Password">
            <input style={inputStyle} type="password" placeholder="••••••••"
              value={wazuh.pass} onChange={e => updateWazuh(w => ({ ...w, pass: e.target.value }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Field>
        </div>
      </IntegrationCard>

      <IntegrationCard name="Grafana" description="Dashboard embed — visualizations and telemetry graphs"
        logo="📊" connected={grafana.connected} onTest={() => updateGrafana(g => ({ ...g, connected: !!g.url }))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Grafana URL">
            <input style={inputStyle} placeholder="https://grafana.yourorg.com"
              value={grafana.url} onChange={e => updateGrafana(g => ({ ...g, url: e.target.value, connected: false }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Field>
          <Field label="Service Account Token" hint="Read-only token for embedding dashboards.">
            <input style={inputStyle} type="password" placeholder="glsa_••••••••"
              value={grafana.token} onChange={e => updateGrafana(g => ({ ...g, token: e.target.value }))}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </Field>
        </div>
      </IntegrationCard>

      <IntegrationCard name="MaxMind GeoIP" description="IP geolocation — country / ASN enrichment on alerts"
        logo="🌐" connected={false}>
        <Field label="License Key" hint="Get a free GeoLite2 key from maxmind.com.">
          <input style={inputStyle} type="password" placeholder="••••••••••••••••"
            value={geoip.key} onChange={e => updateGeoip(g => ({ ...g, key: e.target.value }))}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </Field>
      </IntegrationCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={handleSave} saved={saved} />
      </div>
    </>
  )
}

// ─── Tab: Appearance ──────────────────────────────────────────────────────────

function AppearanceTab() {
  const { settings, updateSetting } = useSettings()
  const prefs = settings.appearance
  const [saved, setSaved] = useState(false)
  const toggle = (key) => updateSetting('appearance', key, !prefs[key])
  const set = (key) => (e) => { updateSetting('appearance', key, e.target.value); setSaved(false) }
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const ACCENTS = [
    { id: 'purple', color: '#a78bfa' },
    { id: 'cyan',   color: '#22d3ee' },
    { id: 'green',  color: '#4ade80' },
    { id: 'amber',  color: '#fbbf24' },
    { id: 'rose',   color: '#fb7185' },
  ]

  return (
    <>
      <SectionHeader title="Appearance" description="Customize how the dashboard looks and feels." />

      <SettingsCard>
        <CardLabel>Accent Color</CardLabel>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {ACCENTS.map(opt => (
            <button key={opt.id}
              onClick={() => { updateSetting('appearance', 'accentColor', opt.id); setSaved(false) }}
              title={opt.id}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: opt.color,
                border: prefs.accentColor === opt.id ? '3px solid white' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
                transform: prefs.accentColor === opt.id ? 'scale(1.15)' : 'scale(1)',
                boxShadow: prefs.accentColor === opt.id ? `0 0 10px ${opt.color}88` : 'none',
              }} />
          ))}
        </div>
        <p style={{ ...hintStyle, marginTop: '0.75rem' }}>
          Color preference is saved locally — full CSS variable theming coming soon.
        </p>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Layout</CardLabel>
        <Toggle checked={prefs.compactMode} onChange={() => toggle('compactMode')}
          label="Compact Mode" description="Reduce padding and spacing throughout the UI." />
        <Toggle checked={prefs.sidebarDefaultCollapsed} onChange={() => toggle('sidebarDefaultCollapsed')}
          label="Collapse Sidebar by Default" description="Start with the sidebar collapsed on page load." />
        <Toggle checked={prefs.liveClockEnabled} onChange={() => toggle('liveClockEnabled')}
          label="Live Clock in Header" description="Show a live UTC clock in the top navigation bar." />
        <div style={{ paddingTop: '0.75rem' }}>
          <Field label="Table Row Density">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={prefs.tableRowDensity} onChange={set('tableRowDensity')}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardLabel>Developer</CardLabel>
        <Toggle checked={prefs.showDevAdvice} onChange={() => toggle('showDevAdvice')}
          label="Show Dev Advice Panels" description="Display implementation tips on placeholder pages." />
      </SettingsCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={handleSave} saved={saved} />
      </div>
    </>
  )
}

// ─── Tab: Danger Zone ─────────────────────────────────────────────────────────

function DangerTab() {
  const [confirmText, setConfirmText] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(null)
  const CONFIRM_PHRASE = 'DELETE ALL DATA'
  const confirmMatch = confirmText === CONFIRM_PHRASE

  const actions = [
    { id: 'flush-logs', label: 'Flush Alert Log', description: 'Permanently delete all stored alert records. This cannot be undone.', buttonLabel: 'Flush Logs' },
    { id: 'reset-integrations', label: 'Reset All Integrations', description: 'Disconnect and clear credentials for all configured integrations.', buttonLabel: 'Reset Integrations' },
    { id: 'delete-all', label: 'Delete All Data', description: `Wipe all platform data — logs, incidents, assets, and settings. Type "${CONFIRM_PHRASE}" to confirm.`, buttonLabel: 'Delete Everything' },
  ]

  return (
    <>
      <SectionHeader title="Danger Zone" description="Irreversible actions. Proceed with caution." />

      <div style={{
        padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius)', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <span style={{ fontSize: '0.9rem' }}>⚠️</span>
        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          All actions on this page are permanent and cannot be reversed.
        </span>
      </div>

      {actions.map(action => (
        <div key={action.id} style={{
          background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.2rem' }}>{action.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{action.description}</div>
          </div>
          <DangerButton onClick={() => setConfirmOpen(action.id)}>{action.buttonLabel}</DangerButton>
        </div>
      ))}

      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 420,
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
              Confirm Destructive Action
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              This action is permanent. Type{' '}
              <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{CONFIRM_PHRASE}</strong>{' '}
              to confirm.
            </p>
            <input
              style={{ ...inputStyle, marginBottom: '1.25rem', borderColor: confirmMatch ? '#22c55e' : 'var(--border)' }}
              placeholder={`Type "${CONFIRM_PHRASE}"`}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => { setConfirmOpen(null); setConfirmText('') }} style={{
                padding: '0.5rem 1rem', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                fontSize: '0.75rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Cancel
              </button>
              <button
                disabled={!confirmMatch}
                onClick={() => { setConfirmOpen(null); setConfirmText('') }}
                style={{
                  padding: '0.5rem 1rem',
                  background: confirmMatch ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${confirmMatch ? '#ef4444' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: confirmMatch ? '#ef4444' : 'rgba(239,68,68,0.35)',
                  fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                  cursor: confirmMatch ? 'pointer' : 'not-allowed',
                  textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.15s',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Settings page ───────────────────────────────────────────────────────

const TABS = [
  { id: 'general',       label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations',  label: 'Integrations' },
  { id: 'appearance',    label: 'Appearance' },
  { id: 'danger',        label: 'Danger Zone' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  const tabContent = {
    general:       <GeneralTab />,
    notifications: <NotificationsTab />,
    integrations:  <IntegrationsTab />,
    appearance:    <AppearanceTab />,
    danger:        <DangerTab />,
  }

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Settings</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Platform configuration and preferences
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.15rem', borderBottom: '1px solid var(--border)', marginBottom: '1.75rem' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const isDanger = tab.id === 'danger'
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '0.5rem 1rem', background: 'none', border: 'none',
                borderBottom: `2px solid ${isActive ? (isDanger ? '#ef4444' : 'var(--accent)') : 'transparent'}`,
                color: isActive ? (isDanger ? '#ef4444' : 'var(--accent)') : (isDanger ? 'rgba(239,68,68,0.55)' : 'var(--text-muted)'),
                fontSize: '0.78rem', fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'var(--font-ui)', marginBottom: -1, letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = isDanger ? '#ef4444' : 'var(--text)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = isDanger ? 'rgba(239,68,68,0.55)' : 'var(--text-muted)' }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ maxWidth: 780 }}>
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  )
}
