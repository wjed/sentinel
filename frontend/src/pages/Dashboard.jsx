import { useState, useEffect } from 'react'

// Mock data for the dashboard
const mockStats = {
  activeThreats: 23,
  incidentsToday: 147,
  avgResponseTime: '4.2m',
  systemsMonitored: 1284,
}

const mockAlerts = [
  { id: 1, severity: 'critical', title: 'Brute Force Attack Detected', source: '192.168.1.105', time: '2 min ago', status: 'active' },
  { id: 2, severity: 'high', title: 'Suspicious Outbound Traffic', source: 'srv-web-03', time: '8 min ago', status: 'investigating' },
  { id: 3, severity: 'critical', title: 'Malware Signature Match', source: 'ws-marketing-12', time: '15 min ago', status: 'active' },
  { id: 4, severity: 'medium', title: 'Failed Authentication Spike', source: 'auth-server-01', time: '23 min ago', status: 'monitoring' },
  { id: 5, severity: 'high', title: 'Port Scan Detected', source: '10.0.0.0/24', time: '31 min ago', status: 'investigating' },
]

const mockThreatSources = [
  { country: 'China', attacks: 2847, percentage: 34 },
  { country: 'Russia', attacks: 1923, percentage: 23 },
  { country: 'USA', attacks: 1456, percentage: 17 },
  { country: 'Brazil', attacks: 892, percentage: 11 },
  { country: 'Other', attacks: 1247, percentage: 15 },
]

const mockTimeline = [
  { time: '00:00', events: 12 },
  { time: '04:00', events: 8 },
  { time: '08:00', events: 45 },
  { time: '12:00', events: 67 },
  { time: '16:00', events: 89 },
  { time: '20:00', events: 34 },
  { time: 'Now', events: 23 },
]

// Stat Card Component
function StatCard({ label, value, trend, trendUp, icon, accent }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color: accent || 'var(--text-primary)', marginTop: '0.5rem' }}>
            {value}
          </div>
          {trend && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: trendUp ? 'var(--critical)' : 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'var(--accent-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)'
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Threat Level Gauge
function ThreatGauge({ level }) {
  const levels = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE']
  const colors = ['var(--success)', 'var(--low)', 'var(--medium)', 'var(--high)', 'var(--critical)']
  const currentIndex = levels.indexOf(level)

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '1rem' }}>Threat Level</div>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: colors[currentIndex],
          textShadow: `0 0 20px ${colors[currentIndex]}40`,
          fontFamily: 'var(--font-mono)'
        }}>
          {level}
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'center',
          marginTop: '1rem'
        }}>
          {levels.map((l, i) => (
            <div
              key={l}
              style={{
                width: 40,
                height: 6,
                borderRadius: 3,
                background: i <= currentIndex ? colors[i] : 'var(--bg-secondary)',
                transition: 'all 0.3s ease',
                boxShadow: i <= currentIndex ? `0 0 10px ${colors[i]}60` : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Alert Row Component
function AlertRow({ alert }) {
  const severityColors = {
    critical: 'var(--critical)',
    high: 'var(--high)',
    medium: 'var(--medium)',
    low: 'var(--low)',
  }

  return (
    <tr>
      <td>
        <span
          className={`badge badge-${alert.severity}`}
          style={alert.severity === 'critical' ? { animation: 'pulse 2s infinite' } : {}}
        >
          {alert.severity}
        </span>
      </td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{alert.title}</td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alert.source}</td>
      <td style={{ color: 'var(--text-muted)' }}>{alert.time}</td>
      <td>
        <span style={{
          color: alert.status === 'active' ? 'var(--critical)' :
                 alert.status === 'investigating' ? 'var(--medium)' : 'var(--text-muted)',
          textTransform: 'capitalize',
          fontSize: '0.8rem'
        }}>
          {alert.status}
        </span>
      </td>
    </tr>
  )
}

// Mini Bar Chart for Timeline
function TimelineChart({ data }) {
  const maxEvents = Math.max(...data.map(d => d.events))

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '1rem' }}>Event Timeline (24h)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: 100, padding: '0.5rem 0' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '100%',
                height: `${(item.events / maxEvents) * 80}px`,
                background: i === data.length - 1 ? 'var(--accent)' : 'var(--accent-bg)',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease',
                border: `1px solid ${i === data.length - 1 ? 'var(--accent)' : 'var(--border)'}`,
              }}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Threat Sources Component
function ThreatSources({ data }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '1rem' }}>Top Threat Sources</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map((source, i) => (
          <div key={source.country}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{source.country}</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {source.attacks.toLocaleString()}
              </span>
            </div>
            <div className="threat-bar">
              <div
                className={`threat-fill ${i === 0 ? 'critical' : i === 1 ? 'high' : 'medium'}`}
                style={{ width: `${source.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">Real-time threat monitoring and incident tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem'
          }}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' '}
            <span style={{ color: 'var(--accent)' }}>
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          label="Active Threats"
          value={mockStats.activeThreats}
          trend="+12% from yesterday"
          trendUp={true}
          accent="var(--critical)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Incidents Today"
          value={mockStats.incidentsToday}
          trend="-8% from yesterday"
          trendUp={false}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Avg Response Time"
          value={mockStats.avgResponseTime}
          trend="32% faster"
          trendUp={false}
          accent="var(--success)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Systems Monitored"
          value={mockStats.systemsMonitored.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
      </div>

      {/* Second Row - Threat Level + Timeline */}
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <ThreatGauge level="ELEVATED" />
        <div style={{ gridColumn: 'span 2' }}>
          <TimelineChart data={mockTimeline} />
        </div>
      </div>

      {/* Third Row - Alerts Table + Threat Sources */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Alerts</span>
            <button className="btn" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
              View All
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Alert</th>
                  <th>Source</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAlerts.map(alert => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ThreatSources data={mockThreatSources} />
      </div>
    </div>
  )
}
