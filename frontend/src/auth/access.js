import { getResolvedConfig } from './resolvedConfig'

const DEFAULT_ALLOWED_GROUPS = [
  'SentinelNetAdmins',
  'SentinelNetAnalysts',
  'SentinelNetViewers',
]

function fromCsv(value) {
  if (typeof value !== 'string') return []
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

function decodeJwtClaims(token) {
  if (!token || typeof token !== 'string') return {}
  const [, payload] = token.split('.')
  if (!payload) return {}

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(window.atob(padded))
  } catch {
    return {}
  }
}

function normalizeGroups(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean)
  if (typeof value === 'string') return fromCsv(value.replace(/\s+/g, ','))
  return []
}

export function getAllowedGroups() {
  const configured = getResolvedConfig()?.allowedGroups
  if (Array.isArray(configured) && configured.length) return configured
  if (typeof configured === 'string' && configured.trim()) return fromCsv(configured)

  const envGroups = typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_ALLOWED_GROUPS
    : ''
  return fromCsv(envGroups).length ? fromCsv(envGroups) : DEFAULT_ALLOWED_GROUPS
}

export function getUserGroups(user) {
  const profile = user?.profile ?? {}
  const accessClaims = decodeJwtClaims(user?.access_token)
  const idClaims = decodeJwtClaims(user?.id_token)
  const groups = [
    ...normalizeGroups(profile['cognito:groups'] ?? profile.groups),
    ...normalizeGroups(accessClaims['cognito:groups'] ?? accessClaims.groups),
    ...normalizeGroups(idClaims['cognito:groups'] ?? idClaims.groups),
  ]
  return [...new Set(groups)]
}

export function hasAllowedGroup(user, requiredGroups = getAllowedGroups()) {
  const allowed = Array.isArray(requiredGroups) ? requiredGroups : fromCsv(requiredGroups)
  if (!allowed.length) return true
  const userGroups = getUserGroups(user)
  return userGroups.some((group) => allowed.includes(group))
}
