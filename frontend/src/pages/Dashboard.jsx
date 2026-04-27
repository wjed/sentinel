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



        <DevAdvice
          title="Integration notes — what needs wiring"
          items={[
            'Wazuh KPIs: query Wazuh Indexer (OpenSearch) — GET /wazuh-alerts-*/_search with date_histogram agg for counts by severity level range.',
            'Top rules: terms aggregation on rule.id field in the Wazuh index, sorted by doc_count desc, size 5.',
            'TheHive cases: TheHive REST API GET /api/case?status=Open,InProgress — count and list; MTTR computed from (closeDate - createdAt) on resolved cases.',
          ]}
        />
      </div>
    </div>
  )
}
