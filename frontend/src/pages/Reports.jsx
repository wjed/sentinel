import DevAdvice from '../components/DevAdvice'

export default function Reports() {
  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Reports</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Scheduled and on-demand security reports
          </p>
        </div>
      <div className="panel">
        <div className="panel-header">Report Library</div>
        <div className="panel-body" style={{ minHeight: 300, flexDirection: 'column', gap: '0.5rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" style={{ opacity: 0.25 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Report engine standby
          </span>
        </div>
      </div>

        <DevAdvice
          title="How to build this"
          items={[
            'Generation: run a job (scheduled or on-demand) that pulls data from your existing APIs/DB, builds a PDF or CSV (e.g. with a template lib or Pandas), and stores the file (S3, GCS, or your app’s file store).',
            'Metadata: track report runs (id, type, schedule, created_at, status, file link) in a DB; list them in the UI and expose a download link (signed URL or authenticated redirect).',
            'Scheduling: use a cron (system cron, Cloud Scheduler, or workflow tool) to trigger the job; optionally email the link (SendGrid, SES) or post to Slack when done.',
            'API: GET /reports (list), GET /reports/:id (metadata + download URL), POST /reports (trigger on-demand run).',
          ]}
        />
      </div>
    </div>
  )
}
