import DevAdvice from '../components/DevAdvice'

function KpiCard({ label, value, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
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
          <div style={{
            width: 6,
            height: 6,
            borderRadius: 1,
            background: color,
          }} />
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Dashboard</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Honeypot attack analytics — last 24 hours
          </p>
        </div>

      {/* Row 1 — KPI stat cards */}
      <div
        className="dashboard-kpi-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}
      >
        <KpiCard label="Total Attacks" value="14,283" sub="+12.4% vs prev period" />
        <KpiCard label="Unique Source IPs" value="2,847" sub="94 countries identified" />
        <KpiCard label="Unique HASSHs" value="312" sub="SSH fingerprints captured" />
      </div>

      {/* Row 2 — Attack timeline histogram */}
      <div style={{ marginBottom: '0.75rem' }}>
        <Panel title="Attack Timeline" tag="24H" height={200}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1 }}>
              {[35,52,28,65,80,45,72,90,60,42,78,95,55,38,68,85,50,33,70,88,62,48,76,58].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: h > 80 ? 'var(--text-bright)' : h > 60 ? 'var(--text-muted)' : 'var(--text-dim)',
                    borderRadius: '1px 1px 0 0',
                    transition: 'height 0.3s',
                  }}
                />
              ))}
            </div>
            {/* Time axis */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
              {['00:00', '06:00', '12:00', '18:00', '23:59'].map(t => (
                <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{t}</span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3 — 3 columns: Dest Port, Country, Attack Map */}
      <div
        className="dashboard-grid-3"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}
      >
        <Panel title="Dest Port" tag="TOP 5" height={200}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', padding: '0.75rem 1rem' }}>
            <BarMetric label="22 // SSH" pct={68} />
            <BarMetric label="23 // TELNET" pct={18} />
            <BarMetric label="2222" pct={8} />
            <BarMetric label="80 // HTTP" pct={4} />
            <BarMetric label="OTHER" pct={2} />
          </div>
        </Panel>

        <Panel title="Attacks by Country" tag="GEO" height={200}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', padding: '0.75rem 1rem' }}>
            <BarMetric label="CN // CHINA" pct={34} />
            <BarMetric label="RU // RUSSIA" pct={22} />
            <BarMetric label="US // UNITED STATES" pct={15} />
            <BarMetric label="BR // BRAZIL" pct={11} />
            <BarMetric label="OTHER" pct={18} />
          </div>
        </Panel>

        <Panel title="Attack Origin Map" tag="GEOIP" height={200}>
          <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="0.7" style={{ marginBottom: '0.4rem', opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              <ellipse cx="12" cy="12" rx="10" ry="4" />
            </svg>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Grafana Embed Ready
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 4 — 2 columns: IP Reputation donut, Country donut */}
      <div
        className="dashboard-grid-2"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}
      >
        <Panel title="IP Reputation" tag="THREAT INTEL" height={180}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
            <DonutChart
              centerLabel="2,847"
              centerSub="IPs"
              segments={[
                { value: 62, color: 'var(--text-bright)' },
                { value: 28, color: 'var(--text-muted)' },
                { value: 10, color: 'var(--text-dim)' },
              ]}
            />
            <Legend items={[
              { color: 'var(--text-bright)', label: 'MALICIOUS — 62%' },
              { color: 'var(--text-muted)', label: 'SUSPICIOUS — 28%' },
              { color: 'var(--text-dim)', label: 'UNKNOWN — 10%' },
            ]} />
          </div>
        </Panel>

        <Panel title="Country Distribution" tag="94 COUNTRIES" height={180}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
            <DonutChart
              centerLabel="94"
              centerSub="GEO"
              segments={[
                { value: 34, color: 'var(--text-bright)' },
                { value: 22, color: 'var(--text-muted)' },
                { value: 15, color: 'var(--text)' },
                { value: 11, color: 'var(--text-dim)' },
                { value: 18, color: 'var(--border)' },
              ]}
            />
            <Legend items={[
              { color: 'var(--text-bright)', label: 'CN — 34%' },
              { color: 'var(--text-muted)', label: 'RU — 22%' },
              { color: 'var(--text)', label: 'US — 15%' },
              { color: 'var(--text-dim)', label: 'BR — 11%' },
              { color: 'var(--border)', label: 'OTHER — 18%' },
            ]} />
          </div>
        </Panel>
      </div>

      {/* Row 5 — 2 columns: Port donut, SSH Version donut */}
      <div
        className="dashboard-grid-2"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}
      >
        <Panel title="Port Analysis" tag="PROTO" height={180}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
            <DonutChart
              centerLabel="PORTS"
              segments={[
                { value: 68, color: 'var(--text-bright)' },
                { value: 18, color: 'var(--text-muted)' },
                { value: 14, color: 'var(--text-dim)' },
              ]}
            />
            <Legend items={[
              { color: 'var(--text-bright)', label: 'PORT 22 — 68%' },
              { color: 'var(--text-muted)', label: 'PORT 23 — 18%' },
              { color: 'var(--text-dim)', label: 'OTHER — 14%' },
            ]} />
          </div>
        </Panel>

        <Panel title="SSH Version" tag="FINGERPRINT" height={180}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', padding: '0.75rem 1rem' }}>
            <DonutChart
              centerLabel="SSH"
              segments={[
                { value: 45, color: 'var(--text-bright)' },
                { value: 35, color: 'var(--text-muted)' },
                { value: 20, color: 'var(--text-dim)' },
              ]}
            />
            <Legend items={[
              { color: 'var(--text-bright)', label: 'SSH-2.0 — 45%' },
              { color: 'var(--text-muted)', label: 'SSH-1.99 — 35%' },
              { color: 'var(--text-dim)', label: 'OTHER — 20%' },
            ]} />
          </div>
        </Panel>
      </div>

      {/* Row 6 — Protocol Relation stacked bars */}
      <div style={{ marginBottom: '0.75rem' }}>
        <Panel title="Country // Protocol Relation" tag="CORRELATION" height={200}>
          <div style={{ width: '100%', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { country: 'CN // CHINA', ssh: 82, telnet: 12, http: 6 },
              { country: 'RU // RUSSIA', ssh: 74, telnet: 20, http: 6 },
              { country: 'US // USA', ssh: 60, telnet: 8, http: 32 },
              { country: 'BR // BRAZIL', ssh: 55, telnet: 35, http: 10 },
              { country: 'IN // INDIA', ssh: 48, telnet: 42, http: 10 },
            ].map(({ country, ssh, telnet, http }) => (
              <div key={country}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.55rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.1rem',
                  letterSpacing: '0.06em',
                }}>{country}</div>
                <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
                  <div style={{ width: `${ssh}%`, background: 'var(--text-bright)', transition: 'width 0.3s' }} title={`SSH ${ssh}%`} />
                  <div style={{ width: `${telnet}%`, background: 'var(--text-muted)', transition: 'width 0.3s' }} title={`Telnet ${telnet}%`} />
                  <div style={{ width: `${http}%`, background: 'var(--text-dim)', transition: 'width 0.3s' }} title={`HTTP ${http}%`} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.2rem' }}>
              {[
                { color: 'var(--text-bright)', label: 'SSH' },
                { color: 'var(--text-muted)', label: 'TELNET' },
                { color: 'var(--text-dim)', label: 'HTTP' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

        <DevAdvice
          title="How to build this"
          items={[
            'Backend: time-series or analytics store (e.g. TimescaleDB, InfluxDB, or a data warehouse) for attack counts by time/port/country; or pre-aggregate in a cache (Redis) and refresh periodically.',
            'Ingest: hook your honeypot/SSH logs into a pipeline (Kinesis, Kafka, or even S3 + batch job) so you can run aggregations on a schedule or in real time.',
            'Charts: either query your API from the frontend (GET /dashboard/metrics) or embed a BI tool (Grafana, QuickSight) in an iframe with a read-only datasource.',
            'Geo: use a GeoIP library or service (MaxMind, IPinfo) when processing logs to get country codes; store by country for the breakdown and map.',
          ]}
        />
      </div>
    </div>
  )
}
