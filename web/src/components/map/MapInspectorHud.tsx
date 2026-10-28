import { useEffect, useRef } from 'react'
import { X, Focus, ExternalLink, ShieldAlert, CheckCircle, Navigation } from 'lucide-react'
import { getRiskLevel, riskBadgeClass, riskLabel, type SiteAction, type RankedSite, type Source } from '@/types/schemas'
import './MapInspectorHud.css'

export type InspectorTarget =
  | {
      type: 'site'
      site: RankedSite
      actionDirective?: SiteAction
    }
  | {
      type: 'source'
      source: Source
      isPeak?: boolean
    }
  | {
      type: 'waypoint'
      eta: number
    }

interface Props {
  target: InspectorTarget
  onClose: () => void
  onFocus: () => void
  onOpenActionsModal?: () => void
  onOpenFullMap?: () => void
}

export default function MapInspectorHud({
  target,
  onClose,
  onFocus,
  onOpenActionsModal,
  onOpenFullMap,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation: Escape key closes the inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (target.type === 'site') {
    const { site, actionDirective } = target
    const isSchool = site.type === 'school'
    const riskLvl = getRiskLevel(site.risk_score)
    const label = riskLabel(riskLvl)
    const badgeClass = riskBadgeClass(riskLvl)
    const occupancyText = site.occupancy != null
      ? `${site.occupancy.toLocaleString()} capacity`
      : 'Capacity unrecorded'

    return (
      <aside
        ref={panelRef}
        className="map-inspector-hud site-mode"
        role="dialog"
        aria-label={`Facility telemetry for ${site.name}`}
      >
        <div className="inspector-header">
          <div className="inspector-title-row">
            <span className="inspector-type-badge">
              {isSchool ? '🏫 School' : '🏥 Hospital'}
            </span>
            <span className={badgeClass} title="Heuristic relative risk tier">
              {label} ({site.risk_score.toFixed(2)})
            </span>
          </div>
          <button
            type="button"
            className="inspector-close-btn"
            onClick={onClose}
            title="Close facility inspector (Esc)"
            aria-label="Close facility inspector"
          >
            <X size={13} />
          </button>
        </div>

        <div className="inspector-name-section">
          <h3 className="inspector-facility-name">{site.name}</h3>
          <div className="inspector-subtext">
            <span>#{site.site_id}</span>
            <span>&bull;</span>
            <span>{site.lat.toFixed(3)}°N, {site.lon.toFixed(3)}°E</span>
          </div>
        </div>

        <div className="inspector-metrics-grid">
          <div className="inspector-metric-card" title="Forecast-relative arrival at receptor">
            <span className="metric-label">Model ETA</span>
            <strong className="metric-val">~{site.eta_hours.toFixed(1)}h</strong>
          </div>
          <div className="inspector-metric-card" title="Modelled peak PM2.5 delta">
            <span className="metric-label">PM2.5 Delta</span>
            <strong className="metric-val">+{site.pm25_delta_ugm3.toFixed(0)} µg/m³</strong>
          </div>
          <div className="inspector-metric-card" title="Receptor population / capacity">
            <span className="metric-label">Occupancy</span>
            <strong className="metric-val">{occupancyText}</strong>
          </div>
          <div className="inspector-metric-card" title="Relative risk score">
            <span className="metric-label">Risk Score</span>
            <strong className="metric-val">{site.risk_score.toFixed(2)}</strong>
          </div>
        </div>

        {actionDirective ? (
          <div className="inspector-directive-card">
            <div className="directive-header">
              <ShieldAlert size={12} className="directive-icon" />
              <strong className="directive-priority-tag">
                Priority #{actionDirective.priority} Mitigation
              </strong>
              <span className="directive-deadline-pill">
                Deadline: ~{actionDirective.deadline_hours.toFixed(1)}h
              </span>
            </div>
            <div className="directive-who">
              <strong>Mandated:</strong> {actionDirective.who}
            </div>
            <p className="directive-action">{actionDirective.action}</p>
            <div className="directive-reason text-xs">
              <strong>Basis:</strong> {actionDirective.reason}
            </div>
          </div>
        ) : (
          <div className="inspector-notice">
            <CheckCircle size={11} className="notice-icon" />
            <span>Standard precautionary advisory. General city-level protocols apply.</span>
          </div>
        )}

        <div className="inspector-actions-row">
          <button
            type="button"
            className="inspector-btn primary"
            onClick={onFocus}
            title="Center and zoom to this facility"
          >
            <Focus size={11} />
            <span>Focus Site</span>
          </button>

          {onOpenActionsModal && (
            <button
              type="button"
              className="inspector-btn secondary"
              onClick={onOpenActionsModal}
              title="Open full actionable mitigation plan checklist"
            >
              <span>Action Plan</span>
            </button>
          )}

          {onOpenFullMap && (
            <button
              type="button"
              className="inspector-btn tertiary"
              onClick={onOpenFullMap}
              title="Open full GIS map explorer"
            >
              <ExternalLink size={10} />
              <span>Full Map</span>
            </button>
          )}
        </div>
      </aside>
    )
  }

  if (target.type === 'source') {
    const { source, isPeak } = target
    const isTransboundary = source.territory === 'transboundary'
    const territoryLabel = isTransboundary
      ? '🌐 Regional (Transboundary)'
      : source.territory === 'india'
        ? '🇮🇳 India (Punjab/Haryana)'
        : 'Territory unrecorded'

    return (
      <aside
        ref={panelRef}
        className="map-inspector-hud source-mode"
        role="dialog"
        aria-label={`Fire cluster details for ${source.id}`}
      >
        <div className="inspector-header">
          <div className="inspector-title-row">
            <span className="inspector-type-badge source-badge">
              🔥 Fire Cluster
            </span>
            {isPeak && (
              <span className="hud-peak-pill" title="Highest thermal energy emission cluster">
                ⚡ PEAK EMITTER
              </span>
            )}
          </div>
          <button
            type="button"
            className="inspector-close-btn"
            onClick={onClose}
            title="Close source inspector (Esc)"
            aria-label="Close source inspector"
          >
            <X size={13} />
          </button>
        </div>

        <div className="inspector-name-section">
          <h3 className="inspector-facility-name">Source Cluster #{source.id}</h3>
          <div className="inspector-subtext">
            <span>{territoryLabel}</span>
            <span>&bull;</span>
            <span>{source.lat.toFixed(3)}°N, {source.lon.toFixed(3)}°E</span>
          </div>
        </div>

        <div className="inspector-metrics-grid">
          <div className="inspector-metric-card" title="Satellite Fire Radiative Power (MW)">
            <span className="metric-label">Thermal FRP</span>
            <strong className="metric-val">{source.total_frp_mw.toFixed(0)} MW</strong>
          </div>
          <div className="inspector-metric-card" title="Thermal anomaly count">
            <span className="metric-label">Active Fires</span>
            <strong className="metric-val">{source.fire_count}</strong>
          </div>
          <div className="inspector-metric-card" title="Heuristic candidate confidence">
            <span className="metric-label">Confidence</span>
            <strong className="metric-val">{(source.confidence * 100).toFixed(0)}%</strong>
          </div>
          <div className="inspector-metric-card" title="Relative emission strength">
            <span className="metric-label">Strength</span>
            <strong className="metric-val">{(source.emission_strength * 100).toFixed(0)}%</strong>
          </div>
        </div>

        <div className="inspector-notice source-notice">
          <Navigation size={11} className="notice-icon" />
          <span>Biomass combustion candidate. Plume forward trajectory modeled downwind.</span>
        </div>

        <div className="inspector-actions-row">
          <button
            type="button"
            className="inspector-btn primary"
            onClick={onFocus}
            title="Center and zoom to this fire cluster"
          >
            <Focus size={11} />
            <span>Focus Emitter</span>
          </button>
          {onOpenFullMap && (
            <button
              type="button"
              className="inspector-btn tertiary"
              onClick={onOpenFullMap}
              title="Open full GIS map explorer"
            >
              <ExternalLink size={10} />
              <span>Full Map</span>
            </button>
          )}
        </div>
      </aside>
    )
  }

  // Waypoint mode
  return (
    <aside
      ref={panelRef}
      className="map-inspector-hud waypoint-mode"
      role="dialog"
      aria-label={`Trajectory waypoint at +${target.eta}h`}
    >
      <div className="inspector-header">
        <span className="inspector-type-badge waypoint-badge">
          ⏱️ Corridor Waypoint
        </span>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={onClose}
          title="Close waypoint inspector (Esc)"
          aria-label="Close waypoint inspector"
        >
          <X size={13} />
        </button>
      </div>
      <div className="inspector-name-section">
        <h3 className="inspector-facility-name">T+{target.eta} Hours Trajectory Milestone</h3>
        <p className="inspector-subtext">Estimated atmospheric transport arrival along dispersion centerline.</p>
      </div>
      <div className="inspector-actions-row">
        <button
          type="button"
          className="inspector-btn primary"
          onClick={onFocus}
          title="Recenter view"
        >
          <Focus size={11} />
          <span>Center Airshed</span>
        </button>
      </div>
    </aside>
  )
}
