import React from 'react'
import DevAdvice from '../components/DevAdvice'
import { useDashboardData } from '../contexts/DashboardDataContext'

function fmt(n) {
  if (n == null) return '—'
  return n.toLocaleString()
}

const SEV_LEVEL_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' }
const SEV_LEVEL_NUM = { Low: 1, Medium: 2, High: 3, Critical: 4 }

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

// href: external URL to open in a new tab (for services with a web UI)
// tooltip: explanatory text shown on hover for internal-only services
function ServiceStatus({ name, status = 'up', latency, href, tooltip }) {
  const isUp = status === 'up'
  const color = isUp ? '#22c55e' : '#ef4444'
  const isClickable = !!href

  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem 0.75rem',
      background: 'var(--bg-hover)',
      border: `1px solid ${isClickable ? 'var(--border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      cursor: isClickable ? 'pointer' : 'default',
      transition: 'border-color 0.15s, background 0.15s',
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
        {isClickable && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', opacity: 0.7, letterSpacing: '0.04em' }}>
            ↗
          </span>
        )}
        {!isClickable && tooltip && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', opacity: 0.6, letterSpacing: '0.04em' }}>
            INT
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color, letterSpacing: '0.06em' }}>
          {isUp ? 'UP' : 'DOWN'}
        </span>
      </div>
    </div>
  )

  if (isClickable) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${name}`}
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={e => e.currentTarget.querySelector('div').style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.querySelector('div').style.borderColor = 'var(--border)'}
      >
        {inner}
      </a>
    )
  }

  return tooltip ? <div title={tooltip}>{inner}</div> : inner
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, errors } = useDashboardData()
  const kpis = data.kpis ?? null
  const health = data.health ?? null
  const error = errors.kpis || errors.health || null

  const w = kpis?.wazuh || {}
  const wSev = w.severity || {}
  const wTotal = w.total_24h ?? 0
  const wCritical = wSev.critical ?? 0
  const wHigh = wSev.high ?? 0
  const wMedium = wSev.medium ?? 0
  const wLow = wSev.low ?? 0
  const wTopRules = w.top_rules || []
  const wTopRuleMax = wTopRules.reduce((m, r) => Math.max(m, r.count || 0), 0)
  const wAgents = w.top_agents || []

  const t = kpis?.thehive || {}
  const tStatus = t.by_status || {}
  const tSev = t.by_severity || {}
  const tOpen = tStatus.Open ?? 0
  const tInProg = tStatus.InProgress ?? 0
  const tResolved = tStatus.Resolved ?? 0
  const tTotal = t.total ?? (tOpen + tInProg + tResolved)
  const tRecent = (t.recent || []).map(c => ({
    id: `#${c.number}`,
    title: c.title || '',
    sev: SEV_LEVEL_LABEL[c.severity] || 'Low',
    status: c.status === 'InProgress' ? 'In Progress' : (c.status || 'Open'),
    assignee: c.assignee || 'unassigned',
  }))

  const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0)

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>SOC Overview</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              SentinelNet — unified security operations center · last 24 hours
            </p>
          </div>
          {error && <span style={{ color: '#ff4d4d', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>Live data: {error}</span>}
          {!error && kpis && <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>LIVE · refresh 30s</span>}
        </div>

        {/* ── System Health ─────────────────────────────────────────────────── */}
        <SectionLabel>System Health</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }} className="dashboard-kpi-grid">
          {(health?.services || []).map(s => (
            <ServiceStatus
              key={s.name}
              name={s.name}
              status={s.status}
              latency={`${s.latency_ms} ms`}
              tooltip={s.tooltip || s.detail}
            />
          ))}
          {!health && <span style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>Loading service status…</span>}
        </div>

        {/* ── Wazuh ─────────────────────────────────────────────────────────── */}
        <SectionLabel>Wazuh — Detection &amp; Response</SectionLabel>

        {/* Wazuh KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-kpi-grid">
          <KpiCard label="Total Alerts (24h)" value={fmt(wTotal)} sub="From wazuh-alerts-* index" />
          <KpiCard label="Critical"  value={fmt(wCritical)} sub="Severity ≥ 12"   accent="#ef4444" />
          <KpiCard label="High"      value={fmt(wHigh)}     sub="Severity 7–11"   accent="#eab308" />
          <KpiCard label="Active Agents" value={fmt(wAgents.length)} sub={wAgents[0]?.agent || 'No agents reporting'} />
        </div>

        {/* Wazuh — Severity breakdown + Top rules */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-grid-2">

          <Panel title="Alert Severity Distribution" tag="24H" height={200}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
              <DonutChart
                centerLabel={fmt(wTotal)}
                centerSub="ALERTS"
                segments={[
                  { value: pct(wCritical, wTotal), color: '#ef4444' },
                  { value: pct(wHigh, wTotal),     color: '#eab308' },
                  { value: pct(wMedium, wTotal),   color: 'var(--accent)' },
                  { value: pct(wLow, wTotal),      color: 'var(--text-dim)' },
                ]}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                <BarMetric label="CRITICAL (≥12)" value={fmt(wCritical)} pct={pct(wCritical, wTotal)} color="#ef4444" />
                <BarMetric label="HIGH (7–11)"    value={fmt(wHigh)}     pct={pct(wHigh, wTotal)}     color="#eab308" />
                <BarMetric label="MEDIUM (4–6)"   value={fmt(wMedium)}   pct={pct(wMedium, wTotal)}   color="var(--accent)" />
                <BarMetric label="LOW (0–3)"      value={fmt(wLow)}      pct={pct(wLow, wTotal)}      color="var(--text-dim)" />
              </div>
            </div>
          </Panel>

          <Panel title="Top 5 Triggered Rules" tag="WAZUH" height={200}>
            <div style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {wTopRules.length === 0 && (
                <span style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                  {kpis ? 'No rules in last 24h' : 'LOADING...'}
                </span>
              )}
              {wTopRules.map(r => (
                <div key={r.rule_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                      {r.rule_id}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)' }}>{r.count}</span>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description}
                  </div>
                  <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${pct(r.count, wTopRuleMax)}%`, background: 'var(--accent)', borderRadius: 1, opacity: 0.6 }} />
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
          <KpiCard label="Open Cases"       value={fmt(tOpen)}       sub="Needs triage"          accent="#ef4444" />
          <KpiCard label="In Progress"      value={fmt(tInProg)}     sub="Actively investigated" accent="#eab308" />
          <KpiCard label="Resolved"         value={fmt(tResolved)}   sub="Closed cases" />
          <KpiCard label="Total Cases"      value={fmt(tTotal)}      sub="All time" />
        </div>

        {/* TheHive — Case status donut + Open cases list */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}
          className="dashboard-grid-2">

          <Panel title="Cases by Status" tag="THEHIVE" height={220}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem' }}>
              <DonutChart
                centerLabel={fmt(tTotal)}
                centerSub="TOTAL"
                size={90}
                segments={[
                  { value: pct(tOpen, tTotal),     color: '#ef4444' },
                  { value: pct(tInProg, tTotal),   color: '#eab308' },
                  { value: pct(tResolved, tTotal), color: '#22c55e' },
                ]}
              />
              <Legend items={[
                { color: '#ef4444', label: `OPEN — ${tOpen}` },
                { color: '#eab308', label: `IN PROGRESS — ${tInProg}` },
                { color: '#22c55e', label: `RESOLVED — ${tResolved}` },
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
                  {tRecent.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '1rem 0.75rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                      {kpis ? 'No active cases' : 'Loading...'}
                    </td></tr>
                  )}
                  {tRecent.map((c, i) => (
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
