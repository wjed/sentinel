import { getCognitoDomain, getLogoutUri, getClientId } from './config'

/**
 * Signs out: clears local OIDC session (so you're not stuck "signed in" when you come back),
 * then redirects to Cognito Hosted UI logout.
 * Pass the auth object from useAuth() so we can clear the user.
 */
export async function signOut(auth) {
  const url = `${getCognitoDomain()}/logout?client_id=${getClientId()}&logout_uri=${encodeURIComponent(getLogoutUri())}`

  if (auth?.removeUser) {
    // Fire and forget so we don't block the redirect or trigger re-renders that cancel it
    auth.removeUser().catch(console.error)
  }

  window.location.href = url
}

/** @deprecated Use signOut(auth) so local session is cleared. */
export function signOutRedirect() {
  const url = `${getCognitoDomain()}/logout?client_id=${getClientId()}&logout_uri=${encodeURIComponent(getLogoutUri())}`
  window.location.href = url
}
