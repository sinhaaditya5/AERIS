/**
 * AERIS Notification Engine
 * Deterministically computes operational environmental alerts from real incoming data feeds.
 * 100% scientifically grounded: zero mock data or fabricated metrics.
 */

import type { SourcesFile, RankedSitesFile, ActionsFile, AqiFile } from '@/types/schemas'
import type { AerisNotification } from '@/types/notifications'
import type { AerisUserSettings } from '@/services/settingsStorage'
import type { Freshness } from '@/services/api'

interface EngineInputs {
  sources?: SourcesFile | null
  rankedSites?: RankedSitesFile | null
  actions?: ActionsFile | null
  aqi?: AqiFile | null
  staleFeeds?: Freshness[]
  settings?: AerisUserSettings
  readIds?: Set<string>
  dismissedIds?: Set<string>
}

export function synthesizeNotifications({
  sources,
  rankedSites,
  actions,
  aqi,
  staleFeeds = [],
  settings,
  readIds = new Set(),
  dismissedIds = new Set(),
}: EngineInputs): AerisNotification[] {
  const notifs: AerisNotification[] = []

  const minFrp = settings?.minFrpMw ?? 50
  const pm25Critical = settings?.pm25CriticalThreshold ?? 150

  // 1. High Thermal Outbreak / Stubble Burning Clusters
  if (sources?.sources && Array.isArray(sources.sources)) {
    // Sort sources by FRP descending
    const sortedSources = [...sources.sources].sort((a, b) => b.total_frp_mw - a.total_frp_mw)
    
    // Pick the top notable clusters exceeding threshold
    for (const src of sortedSources) {
      if (src.total_frp_mw < Math.max(25, minFrp)) continue

      const id = `fire-${src.id}-${Math.round(src.total_frp_mw)}`
      const isCritical = src.total_frp_mw >= 400 || src.fire_count >= 50
      const location = src.location_name || src.district || src.state || 'Agricultural Belt'

      notifs.push({
        id,
        category: 'fire',
        severity: isCritical ? 'critical' : 'warning',
        title: `${isCritical ? '🚨 Severe' : '🔥 Active'} Thermal Cluster: ${Math.round(src.total_frp_mw)} MW`,
        message: `Cluster ${src.id} active with ${src.fire_count} fire detections in ${location}. Emission strength index: ${(src.emission_strength * 100).toFixed(0)}%.`,
        timestamp: src.last_seen || sources.generated_at,
        sourceName: 'NASA VIIRS SNPP / NOAA-20',
        isRead: readIds.has(id),
        isDismissed: dismissedIds.has(id),
        targetTab: 'sources',
        targetPayload: {
          lat: src.lat,
          lon: src.lon,
          sourceId: src.id,
          zoom: 11,
          name: `${src.id} (${location})`,
        },
      })
    }
  }

  // 2. Sensitive Receptor Exposure (Hospitals & Schools in dispersion corridor)
  if (rankedSites?.sites && Array.isArray(rankedSites.sites)) {
    // Look for top facilities facing immediate plume arrival (ETA <= 2h)
    const imminentSites = rankedSites.sites
      .filter(s => s.eta_hours <= 2.0 && (s.pm25_delta_ugm3 >= 10 || s.risk_score >= 0.08))
      .slice(0, 10)

    for (const site of imminentSites) {
      const id = `site-${site.site_id}-${site.eta_hours.toFixed(1)}`
      const isImmediateHospital = site.type === 'hospital' && site.eta_hours <= 1.0
      const isCritical = isImmediateHospital || site.pm25_delta_ugm3 >= pm25Critical

      notifs.push({
        id,
        category: 'receptor',
        severity: isCritical ? 'critical' : 'warning',
        title: `${site.type === 'hospital' ? '🏥 Hospital' : '🏫 School'} Risk: ${site.name}`,
        message: `Projected plume arrival in ${site.eta_hours === 0 ? 'under 30 mins' : `${site.eta_hours.toFixed(1)} hrs`} with +${site.pm25_delta_ugm3.toFixed(0)} µg/m³ PM2.5 delta. Risk score: ${(site.risk_score * 100).toFixed(1)}%.`,
        timestamp: rankedSites.generated_at,
        sourceName: 'Dispersion Model & Receptor Registry',
        isRead: readIds.has(id),
        isDismissed: dismissedIds.has(id),
        targetTab: 'map',
        targetPayload: {
          lat: site.lat,
          lon: site.lon,
          siteId: site.site_id,
          zoom: 13,
          name: site.name,
        },
      })
    }
  }

  // 3. High-Priority Protective Directives
  if (actions?.actions && Array.isArray(actions.actions)) {
    const urgentActions = actions.actions.filter(a => a.deadline_hours <= 1.5).slice(0, 5)

    for (const act of urgentActions) {
      const id = `action-${act.site_id}-${act.priority}`
      const isTopPriority = act.priority <= 2

      notifs.push({
        id,
        category: 'action',
        severity: isTopPriority ? 'critical' : 'advisory',
        title: `Priority #${act.priority} Advisory: ${act.who}`,
        message: `${act.action} — ${act.reason}. Window: ${act.deadline_hours}h.`,
        timestamp: actions.generated_at,
        sourceName: actions.generator || 'CAQM Decision Support Framework',
        isRead: readIds.has(id),
        isDismissed: dismissedIds.has(id),
        targetTab: 'shield',
      })
    }
  }

  // 4. Ground AQI Monitoring Exceedances
  if (aqi?.stations && Array.isArray(aqi.stations)) {
    const severeStations = aqi.stations
      .filter(st => (st.pm25 && st.pm25 >= 180) || st.aqi_category === 'Severe' || (st.aqi && st.aqi >= 300))
      .slice(0, 4)

    for (const st of severeStations) {
      const id = `aqi-${st.id}`
      const pmVal = st.pm25 ? Math.round(st.pm25) : null
      const isCritical = (pmVal != null && pmVal >= 250) || (st.aqi != null && st.aqi >= 400)

      notifs.push({
        id,
        category: 'meteorology',
        severity: isCritical ? 'critical' : 'warning',
        title: `Severe AQI Spike: ${st.name}`,
        message: `Ground station recorded PM2.5 of ${pmVal != null ? `${pmVal} µg/m³` : 'elevated levels'} (${st.aqi_category || 'Hazardous'}).`,
        timestamp: st.observed_at || aqi.generated_at,
        sourceName: `${st.source} Real-Time Sensor`,
        isRead: readIds.has(id),
        isDismissed: dismissedIds.has(id),
        targetTab: 'map',
        targetPayload: {
          lat: st.lat,
          lon: st.lon,
          zoom: 12,
          name: st.name,
        },
      })
    }
  }

  // 5. Data Pipeline Telemetry & Feed Freshness
  if (staleFeeds && staleFeeds.length > 0) {
    for (const feed of staleFeeds) {
      const id = `telemetry-${feed.label}`
      notifs.push({
        id,
        category: 'telemetry',
        severity: feed.status === 'stale' ? 'warning' : 'system',
        title: `Telemetry Stale: ${feed.label.replace('_', ' ')}`,
        message: `Feed is marked ${feed.status}. Last generated: ${feed.generatedAt ?? 'unavailable'}${feed.reason ? ` (${feed.reason})` : ''}.`,
        timestamp: feed.generatedAt || new Date().toISOString(),
        sourceName: 'AERIS Pipeline Health Monitor',
        isRead: readIds.has(id),
        isDismissed: dismissedIds.has(id),
        targetTab: 'settings',
      })
    }
  }

  // Sort order:
  // 1. Critical first, then Warning, Advisory, System
  // 2. Unread before read
  // 3. Newest timestamp descending
  const severityScore: Record<string, number> = {
    critical: 4,
    warning: 3,
    advisory: 2,
    system: 1,
  }

  return notifs
    .filter(n => !n.isDismissed)
    .sort((a, b) => {
      // Unread prioritized
      if (!a.isRead && b.isRead) return -1
      if (a.isRead && !b.isRead) return 1

      // Severity prioritized
      const diffSeverity = (severityScore[b.severity] ?? 0) - (severityScore[a.severity] ?? 0)
      if (diffSeverity !== 0) return diffSeverity

      // Timestamp fallback
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
}
