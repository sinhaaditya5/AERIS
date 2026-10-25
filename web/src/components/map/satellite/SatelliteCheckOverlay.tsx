import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Map, Marker } from 'maplibre-gl'
import type { CorridorGeoJSON, SourcesFile } from '@/types/schemas'
import type { BasemapMode, TimeHorizon } from '@/services/dataContext'
import { applyProjectionAndPitch, isValidSubcontinentCoord } from '../mapStyles'
import {
  GIBS_LAYERS,
  DEFAULT_GIBS_LAYER_ID,
  NASA_GIBS_ACKNOWLEDGEMENT,
  NASA_GIBS_ATTRIBUTION_HTML,
  buildGibsTileTemplateUrls,
  buildWorldviewUrl,
  formatUtcDateString,
  getModelDerivedDate,
  resolveGibsLayer,
  shiftDateDays,
} from '@/services/satellite/gibs'
import { useSatelliteCheck } from '@/services/satellite/satelliteContext'
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Info,
  ExternalLink,
  X,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import './SatelliteCheckOverlay.css'

interface SatelliteCheckOverlayProps {
  mainMap: Map | null
  mapContainer: HTMLDivElement | null
  corridor: CorridorGeoJSON | null
  sources: SourcesFile | null
  timeHorizon: TimeHorizon
  setTimeHorizon: React.Dispatch<React.SetStateAction<TimeHorizon>> | ((horizon: TimeHorizon) => void)
  basemapMode: BasemapMode
  setBasemapMode: (mode: BasemapMode) => void
  effectiveTheme: 'forest' | 'night-watch' | 'field-daylight'
  onClose: () => void
  onExpandFullMap?: () => void
}

export default function SatelliteCheckOverlay({
  mainMap,
  mapContainer,
  corridor,
  sources,
  timeHorizon,
  setTimeHorizon,
  basemapMode,
  setBasemapMode,
  effectiveTheme,
  onClose,
  onExpandFullMap,
}: SatelliteCheckOverlayProps) {
  const {
    mode,
    setMode,
    splitPercent,
    setSplitPercent,
    fadeOpacity,
    setFadeOpacity,
    layerId,
    setLayerId,
    date,
    setDate,
    stepDate,
    resetToModelTime,
    isOnline,
    isInfoOpen,
    setIsInfoOpen,
  } = useSatelliteCheck()

  const observedContainerRef = useRef<HTMLDivElement>(null)
  const observedMapRef = useRef<Map | null>(null)
  const observedMarkersRef = useRef<Marker[]>([])
  const isDraggingRef = useRef(false)
  const handleRef = useRef<HTMLDivElement>(null)

  const [tileError, setTileError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Initial Basemap & Projection preservation
  const initialBasemapMode = useRef<BasemapMode>(basemapMode)
  const initialPitch = useRef<number>(mainMap ? mainMap.getPitch() : 0)
  const initialBearing = useRef<number>(mainMap ? mainMap.getBearing() : 0)

  const activeLayer = resolveGibsLayer(layerId)
  const todayUtc = useMemo(() => formatUtcDateString(new Date()), [])
  const isToday = date >= todayUtc

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleToggleExpand = useCallback(() => {
    if (onExpandFullMap) {
      onExpandFullMap()
      return
    }
    if (mapContainer) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else {
        mapContainer.requestFullscreen().catch(() => {})
      }
    }
  }, [onExpandFullMap, mapContainer])

  // ── 1. Basemap Neutralization on Entry, Restoration on Exit ─────────────────
  useEffect(() => {
    const savedBasemap = initialBasemapMode.current
    // When opening, if current basemap is satellite or globe, switch main basemap to neutral
    if (savedBasemap === 'satellite' || savedBasemap === 'globe') {
      const neutralMode: BasemapMode = effectiveTheme === 'field-daylight' ? 'topo' : 'dark'
      setBasemapMode(neutralMode)
    }

    if (mainMap && (mainMap.getPitch() !== 0 || mainMap.getBearing() !== 0)) {
      mainMap.easeTo({ pitch: 0, bearing: 0, duration: 400 })
    }

    return () => {
      // Restore basemap mode and camera projection on exit
      setBasemapMode(savedBasemap)
      if (mainMap) {
        applyProjectionAndPitch(mainMap, savedBasemap)
        if (savedBasemap === 'globe') {
          mainMap.easeTo({
            pitch: initialPitch.current || 32,
            bearing: initialBearing.current || -6,
            duration: 500,
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Keyboard Focus Trap & Escape Handler ────────────────────────────────
  useEffect(() => {
    handleRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (isInfoOpen) {
          setIsInfoOpen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isInfoOpen, setIsInfoOpen])

  // ── 3. Date auto-initialization from corridor if date is today ─────────────
  useEffect(() => {
    if (corridor?.forecast_start) {
      const derived = getModelDerivedDate(corridor.forecast_start, timeHorizon, new Date())
      setDate(derived)
    }
  }, [corridor?.forecast_start, timeHorizon, setDate])

  // ── 4. Main Map: Fade Mode Raster Layer ─────────────────────────────────────
  useEffect(() => {
    if (!mainMap) return

    const sourceId = 'gibs-fade-source'
    const layerName = 'gibs-fade-layer'

    const syncFadeLayer = () => {
      if (mode === 'fade') {
        const tileUrls = buildGibsTileTemplateUrls(layerId, date)
        if (!mainMap.getSource(sourceId)) {
          mainMap.addSource(sourceId, {
            type: 'raster',
            tiles: tileUrls,
            tileSize: 256,
            maxzoom: activeLayer.maxZoom, // 9, so MapLibre overzooms instead of requesting 404s
            attribution: NASA_GIBS_ATTRIBUTION_HTML,
          })
        } else {
          const src = mainMap.getSource(sourceId) as any
          if (typeof src.setTiles === 'function') {
            src.setTiles(tileUrls)
          }
        }

        if (!mainMap.getLayer(layerName)) {
          // Place before plume or boundary so satellite imagery sits underneath
          const beforeId = mainMap.getLayer('plume-fill')
            ? 'plume-fill'
            : mainMap.getLayer('india-border-halo')
              ? 'india-border-halo'
              : undefined

          mainMap.addLayer(
            {
              id: layerName,
              type: 'raster',
              source: sourceId,
              minzoom: 0,
              maxzoom: 19,
              paint: {
                'raster-opacity': fadeOpacity,
              },
            },
            beforeId,
          )
        } else {
          mainMap.setPaintProperty(layerName, 'raster-opacity', fadeOpacity)
        }
      } else {
        // Remove fade layer in swipe mode
        if (mainMap.getLayer(layerName)) mainMap.removeLayer(layerName)
        if (mainMap.getSource(sourceId)) mainMap.removeSource(sourceId)
      }
    }

    if (mainMap.isStyleLoaded()) {
      syncFadeLayer()
    } else {
      mainMap.once('style.load', syncFadeLayer)
    }

    return () => {
      if (mainMap.getLayer(layerName)) mainMap.removeLayer(layerName)
      if (mainMap.getSource(sourceId)) mainMap.removeSource(sourceId)
    }
  }, [mainMap, mode, fadeOpacity, layerId, date, activeLayer.maxZoom, retryKey])

  // ── 5. Secondary MapLibre Instance: Swipe Mode ─────────────────────────────
  useEffect(() => {
    if (mode !== 'swipe' || !mainMap || !observedContainerRef.current) return

    setTileError(null)
    const tileUrls = buildGibsTileTemplateUrls(layerId, date)

    const observedMap = new Map({
      container: observedContainerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'gibs-tiles': {
            type: 'raster',
            tiles: tileUrls,
            tileSize: 256,
            maxzoom: activeLayer.maxZoom,
            attribution: NASA_GIBS_ATTRIBUTION_HTML,
          },
        },
        layers: [
          {
            id: 'gibs-raster',
            type: 'raster',
            source: 'gibs-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: mainMap.getCenter(),
      zoom: mainMap.getZoom(),
      bearing: mainMap.getBearing(),
      pitch: mainMap.getPitch(),
      interactive: false,
      attributionControl: false,
    })

    observedMapRef.current = observedMap

    // Sync camera from mainMap -> observedMap with re-entrancy prevention
    let syncing = false
    const syncCamera = () => {
      if (syncing || !observedMapRef.current) return
      syncing = true
      observedMapRef.current.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom(),
        bearing: mainMap.getBearing(),
        pitch: mainMap.getPitch(),
      })
      syncing = false
    }

    mainMap.on('move', syncCamera)

    // Keep size in sync using ResizeObserver
    const ro = new ResizeObserver(() => {
      observedMapRef.current?.resize()
    })
    if (mapContainer) ro.observe(mapContainer)

    // Catch tile error events
    observedMap.on('error', (e) => {
      const msg = e.error?.message || ''
      if (
        msg &&
        !msg.includes('abort') &&
        (msg.includes('404') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('tile'))
      ) {
        setTileError('Failed to load satellite tiles.')
      }
    })

    // Populate anchor fire clusters on the observed satellite map
    const addAnchorHotspots = () => {
      observedMarkersRef.current.forEach((m) => m.remove())
      observedMarkersRef.current = []

      if (sources?.sources) {
        sources.sources.forEach((src) => {
          if (!isValidSubcontinentCoord(src.lat, src.lon)) return
          const el = document.createElement('div')
          el.className = 'satellite-anchor-marker'
          el.title = `Shared Fire Hotspot: ${src.id} (${src.total_frp_mw.toFixed(0)} MW)`
          el.textContent = '⊕'

          const marker = new Marker({ element: el, anchor: 'center' })
            .setLngLat([src.lon, src.lat])
            .addTo(observedMap)

          observedMarkersRef.current.push(marker)
        })
      }
    }

    observedMap.on('load', () => {
      syncCamera()
      addAnchorHotspots()
    })

    return () => {
      mainMap.off('move', syncCamera)
      ro.disconnect()
      observedMarkersRef.current.forEach((m) => m.remove())
      observedMarkersRef.current = []
      observedMap.remove()
      observedMapRef.current = null
    }
  }, [mode, mainMap, mapContainer, layerId, date, activeLayer.maxZoom, sources, retryKey])

  // ── 6. Pointer Drag for Split Divider Handle ───────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'swipe' || !mapContainer) return
      isDraggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      const rect = mapContainer.getBoundingClientRect()
      const updateSplit = (clientX: number) => {
        const x = clientX - rect.left
        const p = Math.max(0, Math.min(100, (x / rect.width) * 100))
        setSplitPercent(p)
      }
      updateSplit(e.clientX)
    },
    [mode, mapContainer, setSplitPercent],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !mapContainer) return
      const rect = mapContainer.getBoundingClientRect()
      const x = e.clientX - rect.left
      const p = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSplitPercent(p)
    },
    [mapContainer, setSplitPercent],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignored if pointer was already lost
    }
  }, [])

  // Keyboard navigation for slider (Arrow keys shift by 5%, Home 0%, End 100%)
  const handleSliderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (mode !== 'swipe') return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSplitPercent(Math.max(0, splitPercent - 5))
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSplitPercent(Math.min(100, splitPercent + 5))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setSplitPercent(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setSplitPercent(100)
      } else if (e.key === 'PageDown') {
        e.preventDefault()
        setSplitPercent(Math.max(0, splitPercent - 20))
      } else if (e.key === 'PageUp') {
        e.preventDefault()
        setSplitPercent(Math.min(100, splitPercent + 20))
      }
    },
    [mode, splitPercent, setSplitPercent],
  )

  const worldviewUrl = useMemo(
    () => buildWorldviewUrl(layerId, date),
    [layerId, date],
  )

  return (
    <div className="satellite-check-root satellite-check-overlay" role="region" aria-label="Satellite Cross-Check">
      {/* ── Secondary Observed Map Canvas (Clipped in Swipe Mode) ──────────── */}
      {mode === 'swipe' && (
        <div
          className="satellite-observed-map-viewport"
          style={{
            clipPath: `inset(0 calc(100% - ${splitPercent}%) 0 0)`,
          }}
          aria-hidden="true"
        >
          <div ref={observedContainerRef} className="satellite-observed-map-canvas" />
        </div>
      )}

      {/* ── Draggable Split Handle (Swipe Mode Only) ───────────────────────── */}
      {mode === 'swipe' && (
        <div
          ref={handleRef}
          role="slider"
          tabIndex={0}
          aria-label="Satellite comparison split"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(splitPercent)}
          aria-valuetext={`Observed ${Math.round(splitPercent)}%, modelled ${100 - Math.round(splitPercent)}%`}
          className="satellite-split-divider satellite-split-handle"
          style={{ left: `${splitPercent}%` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleSliderKeyDown}
        >
          <div className="satellite-split-line" />
          <div className="satellite-split-pill">
            <span className="satellite-split-center-dot" aria-hidden="true" />
            <span className="satellite-split-grip-icon" aria-hidden="true">
              ◄ ║ ►
            </span>
          </div>
        </div>
      )}

      {/* ── Top Floating Comparison Header Bar ──────────────────────────── */}
      <header className="satellite-top-banner">
        {/* Left: Observed NASA Satellite Badge */}
        <div className="satellite-side-pill observed">
          <div className="satellite-pill-primary">
            <span className="satellite-pill-dot observed" aria-hidden="true" />
            <span className="satellite-pill-tag observed">NASA OBSERVED</span>
            <span className="satellite-pill-title">🛰️ Observed: NASA {activeLayer.sensor} true colour, {date} UTC</span>
          </div>
          <div className="satellite-pill-secondary">
            Daily daytime composite • {activeLayer.satellite}
          </div>
        </div>

        {/* Right: Modelled Plume Badge + Action Cluster */}
        <div className="satellite-top-right-cluster">
          <div className="satellite-side-pill modelled">
            <div className="satellite-pill-primary">
              <span className="satellite-pill-dot modelled" aria-hidden="true" />
              <span className="satellite-pill-tag modelled">AERIS MODELLED</span>
              <span className="satellite-pill-title">Modelled: plume at T+{timeHorizon}h, uncalibrated baseline</span>
            </div>
            <div className="satellite-pill-secondary">
              Dispersion corridor • neutral basemap
            </div>
          </div>

          <div className="satellite-header-actions">
            {(onExpandFullMap || mapContainer) && (
              <button
                type="button"
                className="satellite-expand-btn"
                onClick={handleToggleExpand}
                title={onExpandFullMap ? "Expand into Full Map Explorer" : isFullscreen ? "Exit full screen" : "Toggle full screen immersion"}
                aria-label={onExpandFullMap ? "Expand to full map" : isFullscreen ? "Exit full screen" : "Toggle full screen immersion"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="satellite-btn-text">{onExpandFullMap ? 'Full Map' : isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>
            )}
            <button
              type="button"
              className="satellite-close-btn"
              onClick={onClose}
              title="Exit Satellite Check (Esc)"
              aria-label="Exit Satellite Check"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Offline / No Imagery / Error Banners ───────────────────────────── */}
      {!isOnline && (
        <div className="satellite-state-banner" role="alert">
          <div className="satellite-state-content">
            <AlertCircle size={16} color="#F59E0B" />
            <span>
              <strong>Offline</strong>. Satellite check requires an active internet connection to load NASA GIBS tiles.
            </span>
          </div>
        </div>
      )}

      {tileError && isOnline && (
        <div className="satellite-state-banner" role="alert">
          <div className="satellite-state-content">
            <AlertCircle size={16} color="#EF4444" />
            <span>{tileError} Network tile request failed.</span>
          </div>
          <div className="satellite-state-actions">
            <button
              type="button"
              className="satellite-btn-action"
              onClick={() => {
                setTileError(null)
                setRetryKey((k) => k + 1)
              }}
            >
              Retry
            </button>
            {isToday && (
              <button
                type="button"
                className="satellite-btn-action"
                onClick={() => stepDate(-1)}
              >
                Try previous day
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Controls Dock / Sheet ──────────────────────────────────── */}
      <footer className="satellite-bottom-dock">
        {/* Row 1: Streamlined Command Capsule */}
        <div className="satellite-command-capsule">
          {/* Swipe vs Fade Segmented Control */}
          <div className="satellite-mode-toggle" role="group" aria-label="Comparison display mode">
            <button
              type="button"
              className={`satellite-mode-btn ${mode === 'swipe' ? 'active' : ''}`}
              onClick={() => setMode('swipe')}
              aria-pressed={mode === 'swipe'}
              title="Swipe comparison mode: drag handle left/right"
            >
              Swipe
            </button>
            <button
              type="button"
              className={`satellite-mode-btn ${mode === 'fade' ? 'active' : ''}`}
              onClick={() => setMode('fade')}
              aria-pressed={mode === 'fade'}
              title="Fade comparison mode: blend between Observed and Modelled"
            >
              Fade
            </button>
          </div>

          <div className="satellite-capsule-divider" aria-hidden="true" />

          {/* Date Stepper */}
          <div className="satellite-date-stepper">
            <button
              type="button"
              className="satellite-step-btn"
              onClick={() => stepDate(-1)}
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft size={15} />
            </button>
            <input
              type="date"
              className="satellite-date-input"
              value={date}
              max={todayUtc}
              min={activeLayer.startDate}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select satellite observation date"
            />
            <button
              type="button"
              className="satellite-step-btn"
              onClick={() => stepDate(1)}
              disabled={date >= todayUtc}
              title={date >= todayUtc ? "Cannot view future satellite dates" : "Next day"}
              aria-label="Next day"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Reset to Model Time Button */}
          <button
            type="button"
            className="satellite-btn-reset-time"
            onClick={() => resetToModelTime(corridor?.forecast_start, timeHorizon)}
            title="Reset date to match model run forecast time"
          >
            <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
            <span>Match model time</span>
          </button>

          <div className="satellite-capsule-divider" aria-hidden="true" />

          {/* Horizon hours selector (+0h, +2h, +4h, +8h, +24h) */}
          <div className="satellite-horizon-chips" role="group" aria-label="Forecast horizon hours">
            {[0, 2, 4, 8, 24].map((h) => (
              <button
                key={h}
                type="button"
                className={`satellite-horizon-btn ${timeHorizon === h ? 'active' : ''}`}
                onClick={() => setTimeHorizon(h as TimeHorizon)}
                aria-pressed={timeHorizon === h}
                title={`Focus model plume at T+${h}h`}
              >
                {h === 0 ? 'T+0' : `+${h}h`}
              </button>
            ))}
          </div>

          <div className="satellite-capsule-divider" aria-hidden="true" />

          {/* Sensor Selection Dropdown */}
          <select
            className="satellite-sensor-select"
            value={layerId}
            onChange={(e) => setLayerId(e.target.value)}
            aria-label="Select satellite sensor"
          >
            {Object.values(GIBS_LAYERS).map((l) => (
              <option key={l.id} value={l.id}>
                🛰️ {l.sensor} ({l.satellite}) • {l.nominalPassTime}
              </option>
            ))}
          </select>
        </div>

        {/* Fade mode Opacity Slider */}
        {mode === 'fade' && (
          <div className="satellite-fade-slider-wrap">
            <span className="satellite-fade-label">Modelled (0%)</span>
            <input
              type="range"
              id="satellite-fade-range"
              className="satellite-fade-range"
              min={0}
              max={1}
              step={0.02}
              value={fadeOpacity}
              onChange={(e) => setFadeOpacity(parseFloat(e.target.value))}
              aria-label="Satellite blend opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fadeOpacity * 100)}
              aria-valuetext={`Satellite imagery ${Math.round(fadeOpacity * 100)}%`}
            />
            <span className="satellite-fade-label">Observed (100%)</span>
          </div>
        )}

        {/* Row 2: Quiet Micro-Bar */}
        <div className="satellite-micro-bar">
          <div className="satellite-micro-bar-left">
            <span className="satellite-composite-notice">Daily composite of that UTC day. Compare by eye; not validation.</span>
            <button
              type="button"
              className="satellite-info-trigger-btn satellite-info-btn"
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              title="Learn about satellite imagery and model cross-checking"
              aria-label="Scientific honesty notes regarding satellite imagery"
              aria-expanded={isInfoOpen}
            >
              <Info size={11} />
              <span>Info</span>
            </button>
            <a
              href={worldviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="satellite-worldview-link"
              title="Open this date and region in official NASA Worldview"
            >
              <span>NASA Worldview</span>
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Official NASA GIBS Acknowledgement */}
          <div className="satellite-gibs-acknowledgement-line satellite-ack-text">
            {NASA_GIBS_ACKNOWLEDGEMENT} • Direct browser tile request to{' '}
            <a href="https://www.earthdata.nasa.gov/gibs" target="_blank" rel="noopener noreferrer">
              NASA GIBS
            </a>
            .
          </div>
        </div>

        {/* Honesty Info Popover */}
        {isInfoOpen && (
          <div className="satellite-info-popover" role="dialog" aria-label="Satellite Honesty Guidance">
            <div className="satellite-popover-head">
              <div className="satellite-popover-title">
                <HelpCircle size={14} color="var(--accent-primary, #22734F)" />
                <span>How to Interpret Satellite Cross-Check</span>
              </div>
              <button
                type="button"
                className="satellite-popover-close"
                onClick={() => setIsInfoOpen(false)}
                aria-label="Close information"
              >
                <X size={14} />
              </button>
            </div>
            <p>
              <strong>Visual cross-check, not validation:</strong> Satellite true-colour imagery captures column
              visible smoke, optical haze, and cloud formations. It does not measure ground-level PM2.5 concentrations
              and cannot numerically validate the model&apos;s exposure predictions.
            </p>
            <p>
              <strong>Daily daytime composite:</strong> VIIRS (NOAA-20, NOAA-21, Suomi NPP) and MODIS (Terra, Aqua)
              imagery is captured during daytime orbital passes (between ~10:30 AM and ~1:30 PM local solar time). The
              resulting image is a composite of that UTC day, not an instantaneous snapshot at the model&apos;s hour.
            </p>
            <p>
              <strong>Cloud cover:</strong> Meteorological cloud banks, low fog, and nocturnal inversions can obscure
              smoke trails from orbit. Compare what you see by eye; never assume lack of visible smoke equates to clean air.
            </p>
            <div className="satellite-popover-citation">
              <strong>Official Acknowledgement:</strong> {NASA_GIBS_ACKNOWLEDGEMENT}
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
