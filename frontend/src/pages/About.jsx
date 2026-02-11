export default function About() {
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>About SentinelNet</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Placeholder copy: SentinelNet is a cloud-native security operations platform designed for B2B and enterprise teams. We help organizations ingest, correlate, and act on security data with clear escalation and executive reporting.
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        This project is a university assignment simulating real-world SOC workflows. All functional areas are placeholders for future integration.
      </p>
      <p className="placeholder-label">Placeholder — About content</p>
    </div>
  )
}
