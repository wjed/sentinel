import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Product from './pages/Product'
import Pricing from './pages/Pricing'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/IncidentDetail'
import Assets from './pages/Assets'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Account from './pages/Account'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="product" element={<Product />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="assets" element={<Assets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
