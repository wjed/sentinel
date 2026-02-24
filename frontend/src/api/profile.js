/**
 * Profile API client. Calls the backend only when profileApiUrl is set (after deploy).
 */

import { getProfileApiUrl } from '../auth/config'

const base = () => getProfileApiUrl()

function getToken(user) {
  return user?.access_token ?? user?.id_token
}

export async function getProfile(user) {
  const url = base()
  if (!url) return null
  const token = getToken(user)
  if (!token) return null
  const res = await fetch(`${url}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function updateProfile(user, updates) {
  const url = base()
  if (!url) throw new Error('Profile API not configured')
  const token = getToken(user)
  if (!token) throw new Error('Not signed in')
  const body = {}
  const allowed = ['displayName', 'avatarIcon', 'jobFunction', 'bio']
  allowed.forEach((k) => { if (updates[k] !== undefined) body[k] = updates[k] })
  const res = await fetch(`${url}/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || res.statusText || 'Update failed')
  }
  return res.json()
}
