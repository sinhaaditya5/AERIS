import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flame,
  Hospital,
  Info,
  Radio,
  School,
  Search,
  Table,
  X,
} from 'lucide-react'
import type { RankedSite, Source, AqiStation, CorridorGeoJSON } from '@/types/schemas'
import { getRiskLevel, riskLabel } from '@/types/schemas'
import { getThermalSeverity } from './thermalMarker'
import './ExplorerTelemetryTray.css'

export interface InspectorData {
  type: 'fire' | 'school' | 'hospital' | 'station'
  title: string
  subtitle: string
  coords: [number, number]
  metrics: { label: string; value: string | number }[]
  actionText?: string
  siteId?: string
}

interface Props {
  isExpanded: boolean
  onToggleExpanded: () => void
  rankedSites: { sites: RankedSite[] } | null
  sources: { sources: Source[] } | null
  stations: AqiStation[] | null
  corridor: CorridorGeoJSON | null
  etaHours: number | null
  exposedPopulation: number | null
  onFlyTo: (coords: [number, number], zoom?: number) => void
  onSelectFeature: (feature: InspectorData) => void
}

type TrayTab = 'facilities' | 'fires' | 'stations'

export default function ExplorerTelemetryTray({
  isExpanded,
  onToggleExpanded,
  rankedSites,
  sources,
  stations,
  corridor,
  etaHours,
  exposedPopulation,
  onFlyTo,
  onSelectFeature,
}: Props) {
  const [activeTab, setActiveTab] = useState<TrayTab>('facilities')
  const [searchQuery, setSearchQuery] = useState('')

  const allSites = useMemo(() => rankedSites?.sites ?? [], [rankedSites])
  const allSources = useMemo(() => sources?.sources ?? [], [sources])
  const allStations = useMemo(() => stations ?? [], [stations])

  const schoolsCount = useMemo(() => allSites.filter(s => s.type === 'school').length, [allSites])
  const hospitalsCount = useMemo(() => allSites.filter(s => s.type === 'hospital').length, [allSites])

  // Filtered lists
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return allSites
    const q = searchQuery.toLowerCase()
    return allSites.filter(s => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q))
  }, [allSites, searchQuery])

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return allSources
    const q = searchQuery.toLowerCase()
    return allSources.filter(s =>
      s.id.toLowerCase().includes(q) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.location_name && s.location_name.toLowerCase().includes(q))
    )
  }, [allSources, searchQuery])

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return allStations
    const q = searchQuery.toLowerCase()
    return allStations.filter(stn =>
      stn.name.toLowerCase().includes(q) ||
      (stn.source && stn.source.toLowerCase().includes(q)) ||
      (stn.id && stn.id.toLowerCase().includes(q))
    )
  }, [allStations, searchQuery])

  const handleSelectSite = (site: RankedSite) => {
    const isSchool = site.type === 'school'
    const riskLvl = getRiskLevel(site.risk_score)
    const riskText = riskLabel(riskLvl)

    onFlyTo([site.lon, site.lat], 12.5)
    onSelectFeature({
      type: site.type === 'school' ? 'school' : 'hospital',
      title: site.name,
      subtitle: `${isSchool ? 'Educational Facility' : 'Healthcare Facility'} • Receptor Zone`,
      coords: [site.lon, site.lat],
      metrics: [
        { label: 'Risk Priority', value: riskText },
        { label: 'Forecast-relative model ETA', value: `~ ${site.eta_hours.toFixed(1)}h` },
        { label: 'Uncalibrated relative score', value: `${(site.risk_score * 100).toFixed(0)}%` },
        { label: 'Modelled band peak PM2.5', value: `+${site.pm25_delta_ugm3.toFixed(0)} µg/m³` },
      ],
      actionText: isSchool
        ? 'Transition morning assembly indoors, verify HVAC filtration, distribute certified N95 masks.'
        : 'Alert respiratory ER staff, prepare nebulizer reserves, activate air filtration backups.',
      siteId: site.site_id,
    })
  }

  const handleSelectSource = (src: Source) => {
    onFlyTo([src.lon, src.lat], 10.5)
    onSelectFeature({
      type: 'fire',
      title: `${src.district || src.type.replace(/_/g, ' ')} (${src.id})`,
      subtitle: src.location_name || 'Fire-derived source candidate; classification unconfirmed',
      coords: [src.lon, src.lat],
      metrics: [
        { label: 'Radiative Power (FRP)', value: `${src.total_frp_mw.toFixed(1)} MW` },
        { label: 'Detected Fires', value: `${src.fire_count} hotspots` },
        { label: 'Territory Scope', value: src.territory ?? 'Unavailable' },
        { label: 'Detection Confidence', value: `${(src.confidence * 100).toFixed(0)}% heuristic score (uncalibrated)` },
        { label: 'Normalised emission proxy', value: `${(src.emission_strength * 100).toFixed(0)}% intensity` },
        { label: 'District / Sector', value: src.district || 'Unassigned' },
      ],
      actionText: 'Candidate derived from fire clustering. Thermal detection does not confirm pollution attribution, land use, or measured emissions.',
      siteId: src.id,
    })
  }

  const handleSelectStation = (stn: AqiStation) => {
    const aqiVal = stn.aqi ?? 0
    onFlyTo([stn.lon, stn.lat], 12.0)
    onSelectFeature({
      type: 'station',
      title: stn.name,
      subtitle: `Reported ground monitoring station${stn.source ? ` · ${stn.source}` : ''}`,
      coords: [stn.lon, stn.lat],
      metrics: [
        { label: 'Peak Observed AQI', value: `${aqiVal}` },
        { label: 'Airshed Status', value: aqiVal > 300 ? 'Reported AQI >300' : aqiVal > 200 ? 'Reported AQI >200' : 'Reported AQI ≤200' },
        { label: 'Coordinates', value: `${stn.lat.toFixed(3)}°N, ${stn.lon.toFixed(3)}°E` },
      ],
      actionText: 'Reported station AQI does not establish source attribution or model validation. Individual observation times and sources are available in the PM2.5 layer.',
      siteId: stn.id,
    })
  }

  return (
    <footer className={`explorer-telemetry-tray ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* ── Collapsed Dock Strip ─────────────────────────────────────── */}
      <div className="tray-dock-bar">
        <div className="tray-dock-left">
          <button
            type="button"
            className="tray-toggle-btn"
            onClick={onToggleExpanded}
            title={isExpanded ? 'Collapse telemetry drawer' : 'Expand full facility & source intelligence table'}
            aria-expanded={isExpanded}
          >
            <Table size={14} className="tray-toggle-icon" />
            <span className="tray-toggle-label">Facility & Telemetry Table</span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          <div className="tray-quick-badges">
            <span className="tray-badge site-badge" title="Total ranked vulnerable facilities">
              <School size={11} />
              <span>{schoolsCount} Schools</span>
            </span>
            <span className="tray-badge site-badge" title="Total ranked healthcare facilities">
              <Hospital size={11} />
              <span>{hospitalsCount} Hospitals</span>
            </span>
            <span className="tray-badge fire-badge" title="Active fire-derived candidate clusters">
              <Flame size={11} />
              <span>{allSources.length} Hotspots</span>
            </span>
            <span className="tray-badge stn-badge" title="Real-time AQI ground stations">
              <Radio size={11} />
              <span>{allStations.length} Stations</span>
            </span>
          </div>

          <div className="tray-telemetry-indicators">
            <span className="telem-chip">
              <strong className="chip-k">Min ETA:</strong>
              <span className="chip-v">{etaHours != null ? `~${etaHours.toFixed(1)}h` : '—'}</span>
            </span>
            <span className="telem-chip">
              <strong className="chip-k">Corridor Pop:</strong>
              <span className="chip-v">{exposedPopulation != null ? `${(exposedPopulation / 1000).toFixed(0)}k` : '—'}</span>
            </span>
          </div>
        </div>

        <div className="tray-dock-right">
          <button
            type="button"
            className="tray-view-table-btn"
            onClick={onToggleExpanded}
          >
            {isExpanded ? 'Hide Data Drawer ▾' : 'View Full Table (All Sites) ▲'}
          </button>
        </div>
      </div>

      {/* ── Expanded Drawer Content ─────────────────────────────────── */}
      {isExpanded && (
        <div className="tray-drawer-body">
          <div className="tray-drawer-header">
            {/* Tab Navigation */}
            <div className="tray-tabs">
              <button
                type="button"
                className={`tray-tab ${activeTab === 'facilities' ? 'active' : ''}`}
                onClick={() => setActiveTab('facilities')}
              >
                <School size={13} />
                <span>Sensitive Facilities ({filteredSites.length})</span>
              </button>
              <button
                type="button"
                className={`tray-tab ${activeTab === 'fires' ? 'active' : ''}`}
                onClick={() => setActiveTab('fires')}
              >
                <Flame size={13} />
                <span>Fire Hotspots ({filteredSources.length})</span>
              </button>
              <button
                type="button"
                className={`tray-tab ${activeTab === 'stations' ? 'active' : ''}`}
                onClick={() => setActiveTab('stations')}
              >
                <Radio size={13} />
                <span>AQI Stations ({filteredStations.length})</span>
              </button>
            </div>

            {/* Search Filter */}
            <div className="tray-search-wrap">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder={
                  activeTab === 'facilities' ? 'Filter facilities by name or type…'
                  : activeTab === 'fires' ? 'Filter hotspots by district or ID…'
                  : 'Filter stations by city or name…'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="tray-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Close Drawer Button */}
            <button
              type="button"
              className="tray-close-btn"
              onClick={onToggleExpanded}
              aria-label="Close telemetry table"
              title="Close table"
            >
              <X size={15} />
            </button>
          </div>

          {/* Table Container */}
          <div className="tray-table-container">
            {activeTab === 'facilities' && (
              <table className="tray-data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Facility Name</th>
                    <th>Type</th>
                    <th>Risk Priority</th>
                    <th>Arrival ETA</th>
                    <th>Peak Delta PM2.5</th>
                    <th>Coordinates</th>
                    <th className="th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.length === 0 ? (
                    <tr><td colSpan={8} className="tray-empty-cell">No matching facilities found.</td></tr>
                  ) : (
                    filteredSites.map((site, idx) => {
                      const riskLvl = getRiskLevel(site.risk_score)
                      const riskText = riskLabel(riskLvl)
                      return (
                        <tr key={site.site_id || idx} onClick={() => handleSelectSite(site)}>
                          <td className="cell-rank">#{site.rank ?? idx + 1}</td>
                          <td className="cell-name">
                            <span className="facility-type-icon">{site.type === 'school' ? '🏫' : '🏥'}</span>
                            <strong>{site.name}</strong>
                          </td>
                          <td className="cell-type">
                            <span className={`type-tag type-${site.type}`}>{site.type === 'school' ? 'School' : 'Hospital'}</span>
                          </td>
                          <td className="cell-risk">
                            <span className={`risk-pill risk-${riskLvl}`}>{riskText}</span>
                          </td>
                          <td className="cell-eta">~{site.eta_hours.toFixed(1)}h</td>
                          <td className="cell-pm25">+{site.pm25_delta_ugm3.toFixed(0)} µg/m³</td>
                          <td className="cell-coords">{site.lat.toFixed(2)}°N, {site.lon.toFixed(2)}°E</td>
                          <td className="cell-action">
                            <button
                              type="button"
                              className="flyto-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectSite(site)
                              }}
                              title={`Fly to ${site.name} on map`}
                            >
                              <Crosshair size={12} />
                              <span>Fly To</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'fires' && (
              <table className="tray-data-table">
                <thead>
                  <tr>
                    <th>Source ID</th>
                    <th>District / Region</th>
                    <th>Territory</th>
                    <th>Radiative Power (FRP)</th>
                    <th>Hotspots</th>
                    <th>Confidence</th>
                    <th>Coordinates</th>
                    <th className="th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.length === 0 ? (
                    <tr><td colSpan={8} className="tray-empty-cell">No matching fire hotspots found.</td></tr>
                  ) : (
                    filteredSources.map((src, idx) => {
                      const severity = getThermalSeverity(src.total_frp_mw)
                      return (
                        <tr key={src.id || idx} onClick={() => handleSelectSource(src)}>
                          <td className="cell-rank"><strong>{src.id}</strong></td>
                          <td className="cell-name">
                            <span className="facility-type-icon">🔥</span>
                            <span>{src.district || src.location_name || 'Agricultural belt'}</span>
                          </td>
                          <td className="cell-type">
                            <span className={`territory-tag ${src.territory === 'transboundary' ? 'trans' : 'dom'}`}>
                              {src.territory === 'transboundary' ? '🌐 Transboundary' : '🇮🇳 Domestic'}
                            </span>
                          </td>
                          <td className="cell-frp">
                            <span className={`frp-pill frp-${severity}`}>{src.total_frp_mw.toFixed(1)} MW</span>
                          </td>
                          <td className="cell-eta">{src.fire_count} detected</td>
                          <td className="cell-pm25">{(src.confidence * 100).toFixed(0)}%</td>
                          <td className="cell-coords">{src.lat.toFixed(2)}°N, {src.lon.toFixed(2)}°E</td>
                          <td className="cell-action">
                            <button
                              type="button"
                              className="flyto-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectSource(src)
                              }}
                              title={`Fly to source ${src.id} on map`}
                            >
                              <Crosshair size={12} />
                              <span>Fly To</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'stations' && (
              <table className="tray-data-table">
                <thead>
                  <tr>
                    <th>Station Name</th>
                    <th>City / State</th>
                    <th>Observed AQI</th>
                    <th>Status Band</th>
                    <th>Coordinates</th>
                    <th className="th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.length === 0 ? (
                    <tr><td colSpan={6} className="tray-empty-cell">No matching stations found.</td></tr>
                  ) : (
                    filteredStations.map((stn, idx) => {
                      const aqiVal = stn.aqi ?? 0
                      const aqiBand = aqiVal > 300 ? 'severe' : aqiVal > 200 ? 'poor' : 'moderate'
                      return (
                        <tr key={stn.id || idx} onClick={() => handleSelectStation(stn)}>
                          <td className="cell-name">
                            <span className="facility-type-icon">📡</span>
                            <strong>{stn.name}</strong>
                          </td>
                          <td className="cell-type">{stn.source ?? 'Ground Network'}</td>
                          <td className="cell-frp">
                            <span className={`aqi-pill aqi-${aqiBand}`}>{aqiVal} AQI</span>
                          </td>
                          <td className="cell-risk">
                            {aqiVal > 300 ? 'Severe / Hazardous' : aqiVal > 200 ? 'Poor / Unhealthy' : 'Moderate'}
                          </td>
                          <td className="cell-coords">{stn.lat.toFixed(2)}°N, {stn.lon.toFixed(2)}°E</td>
                          <td className="cell-action">
                            <button
                              type="button"
                              className="flyto-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectStation(stn)
                              }}
                              title={`Fly to station ${stn.name} on map`}
                            >
                              <Crosshair size={12} />
                              <span>Fly To</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Sleek Bottom Status Note (Compliance & Provenance) ────── */}
      <div className="explorer-footer-status">
        <p className="map-science-note">
          <Info size={11} className="science-note-icon" />
          <span>Uncalibrated model corridors · forecast start: {corridor?.forecast_start ?? corridor?.provenance?.forecast_start ?? 'unavailable'}. Time controls select cumulative bands; full centrelines and ETA markers remain as forecast context. Station observations are separate from modelled band peaks. Facility markers show up to 12 ranked sites after filtering; the facility table contains the full list.</span>
        </p>
      </div>
    </footer>
  )
}
