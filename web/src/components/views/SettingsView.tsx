import { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle2,
  Database,
  Globe,
  RefreshCw,
  Server,
  Settings,
  Trash2,
  Download,
  RotateCcw,
  Sliders,
  ShieldAlert,
  HardDrive,
  Info,
  Clock,
  Activity,
  Check,
} from 'lucide-react'
import { useAeris, type BasemapMode } from '@/services/dataContext'
import { DATA_MODE, getFeedFreshness } from '@/services/api'
import { clearActionChecklist } from '@/components/agent/actionChecklist'
import { useClock } from '@/components/status/useClock'
import ModelProvenanceNotice from '@/components/status/ModelProvenanceNotice'
import {
  useSettings,
  getLocalStorageStats,
  exportDiagnosticBundle,
  type WindUnit,
  type TempUnit,
  type AqiStandard,
  type DefaultTab,
  type AutoRefreshInterval,
} from '@/services/settingsStorage'
import './SettingsView.css'

type SettingsTab = 'all' | 'general' | 'thresholds' | 'feeds' | 'storage' | 'provenance'

const BASEMAP_OPTIONS: { id: BasemapMode; title: string; desc: string; provider: string; tag: string }[] = [
  {
    id: 'satellite',
    title: 'Satellite imagery',
    desc: 'Raster background imagery. Image dates and resolution vary; this is not a current fire measurement.',
    provider: 'Esri World Imagery & reference tiles',
    tag: 'High Resolution',
  },
  {
    id: 'globe',
    title: 'Tilted perspective view',
    desc: 'Mercator map with 32° camera pitch and −6° bearing. Perspective atmospheric observation angle.',
    provider: 'Esri raster / MapLibre camera',
    tag: '3D Angle',
  },
  {
    id: 'dark',
    title: 'Dark cartography',
    desc: 'High contrast dark canvas highlighting active thermal anomalies and plume dispersion corridors.',
    provider: 'CARTO Dark Matter',
    tag: 'High Contrast',
  },
  {
    id: 'topo',
    title: 'Street cartography',
    desc: 'Roads, boundaries, and populated settlements. Ideal for school and hospital corridor verification.',
    provider: 'CARTO Voyager',
    tag: 'Civic Grid',
  },
]

export default function SettingsView() {
  const {
    refreshData,
    loading,
    refreshing,
    basemapMode,
    setBasemapMode,
    sources,
    corridor,
    wind,
    aqi,
    rankedSites,
    actions,
    feedErrors,
    staleFeeds,
  } = useAeris()

  const [settings, updateSettings, resetAllSettings] = useSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>('all')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const now = useClock()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // Active Auto-Refresh Background Timer
  useEffect(() => {
    if (settings.autoRefreshInterval <= 0) return
    const intervalMs = settings.autoRefreshInterval * 60 * 1000
    const timer = setInterval(() => {
      refreshData()
      showToast(`Auto-refreshed telemetry (${settings.autoRefreshInterval}m cadence)`)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [settings.autoRefreshInterval, refreshData])

  // Real-time Local Storage Statistics
  const storageStats = useMemo(() => getLocalStorageStats(), [message])

  // Data Feeds specification (strictly preserves all 6 .feed-item elements for tests)
  const feeds = [
    {
      key: 'sources' as const,
      name: 'Source candidates',
      timestamp: sources?.generated_at,
      countBadge: `${sources?.sources.length ?? 0} clusters`,
      detail: `${sources?.sources.length ?? 0} captured candidates; confidence and strength are heuristic.`,
    },
    {
      key: 'corridor' as const,
      name: 'Modelled plume corridor',
      timestamp: corridor?.generated_at,
      countBadge: `${corridor?.features.length ?? 0} plume bands`,
      detail: `Uncalibrated model output; forecast start: ${corridor?.forecast_start ?? 'unavailable'}.`,
    },
    {
      key: 'wind' as const,
      name: 'Forecast meteorology',
      timestamp: wind?.generated_at,
      countBadge: wind ? `${wind.points.length} grid pts` : 'No points',
      detail: wind ? `${wind.points.length} model grid points · ${wind.source}` : 'Wind feed unavailable.',
    },
    {
      key: 'aqi' as const,
      name: 'Ground station observations',
      timestamp: aqi?.generated_at,
      countBadge: `${aqi?.stations.length ?? 0} monitors`,
      detail: `${aqi?.stations.length ?? 0} stations; measurement timestamps may be older than file generation.`,
    },
    {
      key: 'ranked_sites' as const,
      name: 'Ranked facilities',
      timestamp: rankedSites?.generated_at,
      countBadge: `${rankedSites?.sites.length ?? 0} facilities`,
      detail: `${rankedSites?.sites.length ?? 0} facilities; model risk is uncalibrated.`,
    },
    {
      key: 'actions' as const,
      name: 'Recommendations',
      timestamp: actions?.generated_at,
      countBadge: `${actions?.actions.length ?? 0} advisories`,
      detail: `${actions?.actions.length ?? 0} facility recommendations; local checklist only.`,
    },
  ]

  const handleClearChecklist = () => {
    clearActionChecklist()
    setMessage('Local action checklist cleared. No source data changed.')
    showToast('Local action checklist reset successfully')
  }

  const handleExportDiagnostics = () => {
    exportDiagnosticBundle({
      sources_count: sources?.sources.length ?? 0,
      corridor_features: corridor?.features.length ?? 0,
      wind_grid_points: wind?.points.length ?? 0,
      aqi_stations: aqi?.stations.length ?? 0,
      ranked_sites: rankedSites?.sites.length ?? 0,
      actions_count: actions?.actions.length ?? 0,
      feed_errors: feedErrors,
      stale_feeds_count: staleFeeds.length,
      data_mode: DATA_MODE,
    })
    showToast('System diagnostic bundle exported (.json)')
  }

  const handleResetSettings = () => {
    if (window.confirm('Reset all operational preferences and thresholds to default factory state?')) {
      resetAllSettings()
      showToast('All settings restored to factory defaults')
    }
  }

  return (
    <div className="settings-view">
      {/* Toast Notification */}
      {toast && (
        <div className="settings-toast" role="status">
          <Check size={14} className="toast-icon" />
          <span>{toast}</span>
        </div>
      )}

      {/* View Header with Status Tag & Navigation Pills */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <Settings size={14} />
            <span>Central Configuration &amp; Telemetry</span>
          </div>
          <h1 className="view-title">AERIS System Settings</h1>
          <p className="view-subtitle">
            Manage operational parameters, environmental safety baselines, live telemetry health, and diagnostics.
          </p>
        </div>

        {/* Category Navigation Pills */}
        <div className="settings-nav-pills" role="tablist" aria-label="Settings section filter">
          <button
            type="button"
            className={`nav-pill ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Sections
          </button>
          <button
            type="button"
            className={`nav-pill ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Globe size={13} />
            General &amp; Display
          </button>
          <button
            type="button"
            className={`nav-pill ${activeTab === 'thresholds' ? 'active' : ''}`}
            onClick={() => setActiveTab('thresholds')}
          >
            <Sliders size={13} />
            Thresholds &amp; Safety
          </button>
          <button
            type="button"
            className={`nav-pill ${activeTab === 'feeds' ? 'active' : ''}`}
            onClick={() => setActiveTab('feeds')}
          >
            <Server size={13} />
            Data Feeds ({feeds.length})
          </button>
          <button
            type="button"
            className={`nav-pill ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <HardDrive size={13} />
            Storage &amp; Diagnostics
          </button>
          <button
            type="button"
            className={`nav-pill ${activeTab === 'provenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('provenance')}
          >
            <Info size={13} />
            Provenance &amp; Legal
          </button>
        </div>
      </div>

      {/* SECTION 1: General & Display Preferences */}
      {(activeTab === 'all' || activeTab === 'general') && (
        <>
          <section className="settings-card full-width" id="section-basemap">
            <div className="card-header">
              <Globe size={18} />
              <div className="header-text-group">
                <h2>Basemap Engine &amp; Perspective</h2>
                <span className="card-desc-text">
                  Choose the cartographic provider and projection mode for the GIS spatial viewer.
                </span>
              </div>
            </div>

            <div className="basemap-cards-grid">
              {BASEMAP_OPTIONS.map(option => (
                <button
                  type="button"
                  key={option.id}
                  className={`basemap-option-card ${basemapMode === option.id ? 'selected' : ''}`}
                  aria-pressed={basemapMode === option.id}
                  onClick={() => {
                    setBasemapMode(option.id)
                    showToast(`Basemap switched to ${option.title}`)
                  }}
                >
                  <div className="basemap-card-top">
                    <div className="basemap-card-headings">
                      <div className="basemap-card-title-row">
                        <strong className="basemap-title">{option.title}</strong>
                        <span className="basemap-badge">{option.tag}</span>
                      </div>
                    </div>
                    {basemapMode === option.id && <CheckCircle2 size={16} className="selected-check" aria-hidden="true" />}
                  </div>
                  <p className="basemap-card-desc">{option.desc}</p>
                  <div className="basemap-card-meta">
                    <span className="meta-label">Provider:</span>
                    <span className="meta-value">{option.provider}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-card full-width" id="section-preferences">
            <div className="card-header">
              <Activity size={18} />
              <div className="header-text-group">
                <h2>Operational &amp; Display Preferences</h2>
                <span className="card-desc-text">
                  Configure default units of measurement, landing tabs, and graphic performance.
                </span>
              </div>
            </div>

            <div className="preferences-grid">
              {/* Wind Speed Units */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-wind-unit">Wind Speed Unit</label>
                <div className="pref-segmented-control" id="pref-wind-unit">
                  {(['kmh', 'ms', 'knots'] as WindUnit[]).map(unit => (
                    <button
                      type="button"
                      key={unit}
                      className={`seg-btn ${settings.windUnit === unit ? 'active' : ''}`}
                      onClick={() => {
                        updateSettings({ windUnit: unit })
                        showToast(`Wind speed unit set to ${unit.toUpperCase()}`)
                      }}
                    >
                      {unit === 'kmh' ? 'km/h' : unit === 'ms' ? 'm/s' : 'knots'}
                    </button>
                  ))}
                </div>
                <span className="pref-help">Used in Wind &amp; Weather telemetry view.</span>
              </div>

              {/* Temperature Unit */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-temp-unit">Temperature Unit</label>
                <div className="pref-segmented-control" id="pref-temp-unit">
                  {(['celsius', 'fahrenheit'] as TempUnit[]).map(unit => (
                    <button
                      type="button"
                      key={unit}
                      className={`seg-btn ${settings.tempUnit === unit ? 'active' : ''}`}
                      onClick={() => {
                        updateSettings({ tempUnit: unit })
                        showToast(`Temperature unit set to ${unit === 'celsius' ? '°C' : '°F'}`)
                      }}
                    >
                      {unit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </button>
                  ))}
                </div>
                <span className="pref-help">Station meteorology temperature format.</span>
              </div>

              {/* Default Startup View */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-default-tab">Default Startup Screen</label>
                <select
                  id="pref-default-tab"
                  className="pref-select"
                  value={settings.defaultTab}
                  onChange={e => {
                    updateSettings({ defaultTab: e.target.value as DefaultTab })
                    showToast(`Default startup view set to ${e.target.value}`)
                  }}
                >
                  <option value="dashboard">Executive Dashboard</option>
                  <option value="map">Map Explorer (GIS)</option>
                  <option value="analytics">Risk Analytics</option>
                  <option value="wind">Wind &amp; Weather</option>
                  <option value="sources">Fire Sources</option>
                  <option value="population">Population Risk</option>
                  <option value="shield">Protective Actions</option>
                </select>
                <span className="pref-help">Initial active tab when AERIS launches.</span>
              </div>

              {/* Default Lookahead Horizon */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-default-horizon">Default Lookahead Horizon</label>
                <div className="pref-segmented-control" id="pref-default-horizon">
                  {([0, 2, 4, 8, 24] as const).map(h => (
                    <button
                      type="button"
                      key={h}
                      className={`seg-btn ${settings.defaultHorizon === h ? 'active' : ''}`}
                      onClick={() => {
                        updateSettings({ defaultHorizon: h })
                        showToast(`Default horizon set to ${h}h`)
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <span className="pref-help">Default forecast lookahead slider value.</span>
              </div>

              {/* Particle Quality */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-particle-density">Plume Vector Rendering</label>
                <div className="pref-segmented-control" id="pref-particle-density">
                  {(['standard', 'high', 'eco'] as const).map(density => (
                    <button
                      type="button"
                      key={density}
                      className={`seg-btn ${settings.particleDensity === density ? 'active' : ''}`}
                      onClick={() => {
                        updateSettings({ particleDensity: density })
                        showToast(`Vector quality set to ${density}`)
                      }}
                    >
                      {density === 'standard' ? 'Standard' : density === 'high' ? 'High Density' : 'Eco Mode'}
                    </button>
                  ))}
                </div>
                <span className="pref-help">Balance 60 FPS animation vs hardware battery usage.</span>
              </div>

              {/* Auto Fly-to Toggle */}
              <div className="pref-item">
                <label className="pref-label" htmlFor="pref-auto-fly">Map Navigation Interaction</label>
                <button
                  type="button"
                  id="pref-auto-fly"
                  className={`toggle-switch-btn ${settings.autoFlyToSelection ? 'active' : ''}`}
                  onClick={() => {
                    updateSettings({ autoFlyToSelection: !settings.autoFlyToSelection })
                    showToast(`Auto fly-to ${!settings.autoFlyToSelection ? 'enabled' : 'disabled'}`)
                  }}
                >
                  <span className="toggle-switch-track">
                    <span className="toggle-switch-thumb" />
                  </span>
                  <span className="toggle-switch-label">
                    {settings.autoFlyToSelection ? 'Auto-zoom to facility on selection' : 'Manual pan & zoom'}
                  </span>
                </button>
                <span className="pref-help">Automatically centers camera when site is clicked.</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* SECTION 2: Environmental Safety Thresholds */}
      {(activeTab === 'all' || activeTab === 'thresholds') && (
        <section className="settings-card full-width" id="section-thresholds">
          <div className="card-header">
            <ShieldAlert size={18} />
            <div className="header-text-group">
              <h2>Environmental Safety Thresholds &amp; Regulatory Standards</h2>
              <span className="card-desc-text">
                Define regional air quality indices, satellite anomaly filtering, and critical site exposure limits.
              </span>
            </div>
          </div>

          <div className="thresholds-grid">
            {/* Air Quality Standard Framework */}
            <div className="threshold-card">
              <strong className="threshold-title">Air Quality Standard Framework</strong>
              <p className="threshold-desc">
                Select the regulatory index standard used to classify PM2.5 concentrations and health advisory tiers.
              </p>
              <div className="pref-segmented-control full">
                {(['cpcb', 'who', 'epa'] as AqiStandard[]).map(std => (
                  <button
                    type="button"
                    key={std}
                    className={`seg-btn ${settings.aqiStandard === std ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ aqiStandard: std })
                      showToast(`Air Quality standard set to ${std.toUpperCase()}`)
                    }}
                  >
                    {std === 'cpcb' ? 'CPCB India (NAQI)' : std === 'who' ? 'WHO 2021 Global' : 'US EPA AQI'}
                  </button>
                ))}
              </div>
              <div className="threshold-info-box">
                {settings.aqiStandard === 'cpcb' && (
                  <span>National AQI (India): Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (&gt;400).</span>
                )}
                {settings.aqiStandard === 'who' && (
                  <span>WHO Global Guidelines (2021): Strict epidemiological benchmark with 15 µg/m³ 24-hour mean limit.</span>
                )}
                {settings.aqiStandard === 'epa' && (
                  <span>US EPA Standard: Standard AQI equation based on 24-hr truncated PM2.5 breakpoints.</span>
                )}
              </div>
            </div>

            {/* Fire Radiative Power (FRP) Minimum Filter */}
            <div className="threshold-card">
              <strong className="threshold-title">Thermal Anomaly Sensitivity Filter</strong>
              <p className="threshold-desc">
                Filter out low-intensity satellite agricultural burns to focus incident response on major fire complexes.
              </p>
              <div className="pref-segmented-control full">
                {[
                  { val: 0, label: 'All Fires (≥0 MW)' },
                  { val: 25, label: 'Low+ (≥25 MW)' },
                  { val: 50, label: 'Moderate+ (≥50 MW)' },
                  { val: 100, label: 'Severe Only (≥100 MW)' },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.val}
                    className={`seg-btn ${settings.minFrpMw === opt.val ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ minFrpMw: opt.val })
                      showToast(`Fire filter set to ${opt.label}`)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="threshold-info-box">
                <span>Active telemetry currently includes {sources?.sources.length ?? 0} thermal source clusters across the airshed.</span>
              </div>
            </div>

            {/* Facility Exposure Alarm Level */}
            <div className="threshold-card">
              <strong className="threshold-title">High-Risk Facility Alarm Trigger</strong>
              <p className="threshold-desc">
                Threshold for triggering high-priority emergency checklists for schools and medical centers.
              </p>
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="slider-label">PM2.5 Delta Trigger:</span>
                  <strong className="slider-val">+{settings.pm25CriticalThreshold} µg/m³</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="25"
                  className="threshold-range-slider"
                  value={settings.pm25CriticalThreshold}
                  onChange={e => updateSettings({ pm25CriticalThreshold: Number(e.target.value) })}
                />
                <div className="slider-ticks">
                  <span>50 µg/m³</span>
                  <span>150 µg/m³</span>
                  <span>300 µg/m³</span>
                </div>
              </div>
            </div>

            {/* Facility Sensitivity Prioritization */}
            <div className="threshold-card">
              <strong className="threshold-title">Facility Sensitivity Prioritization</strong>
              <p className="threshold-desc">
                Weight emergency advisory sorting based on institution type vulnerability.
              </p>
              <div className="pref-segmented-control full">
                {[
                  { key: 'all' as const, label: 'All Sites Equal' },
                  { key: 'schools' as const, label: 'Schools Priority' },
                  { key: 'hospitals' as const, label: 'Hospitals Priority' },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`seg-btn ${settings.highRiskFacilityFilter === opt.key ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ highRiskFacilityFilter: opt.key })
                      showToast(`Vulnerability focus set to ${opt.label}`)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="threshold-info-box">
                <span>Applies weighting to 444 tracked civic facilities across the Delhi-NCR airshed.</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3 & 4: Data Feeds, Telemetry, Storage & Diagnostics */}
      <div className={`settings-grid ${activeTab !== 'all' ? 'settings-grid-single-col' : ''}`}>
        {/* Data Feed Status (strictly includes all 6 .feed-item for tests) */}
        {(activeTab === 'all' || activeTab === 'feeds') && (
          <section className="settings-card" id="section-feeds">
            <div className="card-header">
              <Server size={18} />
              <div className="header-text-group">
                <h2>Data feed status</h2>
                <span className="card-desc-text">
                  Scientific telemetry health, generation timestamps, and freshness auditing.
                </span>
              </div>
            </div>

            {/* Auto-Refresh Cadence */}
            <div className="auto-refresh-bar">
              <div className="refresh-label-col">
                <Clock size={14} className="clock-icon" />
                <span className="refresh-title">Auto-Refresh Cadence:</span>
              </div>
              <div className="pref-segmented-control compact">
                {([0, 1, 2, 5, 15] as AutoRefreshInterval[]).map(val => (
                  <button
                    type="button"
                    key={val}
                    className={`seg-btn ${settings.autoRefreshInterval === val ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ autoRefreshInterval: val })
                      showToast(val === 0 ? 'Auto-refresh disabled' : `Auto-refresh set to every ${val} min`)
                    }}
                  >
                    {val === 0 ? 'Manual' : `${val}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="feed-list">
              {feeds.map(feed => {
                const status = getFeedFreshness(
                  feed.key,
                  feed.timestamp,
                  now,
                  !!feedErrors[feed.key] || staleFeeds.some(value => value.label === feed.key)
                )
                const isStale = status.status === 'stale'
                return (
                  <div className="feed-item" key={feed.key}>
                    <div className="feed-info">
                      <div className="feed-title-line">
                        <strong>{feed.name}</strong>
                        <span className="feed-count-pill">{feed.countBadge}</span>
                      </div>
                      <span className="feed-desc">{feed.detail}</span>
                      <span className="feed-time">
                        {feed.timestamp ?? 'Timestamp unavailable'}
                      </span>
                      {feedErrors[feed.key] && (
                        <span className="feed-err-msg">{feedErrors[feed.key]}</span>
                      )}
                    </div>
                    <span className={`status-badge ${isStale ? 'stale' : 'live'}`}>
                      {status.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Data Mode, Local Storage & Diagnostic Tools */}
        {(activeTab === 'all' || activeTab === 'storage') && (
          <section className="settings-card" id="section-storage">
            <div className="card-header">
              <Database size={18} />
              <div className="header-text-group">
                <h2>Data mode &amp; local state</h2>
                <span className="card-desc-text">
                  Operational storage management, diagnostic exports, and session caches.
                </span>
              </div>
            </div>

            <div className="config-box">
              <div className="config-row">
                <span className="config-key">Data mode:</span>
                <strong className="config-val">
                  {DATA_MODE === 'snapshot' ? 'Captured snapshots' : 'Configured API'}
                </strong>
              </div>
              <p>
                Snapshot files are served as captured. A successful load does not certify freshness, model calibration, or observed human exposure.
              </p>
              <p>
                API configuration: {DATA_MODE === 'api' ? 'Configured at build time' : 'Not configured; using local public/data files'}
              </p>
              <p>No authenticated officer session or dispatch service is implemented.</p>
            </div>

            {/* Local Storage Meter */}
            <div className="storage-meter-box">
              <div className="storage-meter-head">
                <div className="storage-meter-title">
                  <HardDrive size={14} />
                  <span>Client Storage Usage</span>
                </div>
                <strong className="storage-meter-stat">{storageStats.totalKb} KB allocated</strong>
              </div>
              <div className="storage-meter-track">
                <div
                  className="storage-meter-fill"
                  style={{ width: `${Math.min(100, Math.max(2, (storageStats.totalKb / 5120) * 100))}%` }}
                />
              </div>
              <div className="storage-keys-list">
                {storageStats.items.slice(0, 3).map(item => (
                  <span key={item.key} className="storage-key-tag">
                    {item.key}: {item.formatted}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons (strictly preserves Reload data and Clear local checklist) */}
            <div className="settings-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={refreshData}
                disabled={loading || refreshing}
              >
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                Reload data
              </button>

              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleClearChecklist}
              >
                <Trash2 size={14} />
                Clear local checklist
              </button>
            </div>

            <div className="settings-extra-actions">
              <button
                type="button"
                className="btn-outline-action"
                onClick={handleExportDiagnostics}
                title="Download JSON diagnostic bundle with complete telemetry snapshot"
              >
                <Download size={14} />
                Export System Diagnostics
              </button>

              <button
                type="button"
                className="btn-text-muted"
                onClick={handleResetSettings}
                title="Reset operational preferences back to factory defaults"
              >
                <RotateCcw size={13} />
                Reset Defaults
              </button>
            </div>

            {message && <p className="clear-feedback" role="status">{message}</p>}
          </section>
        )}
      </div>

      {/* SECTION 5: Provenance & Scientific Governance */}
      {(activeTab === 'all' || activeTab === 'provenance') && (
        <div id="section-provenance" className="provenance-wrap">
          <ModelProvenanceNotice />
          <div className="system-about-card">
            <div className="about-col">
              <strong>AERIS Environmental Risk AI</strong>
              <span>Version 1.4.0 • Regional Air Exposure &amp; Risk Intelligence</span>
            </div>
            <div className="about-col right">
              <span>WeMakeDevs x AWS Environmental Hacks 2026</span>
              <span>Open Data Attribution: NASA FIRMS • Open-Meteo GFS • CPCB India</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
