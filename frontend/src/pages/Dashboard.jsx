import DevAdvice from '../components/DevAdvice'

// ─── Shared primitives ────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function Panel({ title, height = 240, tag, children }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>{title}</span>
        {tag && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5rem',
            padding: '0.1rem 0.4rem',
            background: 'var(--primary-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}>{tag}</span>
        )}
      </div>
      <div className="panel-body" style={{ minHeight: height }}>
        {children || (
          <span style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
            AWAITING DATA FEED
          </span>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.75rem',
      marginTop: '1.5rem',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function BarMetric({ label, value, pct, color = 'var(--primary)' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.15rem' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>{label}</span>
        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{value || `${pct}%`}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}44`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function DonutChart({ segments, centerLabel, centerSub, size = 100 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3.5" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="18" cy="18" r="14"
            fill="none"
            stroke={seg.color}
            strokeWidth="3.5"
            strokeDasharray={`${seg.value} ${100 - seg.value}`}
            strokeDashoffset={`-${segments.slice(0, i).reduce((a, s) => a + s.value, 0)}`}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {centerLabel}
        </span>
        {centerSub && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginTop: 2 }}>
            {centerSub}
          </span>
        )}
      </div>
    </div>
  )
}

function Legend({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.65rem' }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Wazuh alert severity bar (top 5 rules) ──────────────────────────────────

const TOP_RULES = [
  { id: '5710', desc: 'SSH brute force (multiple auth failures)', count: 312, pct: 100 },
  { id: '5503', desc: 'SSH login success from unknown IP',        count: 127, pct: 41  },
  { id: '80792', desc: 'sudo command executed',                   count:  94, pct: 30  },
  { id: '554',  desc: 'File modified in /etc directory',          count:  67, pct: 21  },
  { id: '530',  desc: 'Attempt to login using a non-existent user', count: 45, pct: 14 },
]

// ─── TheHive mock cases ───────────────────────────────────────────────────────

const THEHIVE_CASES = [
  { id: '#47', title: 'SSH Brute-Force Campaign — prod-web-01', sev: 'High',     status: 'In Progress', assignee: 'n.reed' },
  { id: '#46', title: 'Malware beacon detected on fin-srv-03',  sev: 'Critical', status: 'Open',        assignee: 'unassigned' },
  { id: '#45', title: 'Privilege escalation via sudo exploit',   sev: 'High',     status: 'Open',        assignee: 'd.patel' },
  { id: '#44', title: 'Lateral movement attempt — DMZ segment', sev: 'Medium',   status: 'In Progress', assignee: 'j.warren' },
  { id: '#43', title: 'Suspicious outbound DNS — possible C2',  sev: 'High',     status: 'Open',        assignee: 'unassigned' },
]

const SEV_COLORS = {
  Critical: '#ef4444',
  High:     '#eab308',
  Medium:   'var(--accent)',
  Low:      '#22c55e',
}

const STATUS_COLORS = {
  'Open':        '#ef4444',
  'In Progress': '#eab308',
  'Resolved':    '#22c55e',
}

function SevBadge({ sev }) {
  const color = SEV_COLORS[sev] || 'var(--text-dim)'
  return (
    <span style={{
      fontSize: '0.55rem', padding: '0.1rem 0.4rem', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
    }}>{sev.toUpperCase()}</span>
  )
}

function StatusDot({ status }) {
  const color = STATUS_COLORS[status] || 'var(--text-dim)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}88` }} />
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{status}</span>
    </div>
  )
}

// ─── Service health indicator ─────────────────────────────────────────────────

function ServiceStatus({ name, status = 'up', latency }) {
  const isUp = status === 'up'
  const color = isUp ? '#22c55e' : '#ef4444'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem 0.75rem',
      background: 'var(--bg-hover)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: isUp ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text)', letterSpacing: '0.04em' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {latency && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>{latency}</span>}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color, letterSpacing: '0.06em' }}>
          {isUp ? 'UP' : 'DOWN'}
        </span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>SOC Overview</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            SentinelNet — unified security operations center · last 24 hours
          </p>
        </div>

        {/* ── System Health ─────────────────────────────────────────────────── */}
        <SectionLabel>System Health</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }} className="dashboard-kpi-grid">
          <ServiceStatus name="Wazuh Manager"  status="up"   latency="12 ms" />
          <ServiceStatus name="TheHive"        status="up"   latency="28 ms" />
          <ServiceStatus name="Grafana"        status="up"   latency="9 ms"  />
          <ServiceStatus name="Lambda Ingest"  status="up"   latency="—"     />
          <ServiceStatus name="DynamoDB"       status="up"   latency="4 ms"  />
        </div>

        {/* ── Wazuh ─────────────────────────────────────────────────────────── */}
        <SectionLabel>Wazuh — Detection &amp; Response</SectionLabel>

        {/* Wazuh KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-kpi-grid">
          <KpiCard label="Total Alerts (24h)" value="1,847"  sub="+8.3% vs prev period" />
          <KpiCard label="Critical"  value="12"   sub="Severity ≥ 12"    accent="#ef4444" />
          <KpiCard label="High"      value="89"   sub="Severity 7–11"    accent="#eab308" />
          <KpiCard label="Active Agents" value="14" sub="2 disconnected" />
        </div>

        {/* Wazuh — Severity breakdown + Top rules */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-grid-2">

          <Panel title="Alert Severity Distribution" tag="24H" height={200}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart
                centerLabel="1,847"
                centerSub="ALERTS"
                segments={[
                  { value: 1,  color: '#ef4444' },
                  { value: 5,  color: '#eab308' },
                  { value: 23, color: 'var(--accent)' },
                  { value: 71, color: 'var(--text-dim)' },
                ]}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                <BarMetric label="CRITICAL (≥12)" value="12"    pct={1}  color="#ef4444" />
                <BarMetric label="HIGH (7–11)"    value="89"    pct={5}  color="#eab308" />
                <BarMetric label="MEDIUM (3–6)"   value="423"   pct={23} color="var(--accent)" />
                <BarMetric label="LOW (0–2)"      value="1,323" pct={71} color="var(--text-dim)" />
              </div>
            </div>
          </Panel>

          <Panel title="Top 5 Triggered Rules" tag="WAZUH" height={200}>
            <div style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {TOP_RULES.map(r => (
                <div key={r.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                      {r.id}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>{r.count}</span>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.desc}
                  </div>
                  <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${r.pct}%`, background: 'var(--accent)', borderRadius: 1, opacity: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── TheHive ───────────────────────────────────────────────────────── */}
        <SectionLabel>TheHive — Case Management</SectionLabel>

        {/* TheHive KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-kpi-grid">
          <KpiCard label="Open Cases"       value="7"      sub="Needs triage"         accent="#ef4444" />
          <KpiCard label="In Progress"      value="4"      sub="Actively investigated" accent="#eab308" />
          <KpiCard label="Resolved (30d)"   value="23"     sub="Closed this month" />
          <KpiCard label="Avg MTTR"         value="4h 22m" sub="Mean time to resolve" />
        </div>

        {/* TheHive — Case status donut + Open cases list */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-grid-2">

          <Panel title="Cases by Status" tag="THEHIVE" height={220}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem' }}>
              <DonutChart
                centerLabel="34"
                centerSub="TOTAL"
                size={90}
                segments={[
                  { value: 21, color: '#ef4444' },
                  { value: 12, color: '#eab308' },
                  { value: 67, color: '#22c55e' },
                ]}
              />
              <Legend items={[
                { color: '#ef4444', label: 'OPEN — 7' },
                { color: '#eab308', label: 'IN PROGRESS — 4' },
                { color: '#22c55e', label: 'RESOLVED — 23' },
              ]} />
            </div>
          </Panel>

          <Panel title="Active Cases" tag="OPEN + IN PROGRESS" height={220}>
            <div style={{ width: '100%', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Case', 'Title', 'Sev', 'Status', 'Assignee'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {THEHIVE_CASES.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                      <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{c.id}</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}><SevBadge sev={c.sev} /></td>
                      <td style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}><StatusDot status={c.status} /></td>
                      <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>{c.assignee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* ── Honeypot Intelligence ─────────────────────────────────────────── */}
        <SectionLabel>Honeypot Intelligence</SectionLabel>

        {/* Row 1 — KPI stat cards */}
        <div className="dashboard-kpi-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <KpiCard label="Total Attacks" value="14,283" sub="+12.4% vs prev period" />
          <KpiCard label="Unique Source IPs" value="2,847" sub="94 countries identified" />
          <KpiCard label="Unique HASSHs" value="312" sub="SSH fingerprints captured" />
        </div>

        {/* Attack timeline histogram */}
        <div style={{ marginBottom: '0.75rem' }}>
          <Panel title="Attack Timeline" tag="24H" height={200}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1 }}>
                {[35,52,28,65,80,45,72,90,60,42,78,95,55,38,68,85,50,33,70,88,62,48,76,58].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`,
                    background: h > 80 ? 'var(--text-bright)' : h > 60 ? 'var(--text-muted)' : 'var(--text-dim)',
                    borderRadius: '1px 1px 0 0',
                    transition: 'height 0.3s',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                {['00:00', '06:00', '12:00', '18:00', '23:59'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{t}</span>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* 3 columns: Dest Port, Country, Attack Map */}
        <div className="dashboard-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Panel title="Dest Port" tag="TOP 5" height={200}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', padding: '0.75rem 1rem' }}>
              <BarMetric label="22 // SSH"    pct={68} />
              <BarMetric label="23 // TELNET" pct={18} />
              <BarMetric label="2222"         pct={8}  />
              <BarMetric label="80 // HTTP"   pct={4}  />
              <BarMetric label="OTHER"        pct={2}  />
            </div>
          </Panel>

          <Panel title="Attacks by Country" tag="GEO" height={200}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', padding: '0.75rem 1rem' }}>
              <BarMetric label="CN // CHINA"         pct={34} />
              <BarMetric label="RU // RUSSIA"        pct={22} />
              <BarMetric label="US // UNITED STATES" pct={15} />
              <BarMetric label="BR // BRAZIL"        pct={11} />
              <BarMetric label="OTHER"               pct={18} />
            </div>
          </Panel>

          <Panel title="Attack Origin Map" tag="GEOIP" height={200}>
            <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="0.7" style={{ marginBottom: '0.4rem', opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                <ellipse cx="12" cy="12" rx="10" ry="4" />
              </svg>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Grafana Embed Ready
              </div>
            </div>
          </Panel>
        </div>

        {/* IP Reputation + Country Distribution */}
        <div className="dashboard-grid-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Panel title="IP Reputation" tag="THREAT INTEL" height={180}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart centerLabel="2,847" centerSub="IPs" segments={[
                { value: 62, color: 'var(--text-bright)' },
                { value: 28, color: 'var(--text-muted)' },
                { value: 10, color: 'var(--text-dim)' },
              ]} />
              <Legend items={[
                { color: 'var(--text-bright)', label: 'MALICIOUS — 62%' },
                { color: 'var(--text-muted)', label: 'SUSPICIOUS — 28%' },
                { color: 'var(--text-dim)',   label: 'UNKNOWN — 10%' },
              ]} />
            </div>
          </Panel>

          <Panel title="Country Distribution" tag="94 COUNTRIES" height={180}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart centerLabel="94" centerSub="GEO" segments={[
                { value: 34, color: 'var(--text-bright)' },
                { value: 22, color: 'var(--text-muted)' },
                { value: 15, color: 'var(--text)' },
                { value: 11, color: 'var(--text-dim)' },
                { value: 18, color: 'var(--border)' },
              ]} />
              <Legend items={[
                { color: 'var(--text-bright)', label: 'CN — 34%' },
                { color: 'var(--text-muted)', label: 'RU — 22%' },
                { color: 'var(--text)',        label: 'US — 15%' },
                { color: 'var(--text-dim)',    label: 'BR — 11%' },
                { color: 'var(--border)',      label: 'OTHER — 18%' },
              ]} />
            </div>
          </Panel>
        </div>

        {/* Port + SSH Version */}
        <div className="dashboard-grid-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Panel title="Port Analysis" tag="PROTO" height={180}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart centerLabel="PORTS" segments={[
                { value: 68, color: 'var(--text-bright)' },
                { value: 18, color: 'var(--text-muted)' },
                { value: 14, color: 'var(--text-dim)' },
              ]} />
              <Legend items={[
                { color: 'var(--text-bright)', label: 'PORT 22 — 68%' },
                { color: 'var(--text-muted)', label: 'PORT 23 — 18%' },
                { color: 'var(--text-dim)',   label: 'OTHER — 14%' },
              ]} />
            </div>
          </Panel>

          <Panel title="SSH Version" tag="FINGERPRINT" height={180}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart centerLabel="SSH" segments={[
                { value: 45, color: 'var(--text-bright)' },
                { value: 35, color: 'var(--text-muted)' },
                { value: 20, color: 'var(--text-dim)' },
              ]} />
              <Legend items={[
                { color: 'var(--text-bright)', label: 'SSH-2.0 — 45%' },
                { color: 'var(--text-muted)', label: 'SSH-1.99 — 35%' },
                { color: 'var(--text-dim)',   label: 'OTHER — 20%' },
              ]} />
            </div>
          </Panel>
        </div>

        {/* Country // Protocol Relation */}
        <div style={{ marginBottom: '0.75rem' }}>
          <Panel title="Country // Protocol Relation" tag="CORRELATION" height={200}>
            <div style={{ width: '100%', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { country: 'CN // CHINA',  ssh: 82, telnet: 12, http: 6 },
                { country: 'RU // RUSSIA', ssh: 74, telnet: 20, http: 6 },
                { country: 'US // USA',    ssh: 60, telnet: 8,  http: 32 },
                { country: 'BR // BRAZIL', ssh: 55, telnet: 35, http: 10 },
                { country: 'IN // INDIA',  ssh: 48, telnet: 42, http: 10 },
              ].map(({ country, ssh, telnet, http }) => (
                <div key={country}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.1rem', letterSpacing: '0.06em' }}>{country}</div>
                  <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
                    <div style={{ width: `${ssh}%`,    background: 'var(--text-bright)', transition: 'width 0.3s' }} title={`SSH ${ssh}%`} />
                    <div style={{ width: `${telnet}%`, background: 'var(--text-muted)',  transition: 'width 0.3s' }} title={`Telnet ${telnet}%`} />
                    <div style={{ width: `${http}%`,   background: 'var(--text-dim)',    transition: 'width 0.3s' }} title={`HTTP ${http}%`} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.2rem' }}>
                {[
                  { color: 'var(--text-bright)', label: 'SSH' },
                  { color: 'var(--text-muted)',  label: 'TELNET' },
                  { color: 'var(--text-dim)',    label: 'HTTP' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <DevAdvice
          title="Integration notes — what needs wiring"
          items={[
            'Wazuh KPIs: query Wazuh Indexer (OpenSearch) — GET /wazuh-alerts-*/_search with date_histogram agg for counts by severity level range.',
            'Top rules: terms aggregation on rule.id field in the Wazuh index, sorted by doc_count desc, size 5.',
            'TheHive cases: TheHive REST API GET /api/case?status=Open,InProgress — count and list; MTTR computed from (closeDate - createdAt) on resolved cases.',
            'System health: Lambda function or cron that PINGs each service health endpoint and writes status to DynamoDB; frontend polls GET /health every 30s.',
            'Honeypot data: existing cowrie/honeytrap log pipeline → DynamoDB → aggregation Lambda → GET /dashboard/honeypot/metrics.',
          ]}
        />
      </div>
    </div>
  )
}
