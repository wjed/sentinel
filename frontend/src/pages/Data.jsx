import { useState, useEffect } from 'react'

// Mock data sources
const mockDataSources = [
  { id: 1, name: 'Firewall Logs', type: 'Network', status: 'active', eventsPerSec: 1247, lastEvent: '< 1s ago' },
  { id: 2, name: 'Windows Event Logs', type: 'Endpoint', status: 'active', eventsPerSec: 892, lastEvent: '< 1s ago' },
  { id: 3, name: 'AWS CloudTrail', type: 'Cloud', status: 'active', eventsPerSec: 456, lastEvent: '2s ago' },
  { id: 4, name: 'Okta SSO', type: 'Identity', status: 'active', eventsPerSec: 124, lastEvent: '3s ago' },
  { id: 5, name: 'Palo Alto Networks', type: 'Network', status: 'active', eventsPerSec: 2341, lastEvent: '< 1s ago' },
  { id: 6, name: 'CrowdStrike EDR', type: 'Endpoint', status: 'degraded', eventsPerSec: 45, lastEvent: '15s ago' },
  { id: 7, name: 'Azure AD', type: 'Identity', status: 'active', eventsPerSec: 234, lastEvent: '1s ago' },
  { id: 8, name: 'DNS Logs', type: 'Network', status: 'active', eventsPerSec: 5672, lastEvent: '< 1s ago' },
]

// Mock log entries that simulate real-time streaming
const generateLogEntry = () => {
  const levels = ['INFO', 'WARN', 'ERROR', 'INFO', 'INFO', 'INFO']
  const sources = ['fw-prod-01', 'ws-fin-042', 'srv-app-12', 'auth-server', 'vpn-gateway', 'mail-gw']
  const messages = [
    'Connection accepted from 192.168.1.105:44832',
    'Authentication successful for user jsmith@acme.com',
    'Blocked outbound connection to known malicious IP 45.33.32.156',
    'New device enrolled: MacBook-Pro-Marketing',
    'SSL certificate validation failed for api.suspicious-domain.xyz',
    'Policy violation: Attempted access to restricted resource',
    'Session timeout for user mwilson@acme.com',
    'Firewall rule updated: Allow-HTTPS-Outbound',
    'DNS query for malware-c2-server.net blocked',
    'Failed login attempt - invalid credentials',
    'VPN tunnel established from 73.45.123.89',
    'File hash matched known ransomware signature',
  ]

  const now = new Date()
  const timestamp = now.toISOString().split('T')[1].slice(0, 12)

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp,
    level: levels[Math.floor(Math.random() * levels.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
  }
}

// Data Source Card
function DataSourceCard({ source }) {
  const statusColors = {
    active: 'var(--success)',
    degraded: 'var(--medium)',
    offline: 'var(--critical)',
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {source.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{source.type}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`status-dot ${source.status === 'active' ? 'online' : source.status === 'degraded' ? 'warning' : 'offline'}`}></span>
          <span style={{ fontSize: '0.75rem', color: statusColors[source.status], textTransform: 'capitalize' }}>
            {source.status}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Events/sec: </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {source.eventsPerSec.toLocaleString()}
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>{source.lastEvent}</div>
      </div>
    </div>
  )
}

// Log Entry Component
function LogEntry({ log }) {
  const levelColors = {
    INFO: 'var(--accent)',
    WARN: 'var(--medium)',
    ERROR: 'var(--critical)',
  }

  return (
    <div className="log-entry">
      <span className="log-timestamp">{log.timestamp}</span>
      <span className="log-level" style={{ color: levelColors[log.level] }}>{log.level}</span>
      <span style={{ color: 'var(--accent)', minWidth: 100 }}>{log.source}</span>
      <span className="log-message">{log.message}</span>
    </div>
  )
}

// Pipeline Stats
function PipelineStats() {
  const stats = [
    { label: 'Events Processed (24h)', value: '47.2M', trend: '+12%' },
    { label: 'Avg Latency', value: '23ms', trend: '-5%' },
    { label: 'Active Parsers', value: '156', trend: '' },
    { label: 'Storage Used', value: '2.4TB', trend: '+3%' },
  ]

  return (
    <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
      {stats.map(stat => (
        <div key={stat.label} className="card">
          <div className="stat-label">{stat.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="stat-value" style={{ fontSize: '1.5rem' }}>{stat.value}</span>
            {stat.trend && (
              <span style={{
                fontSize: '0.75rem',
                color: stat.trend.startsWith('+') ? 'var(--success)' : 'var(--accent)'
              }}>
                {stat.trend}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Data() {
  const [logs, setLogs] = useState(() => {
    // Initialize with some logs
    return Array(20).fill(null).map(() => generateLogEntry())
  })
  const [isStreaming, setIsStreaming] = useState(true)

  // Simulate real-time log streaming
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = generateLogEntry()
        return [newLog, ...prev.slice(0, 49)] // Keep last 50 logs
      })
    }, 500) // New log every 500ms

    return () => clearInterval(interval)
  }, [isStreaming])

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Streams</h1>
          <p className="page-subtitle">Security data ingestion and log pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${isStreaming ? 'btn-primary' : ''}`}
            onClick={() => setIsStreaming(!isStreaming)}
          >
            {isStreaming ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause Stream
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume Stream
              </>
            )}
          </button>
          <button className="btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Source
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <PipelineStats />

      {/* Data Sources Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Connected Sources
          </h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {mockDataSources.filter(s => s.status === 'active').length} of {mockDataSources.length} active
          </span>
        </div>
        <div className="grid grid-4">
          {mockDataSources.map(source => (
            <DataSourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>

      {/* Live Log Stream */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="card-title">Live Event Stream</span>
            {isStreaming && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.7rem',
                color: 'var(--success)',
                padding: '0.25rem 0.5rem',
                background: 'var(--success-bg)',
                borderRadius: 4,
              }}>
                <span className="status-dot online pulse"></span>
                LIVE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              width: 'auto',
            }}>
              <option>All Sources</option>
              <option>Network</option>
              <option>Endpoint</option>
              <option>Cloud</option>
              <option>Identity</option>
            </select>
            <select style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              width: 'auto',
            }}>
              <option>All Levels</option>
              <option>ERROR</option>
              <option>WARN</option>
              <option>INFO</option>
            </select>
          </div>
        </div>
        <div className="log-stream" style={{ maxHeight: 400 }}>
          {logs.map(log => (
            <LogEntry key={log.id} log={log} />
          ))}
        </div>
      </div>
    </div>
  )
}
