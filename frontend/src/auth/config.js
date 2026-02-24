/**
 * Cognito OIDC config. When deployed, /config.json (from CDK) is loaded and used.
 * For local dev, falls back to env or defaults.
 */

import { getResolvedConfig } from './resolvedConfig.js'

const COGNITO_REGION = 'us-east-1'
const FALLBACK_POOL_ID = 'us-east-1_2tphwtJVz'
const FALLBACK_CLIENT_ID = '72nacspbmmec7ghfurtr7dlom1'

function callbackUri(url) {
  if (typeof url !== 'string') return url
  const u = url.trim().replace(/\/+$/, '')
  return u ? u + '/' : u
}

export function getAuthority() {
  const c = getResolvedConfig()
  if (c?.authority) return c.authority
  return `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${FALLBACK_POOL_ID}`
}

export function getClientId() {
  const c = getResolvedConfig()
  if (c?.clientId) return c.clientId
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_CLIENT_ID
    ? import.meta.env.VITE_COGNITO_CLIENT_ID
    : FALLBACK_CLIENT_ID
}

export function getRedirectUri() {
  const c = getResolvedConfig()
  if (c?.redirectUri) return c.redirectUri
  const raw =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REDIRECT_URI
          ? import.meta.env.VITE_REDIRECT_URI
          : 'http://localhost:3000')
  return callbackUri(raw)
}

export function getCognitoDomain() {
  const c = getResolvedConfig()
  if (c?.cognitoDomain) return c.cognitoDomain
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_DOMAIN
    ? import.meta.env.VITE_COGNITO_DOMAIN
    : `https://sentinelnet.auth.${COGNITO_REGION}.amazoncognito.com`
}

export function getLogoutUri() {
  return getRedirectUri()
}

/** Profile API base URL (from config.json when profile API is deployed). */
export function getProfileApiUrl() {
  const c = getResolvedConfig()
  return c?.profileApiUrl ?? ''
}

export function getOidcConfig() {
  return {
    authority: getAuthority(),
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: (getResolvedConfig()?.scope) || 'openid email phone',
    automaticSilentRenew: true,
  }
}
