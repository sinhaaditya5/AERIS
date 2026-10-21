/**
 * ChapterCard — Right-panel data card, one card per chapter.
 * All narration text produced by replayPure.ts — zero fabricated content.
 */
import { useMemo } from 'react'
import { useReplay } from './ReplayProvider'
import { useAeris } from '@/services/dataContext'
import {
  narrateSource, narrateMovement, narrateExposure, narrateAction,
  formatOccupancy, formatGenerator, formatEta,
  type ReplayChapter,
} from './replayPure'
import { getRiskLevel, riskLabel } from '@/types/schemas'

const CHAPTER_HEADINGS: Record<ReplayChapter, { icon: string; title: string }> = {
  source:   { icon: '🔥', title: 'Fire Source' },
  movement: { icon: '💨', title: 'Smoke Movement' },
  exposure: { icon: '🏥', title: 'Population Exposure' },
  action:   { icon: '🛡️', title: 'Protective Actions' },
}

export default function ChapterCard() {
  const { chapter, sources, corridor, rankedSites, actions, wind } = useReplay()
  const { setActiveTab } = useAeris()

  const heading = CHAPTER_HEADINGS[chapter]

  // ── SOURCE ────────────────────────────────────────────────────────────────
  const sourceCard = useMemo(() => {
    if (!sources) return null
    const total = sources.sources.reduce((a, s) => a + s.fire_count, 0)
    const frp   = sources.sources.reduce((a, s) => a + s.total_frp_mw, 0)
    const types = [...new Set(sources.sources.map(s => s.type.replace(/_/g, ' ')))].join(', ')
    return { total, frp: Math.round(frp), types, count: sources.sources.length }
  }, [sources])

  // ── MOVEMENT ──────────────────────────────────────────────────────────────
  const movementCard = useMemo(() => {
    const sample = wind?.points.find(p => p.hours.length > 0)?.hours[0]
    const bands  = corridor?.features.filter(f => (f.properties as any)?.kind === 'band') ?? []
    const hours  = [...new Set(bands.map(b => (b.properties as any)?.hour_to))]
    const maxHr  = hours.length ? Math.max(...hours.filter(Number.isFinite)) : null
    return {
      speedKmh:  sample ? Math.round(sample.speed_ms * 3.6) : null,
      dirDeg:    sample?.dir_from_deg ?? null,
      bandCount: bands.length,
      maxHorizon: maxHr,
    }
  }, [wind, corridor])

  // ── EXPOSURE ──────────────────────────────────────────────────────────────
  const exposureCard = useMemo(() => {
    const top3 = rankedSites?.sites.slice(0, 3) ?? []
    return {
      pop:   rankedSites?.exposed_population,
      top3,
      total: rankedSites?.sites.length ?? 0,
    }
  }, [rankedSites])

  // ── ACTION ────────────────────────────────────────────────────────────────
  const actionCard = useMemo(() => {
    if (!actions) return null
    const minDeadline = actions.actions.length
      ? Math.min(...actions.actions.map(a => a.deadline_hours))
      : null
    const authorityCount = actions.authority_actions?.length ?? 0
    return {
      count:    actions.actions.length,
      siteCount: [...new Set(actions.actions.map(a => a.site_id))].length,
      gen:      formatGenerator(actions.generator),
      deadline: minDeadline,
      authority: authorityCount,
      top3actions: actions.actions.slice(0, 3),
    }
  }, [actions])

  return (
    <article
      className="replay-chapter-card"
      id={`replay-panel-${chapter}`}
      role="tabpanel"
      aria-labelledby={`replay-chapter-${chapter}`}
    >
      {/* Header */}
      <div className="replay-card-header">
        <span className="replay-card-icon" aria-hidden="true">{heading.icon}</span>
        <h2 className="replay-card-title">{heading.title}</h2>
      </div>

      {/* Narration */}
      <p className="replay-card-narration">
        {chapter === 'source'   && narrateSource(sources)}
        {chapter === 'movement' && narrateMovement(corridor, wind, rankedSites)}
        {chapter === 'exposure' && narrateExposure(rankedSites)}
        {chapter === 'action'   && narrateAction(actions)}
      </p>

      {/* ── Source KPIs ── */}
      {chapter === 'source' && sourceCard && (
        <div className="replay-kpi-grid">
          <div className="replay-kpi">
            <span className="replay-kpi-value">{sourceCard.total.toLocaleString()}</span>
            <span className="replay-kpi-label">Active fires</span>
          </div>
          <div className="replay-kpi">
            <span className="replay-kpi-value">{sourceCard.frp}</span>
            <span className="replay-kpi-label">Combined FRP (MW)</span>
          </div>
          <div className="replay-kpi">
            <span className="replay-kpi-value">{sourceCard.count}</span>
            <span className="replay-kpi-label">Detected clusters</span>
          </div>
        </div>
      )}
      {chapter === 'source' && (
        <div className="replay-card-footer">
          <button
            type="button"
            className="replay-deep-link-btn"
            onClick={() => setActiveTab('sources')}
          >
            Open in Fire Sources →
          </button>
        </div>
      )}

      {/* ── Movement KPIs ── */}
      {chapter === 'movement' && (
        <div className="replay-kpi-grid">
          <div className="replay-kpi">
            <span className="replay-kpi-value">
              {movementCard.speedKmh != null ? `${movementCard.speedKmh}` : '—'}
            </span>
            <span className="replay-kpi-label">Transport speed (km/h)</span>
          </div>
          <div className="replay-kpi">
            <span className="replay-kpi-value">{movementCard.bandCount}</span>
            <span className="replay-kpi-label">Modelled bands</span>
          </div>
          {movementCard.maxHorizon != null && (
            <div className="replay-kpi">
              <span className="replay-kpi-value">T+{movementCard.maxHorizon}h</span>
              <span className="replay-kpi-label">Forecast horizon</span>
            </div>
          )}
        </div>
      )}
      {chapter === 'movement' && (
        <div className="replay-card-footer">
          <button
            type="button"
            className="replay-deep-link-btn"
            onClick={() => setActiveTab('wind')}
          >
            Open in Wind &amp; Weather →
          </button>
        </div>
      )}

      {/* ── Exposure KPIs ── */}
      {chapter === 'exposure' && (
        <>
          <div className="replay-kpi-grid">
            <div className="replay-kpi">
              <span className="replay-kpi-value">
                {exposureCard.pop?.data_available !== false
                  ? (exposureCard.pop?.estimate ?? 0).toLocaleString()
                  : '—'}
              </span>
              <span className="replay-kpi-label">Modelled exposed population</span>
            </div>
            <div className="replay-kpi">
              <span className="replay-kpi-value">{exposureCard.total}</span>
              <span className="replay-kpi-label">Sensitive facilities</span>
            </div>
          </div>

          {exposureCard.top3.length > 0 && (
            <ul className="replay-site-list" aria-label="Top-3 highest-risk sites">
              {exposureCard.top3.map(site => {
                const lvl = getRiskLevel(site.risk_score)
                return (
                  <li key={site.site_id} className="replay-site-row">
                    <span className="replay-site-icon">
                      {site.type === 'hospital' ? '🏥' : '🏫'}
                    </span>
                    <div className="replay-site-info">
                      <span className="replay-site-name">{site.name}</span>
                      <span className="replay-site-meta">
                        ETA {formatEta(site.eta_hours)}
                        {' · '}
                        Occupancy: {formatOccupancy(site.occupancy)}
                        {' · '}
                        PM2.5 +{site.pm25_delta_ugm3.toFixed(0)} µg/m³
                      </span>
                    </div>
                    <span className={`badge badge-${lvl === 'very-high' ? 'vh' : lvl === 'high' ? 'h' : lvl === 'medium' ? 'm' : 'l'}`}>
                      {riskLabel(lvl)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="replay-card-footer">
            <button
              type="button"
              className="replay-deep-link-btn"
              onClick={() => setActiveTab('population')}
            >
              Open in Population Risk →
            </button>
          </div>
        </>
      )}

      {/* ── Action KPIs ── */}
      {chapter === 'action' && actionCard && (
        <>
          <div className="replay-kpi-grid">
            <div className="replay-kpi">
              <span className="replay-kpi-value">{actionCard.count}</span>
              <span className="replay-kpi-label">Site actions</span>
            </div>
            <div className="replay-kpi">
              <span className="replay-kpi-value">{actionCard.siteCount}</span>
              <span className="replay-kpi-label">Facilities covered</span>
            </div>
            {actionCard.deadline != null && (
              <div className="replay-kpi">
                <span className="replay-kpi-value">{formatEta(actionCard.deadline)}</span>
                <span className="replay-kpi-label">Earliest deadline</span>
              </div>
            )}
          </div>

          <div className="replay-generator-badge">
            Generator: <strong>{actionCard.gen}</strong>
          </div>

          {actionCard.top3actions.length > 0 && (
            <ul className="replay-action-list" aria-label="Sample protective actions">
              {actionCard.top3actions.map(a => (
                <li key={`${a.site_id}-${a.priority}`} className="replay-action-row">
                  <span className="replay-action-priority">#{a.priority}</span>
                  <div className="replay-action-info">
                    <span className="replay-action-who">{a.who}</span>
                    <span className="replay-action-desc">{a.action}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="replay-card-footer">
            <button
              type="button"
              className="replay-deep-link-btn"
              onClick={() => setActiveTab('shield')}
            >
              Open in Protective Actions →
            </button>
          </div>
        </>
      )}
    </article>
  )
}
