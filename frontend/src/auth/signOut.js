import { cognitoDomain, logoutUri, clientId } from './config'

/**
 * Redirects the browser to Cognito Hosted UI logout.
 * Add logoutUri to your Cognito App client "Allowed sign-out URLs".
 */
export function signOutRedirect() {
  const url = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`
  window.location.href = url
}
