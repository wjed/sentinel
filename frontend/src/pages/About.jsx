export default function About() {
  return (
    <div className="page-wrap">
      <div className="page">
      <h1 style={{ marginBottom: '0.5rem' }}>About SentinelNet</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        SentinelNet is a cloud-native security operations platform designed for B2B and enterprise teams. We help organizations ingest, correlate, and act on security data with clear escalation and executive reporting.
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        This project is a JMU university assignment simulating real-world SOC workflows. The dashboard, incidents, alerts, and reports areas demonstrate the intended product experience; backend integrations are planned for future work.
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        Contact: <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>jedrzewj@dukes.jmu.edu</a>
      </p>
      </div>
    </div>
  )
}
