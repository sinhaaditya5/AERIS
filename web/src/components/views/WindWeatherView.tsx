import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  Compass,
  Download,
  Gauge,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Waves,
  Wind,
  Zap,
} from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import { useSettings } from '@/services/settingsStorage'
import { getFeedFreshness } from '@/services/api'
import { useClock } from '@/components/status/useClock'
import { buildCsv, downloadText } from './csv'
import {
  weatherPath,
  findNearestGridPoint,
  convertWindSpeed,
  getVentilationTier,
  getStagnationRisk,
  getBeaufortScale,
  isDelhiInflowSector,
  isNocturnalHour,
  formatIstDateTime,
  computeWindRose,
  METEOROLOGICAL_PRESETS,
  SECTORS,
} from '@/utils/meteorologyUtils'
import './WindWeatherView.css'

// Re-export weatherPath for backwards compatibility with tests and external consumers
export { weatherPath }

export default function WindWeatherView() {
  const { wind, feedErrors, staleFeeds, setActiveTab, setFlyToLocation } = useAeris()
  const [settings] = useSettings()
  const [presetIndex, setPresetIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const now = useClock()

  const selectedPreset = METEOROLOGICAL_PRESETS[presetIndex] ?? METEOROLOGICAL_PRESETS[0]

  // Find nearest GFS grid point to current preset
  const point = useMemo(() => {
    return findNearestGridPoint(selectedPreset.lat, selectedPreset.lon, wind?.points)
  }, [wind, selectedPreset])

  const hours = point?.hours ?? []

  // Ensure frame index stays in bounds
  const safeFrameIndex = Math.min(frameIndex, Math.max(0, hours.length - 1))
  const displayIndex = hoverIndex != null ? hoverIndex : safeFrameIndex
  const current = hours[displayIndex]

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || hours.length <= 1) return
    const interval = window.setInterval(() => {
      setFrameIndex(prev => (prev + 1) % hours.length)
    }, 350)
    return () => window.clearInterval(interval)
  }, [isPlaying, hours.length])

  // Pause playback when switching presets or when wind data changes
  const handlePresetChange = (newIndex: number) => {
    setIsPlaying(false)
    setPresetIndex(newIndex)
    setFrameIndex(0)
    setHoverIndex(null)
  }

  // Statistical aggregates across the 48-hour window
  const speedMax = Math.max(1, ...hours.map(hour => hour.speed_ms))
  const mixingMax = Math.max(1, ...hours.map(hour => hour.pblh_m ?? 0))

  // Find peak wind frame & worst dispersion frame
  const peakWindIndex = useMemo(() => {
    if (!hours.length) return 0
    let maxIdx = 0
    let maxSpd = -Infinity
    hours.forEach((h, i) => {
      if (h.speed_ms > maxSpd) {
        maxSpd = h.speed_ms
        maxIdx = i
      }
    })
    return maxIdx
  }, [hours])

  const worstDispersionIndex = useMemo(() => {
    if (!hours.length) return 0
    let minIdx = 0
    let minVent = Infinity
    hours.forEach((h, i) => {
      const vent = h.pblh_m == null ? Infinity : h.speed_ms * h.pblh_m
      if (vent < minVent) {
        minVent = vent
        minIdx = i
      }
    })
    return minIdx
  }, [hours])

  // Direction frequency and wind rose
  const rose = useMemo(() => computeWindRose(hours), [hours])

  // Inflow corridor statistics
  const inflowFramesCount = useMemo(() => {
    return hours.filter(h => isDelhiInflowSector(h.dir_from_deg)).length
  }, [hours])

  const inflowPercentage = hours.length ? (inflowFramesCount / hours.length) * 100 : 0

  // Derived current metrics
  const ventilation = current?.pblh_m == null ? null : Math.round(current.speed_ms * current.pblh_m)
  const ventTier = getVentilationTier(ventilation)
  const stagnation = current ? getStagnationRisk(current.speed_ms, current.pblh_m) : null
  const bft = current ? getBeaufortScale(current.speed_ms) : { force: 0, description: 'Calm' }
  const sectorIdx = current ? Math.floor(((current.dir_from_deg + 11.25) % 360) / 22.5) : 0
  const isCurrentInflow = current ? isDelhiInflowSector(current.dir_from_deg) : false
  const isNocturnal = current ? isNocturnalHour(current.t) : false
  const istTime = current ? formatIstDateTime(current.t) : { dateStr: '', timeStr: '' }

  // Feed freshness check
  const freshness = getFeedFreshness(
    'wind',
    wind?.generated_at,
    now,
    !!feedErrors.wind || staleFeeds.some(feed => feed.label === 'wind')
  )

  // Regional Transect: Source (Sangrur), Corridor (Karnal), Receptor (Delhi)
  const transectPoints = useMemo(() => {
    if (!wind?.points || !wind.points.length) return []
    const presets = [
      { id: 'source', label: 'Punjab Source Basin', name: 'Sangrur', lat: 30.2, lon: 75.8 },
      { id: 'corridor', label: 'Haryana Corridor', name: 'Karnal', lat: 29.7, lon: 77.0 },
      { id: 'receptor', label: 'Delhi NCR Receptor', name: 'Delhi NCR', lat: 28.5, lon: 77.2 },
    ]
    return presets.map(p => {
      const gridPt = findNearestGridPoint(p.lat, p.lon, wind.points)
      const h = gridPt?.hours[displayIndex]
      const vent = h?.pblh_m == null ? null : Math.round(h.speed_ms * h.pblh_m)
      return {
        ...p,
        gridPt,
        hour: h,
        ventilation: vent,
        tier: getVentilationTier(vent),
        isInflow: h ? isDelhiInflowSector(h.dir_from_deg) : false,
      }
    })
  }, [wind, displayIndex])

  // Export 48-Hour Meteorological Profile to CSV
  const handleExportCsv = useCallback(() => {
    if (!point || !hours.length) return
    const headers = [
      'Frame Index',
      'Timestamp UTC',
      'Timestamp IST',
      'Location Name',
      'Grid Latitude',
      'Grid Longitude',
      'Wind Speed (m/s)',
      'Wind Speed (km/h)',
      'Direction (deg)',
      'Direction Sector',
      'Delhi Inflow Corridor',
      'Mixing Height PBLH (m)',
      'Ventilation Index (m2/s)',
      'CPCB Ventilation Tier',
      'Stagnation Assessment',
    ]
    const rows = hours.map((hour, index) => {
      const ist = formatIstDateTime(hour.t)
      const vent = hour.pblh_m == null ? null : Math.round(hour.speed_ms * hour.pblh_m)
      const tier = getVentilationTier(vent)
      const stag = getStagnationRisk(hour.speed_ms, hour.pblh_m)
      const sIdx = Math.floor(((hour.dir_from_deg + 11.25) % 360) / 22.5)
      const isInflow = isDelhiInflowSector(hour.dir_from_deg)
      return [
        index + 1,
        hour.t,
        `${ist.dateStr} ${ist.timeStr}`,
        selectedPreset.name,
        point.lat.toFixed(3),
        point.lon.toFixed(3),
        hour.speed_ms.toFixed(2),
        (hour.speed_ms * 3.6).toFixed(1),
        hour.dir_from_deg.toFixed(1),
        SECTORS[sIdx],
        isInflow ? 'YES (NW Inflow Stream)' : 'NO',
        hour.pblh_m == null ? 'N/A' : Math.round(hour.pblh_m),
        vent == null ? 'N/A' : vent,
        tier.label,
        stag.label,
      ]
    })
    const dateStamp = new Date().toISOString().slice(0, 10)
    const safeName = selectedPreset.name.replace(/[^a-zA-Z0-9]/g, '_')
    downloadText(`AERIS_Meteorology_${safeName}_${dateStamp}.csv`, buildCsv(headers, rows))
  }, [point, hours, selectedPreset])

  // Inspect on GIS Map
  const handleInspectOnMap = () => {
    if (!point) return
    setFlyToLocation({
      lon: point.lon,
      lat: point.lat,
      zoom: 10,
      name: `Weather Grid: ${selectedPreset.name}`,
    })
    setActiveTab('map')
  }

  // Chart hover interaction
  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const chartWidth = rect.width
    const svgX = (mouseX / chartWidth) * 760
    if (svgX >= 50 && svgX <= 730 && hours.length > 1) {
      const fraction = (svgX - 50) / 680
      const index = Math.round(fraction * (hours.length - 1))
      setHoverIndex(Math.max(0, Math.min(hours.length - 1, index)))
    }
  }

  const handleChartMouseLeave = () => {
    setHoverIndex(null)
  }

  const handleChartClick = () => {
    if (hoverIndex != null) {
      setFrameIndex(hoverIndex)
      setIsPlaying(false)
    }
  }

  return (
    <div className="wind-weather-view">
      {/* View Header */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <Wind size={14} />
            <span>Modelled meteorology</span>
          </div>
          <h1 className="view-title">Wind &amp; Mixing Depth</h1>
          <p className="view-subtitle">
            {wind?.source ?? 'Forecast source unavailable'}. File freshness: {freshness.status}. Generated: {wind?.generated_at ?? 'unavailable'}.
          </p>
        </div>

        <div className="view-actions">
          <label className="location-picker">
            <span className="picker-label">Nearest grid to:</span>
            <select
              className="picker-select"
              aria-label="Forecast grid location"
              value={presetIndex}
              onChange={event => handlePresetChange(Number(event.target.value))}
            >
              <optgroup label="Delhi NCR Receptors">
                {METEOROLOGICAL_PRESETS.map((preset, index) =>
                  preset.region === 'Delhi NCR' ? (
                    <option key={preset.name} value={index}>
                      {preset.name}
                    </option>
                  ) : null
                )}
              </optgroup>
              <optgroup label="Punjab Source Basin (Crop Residue Hotspots)">
                {METEOROLOGICAL_PRESETS.map((preset, index) =>
                  preset.region === 'Punjab' ? (
                    <option key={preset.name} value={index}>
                      {preset.name}
                    </option>
                  ) : null
                )}
              </optgroup>
              <optgroup label="Haryana Transit Corridor">
                {METEOROLOGICAL_PRESETS.map((preset, index) =>
                  preset.region === 'Haryana' ? (
                    <option key={preset.name} value={index}>
                      {preset.name}
                    </option>
                  ) : null
                )}
              </optgroup>
            </select>
          </label>

          <button
            type="button"
            className="weather-btn weather-btn-ghost"
            onClick={handleInspectOnMap}
            title="Inspect this grid point on the interactive GIS map"
          >
            <MapPin size={15} />
            <span>Inspect Map</span>
          </button>

          <button
            type="button"
            className="weather-btn weather-btn-primary"
            onClick={handleExportCsv}
            disabled={!hours.length}
            title="Export 48-hour hourly profile as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {!current ? (
        <p role="status">Wind forecast unavailable. No modelled readings are substituted.</p>
      ) : (
        <>
          {/* Subheader Metadata & Inflow Corridor Alert */}
          <div className="weather-meta-banner">
            <p className="panel-sub">
              Actual grid: {point?.lat.toFixed(3)}°N, {point?.lon.toFixed(3)}°E · Selected forecast frame: {current.t} ({istTime.dateStr} {istTime.timeStr}). This is a model forecast, not a station observation.
            </p>
            {isCurrentInflow && (
              <div className="inflow-alert-pill">
                <AlertTriangle size={14} />
                <span>
                  <strong>Active Delhi Inflow Stream (NW Corridor):</strong> Wind is blowing directly along the agricultural transport axis toward Delhi NCR.
                </span>
              </div>
            )}
          </div>

          {/* KPI Cards Grid */}
          <div className="weather-kpi-grid">
            {/* 1. Wind Speed */}
            <div className="weather-card">
              <div className="card-top">
                <span className="card-label">Wind speed</span>
                <div className="card-icon speed-icon">
                  <Gauge size={18} />
                </div>
              </div>
              <div className="card-val-row">
                <span className="card-num">{current.speed_ms.toFixed(2)}</span>
                <span className="card-unit">m/s</span>
                <span className="card-secondary">
                  ({(current.speed_ms * 3.6).toFixed(1)} km/h
                  {settings.windUnit === 'knots' ? ` · ${(current.speed_ms * 1.94384).toFixed(1)} kt` : ''})
                </span>
              </div>
              <div className="card-footer">
                <span className={`pill ${current.speed_ms < 1.6 ? 'pill-calm' : current.speed_ms > 7 ? 'pill-ok' : 'pill-moderate'}`}>
                  Force {bft.force} · {bft.description}
                </span>
                <span className="card-note">Peak: {speedMax.toFixed(2)} m/s</span>
              </div>
            </div>

            {/* 2. Direction */}
            <div className="weather-card">
              <div className="card-top">
                <span className="card-label">Direction from</span>
                <div className="card-icon dir-icon">
                  <Navigation
                    size={18}
                    style={{ transform: `rotate(${current.dir_from_deg}deg)`, transition: 'transform 0.3s ease' }}
                  />
                </div>
              </div>
              <div className="card-val-row">
                <span className="card-num">{current.dir_from_deg.toFixed(1)}°</span>
                <span className="card-unit">{SECTORS[sectorIdx]}</span>
              </div>
              <div className="card-footer">
                <span className={`pill ${isCurrentInflow ? 'pill-danger' : 'pill-neutral'}`}>
                  {isCurrentInflow ? '⚠ Direct Inflow (NW)' : '↔ Crosswind / Divergent'}
                </span>
                <span className="card-note">Transport toward: {((current.dir_from_deg + 180) % 360).toFixed(0)}°</span>
              </div>
              <p className="panel-sub">Meteorological bearing; transport is toward the opposite direction.</p>
            </div>

            {/* 3. Mixing Height (PBLH) */}
            <div className="weather-card">
              <div className="card-top">
                <span className="card-label">Mixing height (PBLH)</span>
                <div className="card-icon pblh-icon">
                  <Waves size={18} />
                </div>
              </div>
              <div className="card-val-row">
                <span className="card-num">
                  {current.pblh_m == null ? 'Unavailable' : Math.round(current.pblh_m)}
                </span>
                {current.pblh_m != null && <span className="card-unit">m</span>}
              </div>
              <div className="card-footer">
                <span className={`pill ${isNocturnal ? 'pill-moderate' : 'pill-ok'}`}>
                  {isNocturnal ? '🌙 Nocturnal Inversion' : '☀️ Daytime Convective'}
                </span>
                {current.pblh_m != null && (
                  <span className="card-note">Peak: {Math.round(mixingMax)}m</span>
                )}
              </div>
              <p className="panel-sub">Low modelled mixing height alone does not prove an inversion.</p>
            </div>

            {/* 4. Ventilation Proxy & Stagnation */}
            <div className="weather-card">
              <div className="card-top">
                <span className="card-label">Ventilation proxy</span>
                <div className="card-icon vent-icon">
                  <Activity size={18} />
                </div>
              </div>
              <div className="card-val-row">
                <span className="card-num">
                  {ventilation == null ? 'Unavailable' : ventilation.toLocaleString()}
                </span>
                {ventilation != null && <span className="card-unit">m²/s</span>}
              </div>
              <div className="card-footer">
                <span className={`pill ${ventTier.badgeClass}`}>
                  {ventTier.label}
                </span>
                {stagnation && stagnation.level !== 'unknown' && (
                  <span className={`pill ${stagnation.badgeClass}`}>
                    {stagnation.label}
                  </span>
                )}
              </div>
              <p className="panel-sub">Wind speed × mixing height; no validated health-risk threshold.</p>
            </div>
          </div>

          {/* Interactive Playback Control Bar */}
          <div className="weather-playback-bar">
            <div className="playback-controls">
              <button
                type="button"
                className="playback-btn play-toggle"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause 48-hour forecast playback' : 'Play 48-hour forecast playback'}
                title={isPlaying ? 'Pause playback' : 'Play 48-hour playback simulation'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : 'Play 48h'}</span>
              </button>

              <button
                type="button"
                className="playback-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setFrameIndex(prev => Math.max(0, prev - 1))
                }}
                disabled={safeFrameIndex <= 0}
                aria-label="Step back 1 hour"
                title="Step back 1 hour"
              >
                <SkipBack size={15} />
                <span>-1h</span>
              </button>

              <button
                type="button"
                className="playback-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setFrameIndex(prev => Math.min(hours.length - 1, prev + 1))
                }}
                disabled={safeFrameIndex >= hours.length - 1}
                aria-label="Step forward 1 hour"
                title="Step forward 1 hour"
              >
                <SkipForward size={15} />
                <span>+1h</span>
              </button>

              <div className="playback-separator" />

              <button
                type="button"
                className="playback-btn jump-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setFrameIndex(0)
                }}
                title="Jump to initial forecast hour (Now)"
              >
                <RotateCcw size={13} />
                <span>Now</span>
              </button>

              <button
                type="button"
                className="playback-btn jump-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setFrameIndex(peakWindIndex)
                }}
                title="Jump to peak wind speed frame"
              >
                <Zap size={13} />
                <span>Peak Wind ({hours[peakWindIndex]?.speed_ms.toFixed(1)} m/s)</span>
              </button>

              <button
                type="button"
                className="playback-btn jump-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setFrameIndex(worstDispersionIndex)
                }}
                title="Jump to worst dispersion / lowest ventilation frame"
              >
                <AlertTriangle size={13} />
                <span>Worst Trap</span>
              </button>
            </div>

            {/* Frame Scrubber with WCAG accessibility */}
            <div className="scrubber-wrapper">
              <div className="scrubber-labels">
                <span className="scrubber-current">
                  Frame {safeFrameIndex + 1} of {hours.length} ({istTime.dateStr} · {istTime.timeStr})
                </span>
                <span className="scrubber-utc">UTC: {current.t.replace('T', ' ').slice(0, 16)}Z</span>
              </div>
              <input
                className="weather-scrubber"
                type="range"
                min={0}
                max={Math.max(0, hours.length - 1)}
                value={safeFrameIndex}
                onChange={event => {
                  setIsPlaying(false)
                  setFrameIndex(Number(event.target.value))
                }}
                aria-label="Selected forecast frame"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, hours.length - 1)}
                aria-valuenow={safeFrameIndex}
                aria-valuetext={`Frame ${safeFrameIndex + 1} of ${hours.length}: ${current.t} (${istTime.dateStr} ${istTime.timeStr})`}
              />
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="weather-main-grid">
            {/* Left: 48h Profile Chart */}
            <section className="chart-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Forecast profile ({hours.length} frames)</h2>
                  <p className="panel-sub">
                    Blue line: wind speed (m/s). Green area: mixing height (m). Shaded vertical bands: nocturnal hours (18:00–06:00 IST). Missing heights leave gaps.
                  </p>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-box pblh-box" />
                    <span>Mixing Height (m)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-box speed-box" />
                    <span>Wind Speed (m/s)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-box night-box" />
                    <span>Night Inversion</span>
                  </div>
                </div>
              </div>

              {/* Chart SVG with hover inspection and diurnal shading */}
              <div className="svg-chart-container">
                <svg
                  viewBox="0 0 760 220"
                  className="weather-chart-svg"
                  role="img"
                  aria-label="Forecast wind speed and mixing height; exact selected values shown above"
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                  onClick={handleChartClick}
                  style={{ cursor: 'crosshair' }}
                >
                  {/* Nocturnal shading bands */}
                  {hours.map((h, i) => {
                    if (!isNocturnalHour(h.t)) return null
                    const bandWidth = 680 / Math.max(1, hours.length - 1)
                    const x = 50 + (i / Math.max(1, hours.length - 1)) * 680 - bandWidth / 2
                    return (
                      <rect
                        key={`night-${i}`}
                        x={Math.max(50, x)}
                        y={20}
                        width={bandWidth}
                        height={165}
                        fill="var(--bg-canvas, rgba(14, 27, 38, 0.05))"
                        opacity={0.65}
                      />
                    )
                  })}

                  {/* Horizontal gridlines with dual Y-axis labels */}
                  {[0, 0.5, 1].map(fraction => (
                    <g key={fraction}>
                      <line
                        x1={50}
                        x2={730}
                        y1={185 - fraction * 165}
                        y2={185 - fraction * 165}
                        stroke="var(--border-strong, #CBD5E1)"
                        strokeDasharray={fraction > 0 && fraction < 1 ? '3 3' : undefined}
                      />
                      <text
                        x={45}
                        y={190 - fraction * 165}
                        textAnchor="end"
                        fontSize={11}
                        fill="var(--accent-primary, #164E35)"
                        fontWeight="600"
                      >
                        {Math.round(fraction * mixingMax)}m
                      </text>
                      <text
                        x={735}
                        y={190 - fraction * 165}
                        fontSize={11}
                        fill="var(--accent-hover, #1D4ED8)"
                        fontWeight="600"
                      >
                        {(fraction * speedMax).toFixed(1)}
                      </text>
                    </g>
                  ))}

                  {/* PBLH Area Fill */}
                  <path
                    d={weatherPath(hours.map(hour => hour.pblh_m), mixingMax, true)}
                    fill="var(--accent-surface, rgba(34,115,79,.2))"
                    stroke="var(--accent-primary, #164E35)"
                  />

                  {/* Wind Speed Line */}
                  <path
                    d={weatherPath(hours.map(hour => hour.speed_ms), speedMax)}
                    fill="none"
                    stroke="var(--accent-medium, #2563EB)"
                    strokeWidth={2.5}
                  />

                  {/* Synchronized Vertical Cursor for active frame */}
                  {hours.length > 1 && (
                    <g>
                      <line
                        x1={50 + (displayIndex / (hours.length - 1)) * 680}
                        x2={50 + (displayIndex / (hours.length - 1)) * 680}
                        y1={20}
                        y2={185}
                        stroke="#B91C1C"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                      <circle
                        cx={50 + (displayIndex / (hours.length - 1)) * 680}
                        cy={185 - (current.speed_ms / speedMax) * 165}
                        r={4.5}
                        fill="#2563EB"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </g>
                  )}

                  {/* X Axis Time Labels */}
                  <text x={50} y={211} fontSize={11} fill="var(--text-secondary, #334155)">
                    {hours[0].t}
                  </text>
                  {hours.length > 1 && (
                    <text x={730} y={211} textAnchor="end" fontSize={11} fill="var(--text-secondary, #334155)">
                      {hours[hours.length - 1].t}
                    </text>
                  )}
                </svg>

                {/* Hover inspection HUD pill */}
                <div className="hover-details-pill">
                  <span className="hover-time">
                    ⏱ {istTime.dateStr} · {istTime.timeStr} ({current.t.slice(11, 16)} UTC)
                  </span>
                  <span className="hover-stat">
                    💨 Wind: <strong>{current.speed_ms.toFixed(2)} m/s</strong> ({(current.speed_ms * 3.6).toFixed(1)} km/h)
                  </span>
                  <span className="hover-stat">
                    🧭 Dir: <strong>{current.dir_from_deg.toFixed(0)}° ({SECTORS[sectorIdx]})</strong>
                  </span>
                  <span className="hover-stat">
                    🏔️ PBLH: <strong>{current.pblh_m != null ? `${Math.round(current.pblh_m)}m` : 'N/A'}</strong>
                  </span>
                  <span className="hover-stat">
                    📊 Ventilation:{' '}
                    <strong>{ventilation != null ? `${ventilation.toLocaleString()} m²/s` : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            </section>

            {/* Right: Polar Wind Rose & Inflow Threat Panel */}
            <section className="polar-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Direction frequency &amp; Inflow</h2>
                  <p className="panel-sub">
                    Fraction of forecast frames by direction from. Orange highlighted petals indicate the Northwest agricultural corridor to Delhi.
                  </p>
                </div>
              </div>

              {/* Wind Rose SVG */}
              <div className="wind-rose-wrapper">
                <svg viewBox="0 0 240 240" className="wind-rose-svg" role="img" aria-label="Directional frequency chart">
                  {/* Concentric rings */}
                  <circle cx={120} cy={120} r={30} fill="none" stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="2 2" />
                  <circle cx={120} cy={120} r={60} fill="none" stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="2 2" />
                  <circle cx={120} cy={120} r={90} fill="none" stroke="var(--border-strong, #CBD5E1)" />

                  {/* Cardinal Crosshairs */}
                  <line x1={120} y1={25} x2={120} y2={215} stroke="var(--border-subtle, rgba(0,0,0,0.08))" strokeDasharray="3 3" />
                  <line x1={25} y1={120} x2={215} y2={120} stroke="var(--border-subtle, rgba(0,0,0,0.08))" strokeDasharray="3 3" />

                  {/* Sector petals */}
                  {rose
                    .filter(item => item.count > 0)
                    .map(item => {
                      const angle = SECTORS.indexOf(item.sector) * 22.5 - 90
                      const radians = (angle * Math.PI) / 180
                      const length = (item.percent / 100) * 90
                      const x2 = 120 + length * Math.cos(radians)
                      const y2 = 120 + length * Math.sin(radians)
                      const isDangerInflow = item.isInflowCorridor

                      return (
                        <line
                          key={item.sector}
                          x1={120}
                          y1={120}
                          x2={x2}
                          y2={y2}
                          stroke={isDangerInflow ? '#DC2626' : 'var(--accent-primary, #164E35)'}
                          strokeWidth={isDangerInflow ? 7 : 5}
                          strokeLinecap="round"
                          opacity={isDangerInflow ? 0.95 : 0.8}
                        />
                      )
                    })}

                  {/* Compass Labels */}
                  <text x={120} y={18} textAnchor="middle" fontSize={12} fontWeight="700" fill="var(--text-secondary, #334155)">
                    N
                  </text>
                  <text x={231} y={125} fontSize={12} fontWeight="700" fill="var(--text-secondary, #334155)">
                    E
                  </text>
                  <text x={120} y={236} textAnchor="middle" fontSize={12} fontWeight="700" fill="var(--text-secondary, #334155)">
                    S
                  </text>
                  <text x={2} y={125} fontSize={12} fontWeight="700" fill="var(--text-secondary, #334155)">
                    W
                  </text>

                  {/* Center pin */}
                  <circle cx={120} cy={120} r={5} fill="var(--accent-primary, #164E35)" />
                </svg>
              </div>

              {/* Corridor Inflow Metric Callout */}
              <div className={`inflow-summary-card ${inflowPercentage >= 25 ? 'inflow-alert-active' : ''}`}>
                <div className="inflow-header">
                  <Compass size={16} />
                  <span>Delhi Inflow Stream (NW Corridor)</span>
                </div>
                <div className="inflow-stat-row">
                  <span className="inflow-num">{inflowPercentage.toFixed(1)}%</span>
                  <span className="inflow-detail">of 48h frames aligned with stubble-to-Delhi transport</span>
                </div>
              </div>

              {/* Direction Values List (Preserves regression test requirement) */}
              <ul className="weather-direction-values">
                {rose
                  .filter(item => item.count > 0)
                  .map(item => (
                    <li key={item.sector} className={item.isInflowCorridor ? 'sector-inflow' : ''}>
                      {item.sector}: {item.count} frames ({item.percent.toFixed(1)}%)
                    </li>
                  ))}
              </ul>

              <p className="panel-sub">
                Plume transit ETA requires the full transport model; a fixed distance divided by one wind speed is not a supported arrival forecast.
              </p>
            </section>
          </div>

          {/* Regional Transect Card: Source -> Corridor -> Receptor */}
          {transectPoints.length > 0 && (
            <div className="regional-transect-panel">
              <div className="transect-header">
                <div>
                  <h3 className="transect-title">Regional Atmospheric Transect (Selected Frame: {istTime.timeStr})</h3>
                  <p className="panel-sub">
                    Simultaneous atmospheric dispersion conditions along the primary stubble transport axis.
                  </p>
                </div>
              </div>
              <div className="transect-grid">
                {transectPoints.map(t => (
                  <div key={t.id} className="transect-card">
                    <div className="transect-top">
                      <span className="transect-badge">{t.label}</span>
                      <strong className="transect-name">{t.name}</strong>
                    </div>
                    {t.hour ? (
                      <div className="transect-metrics">
                        <div className="transect-metric">
                          <span className="t-label">Wind Speed</span>
                          <span className="t-val">
                            {t.hour.speed_ms.toFixed(1)} m/s ({(t.hour.speed_ms * 3.6).toFixed(0)} km/h)
                          </span>
                        </div>
                        <div className="transect-metric">
                          <span className="t-label">Direction</span>
                          <span className="t-val">
                            {t.hour.dir_from_deg.toFixed(0)}° {SECTORS[Math.floor(((t.hour.dir_from_deg + 11.25) % 360) / 22.5)]}{' '}
                            {t.isInflow && <span className="inflow-dot" title="Aligned with Delhi corridor" />}
                          </span>
                        </div>
                        <div className="transect-metric">
                          <span className="t-label">Mixing Depth</span>
                          <span className="t-val">
                            {t.hour.pblh_m != null ? `${Math.round(t.hour.pblh_m)}m` : 'N/A'}
                          </span>
                        </div>
                        <div className="transect-metric">
                          <span className="t-label">Ventilation</span>
                          <span className={`pill ${t.tier.badgeClass}`}>
                            {t.tier.label}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="transect-unavailable">Pending data</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
