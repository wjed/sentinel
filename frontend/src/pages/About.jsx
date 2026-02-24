export default function About() {
  const team = [
    'Will Jedrzejczak',
    'Rich Amiri',
    'Josh Martino',
    'Dilpreet Gill',
    'Noah Reed',
    'Ryan Mindel',
    'Nick F',
    'Dylan Cohen',
    'Andrew M',
    'Nick Crockett',
    'Cole W.',
    'Jack Harper (TA)',
    'Jack Nelson',
  ]

  return (
    <div className="page-wrap">
      <div className="page">
        <h1 style={{ marginBottom: '0.5rem' }}>About SentinelNet</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          SentinelNet is a cloud-native security operations platform designed for B2B and enterprise teams. We help organizations ingest, correlate, and act on security data with clear escalation and executive reporting.
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This project was created at James Madison University (JMU) as a university assignment simulating real-world SOC workflows. The dashboard, incidents, alerts, and reports areas demonstrate the intended product experience.
        </p>
        <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Project team</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {team.join(', ')}.
        </p>
        <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Supervised by</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Professor Griffith
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Contact: <a href="mailto:jedrzewj@dukes.jmu.edu" style={{ color: 'var(--text-muted)' }}>jedrzewj@dukes.jmu.edu</a>
        </p>
      </div>
    </div>
  )
}
