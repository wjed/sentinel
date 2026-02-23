import { useParams, Link } from 'react-router-dom'

export default function IncidentDetail() {
  const { id } = useParams()

  return (
    <div className="page-wrap">
      <div className="page">
      <Link to="/incidents" style={{ display: 'inline-block', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>← Back to Incidents</Link>

      {/* Case summary header */}
      <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem' }}>Case: {id || '—'}</h1>
            <span className="placeholder-label">Placeholder case summary</span>
          </div>
          <span className="badge badge--high">Open</span>
        </div>
      </div>

      <div className="incident-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        <div>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Investigation timeline</h2>
            <div className="placeholder-label">Placeholder</div>
            <div style={{ padding: '2rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Placeholder: Investigation timeline
            </div>
          </section>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Analyst notes</h2>
            <div className="placeholder-label">Placeholder</div>
            <div style={{ padding: '2rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Placeholder: Analyst notes
            </div>
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Remediation steps</h2>
            <div className="placeholder-label">Placeholder</div>
            <div style={{ padding: '2rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Placeholder: Remediation steps
            </div>
          </section>
        </div>
        <div>
          <section>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Affected assets</h2>
            <div className="placeholder-label">Placeholder</div>
            <div style={{ padding: '2rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', textAlign: 'center' }}>
              Placeholder: Affected assets
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  )
}
