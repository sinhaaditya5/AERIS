/**
 * ReplayMap — Dedicated MapLibre GL instance for Forecast Replay.
 * Completely isolated from the dashboard MapContainer — zero shared state.
 * Uses a requestAnimationFrame loop to scrub plume bands without React re-renders.
 */
import { Map, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import { DARK_STYLE, setupMapLayers } from '@/components/map/mapStyles'
import { useReplay } from './ReplayProvider'
import {
  filteredCorridorFeatures, sitesGeoJSON, sourcesGeoJSON,
  sourcesCentroid, corridorBbox, topSitesBbox,
} from './replayPure'

try { setWorkerUrl(workerUrl) } catch { /* already set */ }

export default function ReplayMap() {
  const {
    corridor, sources, rankedSites,
    chapter,
    tHoursRef, playingRef,
  } = useReplay()

  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<Map | null>(null)
  const mapReadyRef   = useRef(false)
  const rafRef        = useRef<number>(0)
  const lastChapterRef = useRef(chapter)
  const markersRef    = useRef<Marker[]>([])

  // ── 1. Build map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: DARK_STYLE,
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

    map.on('load', () => {
      // Reuse dashboard layer setup for boundary + corridor sources
      setupMapLayers(map, 'dark')

      // ── Replay-exclusive sources ──────────────────────────────────────────
      if (!map.getSource('replay-corridor')) {
        map.addSource('replay-corridor', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
      }
      if (!map.getSource('replay-sites')) {
        map.addSource('replay-sites', {
          type: 'geojson',
          data: sitesGeoJSON(rankedSites, 5),
        })
      }
      if (!map.getSource('replay-fire-sources')) {
        map.addSource('replay-fire-sources', {
          type: 'geojson',
          data: sourcesGeoJSON(sources),
        })
      }

      // ── Replay-exclusive layers ───────────────────────────────────────────
      // Plume fill
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
              0, 0.55,
              2, 0.40,
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
            'line-color': 'rgba(255,255,255,0.25)',
            'line-width': 0.8,
          },
        })
      }
      // Centerline
      if (!map.getLayer('replay-plume-centerline')) {
        map.addLayer({
          id: 'replay-plume-centerline',
          type: 'line',
          source: 'replay-corridor',
          filter: ['==', ['get', 'kind'], 'centerline'],
          paint: {
            'line-color': '#38BDF8',
            'line-width': 2,
            'line-dasharray': [4, 3],
            'line-opacity': 0.85,
          },
        })
      }
      // Site pulse circles
      if (!map.getLayer('replay-sites-pulse')) {
        map.addLayer({
          id: 'replay-sites-pulse',
          type: 'circle',
          source: 'replay-sites',
          paint: {
            'circle-radius': 8,
            'circle-color': ['match', ['get', 'type'], 'hospital', '#FFA45C', '#5FD0A5'],
            'circle-opacity': 0.75,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        })
      }
      // Site labels
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
      // Fire source circles
      if (!map.getLayer('replay-fire-circles')) {
        map.addLayer({
          id: 'replay-fire-circles',
          type: 'circle',
          source: 'replay-fire-sources',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'total_frp_mw'], 0, 5, 700, 22],
            'circle-color': '#FF7A6B',
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#FFFFFF',
          },
        })
      }

      mapReadyRef.current = true
      // Trigger initial camera and data
      applyCameraForChapter(map, chapter)
      updateMapData(map, tHoursRef.current)
    })

    const ro = new ResizeObserver(() => map.resize())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      markersRef.current.forEach(m => m.remove())
      mapRef.current?.remove()
      mapRef.current = null
      mapReadyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Plume scrub via rAF — no React state updates inside loop ─────────────
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
    const siteOpacity  = chapter === 'exposure' || chapter === 'action' ? 0.75 : 0
    const plumeOpacity = chapter === 'source' ? 0 : undefined
    if (map.getLayer('replay-sites-pulse')) {
      map.setPaintProperty('replay-sites-pulse', 'circle-opacity', siteOpacity)
      map.setPaintProperty('replay-sites-label', 'text-opacity', siteOpacity > 0 ? 1 : 0)
    }
    if (plumeOpacity !== undefined && map.getLayer('replay-plume-fill')) {
      map.setPaintProperty('replay-plume-fill', 'fill-opacity', 0)
      map.setPaintProperty('replay-plume-line', 'line-opacity', 0)
      map.setPaintProperty('replay-plume-centerline', 'line-opacity', 0)
    } else if (map.getLayer('replay-plume-fill')) {
      // Restore plume opacity
      map.setPaintProperty('replay-plume-fill', 'fill-opacity', [
        'match', ['get', 'hour_from'], 0, 0.55, 2, 0.40, 4, 0.28, 8, 0.18, 0.35,
      ])
      map.setPaintProperty('replay-plume-line', 'line-opacity', 0.45)
      map.setPaintProperty('replay-plume-centerline', 'line-opacity', 0.85)
    }
    // Fire sources: only show in source chapter + movement
    const fireOpacity = chapter === 'source' || chapter === 'movement' ? 0.85 : 0.3
    if (map.getLayer('replay-fire-circles')) {
      map.setPaintProperty('replay-fire-circles', 'circle-opacity', fireOpacity)
    }
  }, [chapter, corridor, sources, rankedSites])

  // ── Helpers (closured over stable refs) ──────────────────────────────────────

  function updateMapData(map: Map, t: number) {
    if (!map.getSource('replay-corridor')) return
    const filtered = filteredCorridorFeatures(corridor, t)
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: filtered as GeoJSON.Feature[] }
    ;(map.getSource('replay-corridor') as GeoJSONSource).setData(fc)
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
        // Overview
        map.flyTo({ center: [76.5, 29.5], zoom: 6.8, speed: 0.8 })
        break
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="replay-map-container"
      aria-label="Forecast replay map"
      role="img"
    />
  )
}
