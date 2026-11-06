/**
 * MetricGrid — top 4 KPI cards row
 * Zero fabricated data: All metrics, badges, and sparklines are computed from real contracts.
 */
import { useAeris } from '@/services/dataContext'
import AqiKpiCard from './AqiKpiCard'
import './MetricGrid.css'

function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export default function MetricGrid() {
  const { sources, rankedSites, activeExposedPopulation, interventionScenario } = useAeris()

  const rawSources   = sources?.sources ?? []
  const sourceCount  = rawSources.length
  const siteCount    = rankedSites?.sites.length ?? 0

  // 1. Source Emitter metrics
  const totalFrp = rawSources.reduce((acc, s) => acc + s.total_frp_mw, 0)
  const sortedSources = [...rawSources].sort((a, b) => b.total_frp_mw - a.total_frp_mw)
  const topSource = sortedSources[0]
  const topFrpShare = totalFrp > 0 && topSource ? Math.round((topSource.total_frp_mw / totalFrp) * 100) : 0

  // 2. Population & Active Scenario metrics
  const exposure   = rankedSites?.exposed_population.data_available === false ? undefined : rankedSites?.exposed_population
  const exposedDisplay = activeExposedPopulation != null ? formatPopulation(activeExposedPopulation) : '—'

  const scenarioMeta = {
    none: {
      label: 'No Action',
      deltaText: exposure ? `Baseline (${formatPopulation(exposure.estimate)})` : 'Baseline',
      deltaClass: 'delta-up',
      tooltip: 'No intervention active. Showing baseline population within smoke plume footprint.',
    },
    partial: {
      label: 'Partial Intervene',
      deltaText: 'Assumed −35%',
      deltaClass: 'delta-down',
      tooltip: 'Assumed scenario multiplier: 35% reduction via schools and hospitals protective measures (not model output).',
    },
    full: {
      label: 'Full Intervene',
      deltaText: 'Assumed −55%',
      deltaClass: 'delta-down',
      tooltip: 'Assumed scenario multiplier: 55% reduction via comprehensive NCR-wide intervention (not model output).',
    },
  }[interventionScenario]

  // 3. Facility categorization
  const schoolsCount = rankedSites?.sites.filter(s => s.type === 'school').length ?? 0
  const hospCount    = rankedSites?.sites.filter(s => s.type === 'hospital').length ?? 0

  return (
    <div className="metric-grid">
      {/* 1. Active Pollution Sources */}
      <div className="metric-card card">
        <div className="metric-icon" style={{ background: 'var(--accent-surface, #E8F2EB)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #22734F)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 2C6 8 4 13 8 17c1.5 1.5 4 2 6 2" /><path d="M12 2c6 6 8 11 4 15-1.5 1.5-4 2-6 2" />
            <line x1="12" y1="2" x2="12" y2="10" />
          </svg>
        </div>
        <div className="metric-body">
          <span className="metric-label">Source Candidates</span>
          <div className="metric-value-row">
            <span className="metric-value">{sources ? sourceCount : '—'}</span>
            <span
              className="delta delta-up"
              title={topSource ? `Top source: ${topSource.district || topSource.type} contributes ${topFrpShare}% of total regional FRP (${topSource.total_frp_mw.toFixed(0)} MW)` : undefined}
            >
              {topSource ? `Top: ${topFrpShare}% FRP` : sources ? 'No candidates' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. People Potentially Exposed */}
      <div className="metric-card card">
        <div className="metric-icon" style={{ background: interventionScenario === 'none' ? 'var(--risk-critical-bg, #FEE8E8)' : 'var(--accent-surface, #E8F2EB)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={interventionScenario === 'none' ? 'var(--risk-critical, #C92A2A)' : 'var(--accent-primary, #22734F)'} strokeWidth="2.2" strokeLinecap="round">
            <circle cx="9" cy="7" r="3"/><path d="M3 21v-1a6 6 0 0 1 6-6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 21v-1a4.5 4.5 0 0 1 9 0v1"/>
          </svg>
        </div>
        <div className="metric-body">
          <span className="metric-label" title={exposure ? (exposure.method || `Threshold sensitivity range: ${formatPopulation(exposure.low)} – ${formatPopulation(exposure.high)}`) : 'No exposure estimate available'}>
            Population estimate · {scenarioMeta.label}
          </span>
          <div className="metric-value-row">
            <span className="metric-value">{exposedDisplay}</span>
            <span className={`delta ${scenarioMeta.deltaClass}`} title={scenarioMeta.tooltip}>
              {scenarioMeta.deltaText}
            </span>
          </div>
        </div>
      </div>

      {/* 3. High-Risk Locations */}
      <div className="metric-card card">
        <div className="metric-icon" style={{ background: 'var(--risk-high-bg, #FFF4EC)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--risk-high, #D4620A)" strokeWidth="2.2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6m-6 4h4m-4 4h3"/>
          </svg>
        </div>
        <div className="metric-body">
          <span className="metric-label">Ranked Critical Receptors</span>
          <div className="metric-value-row">
            <span className="metric-value">{rankedSites ? siteCount : '—'}</span>
            <span
              className="delta delta-up"
              style={{ background: 'var(--risk-caution-bg, #FFF4EC)', color: 'var(--risk-caution, #B45309)', border: 'var(--border-width, 1px) solid var(--risk-caution-border, #FDE68A)' }}
              title={`${schoolsCount} schools and ${hospCount} hospitals identified along modeled dispersion corridor`}
            >
              {schoolsCount > 0 ? `${schoolsCount} Sch · ${hospCount} Hosp` : 'Receptor Sites'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Air Quality Average */}
      <AqiKpiCard />
    </div>
  )
}
