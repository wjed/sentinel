const POST_LOGIN_REDIRECT_KEY = 'sentinel_post_login_redirect'

export function setPostLoginRedirect(path) {
  if (typeof window === 'undefined') return
  if (typeof path !== 'string' || !path.trim()) return
  window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path)
}

export function consumePostLoginRedirect(defaultPath = '/dashboard') {
  if (typeof window === 'undefined') return defaultPath
  const path = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  return path || defaultPath
}