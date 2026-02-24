import { useState } from 'react'
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

function ProductTour({ onClose }) {
  const [step, setStep] = useState(0)
  const current = tourSteps[step]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Step {step + 1} of {tourSteps.length}
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

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              {current.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {current.desc}
            </p>
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--text-bright)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What you’ll see</strong>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>{current.preview}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tourSteps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: i === step ? 'var(--accent)' : 'var(--border)',
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
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              onClick={() => setStep((s) => (s > 0 ? s - 1 : tourSteps.length - 1))}
            >
              Back
            </button>
            {step < tourSteps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Product() {
  const [tourOpen, setTourOpen] = useState(false)
  const modules = [
    { title: 'SIEM Monitoring View', desc: 'Centralized view of logs, alerts, and correlated events from your infrastructure and security tools.' },
    { title: 'Case Management Interface', desc: 'Incident cases with status, assignments, notes, and remediation tracking.' },
    { title: 'Honeypot Intelligence Feed', desc: 'Attack analytics from deception assets: source IPs, protocols, and geographic distribution.' },
    { title: 'Executive Reporting Dashboard', desc: 'KPIs, trend charts, and summary reports for leadership and stakeholders.' },
  ]

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Product</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              SentinelNet unifies ingestion, triage, escalation, and reporting in one platform.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
            onClick={() => setTourOpen(true)}
          >
            Take a quick tour
          </button>
        </div>

        {modules.map(({ title, desc }) => (
          <section key={title} style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{desc}</p>
            <div
              style={{
                aspectRatio: '16/9',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.9rem',
              }}
            >
              {title} — coming soon
            </div>
          </section>
        ))}
      </div>

      {tourOpen && (
        <AnimatePresence>
          <ProductTour onClose={() => setTourOpen(false)} />
        </AnimatePresence>
      )}
    </div>
  )
}
