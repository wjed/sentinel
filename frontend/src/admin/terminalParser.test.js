import { describe, expect, it } from 'vitest'
import { getHelpLines, parseTerminalCommand } from './terminalParser'

describe('parseTerminalCommand', () => {
  it('parses no-arg commands', () => {
    expect(parseTerminalCommand('help')).toEqual({ ok: true, command: 'help' })
    expect(parseTerminalCommand('list-users')).toEqual({ ok: true, command: 'list-users' })
    expect(parseTerminalCommand('whoami')).toEqual({ ok: true, command: 'whoami' })
    expect(parseTerminalCommand('clear')).toEqual({ ok: true, command: 'clear' })
  })

  it('parses get-user', () => {
    expect(parseTerminalCommand('get-user analyst@example.com')).toEqual({
      ok: true,
      command: 'get-user',
      identifier: 'analyst@example.com',
    })
  })

  it('normalizes grant and revoke groups', () => {
    expect(parseTerminalCommand('grant-access user@example.com Admins')).toEqual({
      ok: true,
      command: 'grant-access',
      identifier: 'user@example.com',
      group: 'SentinelNetAdmins',
    })
    expect(parseTerminalCommand('revoke-access bob Analysts')).toEqual({
      ok: true,
      command: 'revoke-access',
      identifier: 'bob',
      group: 'SentinelNetAnalysts',
    })
  })

  it('rejects invalid input', () => {
    expect(parseTerminalCommand('')).toEqual({
      ok: false,
      error: 'Enter a command. Type "help" to see supported commands.',
    })
    expect(parseTerminalCommand('grant-access user@example.com Owners')).toEqual({
      ok: false,
      error: 'Invalid group. Use Admins, Analysts, or Viewers.',
    })
    expect(parseTerminalCommand('rm -rf /')).toEqual({
      ok: false,
      error: 'Unknown command: rm. Type "help" to see supported commands.',
    })
  })
})

describe('getHelpLines', () => {
  it('includes the supported commands', () => {
    const lines = getHelpLines().join('\n')
    expect(lines).toContain('list-users')
    expect(lines).toContain('grant-access <email-or-username> <Admins|Analysts|Viewers>')
    expect(lines).toContain('SentinelNetAdmins')
  })
})
