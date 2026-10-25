/**
 * NASA Global Imagery Browse Services (GIBS) WMTS & Layer Specification
 *
 * Source: Verified against official EPSG:3857 GetCapabilities document at:
 * https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&request=GetCapabilities
 *
 * Specifications confirmed:
 * - TileMatrixSet: GoogleMapsCompatible_Level9 (z: 0 to 9, 256x256 px tiles, Web Mercator)
 * - Tile format: image/jpeg (for TrueColor daily composites)
 * - Period: P1D (daily daytime pass composites)
 * - Subdomain aliases: gibs-a, gibs-b, gibs-c.earthdata.nasa.gov (round-robin support)
 * - CORS: Access-Control-Allow-Origin: * confirmed
 */

export interface GibsLayerConfig {
  readonly id: string
  readonly name: string
  readonly satellite: string
  readonly sensor: 'VIIRS' | 'MODIS'
  readonly tileMatrixSet: string
  readonly maxZoom: number
  readonly format: 'image/jpeg' | 'image/png'
  readonly startDate: string
  readonly period: string
  readonly nominalPassTime: string
  readonly description: string
}

export const GIBS_LAYERS: Record<string, GibsLayerConfig> = {
  VIIRS_NOAA20_CorrectedReflectance_TrueColor: {
    id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
    name: 'VIIRS NOAA-20 (Default)',
    satellite: 'NOAA-20 (JPSS-1)',
    sensor: 'VIIRS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    format: 'image/jpeg',
    startDate: '2018-01-05',
    period: 'P1D',
    nominalPassTime: '~13:20 local solar time',
    description: 'High-resolution 375m true colour imagery from NOAA-20 VIIRS.',
  },
  VIIRS_NOAA21_CorrectedReflectance_TrueColor: {
    id: 'VIIRS_NOAA21_CorrectedReflectance_TrueColor',
    name: 'VIIRS NOAA-21',
    satellite: 'NOAA-21 (JPSS-2)',
    sensor: 'VIIRS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    format: 'image/jpeg',
    startDate: '2023-02-10',
    period: 'P1D',
    nominalPassTime: '~12:50 local solar time',
    description: 'Modern JPSS-2 VIIRS true colour reflectance.',
  },
  VIIRS_SNPP_CorrectedReflectance_TrueColor: {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: 'VIIRS Suomi NPP',
    satellite: 'Suomi NPP',
    sensor: 'VIIRS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    format: 'image/jpeg',
    startDate: '2015-11-24',
    period: 'P1D',
    nominalPassTime: '~13:30 local solar time',
    description: 'Long-term baseline VIIRS true colour daily composite.',
  },
  MODIS_Terra_CorrectedReflectance_TrueColor: {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    name: 'MODIS Terra (Morning)',
    satellite: 'Terra',
    sensor: 'MODIS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    format: 'image/jpeg',
    startDate: '2000-02-24',
    period: 'P1D',
    nominalPassTime: '~10:30 local solar time',
    description: 'Morning equatorial pass; valuable comparison before peak afternoon thermal activity.',
  },
  MODIS_Aqua_CorrectedReflectance_TrueColor: {
    id: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
    name: 'MODIS Aqua (Afternoon)',
    satellite: 'Aqua',
    sensor: 'MODIS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    format: 'image/jpeg',
    startDate: '2002-07-03',
    period: 'P1D',
    nominalPassTime: '~13:30 local solar time',
    description: 'Afternoon pass capturing post-noon smoke plumes.',
  },
} as const

export const DEFAULT_GIBS_LAYER_ID = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor'

/**
 * Exact acknowledgement mandated by NASA Earthdata GIBS policy:
 * https://www.earthdata.nasa.gov/gibs
 */
export const NASA_GIBS_ACKNOWLEDGEMENT =
  "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."

export const NASA_GIBS_ATTRIBUTION_HTML =
  '<a href="https://www.earthdata.nasa.gov/gibs" target="_blank" rel="noopener noreferrer">NASA GIBS</a>'

/**
 * Format a Date object to YYYY-MM-DD UTC string.
 */
export function formatUtcDateString(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Validates a YYYY-MM-DD date string.
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dateObj = new Date(Date.UTC(y, m - 1, d))
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  )
}

/**
 * Safely parses a date string or timestamp, returning null if invalid.
 */
export function parseDateSafe(val: string | number | null | undefined): Date | null {
  if (!val) return null
  const parsed = typeof val === 'number' ? new Date(val) : new Date(String(val))
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Calculate the default UTC date for Satellite Check:
 * (forecast_start + horizonHours), clamped so it never exceeds today's UTC date.
 * If forecast_start is missing or invalid, falls back to today's UTC date.
 */
export function getModelDerivedDate(
  forecastStart: string | null | undefined,
  horizonHours: number = 0,
  nowUtc: Date = new Date(),
): string {
  const todayUtcStr = formatUtcDateString(nowUtc)
  const parsedStart = parseDateSafe(forecastStart)

  if (!parsedStart) {
    return todayUtcStr
  }

  // Add the forecast relative horizon hours
  const targetMs = parsedStart.getTime() + Math.max(0, horizonHours) * 3600 * 1000
  const targetUtcStr = formatUtcDateString(new Date(targetMs))

  // Clamp so it never exceeds today's UTC date
  if (targetUtcStr > todayUtcStr) {
    return todayUtcStr
  }
  return targetUtcStr
}

/**
 * Shifts a YYYY-MM-DD date by +/- n days, clamping to min (layer start) and max (today UTC).
 */
export function shiftDateDays(
  dateStr: string,
  deltaDays: number,
  maxDateStr?: string,
  minDateStr: string = '2000-01-01',
): string {
  if (!isValidDateString(dateStr)) {
    return dateStr
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  const current = new Date(Date.UTC(y, m - 1, d))
  current.setUTCDate(current.getUTCDate() + deltaDays)
  const shifted = formatUtcDateString(current)

  const effectiveMax = maxDateStr && isValidDateString(maxDateStr) ? maxDateStr : formatUtcDateString(new Date())

  if (shifted > effectiveMax) return effectiveMax
  if (shifted < minDateStr) return minDateStr
  return shifted
}

/**
 * Resolves a safe layer configuration with automatic fallback to default.
 */
export function resolveGibsLayer(layerId: string | null | undefined): GibsLayerConfig {
  if (layerId && layerId in GIBS_LAYERS) {
    return GIBS_LAYERS[layerId]
  }
  return GIBS_LAYERS[DEFAULT_GIBS_LAYER_ID]
}

/**
 * Builds a single GIBS tile URL template or exact tile URL.
 * Throws an error for invalid date strings to guarantee clean failures.
 */
export function buildGibsTileUrl(
  layerId: string,
  dateStr: string,
  options?: {
    subdomain?: 'a' | 'b' | 'c' | null
    z?: number | string
    y?: number | string
    x?: number | string
  },
): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date format for GIBS tile: "${dateStr}". Expected YYYY-MM-DD.`)
  }

  const layer = resolveGibsLayer(layerId)
  const sub = options?.subdomain ? `-${options.subdomain}` : ''
  const z = options?.z !== undefined ? options.z : '{z}'
  const y = options?.y !== undefined ? options.y : '{y}'
  const x = options?.x !== undefined ? options.x : '{x}'

  return `https://gibs${sub}.earthdata.nasa.gov/wmts/epsg3857/best/${layer.id}/default/${dateStr}/${layer.tileMatrixSet}/${z}/${y}/${x}.jpg`
}

/**
 * Builds round-robin tile URL templates for MapLibre raster source.
 */
export function buildGibsTileTemplateUrls(layerId: string, dateStr: string): string[] {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date format for GIBS tile templates: "${dateStr}". Expected YYYY-MM-DD.`)
  }
  const layer = resolveGibsLayer(layerId)
  return ['gibs-a', 'gibs-b', 'gibs-c'].map(
    sub => `https://${sub}.earthdata.nasa.gov/wmts/epsg3857/best/${layer.id}/default/${dateStr}/${layer.tileMatrixSet}/{z}/{y}/{x}.jpg`,
  )
}

/**
 * Verified NASA Worldview share-link format:
 * https://worldview.earthdata.nasa.gov/?v={minLon},{minLat},{maxLon},{maxLat}&l=...&t={date}
 */
export function buildWorldviewUrl(
  layerId: string,
  dateStr: string,
  bounds?: { minLon: number; minLat: number; maxLon: number; maxLat: number },
): string {
  const layer = resolveGibsLayer(layerId)
  const b = bounds ?? { minLon: 72.0, minLat: 26.0, maxLon: 80.5, maxLat: 32.5 }
  const v = `${b.minLon.toFixed(2)},${b.minLat.toFixed(2)},${b.maxLon.toFixed(2)},${b.maxLat.toFixed(2)}`
  const activeLayers = `Reference_Labels_15m,Reference_Features_15m,Coastlines_15m,${layer.id}`
  return `https://worldview.earthdata.nasa.gov/?v=${v}&l=${encodeURIComponent(activeLayers)}&t=${dateStr}`
}
