import { getAdminAccessApiUrl } from '../auth/config'

function getToken(user) {
  return user?.access_token ?? user?.id_token
}

async function request(user, path, options = {}) {
  const baseUrl = getAdminAccessApiUrl()
  if (!baseUrl) throw new Error('Access management API not configured')

  const token = getToken(user)
  if (!token) throw new Error('Not signed in')

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(body.error || res.statusText || 'Request failed')
  }

  return body
}

export function listGroups(user) {
  return request(user, '/admin/access/groups')
}

export function whoAmI(user) {
  return request(user, '/admin/access/whoami')
}

export function listUsers(user, nextToken = '') {
  const query = nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : ''
  return request(user, `/admin/access/users${query}`)
}

export function getUserAccess(user, identifier) {
  return request(user, `/admin/access/users/${encodeURIComponent(identifier)}`)
}

export function grantAccess(user, identifier, group) {
  return request(user, '/admin/access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, group }),
  })
}

export function revokeAccess(user, identifier, group) {
  return request(user, '/admin/access/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, group }),
  })
}
