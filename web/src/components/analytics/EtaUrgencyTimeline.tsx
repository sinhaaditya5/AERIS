import { useMemo, useState } from 'react'
import { Clock, Navigation, AlertTriangle } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import type { RankedSite } from '@/types/schemas'
import './EtaUrgencyTimeline.css'

interface EtaBucketDef {
  label: string
  sublabel: string
  min: number
  max: number
  color: string
}

const ETA_DEFS: EtaBucketDef[] = [
  { label: '< 2h', sublabel: 'Immediate', min: 0, max: 2, color: 'var(--risk-critical, #C92A2A)' },
  { label: '2 – 8h', sublabel: 'Near-term', min: 2, max: 8, color: 'var(--risk-high, #D4620A)' },
  { label: '8 – 24h', sublabel: 'Extended', min: 8, max: 24, color: 'var(--risk-caution, #B45309)' },
  { label: '≥ 24h', sublabel: 'Distal', min: 24, max: Infinity, color: 'var(--risk-ok, #166534)' },
]

export default function EtaUrgencyTimeline() {
  const { rankedSites, setActiveTab, setFlyToLocation } = useAeris()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const sites = useMemo(() => rankedSites?.sites ?? [], [rankedSites])

  const buckets = useMemo(() => {
    return ETA_DEFS.map(def => {
      const matched = sites.filter((s: RankedSite) => s.eta_hours >= def.min && s.eta_hours < def.max)
      const schools = matched.filter(s => s.type === 'school')
      const hospitals = matched.filter(s => s.type === 'hospital')
      return {
        ...def,
        total: matched.length,
        schools: schools.length,
        hospitals: hospitals.length,
        sites: matched,
      }
    })
  }, [sites])

  const maxBucketCount = useMemo(() => {
    return Math.max(1, ...buckets.map(b => b.total))
  }, [buckets])

  const criticalSites = buckets[0]?.sites ?? []

  const handleFlyTo = (site: RankedSite) => {
    setFlyToLocation({
      lon: site.lon,
      lat: site.lat,
      zoom: 13,
      name: site.name,
    })
    setActiveTab('map')
  }

  return (
    <div className="analytics-panel eta-urgency">
      <div className="panel-header">
        <div>
          <div className="eta-title-row">
            <h2 className="panel-title">Plume Arrival ETA Timeline</h2>
            {criticalSites.length > 0 && (
              <span className="eta-alert-pill" title="Facilities projected within 2 hours">
                <AlertTriangle size={12} />
                <span>{criticalSites.length} Urgent Receptors (&lt;2h)</span>
              </span>
            )}
          </div>
          <p className="panel-sub">
            Facilities grouped by simulated smoke plume arrival intervals from dominant sources.
          </p>
        </div>
      </div>

      {/* Bar Chart Grid */}
      <div className="eta-chart-container">
        <div className="eta-bars">
          {buckets.map((b, idx) => {
            const heightPct = (b.total / maxBucketCount) * 100
            const isHovered = hoveredIdx === idx

            return (
              <div
                key={b.label}
                className={`eta-bar-col ${isHovered ? 'active' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="eta-bar-wrapper">
                  <span className="eta-count">{b.total}</span>
                  <div
                    className="eta-bar-total"
                    style={{
                      height: `${heightPct}%`,
                      borderTop: `3px solid ${b.color}`,
                    }}
                  >
                    <div
                      className="eta-seg school-seg"
                      style={{ height: `${b.total > 0 ? (b.schools / b.total) * 100 : 0}%` }}
                      title={`Schools: ${b.schools}`}
                    />
                    <div
                      className="eta-seg hospital-seg"
                      style={{ height: `${b.total > 0 ? (b.hospitals / b.total) * 100 : 0}%` }}
                      title={`Hospitals: ${b.hospitals}`}
                    />
                  </div>
                </div>

                <div className="eta-bar-label-group">
                  <strong className="eta-label">{b.label}</strong>
                  <span className="eta-sublabel">{b.sublabel}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="eta-legend">
          <span className="legend-item"><span className="legend-box eta-sch-box" /> Schools</span>
          <span className="legend-item"><span className="legend-box eta-hosp-box" /> Hospitals</span>
        </div>

        {/* Hover inspection card */}
        {hoveredIdx !== null && buckets[hoveredIdx] && (
          <div className="eta-tooltip">
            <div className="eta-tooltip-head">
              <strong>{buckets[hoveredIdx].label} ({buckets[hoveredIdx].sublabel})</strong>
              <span>
                {buckets[hoveredIdx].schools} Schools · {buckets[hoveredIdx].hospitals} Hospitals
              </span>
            </div>
            {buckets[hoveredIdx].sites.length > 0 && (
              <ul className="eta-tooltip-list">
                {buckets[hoveredIdx].sites.slice(0, 4).map(site => (
                  <li key={site.site_id} className="eta-tooltip-item">
                    <span className="eta-tt-name">{site.name}</span>
                    <span className="eta-tt-meta">
                      +{Math.round(site.pm25_delta_ugm3)} µg/m³ · ETA {site.eta_hours.toFixed(1)}h
                    </span>
                    <button
                      type="button"
                      className="eta-tt-fly"
                      onClick={() => handleFlyTo(site)}
                      title="Inspect site on Map Explorer"
                    >
                      <Navigation size={11} />
                      <span>View</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {criticalSites.length > 0 && (
        <div className="eta-quick-action">
          <Clock size={14} className="eta-action-icon" />
          <span>Immediate action window (&lt;2h): prioritize air purifiers &amp; outdoor shelter directives.</span>
          <button
            type="button"
            className="btn-tiny"
            onClick={() => handleFlyTo(criticalSites[0])}
          >
            Locate First ({criticalSites[0].name.slice(0, 18)}...)
          </button>
        </div>
      )}

      <p className="eta-disclaimer">
        Arrival ETA represents straight-line transport velocity derived from modeled advection winds. Local turbulent mixing and building microclimates may alter true exposure onset.
      </p>
    </div>
  )
}

