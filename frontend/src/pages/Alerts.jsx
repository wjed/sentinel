import DevAdvice from '../components/DevAdvice'

export default function Alerts() {
  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Alerts</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Real-time security alerts and notification pipeline
          </p>
        </div>
      <div className="panel">
        <div className="panel-header">Alert Feed</div>
        <div className="panel-body" style={{ minHeight: 300, flexDirection: 'column', gap: '0.5rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" style={{ opacity: 0.25 }}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Alert pipeline initializing
          </span>
        </div>
      </div>

        <DevAdvice
          title="How to build this"
          items={[
            'Rules engine: store alert rules (thresholds, conditions, recipients) in a DB or config store; evaluate against incoming events (from your SIEM, logs, or app) in a worker or serverless function.',
            'Notifications: send email (e.g. SendGrid, SES), Slack webhooks, or PagerDuty/Opsgenie for critical alerts; store user preferences for channel and frequency in your backend.',
            'Feed: persist triggered alerts (e.g. in Postgres or a log store) with created_at, rule_id, summary; expose GET /alerts (paginated) for the UI; optional WebSocket or short polling for “live” updates.',
            'If you already use a monitoring stack (Datadog, PagerDuty), consider an integration that creates alerts there and optionally syncs back a read-only feed here.',
          ]}
        />
      </div>
    </div>
  )
}
