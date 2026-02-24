import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const tourSteps = [
  {
    title: 'SIEM Monitoring View',
    desc: 'Centralized view of logs, alerts, and correlated events from your infrastructure and security tools.',
    preview: 'Live event stream, correlation rules, and search. Filter by source, severity, and time range.',
  },
  {
    title: 'Case Management Interface',
    desc: 'Incident cases with status, assignments, notes, and remediation tracking.',
    preview: 'Open cases with assignees, timelines, and linked evidence. Escalate and close with audit trail.',
  },
  {
    title: 'Honeypot Intelligence Feed',
    desc: 'Attack analytics from deception assets: source IPs, protocols, and geographic distribution.',
    preview: 'Maps, port breakdowns, and SSH fingerprint data. Export for threat intel and blocking.',
  },
  {
    title: 'Executive Reporting Dashboard',
    desc: 'KPIs, trend charts, and summary reports for leadership and stakeholders.',
    preview: 'Customizable widgets, scheduled reports, and one-click export to PDF or share links.',
  },
]

const mockEvents = [
  { time: '14:32:01', source: 'auth.log', msg: 'SSH login attempt', severity: 'high' },
  { time: '14:31:58', source: 'firewall', msg: 'Port scan detected 10.0.1.5', severity: 'critical' },
  { time: '14:31:42', source: 'edr', msg: 'Process spawned: powershell.exe', severity: 'medium' },
  { time: '14:31:20', source: 'auth.log', msg: 'Failed login user=admin', severity: 'medium' },
  { time: '14:30:55', source: 'cloudtrail', msg: 'AssumeRole API call', severity: 'low' },
]

const mockCases = [
  { id: 'INC-0042', title: 'Brute force SSH 10.0.1.0/24', status: 'Open', assignee: 'Unassigned', updated: '2m ago' },
  { id: 'INC-0041', title: 'Suspicious PowerShell execution', status: 'In progress', assignee: 'J. Martino', updated: '15m ago' },
  { id: 'INC-0040', title: 'Phishing link in email', status: 'Resolved', assignee: 'D. Gill', updated: '1h ago' },
]

const mockHoneypot = [
  { label: 'SSH (22)', pct: 68 },
  { label: 'Telnet (23)', pct: 18 },
  { label: 'HTTP (80)', pct: 8 },
  { label: 'Other', pct: 6 },
]

function ProductTourSidebar({ onClose, sectionRefs, step: controlledStep, onStepChange }) {
  const current = tourSteps[controlledStep]

  useEffect(() => {
    sectionRefs[controlledStep]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [controlledStep, sectionRefs])

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: 'var(--nav-height)',
        right: 0,
        bottom: 0,
        width: 'min(360px, 100vw)',
        maxHeight: 'calc(100vh - var(--nav-height))',
        zIndex: 100,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tour — Step {controlledStep + 1} of {tourSteps.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Close tour"
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={controlledStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
              {current.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.55, marginBottom: '1rem' }}>
              {current.desc}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              {current.preview}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {tourSteps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onStepChange(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === controlledStep ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
            onClick={() => onStepChange(controlledStep > 0 ? controlledStep - 1 : tourSteps.length - 1)}
          >
            Back
          </button>
          {controlledStep < tourSteps.length - 1 ? (
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={() => onStepChange(controlledStep + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={onClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

export default function Product() {
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const sectionRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const startTour = () => {
    setTourStep(0)
    setTourOpen(true)
    setTimeout(() => sectionRefs[0]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
  }

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Product</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              SentinelNet unifies ingestion, triage, escalation, and reporting in one platform. Take a tour to see each module.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
            onClick={startTour}
          >
            Take a quick tour
          </button>
        </div>

        {/* 1. SIEM Monitoring View — mock */}
        <section
          ref={sectionRefs[0]}
          className="product-mock-section"
          style={{
            marginBottom: '3rem',
            borderRadius: 'var(--radius)',
            transition: 'box-shadow 0.25s ease',
            ...(tourOpen && tourStep === 0 ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>SIEM Monitoring View</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Centralized view of logs, alerts, and correlated events from your infrastructure and security tools.
          </p>
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search events..."
                readOnly
                style={{
                  flex: '1',
                  minWidth: 160,
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              />
              <select
                readOnly
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                <option>Severity: All</option>
              </select>
            </div>
            <div style={{ padding: 0 }}>
              {mockEvents.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 100px 1fr 80px',
                    gap: '1rem',
                    padding: '0.5rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{ev.time}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{ev.source}</span>
                  <span style={{ color: 'var(--text)' }}>{ev.msg}</span>
                  <span className={`badge badge--${ev.severity === 'critical' ? 'critical' : ev.severity === 'high' ? 'high' : 'medium'}`}>{ev.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Case Management — mock */}
        <section
          ref={sectionRefs[1]}
          className="product-mock-section"
          style={{
            marginBottom: '3rem',
            borderRadius: 'var(--radius)',
            transition: 'box-shadow 0.25s ease',
            ...(tourOpen && tourStep === 1 ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>Case Management Interface</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Incident cases with status, assignments, notes, and remediation tracking.
          </p>
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">Active cases</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--text-dim)' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--text-dim)' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--text-dim)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--text-dim)' }}>Assignee</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--text-dim)' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {mockCases.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{c.id}</td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text)' }}>{c.title}</td>
                    <td style={{ padding: '0.6rem 1rem' }}><span className="badge badge--medium">{c.status}</span></td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)' }}>{c.assignee}</td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-dim)' }}>{c.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Honeypot Intelligence — mock */}
        <section
          ref={sectionRefs[2]}
          className="product-mock-section"
          style={{
            marginBottom: '3rem',
            borderRadius: 'var(--radius)',
            transition: 'box-shadow 0.25s ease',
            ...(tourOpen && tourStep === 2 ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>Honeypot Intelligence Feed</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Attack analytics from deception assets: source IPs, protocols, and geographic distribution.
          </p>
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">Last 24h — Top ports</div>
            <div style={{ display: 'flex', gap: '2rem', padding: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div className="kpi-label">Attacks</div>
                  <div className="kpi-value" style={{ fontSize: '1.25rem' }}>14,283</div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div className="kpi-label">Unique IPs</div>
                  <div className="kpi-value" style={{ fontSize: '1.25rem' }}>2,847</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                {mockHoneypot.map(({ label, pct }) => (
                  <div key={label} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Executive Reporting — mock */}
        <section
          ref={sectionRefs[3]}
          className="product-mock-section"
          style={{
            marginBottom: '3rem',
            borderRadius: 'var(--radius)',
            transition: 'box-shadow 0.25s ease',
            ...(tourOpen && tourStep === 3 ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-bright)' }}>Executive Reporting Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            KPIs, trend charts, and summary reports for leadership and stakeholders.
          </p>
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">Executive summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', padding: '1rem' }}>
              {[
                { label: 'Open incidents', value: '12' },
                { label: 'MTTR (avg)', value: '4.2h' },
                { label: 'Alerts this week', value: '1,240' },
                { label: 'Compliance score', value: '98%' },
              ].map((k) => (
                <div key={k.label} className="kpi-card" style={{ padding: '1rem' }}>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{ fontSize: '1.35rem' }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 120, margin: '0 1rem 1rem', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Trend chart — customizable widgets
            </div>
          </div>
        </section>
      </div>

      {tourOpen && (
        <AnimatePresence>
          <ProductTourSidebar
            onClose={() => setTourOpen(false)}
            sectionRefs={sectionRefs}
            step={tourStep}
            onStepChange={setTourStep}
          />
        </AnimatePresence>
      )}
    </div>
  )
}
