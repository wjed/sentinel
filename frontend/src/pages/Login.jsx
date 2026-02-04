export default function Login() {
  return (
    <div
      className="page"
      style={{
        maxWidth: 360,
        margin: '4rem auto',
        padding: '1.5rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
      }}
    >
      <h1 style={{ marginTop: 0, color: 'var(--text)' }}>SentinelNet</h1>
      <p style={{ color: 'var(--text-muted)' }}>Sign in to the SOC dashboard.</p>
      <p><em>Placeholder — implement auth (e.g. OAuth / SSO).</em></p>
    </div>
  )
}
