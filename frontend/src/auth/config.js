/**
 * Cognito OIDC config for SentinelNet.
 * Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in .env before building (e.g. for production).
 * redirect_uri is origin + "/" so it matches the exact URL that receives the callback.
 */

const COGNITO_REGION = 'us-east-1'
const COGNITO_USER_POOL_ID =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_USER_POOL_ID
    ? import.meta.env.VITE_COGNITO_USER_POOL_ID
    : 'us-east-1_2tphwtJVz'

export const clientId =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_CLIENT_ID
    ? import.meta.env.VITE_COGNITO_CLIENT_ID
    : '72nacspbmmec7ghfurtr7dlom1'

/** OIDC issuer (authority) for your User Pool */
export const authority = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`

/** Callback URL must match exactly what Cognito redirects to (origin + path). Use trailing slash so it matches the real URL: origin + "/" + "?code=...". */
function callbackUri(url) {
  if (typeof url !== 'string') return url
  const u = url.trim().replace(/\/+$/, '')
  return u ? u + '/' : u
}

/** Callback URL after sign-in. Must be identical in authorize and token requests; use origin + "/" to match the page that receives the code. */
const rawRedirect =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REDIRECT_URI
        ? import.meta.env.VITE_REDIRECT_URI
        : 'http://localhost:3000')
export const redirectUri = callbackUri(rawRedirect)

/** Sign-out redirect. Add this to Cognito "Allowed sign-out URLs" */
export const logoutUri = redirectUri

/** Cognito Hosted UI domain for logout. Set VITE_COGNITO_DOMAIN in .env from Cognito → Branding → Domain */
export const cognitoDomain =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_DOMAIN
    ? import.meta.env.VITE_COGNITO_DOMAIN
    : `https://sentinelnet-login.auth.${COGNITO_REGION}.amazoncognito.com`

export const oidcConfig = {
  authority,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid email phone',
  automaticSilentRenew: true,
}
