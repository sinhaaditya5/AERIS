/**
 * MapLibre GL Theme Bridge
 * Dynamically resolves CSS variables using getComputedStyle and applies them
 * via map.setPaintProperty() without rebuilding layer buffers or reloading tiles.
 */
import type { Map } from 'maplibre-gl'

export interface MapThemeTokens {
  boundaryLine: string
  boundaryHalo: string
  boundaryOpacity: number
  boundaryHaloOpacity: number
  plumeH0: string
  plumeH2: string
  plumeH4: string
  plumeH8: string
  plumeCenterline: string
  plumeLine: string
  etaCircle: string
  etaCircleStroke: string
  etaLabel: string
  etaHalo: string
  isDark: boolean
}

export function resolveMapThemeTokens(): MapThemeTokens {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      boundaryLine: '#475569',
      boundaryHalo: '#64748B',
      boundaryOpacity: 0.65,
      boundaryHaloOpacity: 0.15,
      plumeH0: '#DC2626',
      plumeH2: '#EA580C',
      plumeH4: '#D97706',
      plumeH8: '#CA8A04',
      plumeCenterline: '#FFFFFF',
      plumeLine: 'rgba(185, 28, 28, 0.35)',
      etaCircle: '#38BDF8',
      etaCircleStroke: '#0F172A',
      etaLabel: '#F8FAFC',
      etaHalo: '#0F172A',
      isDark: false,
    }
  }

  const s = getComputedStyle(document.documentElement)
  const theme = document.documentElement.getAttribute('data-theme') || 'forest'
  const isDark = theme === 'night-watch'
  const isField = theme === 'field-daylight'

  return {
    boundaryLine: s.getPropertyValue('--map-boundary-line').trim() || (isDark ? '#CBD5E1' : isField ? '#0A1620' : '#475569'),
    boundaryHalo: s.getPropertyValue('--map-boundary-halo').trim() || (isDark ? '#94A3B8' : isField ? '#1B2B38' : '#64748B'),
    boundaryOpacity: parseFloat(s.getPropertyValue('--map-boundary-opacity').trim()) || (isDark ? 0.65 : isField ? 0.85 : 0.65),
    boundaryHaloOpacity: parseFloat(s.getPropertyValue('--map-boundary-halo-opacity').trim()) || (isDark ? 0.20 : isField ? 0.30 : 0.15),
    plumeH0: s.getPropertyValue('--plume-h0-2').trim() || (isDark ? '#FF7A6B' : isField ? '#B00020' : '#DC2626'),
    plumeH2: s.getPropertyValue('--plume-h2-4').trim() || (isDark ? '#FFA45C' : isField ? '#A64400' : '#EA580C'),
    plumeH4: s.getPropertyValue('--plume-h4-8').trim() || (isDark ? '#F5C451' : isField ? '#7A5800' : '#D97706'),
    plumeH8: s.getPropertyValue('--plume-h8-24').trim() || (isDark ? '#FDE047' : isField ? '#594300' : '#CA8A04'),
    plumeCenterline: s.getPropertyValue('--plume-centerline').trim() || (isDark ? '#38BDF8' : isField ? '#0A1620' : '#FFFFFF'),
    plumeLine: isDark ? 'rgba(255, 255, 255, 0.30)' : isField ? 'rgba(11, 43, 56, 0.40)' : 'rgba(185, 28, 28, 0.35)',
    etaCircle: isDark ? '#38BDF8' : isField ? '#0B5D3B' : '#38BDF8',
    etaCircleStroke: isDark ? '#0F172A' : isField ? '#FFFFFF' : '#0F172A',
    etaLabel: isDark ? '#F8FAFC' : isField ? '#0A1620' : '#F8FAFC',
    etaHalo: isDark ? '#0F172A' : isField ? '#FFFFFF' : '#0F172A',
    isDark,
  }
}

/**
 * Updates paint properties of existing map layers without triggering a reload or layer rebuild.
 */
export function applyThemeToMap(map: Map): void {
  try {
    if (!map || typeof (map as any).isStyleLoaded !== 'function' || !map.isStyleLoaded()) {
      return
    }

    const t = resolveMapThemeTokens()

    // 1. Boundary halo
    if (map.getLayer('india-border-halo')) {
      map.setPaintProperty('india-border-halo', 'line-color', t.boundaryHalo)
      map.setPaintProperty('india-border-halo', 'line-opacity', t.boundaryHaloOpacity)
    }

    // 2. Boundary solid line
    if (map.getLayer('india-border-line')) {
      map.setPaintProperty('india-border-line', 'line-color', t.boundaryLine)
      map.setPaintProperty('india-border-line', 'line-opacity', t.boundaryOpacity)
    }

    // 3. Plume fill ramp
    if (map.getLayer('plume-fill')) {
      map.setPaintProperty('plume-fill', 'fill-color', [
        'match',
        ['get', 'hour_from'],
        0, t.plumeH0,
        2, t.plumeH2,
        4, t.plumeH4,
        8, t.plumeH8,
        t.plumeH0,
      ])
      map.setPaintProperty('plume-fill', 'fill-opacity', [
        'match',
        ['get', 'hour_from'],
        0, t.isDark ? 0.52 : 0.44,
        2, t.isDark ? 0.36 : 0.30,
        4, t.isDark ? 0.24 : 0.20,
        8, t.isDark ? 0.15 : 0.12,
        t.isDark ? 0.32 : 0.25,
      ])
    }

    // 4. Plume envelope outline
    if (map.getLayer('plume-line')) {
      map.setPaintProperty('plume-line', 'line-color', t.plumeLine)
    }

    // 5. Plume centerline
    if (map.getLayer('plume-centerline')) {
      map.setPaintProperty('plume-centerline', 'line-color', t.plumeCenterline)
    }

    // 6. ETA Waypoint circles
    if (map.getLayer('corridor-eta-circles')) {
      map.setPaintProperty('corridor-eta-circles', 'circle-color', t.etaCircle)
      map.setPaintProperty('corridor-eta-circles', 'circle-stroke-color', t.etaCircleStroke)
    }

    // 7. ETA Waypoint labels
    if (map.getLayer('corridor-eta-labels')) {
      map.setPaintProperty('corridor-eta-labels', 'text-color', t.etaLabel)
      map.setPaintProperty('corridor-eta-labels', 'text-halo-color', t.etaHalo)
    }
  } catch (err) {
    console.warn('[AERIS MapThemeBridge] Could not apply theme to map:', err)
  }
}
