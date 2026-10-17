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
  const { sources, rankedSites, actions, aqi, staleFeeds } = useAeris()
  const [settings] = useSettings()

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return new Set(Array.isArray(parsed.readIds) ? parsed.readIds : [])
      }
    } catch {
      // fallback
    }
    return new Set<string>()
  })

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return new Set(Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [])
      }
    } catch {
      // fallback
    }
    return new Set<string>()
  })

  const [isChimeMuted, setIsChimeMuted] = useState(false)
  const [testAlerts, setTestAlerts] = useState<AerisNotification[]>([])
  const [activeToasts, setActiveToasts] = useState<AerisNotification[]>([])
  const prevCriticalIdsRef = useRef<Set<string>>(new Set())
  const hasInitializedRef = useRef(false)

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

  // Audio chime and toast dispatch on new critical alerts
  useEffect(() => {
    const currentCritical = notifications.filter(n => n.severity === 'critical' && !n.isRead)
    const currentCriticalIds = new Set(currentCritical.map(n => n.id))

    // Don't play chime on very first load to avoid jarring user before interaction
    if (hasInitializedRef.current) {
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
    } else {
      hasInitializedRef.current = true
    }

    prevCriticalIdsRef.current = currentCriticalIds
  }, [notifications, settings.criticalAlertChime, settings.inAppAlertBanners, isChimeMuted])

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id))
    setTestAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
  }

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(new Set(allIds))
    setTestAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
  }

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const clearAllRead = () => {
    const readItems = notifications.filter(n => n.isRead).map(n => n.id)
    setDismissedIds(prev => {
      const next = new Set(prev)
      readItems.forEach(id => next.add(id))
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

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
