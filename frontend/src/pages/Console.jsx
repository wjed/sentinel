import { useDashboardData } from '../contexts/DashboardDataContext'

const SITE = 'https://sentinelnetsolutions.com'

const SERVICES = [
  {
    name: 'TheHive',
    href: `${SITE}/thehive/`,
    desc: 'Case management — investigate incidents, track tasks, manage observables',
    accent: '#3b82f6',
    initial: 'TH',
  },
  {
    name: 'Grafana',
    href: `${SITE}/grafana/`,
    desc: 'Dashboards & metrics — alerts over time, agent health, custom panels',
    accent: '#f97316',
    initial: 'GF',
  },
  {
    name: 'Wazuh Dashboard',
    href: `${SITE}/wazuh/`,
    desc: 'Wazuh SIEM console — discover, security events, agent management',
    accent: '#22c55e',
    initial: 'WZ',
  },
]


function Tile({ name, href, desc, accent, initial }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        padding: '1.25rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: `${accent}22`, border: `1px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
          color: accent, letterSpacing: '0.04em',
        }}>
          {initial}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-bright)' }}>{name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            {href.replace(/^https:\/\//, '')} ↗
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {desc}
      </div>
    </a>
  )
}


function Field({ label, value, mono = true }) {
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(value) } catch {}
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between',
      padding: '0.5rem 0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
    }}>
      <div>
        <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
          {value || '—'}
        </div>
      </div>
      {value && (
        <button
          type="button"
          onClick={onCopy}
          style={{
            fontSize: '0.6rem', padding: '0.25rem 0.5rem', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >COPY</button>
      )}
    </div>
  )
}


function CodeBlock({ children }) {
  return (
    <pre style={{
      margin: 0,
      padding: '0.75rem 1rem',
      background: 'var(--primary-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: 'var(--text)',
      overflowX: 'auto',
      whiteSpace: 'pre',
    }}>{children}</pre>
  )
}


export default function Console() {
  const { data, errors } = useDashboardData()
  const info = data.agentInfo
  const error = errors.agentInfo

  const ip = info?.manager_ip || ''
  const eventPort = info?.agent_event_port ?? 1514
  const regPort = info?.agent_register_port ?? 1515

  const linuxScript = `# Linux agent — replace AGENT_NAME with the hostname you want shown in Wazuh
curl -so wazuh-agent.rpm \\
  https://packages.wazuh.com/4.x/yum/wazuh-agent-4.9.2-1.x86_64.rpm
sudo WAZUH_MANAGER='${ip || 'MANAGER_IP'}' \\
     WAZUH_REGISTRATION_SERVER='${ip || 'MANAGER_IP'}' \\
     WAZUH_AGENT_NAME='AGENT_NAME' \\
     rpm -ihv wazuh-agent.rpm
sudo systemctl daemon-reload && sudo systemctl enable --now wazuh-agent`

  const debianScript = `# Debian/Ubuntu agent
curl -so wazuh-agent.deb \\
  https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.9.2-1_amd64.deb
sudo WAZUH_MANAGER='${ip || 'MANAGER_IP'}' \\
     WAZUH_REGISTRATION_SERVER='${ip || 'MANAGER_IP'}' \\
     WAZUH_AGENT_NAME='AGENT_NAME' \\
     dpkg -i ./wazuh-agent.deb
sudo systemctl daemon-reload && sudo systemctl enable --now wazuh-agent`

  const windowsScript = `# Windows agent (PowerShell, run as Administrator)
Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.9.2-1.msi" \`
  -OutFile "$env:tmp\\wazuh-agent.msi"
msiexec.exe /i "$env:tmp\\wazuh-agent.msi" /q \`
  WAZUH_MANAGER='${ip || 'MANAGER_IP'}' \`
  WAZUH_REGISTRATION_SERVER='${ip || 'MANAGER_IP'}' \`
  WAZUH_AGENT_NAME='AGENT_NAME'
NET START WazuhSvc`

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Console</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Operator tools — service consoles and agent enrollment
          </p>
        </div>

        {/* Service tiles */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.75rem', marginBottom: '2rem',
        }}>
          {SERVICES.map(s => <Tile key={s.name} {...s} />)}
        </div>

        {/* Agent enrollment info */}
        <div style={{
          marginBottom: '1rem', padding: '1.25rem',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Wazuh agent enrollment</h2>
            {error && <span style={{ color: '#ef4444', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{error}</span>}
          </div>
          <p style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Install the Wazuh agent on a host you want to monitor and point it at the
            manager below. The agent connects on TCP {eventPort} for events and {regPort} for
            registration. Once registered, the host appears under Assets and its alerts
            show up on the Dashboard within ~10s.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.5rem', marginBottom: '1rem',
          }}>
            <Field label="Manager IP" value={ip} />
            <Field label="Events port" value={String(eventPort)} />
            <Field label="Registration port" value={String(regPort)} />
          </div>

          <details style={{ marginBottom: '0.75rem' }} open>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
              Linux (RPM — Amazon Linux / RHEL / Rocky)
            </summary>
            <CodeBlock>{linuxScript}</CodeBlock>
          </details>
          <details style={{ marginBottom: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
              Linux (DEB — Ubuntu / Debian)
            </summary>
            <CodeBlock>{debianScript}</CodeBlock>
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
              Windows (MSI — PowerShell as Administrator)
            </summary>
            <CodeBlock>{windowsScript}</CodeBlock>
          </details>

          <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Replace <code>AGENT_NAME</code> with a stable identifier (typically the hostname).
            Source the official packages from <a href="https://documentation.wazuh.com/current/installation-guide/wazuh-agent/index.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>packages.wazuh.com</a>;
            the snippets above pin v4.9.2 to match this manager.
          </p>
        </div>

        {/* Outbound firewall hint */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
            FIREWALL
          </div>
          The agent host must allow outbound TCP {eventPort} and {regPort} to <code>{ip || 'the manager IP'}</code>.
          The manager's security group already permits inbound from any host configured in <code>wazuh_agent_allowed_cidrs</code>.
        </div>
      </div>
    </div>
  )
}
