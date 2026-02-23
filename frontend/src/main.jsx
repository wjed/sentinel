import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import { getOidcConfig } from './auth/config'
import { setResolvedConfig } from './auth/resolvedConfig'
import './index.css'

function renderApp(oidcConfig) {
  const root = document.getElementById('root')
  if (!root) return
  ReactDOM.createRoot(root).render(
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  )
}

// Load /config.json (from CDK deploy) so the app uses the right Cognito pool.
// If fetch fails or times out (e.g. local dev), we still render with fallback config.
function loadConfigAndRender() {
  const timeout = 4000
  const fetchWithTimeout = Promise.race([
    fetch('/config.json'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ])

  fetchWithTimeout
    .then((r) => (r && r.ok ? r.json() : null))
    .then((config) => {
      if (config) setResolvedConfig(config)
      renderApp(getOidcConfig())
    })
    .catch(() => {
      renderApp(getOidcConfig())
    })
}

loadConfigAndRender()
