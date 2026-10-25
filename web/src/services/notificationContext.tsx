/**
 * AERIS Notification Context & Provider
 * Manages reactive alert state, unread badges, audio chimes, toast dispatches, and persistence.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AerisNotification, AlertSeverity } from '@/types/notifications'
import { synthesizeNotifications } from '@/services/notificationEngine'
import { playAlertChime } from '@/services/soundChime'
import { useAeris } from '@/services/dataContext'
import { useSettings } from '@/services/settingsStorage'

const STORAGE_KEY = 'aeris_notifications_state_v1'

// B4 FIX: Single shared localStorage parse on init — prevents two separate JSON.parse
// calls for the same key that the original dual useState initialisers caused.
function loadStoredState(): { readIds: Set<string>; dismissedIds: Set<string> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        readIds: new Set(Array.isArray(parsed.readIds) ? parsed.readIds : []),
        dismissedIds: new Set(Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : []),
      }
    }
  } catch {
    // fallback to empty sets
  }
  return { readIds: new Set<string>(), dismissedIds: new Set<string>() }
}

interface NotificationContextValue {
  notifications: AerisNotification[]
  unreadCount: number
  criticalCount: number
  isChimeMuted: boolean
  toggleMuteChime: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  clearAllRead: () => void
  triggerTestNotification: (severity?: AlertSeverity) => void
  activeToasts: AerisNotification[]
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { sources, rankedSites, actions, aqi, staleFeeds, loading, refreshing, hasData } = useAeris()
  const [settings] = useSettings()

  // B4 FIX: Single init call — shared parse, not two independent JSON.parse calls
  const [readIds, setReadIds] = useState<Set<string>>(() => loadStoredState().readIds)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadStoredState().dismissedIds)

  const [isChimeMuted, setIsChimeMuted] = useState(false)
  const [testAlerts, setTestAlerts] = useState<AerisNotification[]>([])
  const [activeToasts, setActiveToasts] = useState<AerisNotification[]>([])
  const prevCriticalIdsRef = useRef<Set<string>>(new Set())
  const isBaselineEstablishedRef = useRef(false)
  const wasRefreshingRef = useRef(false)

  // Persist read/dismissed state
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: Array.from(readIds),
          dismissedIds: Array.from(dismissedIds),
        })
      )
    } catch (e) {
      console.warn('[AERIS Notifications] Storage write failed:', e)
    }
  }, [readIds, dismissedIds])

  // Compute live notifications from real feeds
  const synthesized = useMemo(() => {
    return synthesizeNotifications({
      sources,
      rankedSites,
      actions,
      aqi,
      staleFeeds,
      settings,
      readIds,
      dismissedIds,
    })
  }, [sources, rankedSites, actions, aqi, staleFeeds, settings, readIds, dismissedIds])

  // Combined notifications: synthesized real + active test alerts
  const notifications = useMemo(() => {
    const combined = [...testAlerts.filter(t => !dismissedIds.has(t.id)), ...synthesized]
    // Filter duplicates by id
    const seen = new Set<string>()
    return combined.filter(n => {
      if (seen.has(n.id)) return false
      seen.add(n.id)
      return true
    })
  }, [synthesized, testAlerts, dismissedIds])

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications])
  const criticalCount = useMemo(() => notifications.filter(n => !n.isRead && n.severity === 'critical').length, [notifications])

  // Audio chime and toast dispatch on newly arrived critical alerts
  useEffect(() => {
    const currentCritical = notifications.filter(n => n.severity === 'critical' && !n.isRead)
    const currentCriticalIds = new Set(currentCritical.map(n => n.id))

    // 1. Initial Load / Tab Refresh:
    // Wait until data has loaded before establishing baseline.
    // Existing baseline alerts must NEVER pop up sliding toasts or audio chimes on load/refresh.
    if (!isBaselineEstablishedRef.current) {
      if (hasData || !loading || notifications.length > 0) {
        isBaselineEstablishedRef.current = true
        prevCriticalIdsRef.current = currentCriticalIds
      }
      return
    }

    // 2. Data Refresh:
    // When the user or system triggers a refresh, absorb updated alert IDs quietly into the baseline.
    if (refreshing) {
      wasRefreshingRef.current = true
      prevCriticalIdsRef.current = currentCriticalIds
      return
    }

    if (wasRefreshingRef.current) {
      wasRefreshingRef.current = false
      prevCriticalIdsRef.current = currentCriticalIds
      return
    }

    // 3. Newly arrived critical alerts during steady-state live operations
    const newCriticalAlerts = currentCritical.filter(n => !prevCriticalIdsRef.current.has(n.id))

    if (newCriticalAlerts.length > 0) {
      if (settings.criticalAlertChime && !isChimeMuted) {
        playAlertChime('critical')
      }

      if (settings.inAppAlertBanners) {
        setActiveToasts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const additions = newCriticalAlerts.filter(a => !existingIds.has(a.id))
          return [...additions, ...prev].slice(0, 3) // max 3 simultaneous toasts
        })
      }
    }

    prevCriticalIdsRef.current = currentCriticalIds
  }, [notifications, settings.criticalAlertChime, settings.inAppAlertBanners, isChimeMuted, hasData, loading, refreshing])

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id))
    setTestAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(new Set(allIds))
    setTestAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
    setActiveToasts([])
  }

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  // B6 FIX: Use functional updater that reads the current notifications snapshot inside
  // the setter to avoid stale closure mismatch when React batches state updates.
  const clearAllRead = () => {
    // Capture IDs from the current render's notifications snapshot
    const readItemIds = notifications.filter(n => n.isRead).map(n => n.id)
    setDismissedIds(prev => {
      const next = new Set(prev)
      readItemIds.forEach(id => next.add(id))
      return next
    })
  }

  const toggleMuteChime = () => setIsChimeMuted(v => !v)

  const dismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const triggerTestNotification = (severity: AlertSeverity = 'critical') => {
    const testId = `test-${Date.now()}`
    const testNotif: AerisNotification = {
      id: testId,
      category: severity === 'critical' ? 'receptor' : 'fire',
      severity,
      title: severity === 'critical' ? '🏥 Diagnostic Drill: Critical Hospital Inflow' : '🔥 Diagnostic Drill: Simulated Thermal Anomaly',
      message: 'This is an operator-initiated diagnostic test verifying alert propagation, audio synthesizers, and toast banners.',
      timestamp: new Date().toISOString(),
      sourceName: 'AERIS Diagnostics Workbench',
      isRead: false,
      isDismissed: false,
      targetTab: 'dashboard',
    }

    setTestAlerts(prev => [testNotif, ...prev])

    if (settings.criticalAlertChime && !isChimeMuted) {
      playAlertChime(severity === 'critical' ? 'critical' : 'warning')
    }

    if (settings.inAppAlertBanners) {
      setActiveToasts(prev => [testNotif, ...prev].slice(0, 3))
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        criticalCount,
        isChimeMuted,
        toggleMuteChime,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAllRead,
        triggerTestNotification,
        activeToasts,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

const DEFAULT_NOTIFICATION_VALUE: NotificationContextValue = {
  notifications: [],
  unreadCount: 0,
  criticalCount: 0,
  isChimeMuted: false,
  toggleMuteChime: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  dismissNotification: () => {},
  clearAllRead: () => {},
  triggerTestNotification: () => {},
  activeToasts: [],
  dismissToast: () => {},
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  return context ?? DEFAULT_NOTIFICATION_VALUE
}
