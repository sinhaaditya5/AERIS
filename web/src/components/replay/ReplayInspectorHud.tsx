import { useEffect } from 'react'
import { X, Focus, ShieldAlert, CheckCircle, Navigation } from 'lucide-react'
import { getRiskLevel, riskBadgeClass, riskLabel, type RankedSite, type Source, type SiteAction } from '@/types/schemas'
import './ReplayInspectorHud.css'

export type ReplayInspectorTarget =
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
  target: ReplayInspectorTarget
  currentTHours: number
  onClose: () => void
  onFocus: () => void
}

export default function ReplayInspectorHud({ target, currentTHours, onClose, onFocus }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
    const hasArrived = currentTHours >= site.eta_hours
    const hoursRemaining = Math.max(0, site.eta_hours - currentTHours)

    return (
      <aside
        className="replay-inspector-hud site-target"
        role="dialog"
        aria-label={`Facility inspection for ${site.name}`}
      >
        <div className="r-hud-header">
          <div className="r-hud-title-row">
            <span className="r-hud-type-badge">
              {isSchool ? '🏫 School' : '🏥 Hospital'}
            </span>
            <span className={badgeClass}>{label}</span>
          </div>
          <button
            type="button"
            className="r-hud-close-btn"
            onClick={onClose}
            title="Close inspector (Esc)"
            aria-label="Close inspector"
          >
            <X size={12} />
          </button>
        </div>

        <div className="r-hud-name-block">
          <h4 className="r-hud-name">{site.name}</h4>
          <span className="r-hud-coords">
            {site.lat.toFixed(3)}°N, {site.lon.toFixed(3)}°E &bull; #{site.site_id}
          </span>
        </div>

        {/* Dynamic Replay Arrival Status Banner */}
        <div className={`r-hud-arrival-status ${hasArrived ? 'arrived' : 'en-route'}`}>
          {hasArrived ? (
            <span>🚨 <strong>Smoke Front Reached</strong> (T+{site.eta_hours.toFixed(1)}h arrival)</span>
          ) : (
            <span>⏳ <strong>Approaching</strong> &bull; Arrival in ~{hoursRemaining.toFixed(1)}h</span>
          )}
        </div>

        <div className="r-hud-metrics-row">
          <div className="r-metric-pill">
            <span className="m-lbl">Model ETA</span>
            <span className="m-val">~{site.eta_hours.toFixed(1)}h</span>
          </div>
          <div className="r-metric-pill">
            <span className="m-lbl">PM2.5 Delta</span>
            <span className="m-val">+{site.pm25_delta_ugm3.toFixed(0)} µg/m³</span>
          </div>
          <div className="r-metric-pill">
            <span className="m-lbl">Risk Score</span>
            <span className="m-val">{site.risk_score.toFixed(2)}</span>
          </div>
        </div>

        {actionDirective && (
          <div className="r-hud-directive">
            <div className="r-directive-header">
              <ShieldAlert size={11} className="r-directive-icon" />
              <strong>Priority #{actionDirective.priority} Mitigation Directive</strong>
            </div>
            <p className="r-directive-text">{actionDirective.action}</p>
            <div className="r-directive-meta">
              <span>Mandated: {actionDirective.who}</span>
              <span>Deadline: ~{actionDirective.deadline_hours.toFixed(1)}h</span>
            </div>
          </div>
        )}

        <div className="r-hud-footer">
          <button
            type="button"
            className="r-hud-btn focus-btn"
            onClick={onFocus}
            title="Recenter camera on this receptor"
          >
            <Focus size={11} />
            <span>Focus Receptor</span>
          </button>
        </div>
      </aside>
    )
  }

  if (target.type === 'source') {
    const { source, isPeak } = target
    const isTransboundary = source.territory === 'transboundary'
    const territoryLabel = isTransboundary
      ? '🌐 Regional (Transboundary)'
      : '🇮🇳 India (Punjab/Haryana)'

    return (
      <aside
        className="replay-inspector-hud source-target"
        role="dialog"
        aria-label={`Fire cluster details for ${source.id}`}
      >
        <div className="r-hud-header">
          <div className="r-hud-title-row">
            <span className="r-hud-type-badge source-badge">🔥 Fire Cluster</span>
            {isPeak && <span className="r-hud-peak-badge">⚡ PEAK EMITTER</span>}
          </div>
          <button
            type="button"
            className="r-hud-close-btn"
            onClick={onClose}
            title="Close inspector (Esc)"
            aria-label="Close inspector"
          >
            <X size={12} />
          </button>
        </div>

        <div className="r-hud-name-block">
          <h4 className="r-hud-name">Cluster #{source.id}</h4>
          <span className="r-hud-coords">{territoryLabel} &bull; {source.lat.toFixed(3)}°N, {source.lon.toFixed(3)}°E</span>
        </div>

        <div className="r-hud-metrics-row">
          <div className="r-metric-pill">
            <span className="m-lbl">Thermal FRP</span>
            <span className="m-val">{source.total_frp_mw.toFixed(0)} MW</span>
          </div>
          <div className="r-metric-pill">
            <span className="m-lbl">Active Fires</span>
            <span className="m-val">{source.fire_count}</span>
          </div>
          <div className="r-metric-pill">
            <span className="m-lbl">Confidence</span>
            <span className="m-val">{(source.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="r-hud-footer">
          <button
            type="button"
            className="r-hud-btn focus-btn"
            onClick={onFocus}
            title="Recenter camera on this fire cluster"
          >
            <Focus size={11} />
            <span>Focus Emitter</span>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="replay-inspector-hud waypoint-target"
      role="dialog"
      aria-label={`Milestone waypoint at +${target.eta}h`}
    >
      <div className="r-hud-header">
        <span className="r-hud-type-badge waypoint-badge">⏱️ Corridor Waypoint</span>
        <button
          type="button"
          className="r-hud-close-btn"
          onClick={onClose}
          title="Close inspector (Esc)"
          aria-label="Close inspector"
        >
          <X size={12} />
        </button>
      </div>
      <div className="r-hud-name-block">
        <h4 className="r-hud-name">T+{target.eta} Hours Transport Milestone</h4>
        <span className="r-hud-coords">Centerline trajectory marker</span>
      </div>
      <div className="r-hud-footer">
        <button
          type="button"
          className="r-hud-btn focus-btn"
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
