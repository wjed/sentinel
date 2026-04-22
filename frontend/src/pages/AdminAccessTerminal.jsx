import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { hasAllowedGroup } from '../auth/access'
import { ADMIN_GROUP, SENTINEL_GROUPS } from '../auth/groups'
import {
  getUserAccess,
  grantAccess,
  listGroups,
  listUsers,
  revokeAccess,
  whoAmI,
} from '../api/adminAccess'
import { getHelpLines, parseTerminalCommand } from '../admin/terminalParser'

function formatGroups(groups) {
  return Array.isArray(groups) && groups.length ? groups.join(', ') : '(none)'
}

function formatUserLine(user) {
  const status = user.enabled ? 'enabled' : 'disabled'
  return `${user.username} | ${user.email || 'no-email'} | ${status} | groups: ${formatGroups(user.groups)}`
}

function createEntry(type, lines) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    lines: Array.isArray(lines) ? lines : [String(lines)],
  }
}

export default function AdminAccessTerminal() {
  const auth = useAuth()
  const inputRef = useRef(null)
  const outputRef = useRef(null)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [entries, setEntries] = useState(() => [
    createEntry('system', [
      'SentinelNet Access Management Terminal',
      `Admin group required: ${ADMIN_GROUP}`,
      'Type "help" to see supported commands.',
    ]),
  ])
  const [running, setRunning] = useState(false)

  const isAdmin = hasAllowedGroup(auth.user, [ADMIN_GROUP])
  const promptLabel = useMemo(() => {
    const email = auth.user?.profile?.email ?? auth.user?.profile?.sub ?? 'admin'
    return `${email}:~$`
  }, [auth.user])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries, running])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function runStructuredCommand(parsed) {
    switch (parsed.command) {
      case 'help':
        return createEntry('output', getHelpLines())
      case 'list-groups': {
        const data = await listGroups(auth.user)
        return createEntry('output', [
          'Managed groups:',
          ...data.groups.map((group) => `- ${group}`),
        ])
      }
      case 'whoami': {
        const data = await whoAmI(auth.user)
        return createEntry('output', [
          `User: ${data.user.username}`,
          `Email: ${data.user.email || 'unknown'}`,
          `Groups: ${formatGroups(data.user.groups)}`,
          `Admin: ${data.user.isAdmin ? 'yes' : 'no'}`,
        ])
      }
      case 'list-users': {
        const data = await listUsers(auth.user)
        const lines = [
          `Users returned: ${data.users.length}`,
          ...data.users.map(formatUserLine),
        ]
        if (data.nextToken) {
          lines.push(`More results available. Next token: ${data.nextToken}`)
        }
        return createEntry('output', lines)
      }
      case 'get-user': {
        const data = await getUserAccess(auth.user, parsed.identifier)
        return createEntry('output', [
          `User: ${data.user.username}`,
          `Email: ${data.user.email || 'unknown'}`,
          `Status: ${data.user.enabled ? 'enabled' : 'disabled'}`,
          `Groups: ${formatGroups(data.user.groups)}`,
          `Created: ${data.user.userCreateDate || 'unknown'}`,
          `Updated: ${data.user.userLastModifiedDate || 'unknown'}`,
        ])
      }
      case 'grant-access': {
        const data = await grantAccess(auth.user, parsed.identifier, parsed.group)
        return createEntry('success', [
          `${data.message}`,
          `User: ${data.user.username}`,
          `Groups: ${formatGroups(data.user.groups)}`,
        ])
      }
      case 'revoke-access': {
        const data = await revokeAccess(auth.user, parsed.identifier, parsed.group)
        return createEntry('success', [
          `${data.message}`,
          `User: ${data.user.username}`,
          `Groups: ${formatGroups(data.user.groups)}`,
        ])
      }
      default:
        return createEntry('error', 'Unsupported command.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (running) return

    const raw = input.trim()
    if (!raw) return

    const parsed = parseTerminalCommand(raw)
    setEntries((current) => [...current, createEntry('command', `${promptLabel} ${raw}`)])
    setHistory((current) => [...current, raw])
    setHistoryIndex(-1)
    setInput('')

    if (!parsed.ok) {
      setEntries((current) => [...current, createEntry('error', parsed.error)])
      return
    }

    if (parsed.command === 'clear') {
      setEntries([])
      return
    }

    setRunning(true)
    try {
      const result = await runStructuredCommand(parsed)
      setEntries((current) => [...current, result])
    } catch (error) {
      setEntries((current) => [...current, createEntry('error', error.message || 'Command failed')])
    } finally {
      setRunning(false)
    }
  }

  function handleHistory(event) {
    if (!history.length) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = historyIndex < 0 ? history.length - 1 : Math.max(historyIndex - 1, 0)
      setHistoryIndex(nextIndex)
      setInput(history[nextIndex])
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex < 0) return
      const nextIndex = historyIndex + 1
      if (nextIndex >= history.length) {
        setHistoryIndex(-1)
        setInput('')
        return
      }
      setHistoryIndex(nextIndex)
      setInput(history[nextIndex])
    }
  }

  return (
    <div className="page-wrap">
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1>Access Management Terminal</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Admin-only access management on top of the existing Cognito group model.
          </p>
        </div>

        <div className="panel" style={{ minHeight: 620 }}>
          <div className="panel-header">
            <span>Admin Console</span>
            <span style={{ color: isAdmin ? 'var(--success)' : 'var(--danger)' }}>
              {isAdmin ? 'Admin verified' : 'Access denied'}
            </span>
          </div>
          <div
            ref={outputRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              background: 'linear-gradient(180deg, rgba(8,8,10,0.98), rgba(13,13,16,0.98))',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {entries.map((entry) => (
              <div key={entry.id}>
                {entry.lines.map((line, index) => (
                  <div
                    key={`${entry.id}-${index}`}
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color:
                        entry.type === 'error'
                          ? 'var(--danger)'
                          : entry.type === 'success'
                            ? 'var(--success)'
                            : entry.type === 'command'
                              ? 'var(--text-bright)'
                              : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      lineHeight: 1.65,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ))}
            {running && (
              <div style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>
                Executing structured access-management command...
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)',
              padding: '0.9rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
              {promptLabel}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleHistory}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder='Try "help" or "list-users"'
              disabled={!isAdmin || running}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isAdmin ? 'var(--text)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
              }}
            />
            <button type="submit" className="btn-primary" disabled={!isAdmin || running}>
              Run
            </button>
          </form>

          <div style={{ padding: '0.9rem 1rem', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            Allowed groups: {SENTINEL_GROUPS.join(', ')}. This interface only issues structured API calls and never executes arbitrary shell commands.
          </div>
        </div>
      </div>
    </div>
  )
}
