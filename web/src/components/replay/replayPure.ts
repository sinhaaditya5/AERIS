/**
 * replayPure.ts — All pure, side-effect-free functions for Forecast Replay.
 * Every function here is deterministic and testable without React or MapLibre.
 * Zero fabricated data: all inputs come from existing AERIS contracts.
 */

import type {
  SourcesFile, CorridorGeoJSON, RankedSitesFile, ActionsFile, WindFile,
} from '@/types/schemas'

// ─── Chapter ──────────────────────────────────────────────────────────────────

export type ReplayChapter = 'source' | 'movement' | 'exposure' | 'action'

/**
 * Derive the active chapter from the current scrubber position.
 * Manual chapter selection in ChapterNav overrides this.
 */
export function chapterFromTime(tHours: number): ReplayChapter {
  if (tHours < 0.5) return 'source'
  if (tHours < 4)   return 'movement'
  if (tHours < 12)  return 'exposure'
  return 'action'
}

export const CHAPTERS: { id: ReplayChapter; label: string; icon: string }[] = [
  { id: 'source',   label: 'Source',   icon: '🔥' },
  { id: 'movement', label: 'Movement', icon: '💨' },
  { id: 'exposure', label: 'Exposure', icon: '🏥' },
  { id: 'action',   label: 'Action',   icon: '🛡️' },
]

// ─── Time formatting ───────────────────────────────────────────────────────────

/**
 * Format fractional hours as "T+Xh Ym" or "< 1 hour" for ETAs.
 * Never exposes wall-clock times; always relative to forecast_start.
 */
export function formatEta(etaHours: number): string {
  if (!Number.isFinite(etaHours) || etaHours < 0) return '—'
  if (etaHours < 1) return '< 1 hour'
  const h = Math.floor(etaHours)
  const m = Math.round((etaHours - h) * 60)
  if (m === 0) return `T+${h}h`
  return `T+${h}h ${m}m`
}

/**
 * Format fractional tHours as a scrubber label: "T+0h", "T+2h", etc.
 */
export function formatScrubberLabel(tHours: number): string {
  const h = Math.floor(tHours)
  const m = Math.round((tHours - h) * 60)
  if (m === 0) return `T+${h}h`
  return `T+${h}h ${m}m`
}

/**
 * Format estimated real-world clock time based on forecast_start and fractional tHours.
 * Returns null if forecastStart is not provided or invalid.
 */
export function formatWallClock(forecastStart: string | null | undefined, tHours: number): string | null {
  if (!forecastStart) return null
  const baseMs = Date.parse(forecastStart)
  if (!Number.isFinite(baseMs)) return null
  const currentMs = baseMs + tHours * 3600 * 1000
  const d = new Date(currentMs)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })
}

export interface RelativeArrival {
  status: 'approaching' | 'arrived'
  label: string
  text: string
  diffHours: number
}

/**
 * Calculate dynamic arrival relative to current playhead tHours.
 */
export function formatRelativeArrival(siteEta: number, currentTHours: number): RelativeArrival {
  if (!Number.isFinite(siteEta)) {
    return { status: 'approaching', label: 'ETA unavailable', text: '—', diffHours: 0 }
  }
  const diff = siteEta - currentTHours
  if (diff > 0.05) {
    let text = ''
    if (diff < 1) {
      const mins = Math.max(1, Math.round(diff * 60))
      text = `${mins}m`
    } else {
      const h = Math.floor(diff)
      const m = Math.round((diff - h) * 60)
      text = m === 0 ? `${h}h` : `${h}h ${m}m`
    }
    return {
      status: 'approaching',
      label: `In ${text}`,
      text,
      diffHours: diff,
    }
  }

  // Smoke front reached
  const elapsed = Math.abs(diff)
  if (elapsed < 0.1) {
    return {
      status: 'arrived',
      label: 'Arrived now',
      text: 'now',
      diffHours: diff,
    }
  }
  let text = ''
  if (elapsed < 1) {
    const mins = Math.round(elapsed * 60)
    text = `${mins}m ago`
  } else {
    const h = Math.floor(elapsed)
    const m = Math.round((elapsed - h) * 60)
    text = m === 0 ? `${h}h ago` : `${h}h ${m}m ago`
  }
  return {
    status: 'arrived',
    label: `Arrived ${text}`,
    text,
    diffHours: diff,
  }
}

// ─── Occupancy / Generator safe rendering ─────────────────────────────────────

/** Render occupancy: null occupancy is always "unrecorded", never 0. */
export function formatOccupancy(v: number | null | undefined): string {
  if (v == null) return 'unrecorded'
  return v.toLocaleString()
}

/** Render generator label with honesty fallback. */
export function formatGenerator(g: string | null | undefined): string {
  if (!g || g.trim() === '') return 'Rule-based plan (fallback)'
  return g
}

/** Compass direction label from meteorological "from" degrees. */
export function compassLabel(degFrom: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx = Math.round(((degFrom + 360) % 360) / 45) % 8
  return dirs[idx]
}

// ─── Narration strings ────────────────────────────────────────────────────────
// Prohibited words: "live", "will", "accurate", "predicted impact"

export function narrateSource(sources: SourcesFile | null): string {
  if (!sources || sources.sources.length === 0) {
    return 'No fire sources detected in this forecast run.'
  }
  const totalFires = sources.sources.reduce((a, s) => a + s.fire_count, 0)
  const totalFrp   = sources.sources.reduce((a, s) => a + s.total_frp_mw, 0)
  const plural     = totalFires === 1 ? 'fire' : 'fires'
  // Dominant type for territory description
  const dominated  = sources.sources.reduce((a, b) => b.total_frp_mw > a.total_frp_mw ? b : a)
  const territory  = dominated.location_name ?? dominated.territory ?? dominated.district ?? 'the region'
  const frpRounded = Math.round(totalFrp)
  const firstSeen  = dominated.first_seen
    ? new Date(dominated.first_seen).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : 'unknown time'
  // eslint-disable-next-line no-restricted-syntax -- these words checked manually
  return `${totalFires} active ${plural} clustered near ${territory}. Combined radiative power: ${frpRounded} MW. Dominant cluster first detected ${firstSeen}.`
}

export function narrateMovement(
  corridor: CorridorGeoJSON | null,
  wind: WindFile | null,
  rankedSites: RankedSitesFile | null,
): string {
  if (!corridor || corridor.features.length === 0) {
    return 'Smoke corridor data unavailable for this forecast run.'
  }
  const sample = wind?.points.find(p => p.hours.length > 0)?.hours[0]
  const speedKmh = sample ? Math.round(sample.speed_ms * 3.6) : null
  const dir      = sample ? compassLabel(sample.dir_from_deg) : null
  const minEta   = rankedSites?.sites.length
    ? Math.min(...rankedSites.sites.slice(0, 3).map(s => s.eta_hours))
    : null

  const windPart = (speedKmh != null && dir)
    ? `Smoke is moving ${dir} at ~${speedKmh} km/h.`
    : 'Smoke transport speed unavailable.'
  const etaPart  = minEta != null
    ? ` The modelled column reaches the nearest sensitive site in ${formatEta(minEta)}.`
    : ''
  return windPart + etaPart
}

export function narrateExposure(rankedSites: RankedSitesFile | null): string {
  if (!rankedSites || rankedSites.sites.length === 0) {
    return 'Exposure data unavailable for this forecast run.'
  }
  const pop      = rankedSites.exposed_population
  const popEst   = pop.data_available !== false ? pop.estimate.toLocaleString() : 'unknown'
  const siteCount = rankedSites.sites.length
  const top       = rankedSites.sites[0]
  const topType   = top.type === 'school' ? 'school' : 'hospital'
  return `${popEst} people in ${siteCount} sensitive facilities fall inside the modelled smoke corridor. Highest-risk site: ${top.name} (${topType}), model ETA ${formatEta(top.eta_hours)}.`
}

export function narrateAction(actions: ActionsFile | null): string {
  if (!actions || actions.actions.length === 0) {
    return 'No protective actions generated for this forecast run.'
  }
  const count    = actions.actions.length
  const plural   = count === 1 ? 'action' : 'actions'
  const siteIds  = [...new Set(actions.actions.map(a => a.site_id))].length
  const sitePlural = siteIds === 1 ? 'site' : 'sites'
  const gen      = formatGenerator(actions.generator)
  const minDeadline = Math.min(...actions.actions.map(a => a.deadline_hours))
  return `${count} protective ${plural} generated for ${siteIds} ${sitePlural}. Generator: ${gen}. Earliest deadline: ${formatEta(minDeadline)}.`
}

// ─── Map geometry helpers ─────────────────────────────────────────────────────

/**
 * Return corridor band + centerline features visible at time t.
 * Bands are cumulative: all bands where hour_from <= t are shown.
 */
export function filteredCorridorFeatures(
  corridor: CorridorGeoJSON | null,
  tHours: number,
): CorridorGeoJSON['features'] {
  if (!corridor) return []
  return corridor.features.filter(f => {
    const p = f.properties as Record<string, unknown>
    if (p['kind'] === 'centerline') return tHours >= 0.5
    if (p['kind'] === 'band') return typeof p['hour_from'] === 'number' && (p['hour_from'] as number) <= tHours
    return false
  })
}

/** Centroid of all fire source coordinates. */
export function sourcesCentroid(sources: SourcesFile | null): [number, number] | null {
  if (!sources || sources.sources.length === 0) return null
  let lonSum = 0, latSum = 0
  for (const s of sources.sources) { lonSum += s.lon; latSum += s.lat }
  return [lonSum / sources.sources.length, latSum / sources.sources.length]
}

/** Bounding box of all corridor features (for Movement camera). */
export function corridorBbox(
  corridor: CorridorGeoJSON | null,
): [[number, number], [number, number]] | null {
  if (!corridor || corridor.features.length === 0) return null
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  corridor.features.forEach(f => {
    const coords: number[][] =
      f.geometry.type === 'Polygon'   ? f.geometry.coordinates.flat() :
      f.geometry.type === 'LineString' ? f.geometry.coordinates        : []
    coords.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon)
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
    })
  })
  if (!Number.isFinite(minLon)) return null
  return [[minLon, minLat], [maxLon, maxLat]]
}

/** Top-3 ranked site coordinates for Exposure camera. */
export function topSitesBbox(
  rankedSites: RankedSitesFile | null,
): [[number, number], [number, number]] | null {
  if (!rankedSites || rankedSites.sites.length === 0) return null
  const top3 = rankedSites.sites.slice(0, 3)
  const lons = top3.map(s => s.lon), lats = top3.map(s => s.lat)
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}

/** GeoJSON FeatureCollection for top-N ranked site circles. */
export function sitesGeoJSON(
  rankedSites: RankedSitesFile | null,
  limit = 8,
): GeoJSON.FeatureCollection {
  if (!rankedSites) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: rankedSites.sites.slice(0, limit).map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
      properties: {
        site_id:       s.site_id,
        name:          s.name,
        type:          s.type,
        risk_score:    s.risk_score,
        eta_hours:     s.eta_hours,
        pm25_delta:    s.pm25_delta_ugm3,
        occupancy:     s.occupancy,
        rank:          s.rank,
      },
    })),
  }
}

/** GeoJSON FeatureCollection for fire source thermal markers. */
export function sourcesGeoJSON(sources: SourcesFile | null): GeoJSON.FeatureCollection {
  if (!sources) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: sources.sources.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
      properties: {
        id:               s.id,
        fire_count:       s.fire_count,
        total_frp_mw:     s.total_frp_mw,
        emission_strength: s.emission_strength,
        confidence:       s.confidence,
        type:             s.type,
      },
    })),
  }
}

/** Pulsing circle radius for Exposure chapter (grows with time, 4–16 px). */
export function pulseRadius(tHours: number): number {
  const base = 7
  const wave = Math.sin((tHours % 2) * Math.PI) * 3
  return Math.max(4, Math.min(16, base + wave))
}

/**
 * GeoJSON FeatureCollection containing interpolated wavefront points along each centerline
 * at the given tHours.
 */
export function wavefrontGeoJSON(
  corridor: CorridorGeoJSON | null,
  tHours: number,
): GeoJSON.FeatureCollection {
  if (!corridor || corridor.features.length === 0 || tHours <= 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  const features: GeoJSON.Feature[] = []

  for (const f of corridor.features) {
    const p = f.properties as Record<string, unknown>
    if (p['kind'] !== 'centerline' || f.geometry.type !== 'LineString') continue

    const coords = f.geometry.coordinates as [number, number][]
    const etas = (p['points_eta_hours'] as number[]) ?? []
    if (coords.length === 0) continue

    let pt: [number, number] = coords[0]
    if (etas.length === coords.length && coords.length > 1) {
      const maxEta = etas[etas.length - 1]
      if (tHours >= maxEta) {
        pt = coords[coords.length - 1]
      } else {
        for (let i = 0; i < etas.length - 1; i++) {
          const e0 = etas[i]
          const e1 = etas[i + 1]
          if (tHours >= e0 && tHours <= e1) {
            const span = e1 - e0
            const frac = span > 0 ? (tHours - e0) / span : 0
            const lon = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * frac
            const lat = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * frac
            pt = [lon, lat]
            break
          }
        }
      }
    } else {
      const frac = Math.min(1, Math.max(0, tHours / 24))
      const idx = Math.min(coords.length - 1, Math.floor(frac * (coords.length - 1)))
      pt = coords[idx]
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pt },
      properties: {
        source_id: p['source_id'] ?? 'unknown',
        t_hours: tHours,
      },
    })
  }

  return { type: 'FeatureCollection', features }
}

export interface ExposureCurvePoint {
  hour: number
  peakPm25Delta: number
}

/**
 * Computes regional peak PM2.5 delta progression over time bands for sparkline rendering.
 */
export function regionalExposureCurve(corridor: CorridorGeoJSON | null): ExposureCurvePoint[] {
  if (!corridor) return []
  const grouped = new Map<number, number>()
  grouped.set(0, 0)
  for (const f of corridor.features) {
    const p = f.properties as Record<string, unknown>
    if (p['kind'] !== 'band') continue
    const hr = typeof p['hour_to'] === 'number' ? (p['hour_to'] as number) : null
    const delta = typeof p['pm25_delta_ugm3'] === 'number' ? (p['pm25_delta_ugm3'] as number) : 0
    if (hr != null) {
      const cur = grouped.get(hr) ?? 0
      grouped.set(hr, Math.max(cur, delta))
    }
  }
  return [...grouped.entries()]
    .map(([hour, peakPm25Delta]) => ({ hour, peakPm25Delta }))
    .sort((a, b) => a.hour - b.hour)
}
