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
  Wind,
  Thermometer,
  Flame,
  Layers,
  Sparkles,
  Crosshair,
  ShieldCheck,
  Compass,
  Palette,
  Eye,
  Sun,
  Moon,
  Monitor,
  Type,
  SlidersHorizontal,
  Contrast,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useAeris, type BasemapMode } from '@/services/dataContext'
import { DATA_MODE, getFeedFreshness } from '@/services/api'
import { clearActionChecklist } from '@/components/agent/actionChecklist'
import { useClock } from '@/components/status/useClock'
import ModelProvenanceNotice from '@/components/status/ModelProvenanceNotice'
import { useNotifications } from '@/services/notificationContext'
import { playAlertChime } from '@/services/soundChime'
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
import {
  useTheme,
  type ThemeMode,
  type AccentColor,
} from '@/services/themeContext'
import './SettingsView.css'

type SettingsTab = 'all' | 'appearance' | 'general' | 'notifications' | 'thresholds' | 'feeds' | 'storage' | 'provenance'

const BASEMAP_OPTIONS: {
  id: BasemapMode
  title: string
  desc: string
  provider: string
  tag: string
  previewClass: string
  previewLabel: string
}[] = [
  {
    id: 'satellite',
    title: 'Satellite imagery',
    desc: 'Raster background imagery. Image dates and resolution vary; this is not a current fire measurement.',
    provider: 'Esri World Imagery & reference tiles',
    tag: 'High Resolution',
    previewClass: 'preview-satellite',
    previewLabel: 'Orbital Multispectral',
  },
  {
    id: 'globe',
    title: 'Tilted perspective view',
    desc: 'Mercator map with 32° camera pitch and −6° bearing. Perspective atmospheric observation angle.',
    provider: 'Esri raster / MapLibre camera',
    tag: '3D Angle',
    previewClass: 'preview-globe',
    previewLabel: '32° Pitch Horizon',
  },
  {
    id: 'dark',
    title: 'Dark cartography',
    desc: 'High contrast dark canvas highlighting active thermal anomalies and plume dispersion corridors.',
    provider: 'CARTO Dark Matter',
    tag: 'High Contrast',
    previewClass: 'preview-dark',
    previewLabel: 'Obsidian Fire Canvas',
  },
  {
    id: 'topo',
    title: 'Street cartography',
    desc: 'Roads, boundaries, and populated settlements. Ideal for school and hospital corridor verification.',
    provider: 'CARTO Voyager',
    tag: 'Civic Grid',
    previewClass: 'preview-topo',
    previewLabel: 'Civic Arterial Grid',
  },
]

const THEME_OPTIONS: {
  id: ThemeMode
  title: string
  subtitle: string
  desc: string
  tag: string
  previewClass: string
  icon: typeof Sun
}[] = [
  {
    id: 'forest',
    title: 'Forest',
    subtitle: 'Standard Control Room',
    desc: 'Warm slate-grey page (#F2F5F2), crisp white elevation, and forest green accents. Baseline standard for day/night duty.',
    tag: 'Baseline Default',
    previewClass: 'preview-theme-forest',
    icon: Sun,
  },
  {
    id: 'night-watch',
    title: 'Night Watch',
    subtitle: 'Emergency Night Operations',
    desc: 'Deep oceanic slate (#0E1B26), calibrated dark cards (#152635), and signal teal indicators. Zero glare for dim control rooms.',
    tag: 'OLED / Low Glare',
    previewClass: 'preview-theme-night-watch',
    icon: Moon,
  },
  {
    id: 'field-daylight',
    title: 'Field Daylight',
    subtitle: 'Outdoor Incident Response',
    desc: 'High-albedo page (#E6EBEE), pure white cards, and 2px architectural borders (#1B2B38). Maximum legibility under direct sunlight.',
    tag: 'Sunlight / High Contrast',
    previewClass: 'preview-theme-field-daylight',
    icon: Eye,
  },
  {
    id: 'system',
    title: 'Match System',
    subtitle: 'Adaptive OS Scheme',
    desc: 'Automatically synchronizes with your device operating system dark or light preference.',
    tag: 'Adaptive OS',
    previewClass: 'preview-theme-system',
    icon: Monitor,
  },
]

const ACCENT_OPTIONS: {
  id: AccentColor
  label: string
  colorHex: string
}[] = [
  { id: 'forest', label: 'Forest Green', colorHex: '#15803D' },
  { id: 'teal', label: 'Signal Teal', colorHex: '#0D9488' },
  { id: 'blue', label: 'Deep Blue', colorHex: '#2563EB' },
  { id: 'violet', label: 'Amethyst Violet', colorHex: '#7C3AED' },
  { id: 'slate', label: 'Carbon Slate', colorHex: '#475569' },
]

const FEED_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sources: Flame,
  corridor: Wind,
  wind: Compass,
  aqi: Activity,
  ranked_sites: Layers,
  actions: ShieldCheck,
}

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
  const {
    settings: themeSettings,
    updateSettings: updateThemeSettings,
    resetThemeSettings,
    effectiveTheme,
  } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('all')
  const { triggerTestNotification, clearAllRead } = useNotifications()
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

  // Dynamic risk categorization for PM2.5 alarm threshold
  const riskTier = useMemo(() => {
    if (settings.pm25CriticalThreshold <= 100) return { key: 'mod', label: 'Moderate Advisory' }
    if (settings.pm25CriticalThreshold <= 200) return { key: 'high', label: 'High Alert Tier' }
    return { key: 'severe', label: 'Emergency Tier' }
  }, [settings.pm25CriticalThreshold])

  // Contextual FRP fire cluster retention count
  const retainedFiresCount = useMemo(() => {
    if (!sources?.sources) return 0
    return sources.sources.filter(s => (s.total_frp_mw ?? 0) >= settings.minFrpMw).length
  }, [sources, settings.minFrpMw])

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
            className={`nav-pill ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={13} />
            Appearance
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
            className={`nav-pill ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={13} />
            Notifications &amp; Alerts
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

      {/* SECTION: Appearance & Visual Accessibility */}
      {(activeTab === 'all' || activeTab === 'appearance') && (
        <section className="settings-card full-width" id="section-appearance">
          <div className="card-header">
            <Palette size={18} />
            <div className="header-text-group">
              <h2>Appearance &amp; Visual Accessibility</h2>
              <span className="card-desc-text">
                Switch control room operational themes, non-emergency accents, interface density, and visual accessibility.
              </span>
            </div>
          </div>

          {/* Theme Mode Selection Cards */}
          <div className="appearance-subsection">
            <div className="subsection-header">
              <span className="subsection-title">Operational Theme Mode</span>
              <span className="subsection-desc">
                Adapts page luminescence, card elevation, and contrast for control rooms or outdoor rugged field laptops.
              </span>
            </div>

            <div className="theme-cards-grid">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = themeSettings.theme === opt.id
                const IconComponent = opt.icon
                return (
                  <button
                    type="button"
                    key={opt.id}
                    className={`theme-option-card ${isSelected ? 'selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      updateThemeSettings({ theme: opt.id })
                      showToast(`Theme switched to ${opt.title}`)
                    }}
                  >
                    <div className={`theme-preview-banner ${opt.previewClass}`}>
                      <div className="banner-mock-window">
                        <div className="mock-header">
                          <span className="mock-dot" />
                          <span className="mock-bar" />
                        </div>
                        <div className="mock-card">
                          <span className="mock-pill" />
                          <span className="mock-text" />
                        </div>
                      </div>
                      <span className="banner-label">{opt.tag}</span>
                      {isSelected && (
                        <span className="banner-active-chip">
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>
                    <div className="theme-card-content">
                      <div className="theme-card-top">
                        <div className="theme-card-title-row">
                          <IconComponent size={14} className="theme-icon" />
                          <strong className="theme-title">{opt.title}</strong>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="selected-check" aria-hidden="true" />}
                      </div>
                      <span className="theme-subtitle">{opt.subtitle}</span>
                      <p className="theme-card-desc">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accent Color Selection */}
          <div className="appearance-subsection">
            <div className="subsection-header">
              <span className="subsection-title">Operational Accent Color</span>
              <span className="subsection-desc">
                Customizes primary interactive elements, active navigation pills, and focused selections.
              </span>
            </div>

            <div className="accent-pills-row" role="radiogroup" aria-label="Operational accent palette">
              {ACCENT_OPTIONS.map((opt) => {
                const isSelected = themeSettings.accent === opt.id
                return (
                  <button
                    type="button"
                    key={opt.id}
                    className={`accent-pill-btn ${isSelected ? 'selected' : ''}`}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      updateThemeSettings({ accent: opt.id })
                      showToast(`Accent color set to ${opt.label}`)
                    }}
                  >
                    <span
                      className="accent-swatch-circle"
                      style={{ backgroundColor: opt.colorHex }}
                    />
                    <span className="accent-name">{opt.label}</span>
                    {isSelected && <Check size={13} className="accent-check" />}
                  </button>
                )
              })}
            </div>
            <div className="accent-safety-notice">
              <ShieldAlert size={13} className="safety-icon" />
              <span>
                <strong>Safety Guarantee:</strong> Statutory severity colors (Critical, High, Caution, Ok) and the fire plume ramp (0-2h, 2-4h, 4-8h, 8-24h) remain fixed to statutory safety standards and never collide with accent selection.
              </span>
            </div>
          </div>

          {/* Typography, Density, and Accessibility Controls */}
          <div className="appearance-controls-grid">
            {/* Typography Scale */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-blue">
                  <Type size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="pref-text-size">Typography Scaling</label>
                  <span className="pref-help">Root font scale for control room displays and wall monitors.</span>
                </div>
              </div>
              <div className="pref-segmented-control" id="pref-text-size">
                <button
                  type="button"
                  className={`seg-btn ${themeSettings.textSize === 'default' ? 'active' : ''}`}
                  onClick={() => {
                    updateThemeSettings({ textSize: 'default' })
                    showToast('Typography set to Standard (14px baseline)')
                  }}
                >
                  Standard (14px)
                </button>
                <button
                  type="button"
                  className={`seg-btn ${themeSettings.textSize === 'large' ? 'active' : ''}`}
                  onClick={() => {
                    updateThemeSettings({ textSize: 'large' })
                    showToast('Typography set to Large (16px baseline)')
                  }}
                >
                  Large (16px)
                </button>
              </div>
            </div>

            {/* Interface Density */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-cyan">
                  <SlidersHorizontal size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="pref-density">Interface Density</label>
                  <span className="pref-help">Controls padding and gap spacing across KPI cards and tables.</span>
                </div>
              </div>
              <div className="pref-segmented-control" id="pref-density">
                <button
                  type="button"
                  className={`seg-btn ${themeSettings.density === 'comfortable' ? 'active' : ''}`}
                  onClick={() => {
                    updateThemeSettings({ density: 'comfortable' })
                    showToast('Density set to Comfortable')
                  }}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  className={`seg-btn ${themeSettings.density === 'compact' ? 'active' : ''}`}
                  onClick={() => {
                    updateThemeSettings({ density: 'compact' })
                    showToast('Density set to Compact')
                  }}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Basemap Matching Toggle */}
            <div className="pref-item toggle-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-emerald">
                  <Globe size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="toggle-match-basemap">Synchronize Cartography</label>
                  <span className="pref-help">Auto-match basemap (Dark for Night Watch, Street for Daylight, Satellite for Forest).</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  id="toggle-match-basemap"
                  type="checkbox"
                  checked={themeSettings.matchBasemap}
                  onChange={(e) => {
                    updateThemeSettings({ matchBasemap: e.target.checked })
                    showToast(e.target.checked ? 'Basemap synchronization enabled' : 'Basemap synchronization disabled')
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Colour-blind-safe Ramp Toggle */}
            <div className="pref-item toggle-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-orange">
                  <Contrast size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="toggle-cb-safe">Colour-Blind-Safe Severity Ramp</label>
                  <span className="pref-help">Applies Okabe-Ito / Viridis palette to plume bands and severity badges.</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  id="toggle-cb-safe"
                  type="checkbox"
                  checked={themeSettings.colorBlindSafe}
                  onChange={(e) => {
                    updateThemeSettings({ colorBlindSafe: e.target.checked })
                    showToast(e.target.checked ? 'Colour-blind-safe palette enabled' : 'Default severity palette restored')
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Reduce Motion Toggle */}
            <div className="pref-item toggle-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-purple">
                  <Activity size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="toggle-reduce-motion">Reduce Interface Motion</label>
                  <span className="pref-help">Disables animated transitions and pulsing indicators for rugged terminals.</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  id="toggle-reduce-motion"
                  type="checkbox"
                  checked={themeSettings.reduceMotion}
                  onChange={(e) => {
                    updateThemeSettings({ reduceMotion: e.target.checked })
                    showToast(e.target.checked ? 'Reduced motion enabled' : 'Standard motion enabled')
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* Reset Appearance Actions */}
          <div className="appearance-footer-actions">
            <button
              type="button"
              className="btn-reset-appearance"
              onClick={() => {
                resetThemeSettings()
                showToast('Appearance restored to Forest default')
              }}
            >
              <RotateCcw size={13} />
              Reset Appearance to Defaults
            </button>
            <span className="appearance-active-summary">
              Active Theme: <strong>{effectiveTheme}</strong> · Accent: <strong>{themeSettings.accent}</strong> · Scale: <strong>{themeSettings.textSize}</strong>
            </span>
          </div>
        </section>
      )}

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
                  <div className={`basemap-preview-banner ${option.previewClass}`}>
                    <span className="banner-label">{option.previewLabel}</span>
                    {basemapMode === option.id && (
                      <span className="banner-active-chip">
                        <Check size={11} /> Active
                      </span>
                    )}
                  </div>
                  <div className="basemap-card-content">
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
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-cyan">
                    <Wind size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-wind-unit">Wind Speed Unit</label>
                    <span className="pref-help">Used in Wind &amp; Weather telemetry view.</span>
                  </div>
                </div>
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
              </div>

              {/* Temperature Unit */}
              <div className="pref-item">
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-orange">
                    <Thermometer size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-temp-unit">Temperature Unit</label>
                    <span className="pref-help">Station meteorology temperature format.</span>
                  </div>
                </div>
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
              </div>

              {/* Default Startup View */}
              <div className="pref-item">
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-green">
                    <Layers size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-default-tab">Default Startup Screen</label>
                    <span className="pref-help">Initial active tab when AERIS launches.</span>
                  </div>
                </div>
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
                  <option value="notifications">Notification Center</option>
                </select>
              </div>

              {/* Default Lookahead Horizon */}
              <div className="pref-item">
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-purple">
                    <Clock size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-default-horizon">Default Lookahead Horizon</label>
                    <span className="pref-help">Default forecast lookahead slider value.</span>
                  </div>
                </div>
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
              </div>

              {/* Particle Quality */}
              <div className="pref-item">
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-blue">
                    <Sparkles size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-particle-density">Plume Vector Rendering</label>
                    <span className="pref-help">Balance 60 FPS animation vs hardware battery.</span>
                  </div>
                </div>
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
              </div>

              {/* Auto Fly-to Toggle */}
              <div className="pref-item">
                <div className="pref-header-row">
                  <div className="pref-icon-squircle icon-teal">
                    <Crosshair size={15} />
                  </div>
                  <div className="pref-header-text">
                    <label className="pref-label" htmlFor="pref-auto-fly">Map Navigation Interaction</label>
                    <span className="pref-help">Automatically centers camera when site is clicked.</span>
                  </div>
                </div>
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
              </div>
            </div>
          </section>
        </>
      )}

      {/* SECTION: Environmental Alerts & Notification Controls */}
      {(activeTab === 'all' || activeTab === 'notifications') && (
        <section className="settings-card full-width" id="section-notifications">
          <div className="card-header">
            <Bell size={18} />
            <div className="header-text-group">
              <h2>Environmental Alerts &amp; Notification Controls</h2>
              <span className="card-desc-text">
                Manage operational alert dispatch, audio chimes, in-app toast banners, and incident sensitivity.
              </span>
            </div>
          </div>

          <div className="preferences-grid">
            {/* In-App Toast Banners */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-cyan">
                  <Bell size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="pref-toast-toggle">In-App Toast Banners</label>
                  <span className="pref-help">Floating toasts for real-time critical receptor arrivals and telemetry downtime.</span>
                </div>
              </div>
              <div className="pref-segmented-control" id="pref-toast-toggle">
                <button
                  type="button"
                  className={`seg-btn ${settings.inAppAlertBanners ? 'active' : ''}`}
                  onClick={() => {
                    updateSettings({ inAppAlertBanners: true })
                    showToast('Enabled in-app alert toasts')
                  }}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className={`seg-btn ${!settings.inAppAlertBanners ? 'active' : ''}`}
                  onClick={() => {
                    updateSettings({ inAppAlertBanners: false })
                    showToast('Disabled in-app alert toasts')
                  }}
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Critical Alert Audio Chime */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-orange">
                  {settings.criticalAlertChime ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </div>
                <div className="pref-header-text">
                  <label className="pref-label" htmlFor="pref-chime-toggle">Critical Audio Chime</label>
                  <span className="pref-help">Synthesized dual-tone audio chime on emergency receptor exposure events.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="pref-segmented-control" id="pref-chime-toggle" style={{ flex: 1 }}>
                  <button
                    type="button"
                    className={`seg-btn ${settings.criticalAlertChime ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ criticalAlertChime: true })
                      playAlertChime('test')
                      showToast('Critical audio chime enabled')
                    }}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    className={`seg-btn ${!settings.criticalAlertChime ? 'active' : ''}`}
                    onClick={() => {
                      updateSettings({ criticalAlertChime: false })
                      showToast('Critical audio chime disabled')
                    }}
                  >
                    Muted
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-compact-tool"
                  onClick={() => {
                    playAlertChime('critical')
                    showToast('Played test audio chime')
                  }}
                  title="Test Web Audio synthesizer tone"
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Test Tone
                </button>
              </div>
            </div>

            {/* Diagnostic Alert Drill */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-purple">
                  <ShieldAlert size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label">Operational Drill Simulation</label>
                  <span className="pref-help">Simulate an immediate high-priority hospital plume arrival drill.</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-compact-tool"
                onClick={() => {
                  triggerTestNotification('critical')
                  showToast('Simulated critical operational alert')
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--risk-critical)',
                  background: 'rgba(225, 29, 72, 0.08)',
                  color: 'var(--risk-critical)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={13} />
                <span>Simulate Emergency Drill Alert</span>
              </button>
            </div>

            {/* Queue Management */}
            <div className="pref-item">
              <div className="pref-header-row">
                <div className="pref-icon-squircle icon-green">
                  <Trash2 size={15} />
                </div>
                <div className="pref-header-text">
                  <label className="pref-label">Incident Queue Maintenance</label>
                  <span className="pref-help">Clear all previously read incidents from local browser memory.</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-compact-tool"
                onClick={() => {
                  clearAllRead()
                  showToast('Cleared read incidents from queue')
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={13} />
                <span>Clear Read Incidents</span>
              </button>
            </div>
          </div>
        </section>
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
              <div className="threshold-header-row">
                <div className="threshold-icon-squircle icon-emerald">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong className="threshold-title">Air Quality Standard Framework</strong>
                  <p className="threshold-desc">
                    Select the regulatory index standard used to classify PM2.5 concentrations and health advisory tiers.
                  </p>
                </div>
              </div>
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
              {/* Visual AQI Spectrum Bar */}
              <div className="aqi-spectrum-bar" role="img" aria-label="National AQI Classification Spectrum">
                <span className="aqi-pill aqi-good">Good 0-50</span>
                <span className="aqi-pill aqi-sat">Satisfactory 51-100</span>
                <span className="aqi-pill aqi-mod">Moderate 101-200</span>
                <span className="aqi-pill aqi-poor">Poor 201-300</span>
                <span className="aqi-pill aqi-vpoor">Very Poor 301-400</span>
                <span className="aqi-pill aqi-sev">Severe &gt;400</span>
              </div>
            </div>

            {/* Fire Radiative Power (FRP) Minimum Filter */}
            <div className="threshold-card">
              <div className="threshold-header-row">
                <div className="threshold-icon-squircle icon-orange">
                  <Flame size={16} />
                </div>
                <div>
                  <strong className="threshold-title">Thermal Anomaly Sensitivity Filter</strong>
                  <p className="threshold-desc">
                    Filter out low-intensity satellite agricultural burns to focus incident response on major fire complexes.
                  </p>
                </div>
              </div>
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
                <span>Active airshed telemetry: {retainedFiresCount} of {sources?.sources.length ?? 0} thermal source clusters retained ({sources?.sources.length ? Math.round((retainedFiresCount / sources.sources.length) * 100) : 0}% coverage).</span>
              </div>
            </div>

            {/* Facility Exposure Alarm Level */}
            <div className="threshold-card">
              <div className="threshold-header-row">
                <div className="threshold-icon-squircle icon-red">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <strong className="threshold-title">High-Risk Facility Alarm Trigger</strong>
                  <p className="threshold-desc">
                    Threshold for triggering high-priority emergency checklists for schools and medical centers.
                  </p>
                </div>
              </div>
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="slider-label">PM2.5 Delta Trigger:</span>
                  <div className="slider-val-wrap">
                    <strong className="slider-val">+{settings.pm25CriticalThreshold} µg/m³</strong>
                    <span className={`risk-tier-badge tier-${riskTier.key}`}>{riskTier.label}</span>
                  </div>
                </div>
                <div className="slider-track-wrap">
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="25"
                    className="threshold-range-slider"
                    value={settings.pm25CriticalThreshold}
                    onChange={e => updateSettings({ pm25CriticalThreshold: Number(e.target.value) })}
                  />
                  <div className="slider-gradient-bar" />
                </div>
                <div className="slider-ticks">
                  <span>50 µg/m³ (Advisory)</span>
                  <span>150 µg/m³ (Warning)</span>
                  <span>300 µg/m³ (Severe)</span>
                </div>
              </div>
            </div>

            {/* Facility Sensitivity Prioritization */}
            <div className="threshold-card">
              <div className="threshold-header-row">
                <div className="threshold-icon-squircle icon-blue">
                  <Layers size={16} />
                </div>
                <div>
                  <strong className="threshold-title">Facility Sensitivity Prioritization</strong>
                  <p className="threshold-desc">
                    Weight emergency advisory sorting based on institution type vulnerability.
                  </p>
                </div>
              </div>
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
                const FeedIcon = FEED_ICONS[feed.key] || Activity
                return (
                  <div className="feed-item" key={feed.key}>
                    <div className={`feed-icon-squircle icon-${feed.key}`}>
                      <FeedIcon size={16} />
                    </div>
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

          {/* Keyless External Data Sources: NASA GIBS */}
          <section className="settings-card" id="section-external-sources" style={{ marginTop: '16px' }}>
            <div className="card-header">
              <Globe size={18} />
              <div className="header-text-group">
                <h2>External data sources &amp; satellite telemetry</h2>
                <span className="card-desc-text">
                  Direct browser-to-provider keyless telemetry feeds for visual cross-checking.
                </span>
              </div>
            </div>

            <div
              id="source-nasa-gibs"
              className="external-source-card"
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-card-sm, 12px)',
                background: 'var(--surface-subtle, rgba(0, 40, 20, 0.03))',
                border: '1px solid var(--border-subtle, rgba(0, 40, 20, 0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>NASA Global Imagery Browse Services (GIBS)</strong>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill, 9999px)',
                    background: 'var(--accent-surface, #E6F2EB)',
                    color: 'var(--accent-text, #1A4433)',
                    border: '1px solid var(--accent-primary, #22734F)',
                  }}
                >
                  Keyless External Source
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                Serves full-resolution Web Mercator (EPSG:3857) true-colour satellite reflectance composites from VIIRS (NOAA-20, NOAA-21, Suomi NPP) and MODIS (Terra, Aqua) sensors.
              </p>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Direct Browser Architecture:</strong> Tile requests go directly from the viewer&apos;s browser to NASA Earthdata (<code>gibs.earthdata.nasa.gov</code>). No API key, account registration, or intermediary backend proxy required.</div>
                <div><strong>Attribution Policy:</strong> &ldquo;We acknowledge the use of imagery provided by services from NASA&apos;s Global Imagery Browse Services (GIBS), part of NASA&apos;s Earth Science Data and Information System (ESDIS).&rdquo;</div>
              </div>
            </div>
          </section>

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
