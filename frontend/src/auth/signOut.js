import { getCognitoDomain, getLogoutUri, getClientId } from './config'

/**
 * Signs out: clears local OIDC session (so you're not stuck "signed in" when you come back),
 * then redirects to Cognito Hosted UI logout.
 * Pass the auth object from useAuth() so we can clear the user.
 */
export async function signOut(auth) {
  if (auth?.removeUser) {
    await auth.removeUser()
  }
  const url = `${getCognitoDomain()}/logout?client_id=${getClientId()}&logout_uri=${encodeURIComponent(getLogoutUri())}`
  window.location.href = url
}

/** @deprecated Use signOut(auth) so local session is cleared. */
export function signOutRedirect() {
  const url = `${getCognitoDomain()}/logout?client_id=${getClientId()}&logout_uri=${encodeURIComponent(getLogoutUri())}`
  window.location.href = url
}
