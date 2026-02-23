import { cognitoDomain, logoutUri } from './config'

const COGNITO_CLIENT_ID = '76agfktalked2qpjjvbfh380m5'

/**
 * Redirects the browser to Cognito Hosted UI logout.
 * Add logoutUri to your Cognito App client "Allowed sign-out URLs".
 */
export function signOutRedirect() {
  const url = `${cognitoDomain}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(logoutUri)}`
  window.location.href = url
}
