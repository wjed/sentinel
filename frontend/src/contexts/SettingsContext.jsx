import { createContext, useContext, useState, useEffect } from 'react'

const defaultSettings = {
  general: {
    orgName: 'SentinelNet SOC',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    dataRetention: '90',
    telemetryUrl: '',
  },
  notifications: {
    alertsEnabled: true,
    digestEnabled: false,
    emailEnabled: false,
    slackEnabled: false,
    emailAddress: '',
    slackWebhook: '',
    minSeverity: '7',
    digestFrequency: 'daily',
  },
  integrations: {
    wazuh: { url: '', user: '', pass: '', connected: false, testing: false },
    grafana: { url: '', token: '', connected: false },
    geoip: { key: '' },
  },
  appearance: {
    compactMode: false,
    showDevAdvice: true,
    sidebarDefaultCollapsed: false,
    accentColor: 'purple',
    tableRowDensity: 'comfortable',
    liveClockEnabled: true,
  }
}

const ACCENT_COLORS = {
  purple: { accent: '#a78bfa', hover: '#c4b5fd', bg: 'rgba(167, 139, 250, 0.12)', primaryDim: 'rgba(167, 139, 250, 0.8)', primaryBg: 'rgba(167, 139, 250, 0.1)' },
  cyan:   { accent: '#22d3ee', hover: '#67e8f9', bg: 'rgba(34, 211, 238, 0.12)', primaryDim: 'rgba(34, 211, 238, 0.8)', primaryBg: 'rgba(34, 211, 238, 0.1)' },
  green:  { accent: '#4ade80', hover: '#86efac', bg: 'rgba(74, 222, 128, 0.12)', primaryDim: 'rgba(74, 222, 128, 0.8)', primaryBg: 'rgba(74, 222, 128, 0.1)' },
  amber:  { accent: '#fbbf24', hover: '#fcd34d', bg: 'rgba(251, 191, 36, 0.12)', primaryDim: 'rgba(251, 191, 36, 0.8)', primaryBg: 'rgba(251, 191, 36, 0.1)' },
  rose:   { accent: '#fb7185', hover: '#fda4af', bg: 'rgba(251, 113, 133, 0.12)', primaryDim: 'rgba(251, 113, 133, 0.8)', primaryBg: 'rgba(251, 113, 133, 0.1)' },
}

const SettingsContext = createContext()

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('sentinel_settings')
      if (stored) {
        // Merge stored settings with defaultSettings to ensure all keys exist
        const parsed = JSON.parse(stored)
        return {
          general: { ...defaultSettings.general, ...parsed.general },
          notifications: { ...defaultSettings.notifications, ...parsed.notifications },
          integrations: { ...defaultSettings.integrations, ...parsed.integrations },
          appearance: { ...defaultSettings.appearance, ...parsed.appearance },
        }
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e)
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('sentinel_settings', JSON.stringify(settings))
  }, [settings])

  // Apply Appearance preferences
  useEffect(() => {
    const { compactMode, accentColor } = settings.appearance

    if (compactMode) {
      document.body.classList.add('compact-mode')
    } else {
      document.body.classList.remove('compact-mode')
    }

    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.purple
    const root = document.documentElement
    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--accent-hover', colors.hover)
    root.style.setProperty('--accent-bg', colors.bg)
    root.style.setProperty('--primary', colors.accent)
    root.style.setProperty('--primary-dim', colors.primaryDim)
    root.style.setProperty('--primary-bg', colors.primaryBg)
  }, [settings.appearance.compactMode, settings.appearance.accentColor])

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const setCategoryConfig = (category, config) => {
    setSettings(prev => ({
      ...prev,
      [category]: typeof config === 'function' ? config(prev[category]) : config
    }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, setCategoryConfig, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
