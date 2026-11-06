import { useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Wind,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import { getRiskLevel, riskLabel } from '@/types/schemas'
import './AnalyticsView.css'
import { buildCsv, downloadText } from './csv'
import RiskDistribution from '@/components/analytics/RiskDistribution'
import EtaUrgencyTimeline from '@/components/analytics/EtaUrgencyTimeline'
import WindAtmosphericSummary from '@/components/analytics/WindAtmosphericSummary'
import MetricCorrelationStrip from '@/components/analytics/MetricCorrelationStrip'
import SourceBreakdown from '@/components/analytics/SourceBreakdown'
import WhatIfWeAct from '@/components/analytics/WhatIfWeAct'

type AnalyticsSection = 'all' | 'facilities' | 'airquality' | 'atmospheric'

export default function AnalyticsView() {
  const { rankedSites, aqi, exposedPopulation, setActiveTab, setFlyToLocation } = useAeris()
  const [activeSection, setActiveSection] = useState<AnalyticsSection>('all')
  const [hoveredBin, setHoveredBin] = useState<number | null>(null)
  const [hoveredStation, setHoveredStation] = useState<string | null>(null)
  const [showAllStations, setShowAllStations] = useState(false)

  const sites = useMemo(() => rankedSites?.sites ?? [], [rankedSites])
  const stations = useMemo(() => aqi?.stations ?? [], [aqi])

  // Top Metrics
  const meanDelta = useMemo(() => {
    if (!sites.length) return null
    const sum = sites.reduce((acc, s) => acc + s.pm25_delta_ugm3, 0)
    return Math.round((sum / sites.length) * 10) / 10
  }, [sites])

  const maxStationAqi = useMemo(() => {
    const valid = stations.filter(station => station.aqi != null)
    if (!valid.length) return { aqi: null, name: 'Unavailable' }
    let top = valid[0]
    for (const s of valid) {
      if (s.aqi! > top.aqi!) top = s
    }
    return { aqi: top.aqi!, name: top.name }
  }, [stations])

  const severeSiteCount = useMemo(() => {
    return sites.filter((s) => s.risk_score >= 0.65).length
  }, [sites])

  // Schools vs Hospitals split
  const schools = useMemo(() => sites.filter((s) => s.type === 'school'), [sites])
  const hospitals = useMemo(() => sites.filter((s) => s.type === 'hospital'), [sites])

  const schoolOccupancy = useMemo(() => {
    return schools.reduce((acc, s) => acc + (s.occupancy ?? 0), 0)
  }, [schools])

  const hospitalOccupancy = useMemo(() => {
    return hospitals.reduce((acc, s) => acc + (s.occupancy ?? 0), 0)
  }, [hospitals])

  // PM2.5 Delta Histogram Bins: [0-50, 50-100, 100-150, 150-200, >=200]
  const histogramBins = useMemo(() => {
    const bins = [
      { range: '0–50', min: 0, max: 50, schools: 0, hospitals: 0, total: 0 },
      { range: '50–100', min: 50, max: 100, schools: 0, hospitals: 0, total: 0 },
      { range: '100–150', min: 100, max: 150, schools: 0, hospitals: 0, total: 0 },
      { range: '150–200', min: 150, max: 200, schools: 0, hospitals: 0, total: 0 },
      { range: '≥200', min: 200, max: Infinity, schools: 0, hospitals: 0, total: 0 },
    ]

    sites.forEach((s) => {
      const b = bins.find((bin) => s.pm25_delta_ugm3 >= bin.min && s.pm25_delta_ugm3 < bin.max)
      if (b) {
        b.total++
        if (s.type === 'school') b.schools++
        else b.hospitals++
      }
    })

    return bins
  }, [sites])

  const maxBinCount = Math.max(1, ...histogramBins.map((b) => b.total))

  // District / Latitude Aggregation
  const districtGroups = useMemo(() => {
    const map = new Map<string, { count: number; maxDelta: number; totalOcc: number; vhCount: number }>()

    sites.forEach((s) => {
      let district = 'Latitude ≤29.3°N'
      if (s.lat > 31.0) district = 'Latitude >31°N'
      else if (s.lat > 30.5) district = 'Latitude (30.5,31]°N'
      else if (s.lat > 30.0) district = 'Latitude (30,30.5]°N'
      else if (s.lat > 29.3) district = 'Latitude (29.3,30]°N'

      const existing = map.get(district) ?? { count: 0, maxDelta: 0, totalOcc: 0, vhCount: 0 }
      existing.count++
      existing.maxDelta = Math.max(existing.maxDelta, s.pm25_delta_ugm3)
      existing.totalOcc += s.occupancy ?? 0
      if (s.risk_score >= 0.85) existing.vhCount++
      map.set(district, existing)
    })

    return Array.from(map.entries()).map(([district, data]) => ({
      district,
      ...data,
      pctAtRisk: data.count > 0 ? Math.round((data.vhCount / data.count) * 100) : 0,
    }))
  }, [sites])

  // Visible stations
  const visibleStations = useMemo(() => {
    return showAllStations ? stations : stations.slice(0, 10)
  }, [stations, showAllStations])

  // Export full analytics summary to CSV
  const exportAnalyticsCsv = () => {
    const headers = [
      'Facility Name',
      'Type',
      'Latitude',
      'Longitude',
      'Occupancy',
      'ETA (Hours)',
      'Delta PM2.5 (ug/m3)',
      'Risk Score',
      'Risk Category',
    ]
    const rows = sites.map((s) => [
      s.name,
      s.type,
      s.lat,
      s.lon,
      s.occupancy ?? 'N/A',
      s.eta_hours,
      s.pm25_delta_ugm3,
      s.risk_score.toFixed(3),
      riskLabel(getRiskLevel(s.risk_score)),
    ])
    downloadText(
      `AERIS_Modelled_Facility_Analysis_${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(headers, rows)
    )
  }

  return (
    <div className="analytics-view">
      {/* Header */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <Activity size={14} />
            <span>Statistical Modeling &amp; Risk Inference</span>
          </div>
          <h1 className="view-title">Environmental Risk &amp; Exposure Analytics</h1>
          <p className="view-subtitle">
            Modelled plume values at {sites.length} ranked facilities and separate ground-station observations. No historical model validation is established.
          </p>
        </div>

        <div className="view-actions">
          <button className="btn-secondary" onClick={exportAnalyticsCsv}>
            <FileSpreadsheet size={15} />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Section Sub-Navigation Tabs */}
      <div className="analytics-nav-strip" role="group" aria-label="Analytics Sections">
        <button
          type="button"
          className={`nav-tab-btn ${activeSection === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSection('all')}
        >
          <Layers size={14} />
          <span>Overview &amp; All Panels</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeSection === 'facilities' ? 'active' : ''}`}
          onClick={() => setActiveSection('facilities')}
        >
          <ShieldAlert size={14} />
          <span>Facilities &amp; Risk ({sites.length})</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeSection === 'airquality' ? 'active' : ''}`}
          onClick={() => setActiveSection('airquality')}
        >
          <Activity size={14} />
          <span>Air Quality &amp; Sources</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeSection === 'atmospheric' ? 'active' : ''}`}
          onClick={() => setActiveSection('atmospheric')}
        >
          <Wind size={14} />
          <span>Atmospheric &amp; Weather</span>
        </button>
      </div>

      {/* KPI Summary Cards (5-Card Grid) */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <span className="kpi-label">Mean Plume ΔPM2.5</span>
          <div className="kpi-val-row">
            <span className="kpi-val">{meanDelta == null ? 'Unavailable' : `+${meanDelta}`}</span>
            <span className="kpi-unit">µg/m³</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">Uncalibrated model increment; source attribution is provisional</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <span className="kpi-label">Peak Ground Station AQI</span>
          <div className="kpi-val-row">
            <span className="kpi-val danger">{maxStationAqi.aqi ?? 'Unavailable'}</span>
            <span className="kpi-unit">AQI</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">{maxStationAqi.name}; observation freshness must be checked separately</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <span className="kpi-label">High Heuristic Risk Receptors</span>
          <div className="kpi-val-row">
            <span className="kpi-val">{severeSiteCount}</span>
            <span className="kpi-unit">of {sites.length}</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">Facilities exceeding 0.65 composite risk</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <span className="kpi-label">Modelled Exposed Population</span>
          <div className="kpi-val-row">
            <span className="kpi-val">
              {exposedPopulation != null ? exposedPopulation.toLocaleString() : 'Unavailable'}
            </span>
            <span className="kpi-unit">receptors</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">
              {rankedSites?.exposed_population?.low != null
                ? `Bound: ${rankedSites.exposed_population.low.toLocaleString()} – ${rankedSites.exposed_population.high.toLocaleString()}`
                : 'Corridor estimate; uncalibrated census overlay'}
            </span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <span className="kpi-label">Historical Model Validation</span>
          <div className="kpi-val-row">
            <span className="kpi-val">Unavailable</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">No observed/model pairing or calibrated skill score is supplied</span>
          </div>
        </div>
      </div>

      {/* Signal Pipeline Correlation Strip */}
      {(activeSection === 'all' || activeSection === 'airquality') && (
        <MetricCorrelationStrip />
      )}

      {/* Section 1: Facilities & Receptor Risk Panels */}
      {(activeSection === 'all' || activeSection === 'facilities') && (
        <>
          <div className="analytics-two-col">
            <RiskDistribution />
            <EtaUrgencyTimeline />
          </div>

          <div className="analytics-two-col">
            {/* PM2.5 Histogram with Y-Axis */}
            <div className="analytics-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Modelled ΔPM2.5 across {sites.length} Facilities</h2>
                  <p className="panel-sub">Frequency of schools and hospitals categorized by simulated smoke delta.</p>
                </div>
              </div>

              <div className="histogram-container">
                <div className="histogram-chart-area">
                  {/* Y-Axis scale ticks */}
                  <div className="histogram-y-axis" aria-hidden="true">
                    <span>{maxBinCount}</span>
                    <span>{Math.round(maxBinCount * 0.75)}</span>
                    <span>{Math.round(maxBinCount * 0.5)}</span>
                    <span>{Math.round(maxBinCount * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* Bars & Gridlines */}
                  <div className="histogram-bars-wrapper">
                    <div className="hist-gridlines" aria-hidden="true">
                      <div className="hist-gridline" />
                      <div className="hist-gridline" />
                      <div className="hist-gridline" />
                      <div className="hist-gridline" />
                    </div>

                    <div className="histogram-bars">
                      {histogramBins.map((bin, i) => {
                        const heightPct = (bin.total / maxBinCount) * 100
                        const isHovered = hoveredBin === i

                        return (
                          <div
                            key={bin.range}
                            className={`hist-col ${isHovered ? 'active' : ''}`}
                            onMouseEnter={() => setHoveredBin(i)}
                            onMouseLeave={() => setHoveredBin(null)}
                          >
                            <div className="hist-bar-wrapper">
                              <div className="hist-bar-total" style={{ height: `${heightPct}%` }}>
                                <div
                                  className="hist-seg school-seg"
                                  style={{ height: `${bin.total > 0 ? (bin.schools / bin.total) * 100 : 0}%` }}
                                />
                                <div
                                  className="hist-seg hospital-seg"
                                  style={{ height: `${bin.total > 0 ? (bin.hospitals / bin.total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="hist-count">{bin.total}</span>
                            </div>
                            <span className="hist-label">{bin.range} µg/m³</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="histogram-legend">
                  <span className="legend-item"><span className="legend-box sch-box" /> Schools ({schools.length})</span>
                  <span className="legend-item"><span className="legend-box hosp-box" /> Hospitals ({hospitals.length})</span>
                </div>

                {hoveredBin !== null && (
                  <div className="hist-tooltip">
                    <strong>Bucket: {histogramBins[hoveredBin].range} µg/m³</strong> —{' '}
                    {histogramBins[hoveredBin].schools} Schools,{' '}
                    {histogramBins[hoveredBin].hospitals} Hospitals ({histogramBins[hoveredBin].total} total facilities)
                  </div>
                )}
              </div>
            </div>

            {/* Vulnerability Split Card */}
            <div className="analytics-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Receptor Vulnerability Breakdown</h2>
                  <p className="panel-sub">Reported facility capacity by type. Ages, attendance, patient cohorts, and measured exposure are unavailable.</p>
                </div>
              </div>

              <div className="vuln-grid">
                <div className="vuln-box school-box">
                  <div className="vuln-icon"><GraduationCap size={24} /></div>
                  <div className="vuln-info">
                    <span className="vuln-name">Primary &amp; Senior Secondary Schools</span>
                    <span className="vuln-stat">{schools.length} Facilities</span>
                    <span className="vuln-occ">{schoolOccupancy.toLocaleString()} known capacity · {schools.filter(site => site.occupancy == null).length} unknown</span>
                    <p className="vuln-desc">
                      Facility type does not establish individual ages or observed attendance.
                    </p>
                  </div>
                </div>

                <div className="vuln-box hospital-box">
                  <div className="vuln-icon"><Building2 size={24} /></div>
                  <div className="vuln-info">
                    <span className="vuln-name">Hospitals &amp; Healthcare Centers</span>
                    <span className="vuln-stat">{hospitals.length} Facilities</span>
                    <span className="vuln-occ">{hospitalOccupancy.toLocaleString()} known capacity · {hospitals.filter(site => site.occupancy == null).length} unknown</span>
                    <p className="vuln-desc">
                      Facility type does not establish patient demographics, occupied beds, or clinical exposure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latitude Band Table */}
          <div className="analytics-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Facilities by Latitude Band</h2>
                <p className="panel-sub">Display-only latitude groups; not administrative districts. Known capacities exclude missing occupancy.</p>
              </div>
            </div>

            <div
              className="district-table-wrapper"
              tabIndex={0}
              role="region"
              aria-label="Facilities by latitude band table; scroll with arrow keys"
            >
              <table className="district-table">
                <thead>
                  <tr>
                    <th scope="col">Latitude Band</th>
                    <th scope="col">Facilities</th>
                    <th scope="col">Max ΔPM2.5</th>
                    <th scope="col">Occupancy</th>
                    <th scope="col">% At Risk</th>
                    <th scope="col">Very High Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {districtGroups.map((d) => (
                    <tr key={d.district}>
                      <td className="zone-name"><strong>{d.district}</strong></td>
                      <td>{d.count}</td>
                      <td><span className="delta-badge">+{Math.round(d.maxDelta)} µg/m³</span></td>
                      <td>{d.totalOcc.toLocaleString()}</td>
                      <td>
                        <span className="pct-risk-tag" style={{ color: d.pctAtRisk > 25 ? 'var(--risk-critical)' : 'var(--text-secondary)' }}>
                          {d.pctAtRisk}%
                        </span>
                      </td>
                      <td>
                        <span className={`urgent-count ${d.vhCount > 0 ? 'alert' : ''}`}>
                          {d.vhCount} sites
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Section 2: Air Quality & Sources Panels */}
      {(activeSection === 'all' || activeSection === 'airquality') && (
        <div className="analytics-two-col">
          {/* Source Breakdown Interactive Donut */}
          <SourceBreakdown />

          {/* What If We Act Counterfactual Simulation */}
          <WhatIfWeAct />
        </div>
      )}

      {/* Section 3: Ground Stations & Weather / Atmospheric Panels */}
      {(activeSection === 'all' || activeSection === 'atmospheric' || activeSection === 'airquality') && (
        <div className="analytics-two-col">
          {/* Atmospheric Conditions */}
          <WindAtmosphericSummary />

          {/* Ground Station Observations */}
          <div className="analytics-panel">
            <div className="panel-header">
              <div className="header-with-toggle">
                <div>
                  <h2 className="panel-title">Ground Station Observations ({stations.length})</h2>
                  <p className="panel-sub">
                    Direct regulatory CPCB/DPCC monitoring stations; separate from plume dispersal.
                  </p>
                </div>
                {stations.length > 10 && (
                  <button
                    type="button"
                    className="btn-tiny-outline"
                    onClick={() => setShowAllStations(!showAllStations)}
                  >
                    {showAllStations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>{showAllStations ? 'Show Top 10' : `Show All (${stations.length})`}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="station-scatter-wrapper">
              <div className="station-pills-list">
                {visibleStations.map((st) => {
                  const aqiVal = st.aqi
                  const aqiClass = aqiVal == null ? '' : aqiVal > 400 ? 'badge-vh' : aqiVal > 300 ? 'badge-h' : 'badge-m'

                  return (
                    <button
                      type="button"
                      key={st.id}
                      className={`station-row ${hoveredStation === st.id ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredStation(st.id)}
                      onMouseLeave={() => setHoveredStation(null)}
                      onClick={() => {
                        setFlyToLocation({ lon: st.lon, lat: st.lat, zoom: 12, name: st.name })
                        setActiveTab('map')
                      }}
                    >
                      <div className="station-name-col">
                        <span className="st-name">{st.name}</span>
                        <span className="st-source">
                          {st.source} • {st.lat.toFixed(2)}°N, {st.lon.toFixed(2)}°E · observed {st.observed_at ?? 'time unavailable'}
                        </span>
                      </div>
                      <div className="station-val-col">
                        {st.aqi_category && (
                          <span className="st-cat-chip">{st.aqi_category}</span>
                        )}
                        <span className={`badge ${aqiClass}`}>AQI {st.aqi ?? 'N/A'}</span>
                        <span className="st-pm">PM2.5: {st.pm25 != null ? Math.round(st.pm25) : 'N/A'}</span>
                        {st.pm10 != null && (
                          <span className="st-pm10">PM10: {Math.round(st.pm10)}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
