/**
 * ReplayMap — Dedicated MapLibre GL instance for Forecast Replay.
 * Completely isolated from the dashboard MapContainer — zero shared state.
 * Uses a requestAnimationFrame loop to scrub plume bands without React re-renders.
 */
import { Map, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, Compass, Focus } from 'lucide-react'
import { getStyleForMode, setupMapLayers } from '@/components/map/mapStyles'
import { windVectorsGeoJson, etaMilestones } from '@/components/map/mapData'
import { useReplay } from './ReplayProvider'
import {
  filteredCorridorFeatures, sitesGeoJSON, sourcesGeoJSON,
  sourcesCentroid, corridorBbox, topSitesBbox, formatScrubberLabel,
  CHAPTERS,
} from './replayPure'
import ReplayInspectorHud, { type ReplayInspectorTarget } from './ReplayInspectorHud'

try { setWorkerUrl(workerUrl) } catch { /* already set */ }

export default function ReplayMap() {
  const {
    corridor, sources, rankedSites, actions, wind,
    chapter, tHours, playing,
    basemapMode, setBasemapMode,
    tHoursRef,
  } = useReplay()

  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<Map | null>(null)
  const mapReadyRef    = useRef(false)
  const rafRef         = useRef<number>(0)
  const lastChapterRef = useRef(chapter)
  const markersRef     = useRef<Marker[]>([])

  const [activeTarget, setActiveTarget]       = useState<ReplayInspectorTarget | null>(null)
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)

  // Stale closure protection refs for map event listeners
  const rankedSitesRef = useRef(rankedSites)
  rankedSitesRef.current = rankedSites
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const corridorRef = useRef(corridor)
  corridorRef.current = corridor
  const windRef = useRef(wind)
  windRef.current = wind

  const appliedStyleMode = useRef(basemapMode)

  // ── Setup Replay exclusive sources & layers ─────────────────────────────────
  const setupReplayExclusiveLayers = useCallback((map: Map) => {
    setupMapLayers(map, basemapMode)

    // 1. Wind flow vector streamlines
    if (!map.getSource('replay-wind-vectors')) {
      map.addSource('replay-wind-vectors', {
        type: 'geojson',
        data: windVectorsGeoJson(windRef.current),
      })
    }
    if (!map.getLayer('replay-wind-vectors-line')) {
      map.addLayer({
        id: 'replay-wind-vectors-line',
        type: 'line',
        source: 'replay-wind-vectors',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 1.4,
          'line-opacity': 0.45,
          'line-dasharray': [3, 3],
        },
      })
    }

    // 2. Plume Corridor
    if (!map.getSource('replay-corridor')) {
      map.addSource('replay-corridor', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }

    // Plume fill with atmospheric transparency ramp
    if (!map.getLayer('replay-plume-fill')) {
      map.addLayer({
        id: 'replay-plume-fill',
        type: 'fill',
        source: 'replay-corridor',
        filter: ['==', ['get', 'kind'], 'band'],
        paint: {
          'fill-color': [
            'match', ['get', 'hour_from'],
            0, '#FF7A6B',
            2, '#FFA45C',
            4, '#F5C451',
            8, '#FDE047',
            '#FF7A6B',
          ],
          'fill-opacity': [
            'match', ['get', 'hour_from'],
            0, 0.58,
            2, 0.42,
            4, 0.28,
            8, 0.18,
            0.35,
          ],
        },
      })
    }

    // Plume outline
    if (!map.getLayer('replay-plume-line')) {
      map.addLayer({
        id: 'replay-plume-line',
        type: 'line',
        source: 'replay-corridor',
        filter: ['==', ['get', 'kind'], 'band'],
        paint: {
          'line-color': 'rgba(255,255,255,0.30)',
          'line-width': 0.9,
        },
      })
    }

    // Centerline trajectory
    if (!map.getLayer('replay-plume-centerline')) {
      map.addLayer({
        id: 'replay-plume-centerline',
        type: 'line',
        source: 'replay-corridor',
        filter: ['==', ['get', 'kind'], 'centerline'],
        paint: {
          'line-color': '#38BDF8',
          'line-width': 2.2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.85,
        },
      })
    }

    // 3. Centerline ETA milestone ticks
    if (!map.getSource('replay-corridor-eta')) {
      map.addSource('replay-corridor-eta', {
        type: 'geojson',
        data: etaMilestones(corridorRef.current),
      })
    }
    if (!map.getLayer('replay-corridor-eta-circles')) {
      map.addLayer({
        id: 'replay-corridor-eta-circles',
        type: 'circle',
        source: 'replay-corridor-eta',
        paint: {
          'circle-radius': 3.2,
          'circle-color': '#38BDF8',
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#0F172A',
          'circle-opacity': 0.9,
        },
      })
    }
    if (!map.getLayer('replay-corridor-eta-labels')) {
      map.addLayer({
        id: 'replay-corridor-eta-labels',
        type: 'symbol',
        source: 'replay-corridor-eta',
        layout: {
          'text-field': ['concat', '+', ['to-string', ['get', 'eta']], 'h'],
          'text-font': ['Open Sans Semibold'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-padding': 6,
        },
        paint: {
          'text-color': '#F8FAFC',
          'text-halo-color': '#0F172A',
          'text-halo-width': 1.6,
        },
      })
    }

    // 4. Fire source clusters
    if (!map.getSource('replay-fire-sources')) {
      map.addSource('replay-fire-sources', {
        type: 'geojson',
        data: sourcesGeoJSON(sourcesRef.current),
      })
    }
    if (!map.getLayer('replay-fire-circles')) {
      map.addLayer({
        id: 'replay-fire-circles',
        type: 'circle',
        source: 'replay-fire-sources',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'total_frp_mw'], 0, 6, 700, 24],
          'circle-color': '#EF4444',
          'circle-opacity': 0.88,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      })
    }

    // 5. Sensitive receptor sites
    if (!map.getSource('replay-sites')) {
      map.addSource('replay-sites', {
        type: 'geojson',
        data: sitesGeoJSON(rankedSitesRef.current, 8),
      })
    }

    // Dynamic arrival collision beacon: lights up when smoke reaches facility
    if (!map.getLayer('replay-sites-impact-pulse')) {
      map.addLayer({
        id: 'replay-sites-impact-pulse',
        type: 'circle',
        source: 'replay-sites',
        filter: ['<=', ['get', 'eta_hours'], 0],
        paint: {
          'circle-radius': 16,
          'circle-color': 'transparent',
          'circle-stroke-width': 2.2,
          'circle-stroke-color': '#EF4444',
          'circle-stroke-opacity': 0.85,
        },
      })
    }

    // Receptor base dot
    if (!map.getLayer('replay-sites-pulse')) {
      map.addLayer({
        id: 'replay-sites-pulse',
        type: 'circle',
        source: 'replay-sites',
        paint: {
          'circle-radius': 8,
          'circle-color': ['match', ['get', 'type'], 'hospital', '#FFA45C', '#5FD0A5'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      })
    }

    // Receptor emoji symbol
    if (!map.getLayer('replay-sites-symbol')) {
      map.addLayer({
        id: 'replay-sites-symbol',
        type: 'symbol',
        source: 'replay-sites',
        minzoom: 6.8,
        layout: {
          'text-field': ['case', ['==', ['get', 'type'], 'hospital'], '🏥', '🏫'],
          'text-size': 13,
          'text-offset': [0, -1.2],
          'text-anchor': 'bottom',
          'text-allow-overlap': false,
          'text-padding': 6,
        },
      })
    }

    // Receptor name label
    if (!map.getLayer('replay-sites-label')) {
      map.addLayer({
        id: 'replay-sites-label',
        type: 'symbol',
        source: 'replay-sites',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-padding': 6,
        },
        paint: {
          'text-color': '#E8EFF4',
          'text-halo-color': '#0E1B26',
          'text-halo-width': 1.6,
        },
      })
    }
  }, [basemapMode])

  // ── 1. Build map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let onSiteClick: ((e: any) => void) | undefined
    let onFireClick: ((e: any) => void) | undefined
    let onWaypointClick: ((e: any) => void) | undefined
    let onPointerEnter: (() => void) | undefined
    let onPointerLeave: (() => void) | undefined

    const map = new Map({
      container: containerRef.current,
      style: getStyleForMode(appliedStyleMode.current),
      center: [76.5, 30.0],
      zoom: 6.5,
      minZoom: 3.5,
      maxZoom: 16,
      maxBounds: [[52.0, 2.0], [104.0, 42.0]],
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    // Interactive click listeners
    onSiteClick = (e: any) => {
      const feature = e.features?.[0]
      if (!feature) return
      const siteId = feature.properties?.site_id
      const site = rankedSitesRef.current?.sites.find(s => s.site_id === siteId)
      if (site) {
        const actionDirective = actionsRef.current?.actions.find(a => a.site_id === site.site_id)
        setActiveTarget({ type: 'site', site, actionDirective })
        map.flyTo({ center: [site.lon, site.lat], zoom: Math.max(map.getZoom(), 11), speed: 1.1 })
      }
    }

    onFireClick = (e: any) => {
      const feature = e.features?.[0]
      if (!feature) return
      const id = feature.properties?.id
      const src = sourcesRef.current?.sources.find(s => s.id === id)
      if (src) {
        setActiveTarget({ type: 'source', source: src })
        map.flyTo({ center: [src.lon, src.lat], zoom: Math.max(map.getZoom(), 8.5), speed: 1.1 })
      }
    }

    onWaypointClick = (e: any) => {
      const feature = e.features?.[0]
      if (!feature) return
      const eta = feature.properties?.eta
      if (typeof eta === 'number') {
        setActiveTarget({ type: 'waypoint', eta })
      }
    }

    onPointerEnter = () => {
      const c = map.getCanvas?.()
      if (c?.style) c.style.cursor = 'pointer'
    }

    onPointerLeave = () => {
      const c = map.getCanvas?.()
      if (c?.style) c.style.cursor = ''
    }

    map.on('click', 'replay-sites-pulse', onSiteClick)
    map.on('click', 'replay-sites-symbol', onSiteClick)
    map.on('click', 'replay-fire-circles', onFireClick)
    map.on('click', 'replay-corridor-eta-circles', onWaypointClick)

    map.on('mouseenter', 'replay-sites-pulse', onPointerEnter)
    map.on('mouseenter', 'replay-sites-symbol', onPointerEnter)
    map.on('mouseenter', 'replay-fire-circles', onPointerEnter)
    map.on('mouseenter', 'replay-corridor-eta-circles', onPointerEnter)

    map.on('mouseleave', 'replay-sites-pulse', onPointerLeave)
    map.on('mouseleave', 'replay-sites-symbol', onPointerLeave)
    map.on('mouseleave', 'replay-fire-circles', onPointerLeave)
    map.on('mouseleave', 'replay-corridor-eta-circles', onPointerLeave)

    map.on('load', () => {
      setupReplayExclusiveLayers(map)
      mapReadyRef.current = true
      applyCameraForChapter(map, chapter)
      updateMapData(map, tHoursRef.current)
    })

    const ro = new ResizeObserver(() => map.resize())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      markersRef.current.forEach(m => m.remove())
      if (map) {
        if (onSiteClick) {
          map.off('click', 'replay-sites-pulse', onSiteClick)
          map.off('click', 'replay-sites-symbol', onSiteClick)
        }
        if (onFireClick) map.off('click', 'replay-fire-circles', onFireClick)
        if (onWaypointClick) map.off('click', 'replay-corridor-eta-circles', onWaypointClick)
        if (onPointerEnter) {
          map.off('mouseenter', 'replay-sites-pulse', onPointerEnter)
          map.off('mouseenter', 'replay-fire-circles', onPointerEnter)
          map.off('mouseenter', 'replay-corridor-eta-circles', onPointerEnter)
        }
        if (onPointerLeave) {
          map.off('mouseleave', 'replay-sites-pulse', onPointerLeave)
          map.off('mouseleave', 'replay-fire-circles', onPointerLeave)
          map.off('mouseleave', 'replay-corridor-eta-circles', onPointerLeave)
        }
        map.remove()
      }
      mapRef.current = null
      mapReadyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 1b. Basemap style switching ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (appliedStyleMode.current === basemapMode) return
    appliedStyleMode.current = basemapMode

    const onStyleLoad = () => {
      setupReplayExclusiveLayers(map)
      updateMapData(map, tHoursRef.current)
    }
    map.once('style.load', onStyleLoad)
    map.setStyle(getStyleForMode(basemapMode), { diff: false })
    return () => { map.off('style.load', onStyleLoad) }
  }, [basemapMode, setupReplayExclusiveLayers, tHoursRef])

  // ── 2. Plume scrub via rAF — updates corridor & arrival beacons ─────────────
  useEffect(() => {
    let lastT = -1

    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      const map = mapRef.current
      if (!map || !mapReadyRef.current) return

      const t = tHoursRef.current
      if (t !== lastT) {
        lastT = t
        updateMapData(map, t)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Camera changes on chapter switch ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return
    if (lastChapterRef.current === chapter) return
    lastChapterRef.current = chapter
    applyCameraForChapter(map, chapter)

    // Show/hide layers by chapter
    const siteOpacity  = chapter === 'exposure' || chapter === 'action' ? 0.85 : 0
    const plumeOpacity = chapter === 'source' ? 0 : undefined
    if (map.getLayer('replay-sites-pulse')) {
      map.setPaintProperty('replay-sites-pulse', 'circle-opacity', siteOpacity)
      if (map.getLayer('replay-sites-symbol')) {
        map.setLayoutProperty('replay-sites-symbol', 'visibility', siteOpacity > 0 ? 'visible' : 'none')
      }
      if (map.getLayer('replay-sites-label')) {
        map.setPaintProperty('replay-sites-label', 'text-opacity', siteOpacity > 0 ? 1 : 0)
      }
    }
    if (plumeOpacity !== undefined && map.getLayer('replay-plume-fill')) {
      map.setPaintProperty('replay-plume-fill', 'fill-opacity', 0)
      map.setPaintProperty('replay-plume-line', 'line-opacity', 0)
      map.setPaintProperty('replay-plume-centerline', 'line-opacity', 0)
    } else if (map.getLayer('replay-plume-fill')) {
      // Restore plume opacity
      map.setPaintProperty('replay-plume-fill', 'fill-opacity', [
        'match', ['get', 'hour_from'], 0, 0.58, 2, 0.42, 4, 0.28, 8, 0.18, 0.35,
      ])
      map.setPaintProperty('replay-plume-line', 'line-opacity', 0.45)
      map.setPaintProperty('replay-plume-centerline', 'line-opacity', 0.85)
    }
    // Fire sources: primary in source chapter + movement, dimmer context in later chapters
    const fireOpacity = chapter === 'source' || chapter === 'movement' ? 0.88 : 0.35
    if (map.getLayer('replay-fire-circles')) {
      map.setPaintProperty('replay-fire-circles', 'circle-opacity', fireOpacity)
    }
  }, [chapter, corridor, sources, rankedSites])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function updateMapData(map: Map, t: number) {
    if (!map.getSource('replay-corridor')) return
    const filtered = filteredCorridorFeatures(corridor, t)
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: filtered as GeoJSON.Feature[] }
    ;(map.getSource('replay-corridor') as GeoJSONSource).setData(fc)

    // Update dynamic collision alert beacon for reached facilities
    if (typeof map.setFilter === 'function' && map.getLayer('replay-sites-impact-pulse')) {
      map.setFilter('replay-sites-impact-pulse', ['<=', ['get', 'eta_hours'], t])
    }
  }

  function applyCameraForChapter(map: Map, ch: typeof chapter) {
    switch (ch) {
      case 'source': {
        const centroid = sourcesCentroid(sources)
        if (centroid) {
          map.flyTo({ center: centroid, zoom: 7.5, speed: 0.9, curve: 1.4 })
        } else {
          map.flyTo({ center: [76.5, 30.0], zoom: 6.5, speed: 0.8 })
        }
        break
      }
      case 'movement': {
        const bbox = corridorBbox(corridor)
        if (bbox) {
          map.fitBounds(bbox, { padding: 60, maxZoom: 9, duration: 1200 })
        }
        break
      }
      case 'exposure': {
        const bbox = topSitesBbox(rankedSites)
        if (bbox) {
          const [[w, s], [e, n]] = bbox
          const pad = 0.3
          map.fitBounds([[w - pad, s - pad], [e + pad, n + pad]], { padding: 60, maxZoom: 11, duration: 1000 })
        }
        break
      }
      case 'action': {
        // Overview of whole airshed
        map.flyTo({ center: [76.5, 29.5], zoom: 6.8, speed: 0.8 })
        break
      }
    }
  }

  const activeChapterMeta = CHAPTERS.find(c => c.id === chapter)

  return (
    <div className="replay-map-wrapper">
      <div
        ref={containerRef}
        className="replay-map-container"
        aria-label="Forecast replay map"
        role="img"
        onClick={() => isLayerMenuOpen && setIsLayerMenuOpen(false)}
      />

      {/* Floating Tactical Chapter Phase & Telemetry HUD */}
      <div className="replay-canvas-hud" role="status" aria-label="Replay current status">
        <div className="replay-canvas-hud-pill">
          <span className="replay-hud-icon">{activeChapterMeta?.icon ?? '⏱️'}</span>
          <span className="replay-hud-chapter-label">{activeChapterMeta?.label}</span>
          <span className="replay-hud-divider" />
          <span className="replay-hud-time">{formatScrubberLabel(tHours)}</span>
          <span className={`replay-hud-state ${playing ? 'playing' : 'paused'}`}>
            {playing ? '▶ PLAYING' : '⏸ PAUSED'}
          </span>
        </div>
      </div>

      {/* Camera Presets Bar */}
      <div className="replay-camera-bar">
        <button
          type="button"
          className="replay-camera-chip"
          onClick={() => {
            if (mapRef.current) {
              const bbox = corridorBbox(corridor)
              if (bbox) mapRef.current.fitBounds(bbox, { padding: 50, duration: 900 })
              else mapRef.current.flyTo({ center: [76.5, 29.8], zoom: 6.6 })
            }
          }}
          title="Fit full smoke dispersion airshed"
        >
          <Focus size={10} />
          <span>Airshed</span>
        </button>
        <button
          type="button"
          className="replay-camera-chip"
          onClick={() => {
            if (mapRef.current) {
              const centroid = sourcesCentroid(sources)
              if (centroid) mapRef.current.flyTo({ center: centroid, zoom: 8, duration: 900 })
            }
          }}
          title="Focus Punjab stubble fire origin"
        >
          <span>🔥 Source</span>
        </button>
        <button
          type="button"
          className="replay-camera-chip"
          onClick={() => {
            if (mapRef.current) {
              const bbox = topSitesBbox(rankedSites)
              if (bbox) mapRef.current.fitBounds(bbox, { padding: 60, maxZoom: 11, duration: 900 })
            }
          }}
          title="Focus high-exposure receptors"
        >
          <span>🏥 Receptors</span>
        </button>
      </div>

      {/* Basemap Switcher Floating Button & Dropdown */}
      <div
        className="replay-layer-dock"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') setIsLayerMenuOpen(false) }}
      >
        <button
          type="button"
          className={`replay-layer-btn ${isLayerMenuOpen ? 'active' : ''}`}
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title={`Basemap style: ${basemapMode}`}
          aria-label="Switch replay basemap"
          aria-expanded={isLayerMenuOpen}
        >
          <Layers size={13} />
        </button>

        {isLayerMenuOpen && (
          <div className="replay-layer-menu">
            <div className="replay-menu-title">Basemap Engine</div>
            <button
              type="button"
              className={`replay-menu-item ${basemapMode === 'dark' ? 'active' : ''}`}
              onClick={() => { setBasemapMode('dark'); setIsLayerMenuOpen(false) }}
            >
              <span>🌑</span>
              <div>
                <strong>Dark GIS</strong>
                <small>High contrast console</small>
              </div>
            </button>
            <button
              type="button"
              className={`replay-menu-item ${basemapMode === 'satellite' ? 'active' : ''}`}
              onClick={() => { setBasemapMode('satellite'); setIsLayerMenuOpen(false) }}
            >
              <span>🛰️</span>
              <div>
                <strong>Satellite</strong>
                <small>Photorealistic Maxar/ESRI</small>
              </div>
            </button>
            <button
              type="button"
              className={`replay-menu-item ${basemapMode === 'topo' ? 'active' : ''}`}
              onClick={() => { setBasemapMode('topo'); setIsLayerMenuOpen(false) }}
            >
              <span>🗺️</span>
              <div>
                <strong>Topographic</strong>
                <small>Terrain & road network</small>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Zoom and True North Compass Dock */}
      <div className="replay-nav-dock">
        <button
          type="button"
          className="replay-nav-btn"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="replay-nav-btn"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="replay-nav-btn compass-btn"
          onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 })}
          title="Reset True North orientation"
          aria-label="Reset North orientation"
        >
          <Compass size={13} />
        </button>
      </div>

      {/* Docked Target Inspector (Active when site, fire cluster or waypoint clicked) */}
      {activeTarget && (
        <ReplayInspectorHud
          target={activeTarget}
          currentTHours={tHours}
          onClose={() => setActiveTarget(null)}
          onFocus={() => {
            if (activeTarget.type === 'site') {
              mapRef.current?.flyTo({ center: [activeTarget.site.lon, activeTarget.site.lat], zoom: 12, speed: 1.2 })
            } else if (activeTarget.type === 'source') {
              mapRef.current?.flyTo({ center: [activeTarget.source.lon, activeTarget.source.lat], zoom: 9, speed: 1.2 })
            } else {
              applyCameraForChapter(mapRef.current!, chapter)
            }
          }}
        />
      )}
    </div>
  )
}
