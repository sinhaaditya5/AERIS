/**
 * AERIS Meteorology Utilities & Physics Algorithms
 * Pure mathematical, meteorological, and conversion functions.
 * Decoupled from React UI components for HMR compliance and unit testing.
 */

import type { WindPoint, WindHour } from '@/types/schemas'
import type { WindUnit } from '@/services/settingsStorage'

export interface MeteorologicalPreset {
  name: string
  region: 'Delhi NCR' | 'Punjab' | 'Haryana'
  role: 'receptor' | 'source' | 'corridor'
  lat: number
  lon: number
}

/** 16-point meteorological compass sectors */
export const SECTORS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW'
] as const

export type Sector = typeof SECTORS[number]

/**
 * High-value regional presets covering Delhi NCR receptors, Punjab source basins,
 * and Haryana transit corridors.
 * Preserves exact coordinates of the original 6 presets for backward compatibility.
 */
export const METEOROLOGICAL_PRESETS: MeteorologicalPreset[] = [
  // Core originals
  { name: 'Delhi NCR (Central)', region: 'Delhi NCR', role: 'receptor', lat: 28.5, lon: 77.2 },
  { name: 'Sangrur (Peak Fire Basin)', region: 'Punjab', role: 'source', lat: 30.2, lon: 75.8 },
  { name: 'Patiala (East Punjab)', region: 'Punjab', role: 'source', lat: 30.3, lon: 76.4 },
  { name: 'Karnal (GT Road Corridor)', region: 'Haryana', role: 'corridor', lat: 29.7, lon: 77.0 },
  { name: 'Ludhiana (Central Malwa)', region: 'Punjab', role: 'source', lat: 30.9, lon: 75.8 },
  { name: 'Amritsar (Majha Border)', region: 'Punjab', role: 'source', lat: 31.6, lon: 74.9 },

  // Expanded Delhi NCR Receptors
  { name: 'Anand Vihar (East Delhi)', region: 'Delhi NCR', role: 'receptor', lat: 28.65, lon: 77.31 },
  { name: 'Rohini (North Delhi)', region: 'Delhi NCR', role: 'receptor', lat: 28.73, lon: 77.12 },
  { name: 'Dwarka (SW Delhi)', region: 'Delhi NCR', role: 'receptor', lat: 28.59, lon: 77.05 },
  { name: 'Gurugram (NCR South-West)', region: 'Delhi NCR', role: 'receptor', lat: 28.46, lon: 77.03 },
  { name: 'Faridabad (NCR South)', region: 'Delhi NCR', role: 'receptor', lat: 28.41, lon: 77.31 },
  { name: 'Noida (NCR East)', region: 'Delhi NCR', role: 'receptor', lat: 28.57, lon: 77.33 },

  // Expanded Punjab Agricultural Hotspots
  { name: 'Bathinda (Southern Malwa)', region: 'Punjab', role: 'source', lat: 30.21, lon: 74.95 },
  { name: 'Firozpur (Western Border)', region: 'Punjab', role: 'source', lat: 30.92, lon: 74.61 },
  { name: 'Tarn Taran (Central Majha)', region: 'Punjab', role: 'source', lat: 31.45, lon: 74.93 },
  { name: 'Mansa (South Punjab Basin)', region: 'Punjab', role: 'source', lat: 29.99, lon: 75.39 },

  // Expanded Haryana Transit Corridors
  { name: 'Jind (Central Inflow Corridor)', region: 'Haryana', role: 'corridor', lat: 29.32, lon: 76.32 },
  { name: 'Kaithal (North Haryana)', region: 'Haryana', role: 'corridor', lat: 29.80, lon: 76.40 },
  { name: 'Kurukshetra (North Corridor)', region: 'Haryana', role: 'corridor', lat: 29.97, lon: 76.88 },
  { name: 'Rohtak (Western Approach)', region: 'Haryana', role: 'corridor', lat: 28.89, lon: 76.58 },
  { name: 'Panipat (Upper NCR Corridor)', region: 'Haryana', role: 'corridor', lat: 29.39, lon: 76.97 },
  { name: 'Sonipat (NCR Northern Gate)', region: 'Haryana', role: 'corridor', lat: 28.99, lon: 77.02 },
]

/**
 * Generate SVG path string for time series.
 * Missing values break the line/area into separate disjoint segments.
 * Tested by uiRegression.test.tsx.
 */
export function weatherPath(values: (number | null)[], maximum: number, area = false): string {
  const paths: string[] = []
  let segment: { x: number; y: number }[] = []

  const finish = () => {
    if (!segment.length) return
    const line = segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
    paths.push(area ? `${line} L${segment[segment.length - 1].x.toFixed(1)},185 L${segment[0].x.toFixed(1)},185 Z` : line)
    segment = []
  }

  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      finish()
      return
    }
    const x = 50 + (index / Math.max(1, values.length - 1)) * 680
    const y = 185 - (value / Math.max(1, maximum)) * 165
    segment.push({ x, y })
  })

  finish()
  return paths.join(' ')
}

/**
 * Find the nearest grid point in the wind file using cosine-corrected planar distance.
 */
export function findNearestGridPoint(
  targetLat: number,
  targetLon: number,
  points: WindPoint[] | undefined | null
): WindPoint | null {
  if (!points || !points.length) return null

  const rad = Math.PI / 180
  const cosLat = Math.cos(targetLat * rad)

  let nearest: WindPoint | null = null
  let minDistanceSq = Infinity

  for (const candidate of points) {
    const dLat = candidate.lat - targetLat
    const dLon = (candidate.lon - targetLon) * cosLat
    const distSq = dLat * dLat + dLon * dLon
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq
      nearest = candidate
    }
  }

  return nearest
}

/**
 * Convert wind speed in m/s to the user's preferred display unit.
 */
export function convertWindSpeed(
  speedMs: number,
  unit: WindUnit = 'kmh'
): {
  primaryVal: string
  primaryUnit: string
  secondaryVal: string
  secondaryUnit: string
  numericConverted: number
} {
  const safeSpeed = Math.max(0, Number.isFinite(speedMs) ? speedMs : 0)
  const kmh = safeSpeed * 3.6
  const knots = safeSpeed * 1.94384

  switch (unit) {
    case 'ms':
      return {
        primaryVal: safeSpeed.toFixed(2),
        primaryUnit: 'm/s',
        secondaryVal: kmh.toFixed(1),
        secondaryUnit: 'km/h',
        numericConverted: safeSpeed,
      }
    case 'knots':
      return {
        primaryVal: knots.toFixed(1),
        primaryUnit: 'kt',
        secondaryVal: kmh.toFixed(1),
        secondaryUnit: 'km/h',
        numericConverted: knots,
      }
    case 'kmh':
    default:
      return {
        primaryVal: kmh.toFixed(1),
        primaryUnit: 'km/h',
        secondaryVal: safeSpeed.toFixed(2),
        secondaryUnit: 'm/s',
        numericConverted: kmh,
      }
  }
}

/**
 * Standard CPCB / IMD Ventilation Coefficient Tiers:
 * Ventilation Index = Wind Speed (m/s) * Planetary Boundary Layer Height (m)
 *
 * < 2,000 m²/s: Poor / Critical Trapping (Severe potential for air stagnation)
 * 2,000 - 6,000 m²/s: Moderate Dispersion
 * > 6,000 m²/s: Good / Cleansing Dispersion
 */
export function getVentilationTier(ventilation: number | null): {
  label: string
  tier: 'poor' | 'moderate' | 'good' | 'unknown'
  badgeClass: string
  color: string
  description: string
} {
  if (ventilation == null || !Number.isFinite(ventilation)) {
    return {
      label: 'Unrated',
      tier: 'unknown',
      badgeClass: 'pill-neutral',
      color: 'var(--text-tertiary, #64748B)',
      description: 'PBLH or wind speed missing from forecast.',
    }
  }

  if (ventilation < 2000) {
    return {
      label: 'Poor (Critical Trap)',
      tier: 'poor',
      badgeClass: 'pill-danger',
      color: '#B91C1C',
      description: 'Severe stagnation risk; atmospheric trapping under shallow boundary layer.',
    }
  }

  if (ventilation <= 6000) {
    return {
      label: 'Moderate',
      tier: 'moderate',
      badgeClass: 'pill-moderate',
      color: '#B45309',
      description: 'Intermediate dispersion; smoke may accumulate under sustained emissions.',
    }
  }

  return {
    label: 'Good Dispersion',
    tier: 'good',
    badgeClass: 'pill-ok',
    color: '#15803D',
    description: 'Favorable atmospheric ventilation; effective vertical and horizontal mixing.',
  }
}

/**
 * Atmospheric Stagnation & Inversion Risk Heuristic:
 * Identifies high-risk trapping conditions (calm winds <= 2 m/s and collapsed PBLH <= 250 m).
 */
export function getStagnationRisk(
  speedMs: number,
  pblhM: number | null
): {
  level: 'critical' | 'poor' | 'moderate' | 'favorable' | 'unknown'
  label: string
  badgeClass: string
  description: string
} {
  if (!Number.isFinite(speedMs) || pblhM == null || !Number.isFinite(pblhM)) {
    return {
      level: 'unknown',
      label: 'Data Unavailable',
      badgeClass: 'pill-neutral',
      description: 'Insufficient meteorological parameters to evaluate atmospheric trapping.',
    }
  }

  // Critical trapping: Calm surface winds AND nocturnal boundary layer collapse
  if (speedMs < 2.0 && pblhM <= 250) {
    return {
      level: 'critical',
      label: 'Severe Inversion Trap',
      badgeClass: 'pill-danger',
      description: 'Calm winds and collapsed boundary layer severely trap emissions at breathing level.',
    }
  }

  if (speedMs < 3.0 && pblhM <= 500) {
    return {
      level: 'poor',
      label: 'High Stagnation Risk',
      badgeClass: 'pill-moderate',
      description: 'Weak advection and shallow mixing depth suppress vertical dispersion.',
    }
  }

  if (speedMs < 4.5 || pblhM <= 1000) {
    return {
      level: 'moderate',
      label: 'Moderate Dispersion',
      badgeClass: 'pill-moderate',
      description: 'Standard autumn dispersion with diurnal boundary layer variations.',
    }
  }

  return {
    level: 'favorable',
    label: 'Favorable Dispersion',
    badgeClass: 'pill-ok',
    description: 'Strong boundary layer ventilation or brisk surface winds dispersing pollutants.',
  }
}

/**
 * Beaufort Wind Force Scale (WMO standard)
 */
export function getBeaufortScale(speedMs: number): { force: number; description: string } {
  const s = Math.max(0, Number.isFinite(speedMs) ? speedMs : 0)
  if (s < 0.5) return { force: 0, description: 'Calm' }
  if (s < 1.6) return { force: 1, description: 'Light Air' }
  if (s < 3.4) return { force: 2, description: 'Light Breeze' }
  if (s < 5.5) return { force: 3, description: 'Gentle Breeze' }
  if (s < 8.0) return { force: 4, description: 'Moderate Breeze' }
  if (s < 10.8) return { force: 5, description: 'Fresh Breeze' }
  if (s < 13.9) return { force: 6, description: 'Strong Breeze' }
  return { force: 7, description: 'Near Gale / Gale' }
}

/**
 * Checks if a wind direction is aligned with the critical Punjab/Haryana-to-Delhi
 * North-Westerly smoke transport corridor (280° - 340° meteorological bearing).
 */
export function isDelhiInflowSector(dirFromDeg: number): boolean {
  if (!Number.isFinite(dirFromDeg)) return false
  const deg = (dirFromDeg % 360 + 360) % 360
  return deg >= 280 && deg <= 340
}

/**
 * Determines if a given UTC timestamp falls during the local nocturnal period
 * in northern India (approx. 18:00 to 06:00 IST = 12:30 to 00:30 UTC),
 * during which surface boundary layers characteristically collapse.
 */
export function isNocturnalHour(isoTimestamp: string): boolean {
  const d = new Date(isoTimestamp)
  if (isNaN(d.getTime())) return false

  // Indian Standard Time is UTC + 5:30
  const istMinutes = (d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440
  const istHour = istMinutes / 60

  // Nocturnal hours: 18:00 (evening) to 06:00 (morning)
  return istHour >= 18 || istHour < 6
}

/**
 * Format timestamp into concise operator-friendly IST date and time string.
 */
export function formatIstDateTime(isoTimestamp: string): { dateStr: string; timeStr: string } {
  const d = new Date(isoTimestamp)
  if (isNaN(d.getTime())) return { dateStr: 'Invalid date', timeStr: '--:--' }

  try {
    const dateStr = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
    })
    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST'
    return { dateStr, timeStr }
  } catch {
    return { dateStr: isoTimestamp.slice(0, 10), timeStr: isoTimestamp.slice(11, 16) + 'Z' }
  }
}

/**
 * Computes wind rose frequency distribution across the 16 compass sectors.
 */
export function computeWindRose(hours: WindHour[]): {
  sector: Sector
  count: number
  percent: number
  isInflowCorridor: boolean
  avgSpeed: number
}[] {
  return SECTORS.map((sector, index) => {
    const sectorHours = hours.filter(hour => {
      const sectorIdx = Math.floor(((hour.dir_from_deg + 11.25) % 360) / 22.5)
      return sectorIdx === index
    })

    const count = sectorHours.length
    const percent = hours.length ? (count / hours.length) * 100 : 0
    const avgSpeed = count ? sectorHours.reduce((sum, h) => sum + h.speed_ms, 0) / count : 0

    // Sector angle center
    const centerDeg = index * 22.5
    const isInflowCorridor = isDelhiInflowSector(centerDeg)

    return {
      sector,
      count,
      percent,
      isInflowCorridor,
      avgSpeed,
    }
  })
}
