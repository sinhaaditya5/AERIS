/**
 * AERIS Notification & Incident Types
 * Strict typing for synthesized real-time environmental alerts, telemetry warnings,
 * and receptor exposure notifications.
 */

export type AlertSeverity = 'critical' | 'warning' | 'advisory' | 'system'
export type AlertCategory = 'receptor' | 'fire' | 'meteorology' | 'action' | 'telemetry'

export interface AerisNotification {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  message: string
  timestamp: string // ISO timestamp from originating feed or detection
  sourceName: string // e.g. "NASA VIIRS", "CPCB/OpenAQ", "Open-Meteo GFS", "CAQM Advisory Engine"
  isRead: boolean
  isDismissed: boolean
  targetTab?: 'dashboard' | 'map' | 'analytics' | 'wind' | 'sources' | 'population' | 'shield' | 'settings' | 'notifications'
  targetPayload?: {
    lon?: number
    lat?: number
    siteId?: string
    sourceId?: string
    zoom?: number
    name?: string
  }
}

export interface NotificationFilter {
  severity: 'all' | AlertSeverity
  category: 'all' | AlertCategory
  unreadOnly: boolean
  searchQuery: string
}

export interface NotificationStateStore {
  readIds: string[]
  dismissedIds: string[]
  mutedSeverities: AlertSeverity[]
  lastAlertTimestamp: string | null
}
