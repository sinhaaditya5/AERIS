/**
 * AERIS Settings Storage & Diagnostics
 * Centralized typed configuration for operational preferences, threshold levels,
 * telemetry intervals, and local storage state.
 */
import { useEffect, useState } from 'react'

export type WindUnit = 'kmh' | 'ms' | 'knots'
export type TempUnit = 'celsius' | 'fahrenheit'
export type AqiStandard = 'cpcb' | 'who' | 'epa'
export type DefaultTab = 'dashboard' | 'map' | 'analytics' | 'wind' | 'sources' | 'population' | 'shield'
export type AutoRefreshInterval = 0 | 1 | 2 | 5 | 15 // minutes, 0 = manual

export interface AerisUserSettings {
  // Operational Preferences
  defaultTab: DefaultTab
  defaultHorizon: 0 | 2 | 4 | 8 | 24
  windUnit: WindUnit
  tempUnit: TempUnit
  aqiStandard: AqiStandard

  // Map & Visuals
  mapPitchEnabled: boolean
  particleDensity: 'standard' | 'high' | 'eco'
  autoFlyToSelection: boolean

  // Thresholds & Sensitivities
  minFrpMw: number // 0 = all, 25, 50, 100
  pm25CriticalThreshold: number // µg/m³
  highRiskFacilityFilter: 'all' | 'schools' | 'hospitals'

  // Telemetry
  autoRefreshInterval: AutoRefreshInterval

  // Notifications
  inAppAlertBanners: boolean
  criticalAlertChime: boolean
}

export const DEFAULT_SETTINGS: AerisUserSettings = {
  defaultTab: 'dashboard',
  defaultHorizon: 2,
  windUnit: 'kmh',
  tempUnit: 'celsius',
  aqiStandard: 'cpcb',

  mapPitchEnabled: false,
  particleDensity: 'standard',
  autoFlyToSelection: true,

  minFrpMw: 0,
  pm25CriticalThreshold: 150,
  highRiskFacilityFilter: 'all',

  autoRefreshInterval: 0,

  inAppAlertBanners: true,
  criticalAlertChime: false,
}

const SETTINGS_KEY = 'aeris_user_settings_v1'
const SETTINGS_EVENT = 'aeris-settings-updated'

export function getSettings(): AerisUserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(partial: Partial<AerisUserSettings>): AerisUserSettings {
  const current = getSettings()
  const updated = { ...current, ...partial }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: updated }))
  } catch (err) {
    console.warn('[AERIS] Failed to persist settings to localStorage:', err)
  }
  return updated
}

export function resetSettings(): AerisUserSettings {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: DEFAULT_SETTINGS }))
  } catch (err) {
    console.warn('[AERIS] Failed to reset settings in localStorage:', err)
  }
  return DEFAULT_SETTINGS
}

export function useSettings(): [
  AerisUserSettings,
  (partial: Partial<AerisUserSettings>) => void,
  () => void,
] {
  const [settings, setSettings] = useState<AerisUserSettings>(getSettings)

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<AerisUserSettings>
      if (custom.detail) {
        setSettings(custom.detail)
      } else {
        setSettings(getSettings())
      }
    }

    window.addEventListener(SETTINGS_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const update = (partial: Partial<AerisUserSettings>) => {
    saveSettings(partial)
  }

  const reset = () => {
    resetSettings()
  }

  return [settings, update, reset]
}

export function getLocalStorageStats(): {
  totalBytes: number
  totalKb: number
  items: { key: string; bytes: number; formatted: string }[]
} {
  if (typeof window === 'undefined') return { totalBytes: 0, totalKb: 0, items: [] }
  try {
    let total = 0
    const items: { key: string; bytes: number; formatted: string }[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('aeris_')) {
        const value = localStorage.getItem(key) || ''
        const bytes = (key.length + value.length) * 2 // UTF-16
        total += bytes
        items.push({
          key,
          bytes,
          formatted: bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`,
        })
      }
    }

    return {
      totalBytes: total,
      totalKb: Number((total / 1024).toFixed(2)),
      items: items.sort((a, b) => b.bytes - a.bytes),
    }
  } catch {
    return { totalBytes: 0, totalKb: 0, items: [] }
  }
}

export function exportDiagnosticBundle(runtimeState?: Record<string, unknown>): void {
  try {
    const settings = getSettings()
    const storageStats = getLocalStorageStats()

    const bundle = {
      aeris_version: '1.4.0',
      timestamp_iso: new Date().toISOString(),
      timestamp_local: new Date().toLocaleString(),
      client_environment: {
        user_agent: navigator.userAgent,
        language: navigator.language,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        device_pixel_ratio: window.devicePixelRatio,
        online: navigator.onLine,
      },
      persisted_settings: settings,
      local_storage_audit: storageStats,
      telemetry_state: runtimeState || {
        note: 'Live dashboard telemetry snapshot',
      },
    }

    const jsonStr = JSON.stringify(bundle, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `aeris_diagnostics_${dateTag}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('[AERIS] Failed to export diagnostic bundle:', err)
  }
}
