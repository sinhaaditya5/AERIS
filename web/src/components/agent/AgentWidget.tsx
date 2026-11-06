import { useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, Flame, ShieldAlert, Users, Zap } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import './AgentWidget.css'
import { advisoryDeadline } from './advisoryEvidence'

function formatPopK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export default function AgentWidget() {
  const { actions, sources, rankedSites, etaHours, setShowActionsModal, setShowNotesDrawer, setNotesDrawerSection } = useAeris()

  // Compute stats from real contracts
  // No data -> '—'; never a placeholder number
  const totalFires = sources?.sources.reduce((acc, s) => acc + s.fire_count, 0)
  const totalFrp   = sources?.sources.reduce((acc, s) => acc + s.total_frp_mw, 0)
  const exposure   = rankedSites?.exposed_population.data_available === false ? undefined : rankedSites?.exposed_population
  const etaVal     = etaHours != null ? (etaHours <= 0 ? 'Over receptors at forecast start' : `~${etaHours.toFixed(1)}h`) : '—'

  const topActions = actions?.actions.slice(0, 3) ?? []

  return (
    <div className="agent-card card">
      {/* Header */}
      <div className="agent-header">
        <div className="agent-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="8" r="3"/>
            <path d="M6 20v-1a6 6 0 0 1 12 0v1"/>
            <path d="M12 14v2m-2 2h4"/>
          </svg>
        </div>
        <div className="agent-title-group">
          <span className="agent-title">AERIS Agent</span>
          <span className="agent-status">Generated advisory</span>
        </div>
      </div>

      {/* Headline & 2-line Clamped Summary with Full Briefing Link */}
      <div className="agent-headline-block">
        <h4 className="agent-headline">Model-informed Recommendations</h4>
        {actions?.summary && (
          <div className="agent-briefing-block">
            <p className="briefing-clamped-text">{actions.summary}</p>
            <button
              type="button"
              className="briefing-drawer-trigger-btn"
              onClick={() => {
                setNotesDrawerSection('agent')
                setShowNotesDrawer(true)
              }}
              title="Open scientific limitations, model provenance and full advisory briefing"
            >
              <span>Read full briefing</span>
              <ArrowRight size={11} />
            </button>
          </div>
        )}
        <div className="agent-chips-grid">
          <span className="agent-chip" title="Fire detections represented by source candidates">
            <Flame size={11} color="#DC2626" />
            <strong>{totalFires ?? '—'}</strong> Fires
          </span>
          <span className="agent-chip" title="Total Fire Radiative Power (MW)">
            <Zap size={11} color="#EA580C" />
            <strong>{totalFrp != null ? Math.round(totalFrp) : '—'}</strong> MW FRP
          </span>
          <span className="agent-chip highlight" title="Model-relative ETA from the ranked snapshot; not a live countdown">
            ⏱️ ETA <strong>{etaVal}</strong>
          </span>
          <span
            className="agent-chip pop"
            title={exposure ? (exposure.method || `Exposed population estimate: ${exposure.estimate.toLocaleString()} (Threshold sensitivity range: ${exposure.low.toLocaleString()} – ${exposure.high.toLocaleString()})`) : 'No exposure estimate available'}
          >
            <Users size={11} color="#C92A2A" />
            {exposure ? <><strong>{formatPopK(exposure.estimate)}</strong> ({formatPopK(exposure.low)}–{formatPopK(exposure.high)})</> : <strong>—</strong>}
          </span>
        </div>
      </div>

      {/* Top 3 Prioritized Directives */}
      <div className="agent-top-directives">
        <div className="directives-header">
          <span className="directives-title">Suggested Actions (Top 3)</span>
          <span className="directives-count">{actions?.actions.length ?? 0} Recommendations</span>
        </div>
        <ul className="directives-list" tabIndex={0} aria-label="Suggested actions">
          {topActions.map((act) => {
            // Extract facility name from who
            const target = act.who.split(',')[1]?.trim() || act.who.split(',')[0]?.trim() || act.site_id
            return (
              <li key={act.site_id} className="directive-item">
                <span className="dir-priority">#{act.priority}</span>
                <div className="dir-content">
                  <div className="dir-title-row">
                    <span className="dir-target">{target}</span>
                    <span className="dir-deadline" title={advisoryDeadline(actions, act.deadline_hours)}>⏱ {act.deadline_hours}h scheduling</span>
                  </div>
                  <p className="dir-action">{act.action}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* CTA */}
      <button
        className="btn-primary agent-cta"
        onClick={() => setShowActionsModal(true)}
        type="button"
      >
        <ShieldAlert size={14} />
        View All Recommendations
        <ArrowRight size={14} />
      </button>
    </div>
  )
}
