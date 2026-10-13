/**
 * AERIS Theme Context & Persistence
 * Completely standalone from AerisProvider to ensure zero refetches or data pipeline invalidation
 * on theme/accent/density changes.
 */
import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { z } from 'zod'

export type ThemeMode = 'forest' | 'night-watch' | 'field-daylight' | 'system'
export type AccentColor = 'forest' | 'teal' | 'blue' | 'violet' | 'slate'
export type TextSize = 'default' | 'large'
export type Density = 'comfortable' | 'compact'

export const ThemeSettingsSchema = z.object({
  theme: z.enum(['forest', 'night-watch', 'field-daylight', 'system']).default('forest'),
  accent: z.enum(['forest', 'teal', 'blue', 'violet', 'slate']).default('forest'),
  textSize: z.enum(['default', 'large']).default('default'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  reduceMotion: z.boolean().default(false),
  colorBlindSafe: z.boolean().default(false),
  matchBasemap: z.boolean().default(true),
})

export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'forest',
  accent: 'forest',
  textSize: 'default',
  density: 'comfortable',
  reduceMotion: false,
  colorBlindSafe: false,
  matchBasemap: true,
}

export const THEME_STORAGE_KEY = 'aeris_theme_settings_v1'
const THEME_CHANGE_EVENT = 'aeris-theme-changed'

export function getSystemTheme(): 'night-watch' | 'forest' {
  if (typeof window === 'undefined') return 'forest'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night-watch' : 'forest'
}

export function getPersistedThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME_SETTINGS
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return DEFAULT_THEME_SETTINGS
    const parsed = JSON.parse(raw)
    const result = ThemeSettingsSchema.safeParse(parsed)
    return result.success ? result.data : DEFAULT_THEME_SETTINGS
  } catch {
    return DEFAULT_THEME_SETTINGS
  }
}

export function applyThemeToDom(settings: ThemeSettings): 'forest' | 'night-watch' | 'field-daylight' {
  if (typeof document === 'undefined') return 'forest'

  const effectiveTheme: 'forest' | 'night-watch' | 'field-daylight' =
    settings.theme === 'system' ? getSystemTheme() : settings.theme

  const root = document.documentElement
  root.setAttribute('data-theme', effectiveTheme)
  root.setAttribute('data-accent', settings.accent)
  root.setAttribute('data-density', settings.density)
  root.setAttribute('data-text', settings.textSize)
  root.setAttribute('data-cb-safe', settings.colorBlindSafe ? 'true' : 'false')
  root.setAttribute('data-reduce-motion', settings.reduceMotion ? 'true' : 'false')

  // Synchronize mobile browser address bar color
  try {
    let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.name = 'theme-color'
      document.head.appendChild(metaTheme)
    }
    metaTheme.content =
      effectiveTheme === 'night-watch' ? '#0E1B26' : effectiveTheme === 'field-daylight' ? '#E6EBEE' : '#F2F5F2'
  } catch {
    // Ignore DOM head security or SSR errors
  }

  return effectiveTheme
}

export interface ThemeContextValue {
  settings: ThemeSettings
  effectiveTheme: 'forest' | 'night-watch' | 'field-daylight'
  isDark: boolean
  updateSettings: (partial: Partial<ThemeSettings>) => void
  resetThemeSettings: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(getPersistedThemeSettings)
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Listen to OS dark/light mode preference changes if using 'system'
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches)
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  // Apply to DOM attributes whenever settings or OS theme changes
  const effectiveTheme = useMemo(() => {
    return applyThemeToDom(settings)
  }, [settings, systemDark])

  const isDark = effectiveTheme === 'night-watch'

  // Cross-tab and local window event listener
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ThemeSettings>
      if (custom.detail) {
        setSettings(custom.detail)
      } else {
        setSettings(getPersistedThemeSettings())
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const updateSettings = (partial: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...partial }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: updated }))
    } catch (err) {
      console.warn('[AERIS Theme] Failed to persist theme settings:', err)
    }
    setSettings(updated)
  }

  const resetThemeSettings = () => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: DEFAULT_THEME_SETTINGS }))
    } catch (err) {
      console.warn('[AERIS Theme] Failed to reset theme settings:', err)
    }
    setSettings(DEFAULT_THEME_SETTINGS)
  }

  const value = useMemo(
    () => ({
      settings,
      effectiveTheme,
      isDark,
      updateSettings,
      resetThemeSettings,
    }),
    [settings, effectiveTheme, isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
