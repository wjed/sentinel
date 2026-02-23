/**
 * Cognito OIDC config for SentinelNet.
 * Set VITE_REDIRECT_URI in .env for production (e.g. your CloudFront URL);
 * otherwise redirect_uri defaults to current origin (works for localhost and same-origin deploy).
 */

const COGNITO_USER_POOL_ID = 'us-east-1_YfNiopkS0'
const COGNITO_REGION = 'us-east-1'
const COGNITO_CLIENT_ID = '76agfktalked2qpjjvbfh380m5'

/** OIDC issuer (authority) for your User Pool */
export const authority = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`

/** Normalize URL: no trailing slash so it matches Cognito allowed URLs exactly */
function normalizeOrigin(url) {
  if (typeof url !== 'string') return url
  const u = url.trim()
  return u.endsWith('/') ? u.slice(0, -1) : u
}

/** Callback URL after sign-in. Add this exact URL to Cognito App client "Allowed callback URLs" */
const rawRedirect =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_REDIRECT_URI
    ? import.meta.env.VITE_REDIRECT_URI
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
export const redirectUri = normalizeOrigin(rawRedirect)

/** Sign-out redirect. Add this to Cognito "Allowed sign-out URLs" */
export const logoutUri = redirectUri

/** Cognito Hosted UI domain for logout. Set VITE_COGNITO_DOMAIN in .env (e.g. https://your-domain.auth.us-east-1.amazoncognito.com) */
export const cognitoDomain =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_COGNITO_DOMAIN
    ? import.meta.env.VITE_COGNITO_DOMAIN
    : `https://us-east-1yfniopks0.auth.${COGNITO_REGION}.amazoncognito.com`

export const oidcConfig = {
  authority,
  client_id: COGNITO_CLIENT_ID,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'email openid phone profile',
  automaticSilentRenew: true,
}
