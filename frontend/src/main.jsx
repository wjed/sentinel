import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import App from './App'
import { oidcConfig } from './auth/config'
import './index.css'

// StrictMode disabled: it can cause the OIDC callback to run twice and the token exchange to return 400.
ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider {...oidcConfig}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
)
