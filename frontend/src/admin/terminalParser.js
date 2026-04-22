import { ADMIN_GROUP, SENTINEL_GROUPS, TERMINAL_GROUP_ALIASES } from '../auth/groups'

function tokenize(input) {
  if (typeof input !== 'string') return []
  return input.trim().split(/\s+/).filter(Boolean)
}

function normalizeGroup(group) {
  if (typeof group !== 'string') return null
  const normalized = TERMINAL_GROUP_ALIASES[group.trim().toLowerCase()]
  return normalized ?? null
}

function syntaxError(message) {
  return { ok: false, error: message }
}

export function parseTerminalCommand(input) {
  const tokens = tokenize(input)
  if (!tokens.length) return syntaxError('Enter a command. Type "help" to see supported commands.')

  const [command, ...args] = tokens

  switch (command.toLowerCase()) {
    case 'help':
      if (args.length) return syntaxError('help does not take arguments.')
      return { ok: true, command: 'help' }
    case 'clear':
      if (args.length) return syntaxError('clear does not take arguments.')
      return { ok: true, command: 'clear' }
    case 'list-users':
      if (args.length) return syntaxError('list-users does not take arguments.')
      return { ok: true, command: 'list-users' }
    case 'list-groups':
      if (args.length) return syntaxError('list-groups does not take arguments.')
      return { ok: true, command: 'list-groups' }
    case 'whoami':
      if (args.length) return syntaxError('whoami does not take arguments.')
      return { ok: true, command: 'whoami' }
    case 'get-user':
      if (args.length !== 1) return syntaxError('Usage: get-user <email-or-username>')
      return { ok: true, command: 'get-user', identifier: args[0] }
    case 'grant-access':
    case 'revoke-access': {
      if (args.length !== 2) return syntaxError(`Usage: ${command} <email-or-username> <Admins|Analysts|Viewers>`)
      const group = normalizeGroup(args[1])
      if (!group) return syntaxError('Invalid group. Use Admins, Analysts, or Viewers.')
      return {
        ok: true,
        command: command.toLowerCase(),
        identifier: args[0],
        group,
      }
    }
    default:
      return syntaxError(`Unknown command: ${command}. Type "help" to see supported commands.`)
  }
}

export function getHelpLines() {
  return [
    'Supported commands:',
    'help',
    'list-users',
    'get-user <email-or-username>',
    'grant-access <email-or-username> <Admins|Analysts|Viewers>',
    'revoke-access <email-or-username> <Admins|Analysts|Viewers>',
    'list-groups',
    'whoami',
    'clear',
    '',
    `Admin group required: ${ADMIN_GROUP}`,
    `Managed groups: ${SENTINEL_GROUPS.join(', ')}`,
  ]
}
