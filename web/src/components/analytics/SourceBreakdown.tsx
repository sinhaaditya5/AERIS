/**
 * Source Breakdown — Dynamically computed from real VIIRS satellite cluster FRP in sources.json
 * Enhanced with interactive donut chart, proportional micro-meter legend, and executive intelligence ticker.
 */
import { useState } from 'react'
import { useAeris } from '@/services/dataContext'
import './SourceBreakdown.css'

interface Segment {
  label: string
  tierName?: string
  range?: string
  pct: number
  color: string
  count: number
  frpMw: number
}

function DonutChart({
  total,
  totalFrp,
  segments,
  activeSegment,
  setActiveSegment,
}: {
  total: number
  totalFrp: number
  segments: Segment[]
  activeSegment: Segment | null
  setActiveSegment: (s: Segment | null) => void
}) {
  const cx = 58, cy = 58, r = 40, stroke = 15
  const circumference = 2 * Math.PI * r

  return (
    <div className="donut-chart-wrap">
      <svg
        width="110"
        height="110"
        viewBox="0 0 116 116"
        aria-label="Source Intensity Donut Chart"
        className="donut-svg"
      >
        {/* Background track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(0, 0, 0, 0.05)"
          strokeWidth={stroke}
        />

        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference
          const offset = segments.slice(0, i).reduce((sum, prev) => sum + (prev.pct / 100) * circumference, 0)
          const gap = circumference - dash
          const isHovered = activeSegment?.label === seg.label

          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? stroke + 3 : stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              onMouseEnter={() => setActiveSegment(seg)}
              onMouseLeave={() => setActiveSegment(null)}
              className={`donut-segment ${isHovered ? 'active' : ''}`}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '58px 58px',
                cursor: 'pointer',
                transition: 'stroke-width 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
                opacity: activeSegment && !isHovered ? 0.35 : 1,
              }}
            />
          )
        })}

        {/* Dynamic Center Hub Readout */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={activeSegment ? "13" : "15"}
          fontWeight="800"
          fill={activeSegment ? activeSegment.color : "var(--text-primary, #1e2924)"}
          fontFamily="Outfit, var(--font, sans-serif)"
          className="donut-center-main"
        >
          {activeSegment ? `${activeSegment.frpMw} MW` : totalFrp > 0 ? `${Math.round(totalFrp)} MW` : total}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill="var(--text-tertiary, #6c8077)"
          fontFamily="Outfit, var(--font, sans-serif)"
          className="donut-center-sub"
        >
          {activeSegment ? `${Math.round(activeSegment.pct)}% · ${activeSegment.count} fires` : `${total} Hotspots`}
        </text>
      </svg>
    </div>
  )
}

export default function SourceBreakdown() {
  const { sources } = useAeris()
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null)
  const [viewMode, setViewMode] = useState<'frp' | 'scope'>('frp')

  const rawSources = sources?.sources ?? []
  const total = rawSources.length
  const totalFrp = rawSources.reduce((acc, s) => acc + s.total_frp_mw, 0)

  // Dynamic FRP emission tiers computed directly from NASA FIRMS cluster data
  const severe = rawSources.filter(s => s.total_frp_mw >= 200)
  const high = rawSources.filter(s => s.total_frp_mw >= 100 && s.total_frp_mw < 200)
  const moderate = rawSources.filter(s => s.total_frp_mw >= 50 && s.total_frp_mw < 100)
  const low = rawSources.filter(s => s.total_frp_mw < 50)

  // Territory grouping
  const indiaSources = rawSources.filter(s => s.territory === 'india')
  const transSources = rawSources.filter(s => s.territory === 'transboundary')
  const unknownSources = rawSources.filter(s => s.territory == null)

  const calcFrp = (arr: typeof rawSources) => arr.reduce((acc, s) => acc + s.total_frp_mw, 0)
  const share = (arr: typeof rawSources) => (totalFrp > 0 ? (calcFrp(arr) / totalFrp) * 100 : 0)

  const frpSegments: Segment[] = [
    {
      label: 'Severe (≥200 MW)',
      tierName: 'Severe',
      range: '≥200 MW',
      pct: share(severe),
      color: 'var(--risk-critical, #C92A2A)',
      count: severe.length,
      frpMw: Math.round(calcFrp(severe)),
    },
    {
      label: 'High (100–200 MW)',
      tierName: 'High',
      range: '100–200 MW',
      pct: share(high),
      color: 'var(--risk-high, #D4620A)',
      count: high.length,
      frpMw: Math.round(calcFrp(high)),
    },
    {
      label: 'Moderate (50–100 MW)',
      tierName: 'Moderate',
      range: '50–100 MW',
      pct: share(moderate),
      color: 'var(--risk-caution, #F59F00)',
      count: moderate.length,
      frpMw: Math.round(calcFrp(moderate)),
    },
    {
      label: 'Minor (<50 MW)',
      tierName: 'Minor',
      range: '<50 MW',
      pct: share(low),
      color: 'var(--risk-ok, #22734F)',
      count: low.length,
      frpMw: Math.round(calcFrp(low)),
    },
  ]

  const scopeSegments: Segment[] = [
    {
      label: 'Domestic',
      tierName: 'Domestic',
      pct: share(indiaSources),
      color: 'var(--risk-ok, #16A34A)',
      count: indiaSources.length,
      frpMw: Math.round(calcFrp(indiaSources)),
    },
    {
      label: 'Transboundary',
      tierName: 'Transboundary',
      pct: share(transSources),
      color: 'var(--risk-high, #D97706)',
      count: transSources.length,
      frpMw: Math.round(calcFrp(transSources)),
    },
    {
      label: 'Territory unavailable',
      tierName: 'Territory unavailable',
      pct: share(unknownSources),
      color: 'var(--text-tertiary, #64748B)',
      count: unknownSources.length,
      frpMw: Math.round(calcFrp(unknownSources)),
    },
  ]

  const segments = viewMode === 'frp' ? frpSegments : scopeSegments

  // Executive tactical insights
  const peakSource = rawSources.length > 0
    ? [...rawSources].sort((a, b) => b.total_frp_mw - a.total_frp_mw)[0]
    : null
  const domesticFrp = calcFrp(indiaSources)
  const domesticPct = totalFrp > 0 ? Math.round((domesticFrp / totalFrp) * 100) : 0
  const peakDistrict = peakSource?.district && peakSource.district !== 'Unassigned'
    ? peakSource.district
    : peakSource?.territory === 'transboundary'
      ? 'Cross-Border'
      : peakSource?.territory === 'india'
        ? 'Domestic'
        : null

  return (
    <div className="source-breakdown card">
      <div className="section-header source-breakdown-head">
        <div className="breakdown-title-group">
          <div className="breakdown-title-row">
            <h3 className="section-title">Source Intensity</h3>
            <span className="breakdown-tag">% Total FRP</span>
          </div>
          <span className="text-xs text-tertiary breakdown-sub">
            {totalFrp > 0 ? `Thermal emission share · ${Math.round(totalFrp)} MW total` : 'Satellite thermal emission'}
          </span>
        </div>
        <div className="breakdown-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${viewMode === 'frp' ? 'active' : ''}`}
            aria-pressed={viewMode === 'frp'}
            onClick={() => {
              setViewMode('frp')
              setActiveSegment(null)
            }}
            title="Group by Fire Radiative Power tiers"
          >
            FRP Tiers
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === 'scope' ? 'active' : ''}`}
            aria-pressed={viewMode === 'scope'}
            onClick={() => {
              setViewMode('scope')
              setActiveSegment(null)
            }}
            title="Group by Domestic vs Transboundary Influx"
          >
            Airshed Scope
          </button>
        </div>
      </div>

      {totalFrp === 0 && (
        <p className="panel-sub">
          {total === 0
            ? 'No source candidates available.'
            : 'Total FRP is zero; percentage shares are unavailable.'}
        </p>
      )}

      <div className="breakdown-body">
        <DonutChart
          total={total}
          totalFrp={totalFrp}
          segments={segments}
          activeSegment={activeSegment}
          setActiveSegment={setActiveSegment}
        />

        <ul className="breakdown-legend">
          {segments.map(seg => {
            const isHovered = activeSegment?.label === seg.label
            return (
              <li
                key={seg.label}
                className={`legend-row ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setActiveSegment(seg)}
                onMouseLeave={() => setActiveSegment(null)}
              >
                <div className="legend-row-header">
                  <div className="legend-identity">
                    <span className="legend-dot" style={{ background: seg.color }} />
                    <span className="legend-name">{seg.tierName || seg.label}</span>
                    {seg.range && <span className="legend-range-tag">{seg.range}</span>}
                    <span className="legend-count-chip">
                      {seg.count} {seg.count === 1 ? 'fire' : 'fires'}
                    </span>
                  </div>
                  <span className="legend-pct">
                    {totalFrp > 0 ? `${Math.round(seg.pct)}% FRP` : 'N/A'}
                  </span>
                </div>

                <div className="legend-meter-track" title={`${Math.round(seg.pct)}% FRP share`}>
                  <div
                    className="legend-meter-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, seg.pct))}%`,
                      background: seg.color,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {totalFrp > 0 && (
        <div className="source-breakdown-ticker">
          {peakSource && (
            <span className="ticker-chip" title={`Peak emitter ID: ${peakSource.id} (${Math.round(peakSource.total_frp_mw)} MW)`}>
              <span className="ticker-icon">⚡</span>
              <span className="ticker-label">Peak:</span>
              <strong className="ticker-val">{Math.round(peakSource.total_frp_mw)} MW</strong>
              {peakDistrict && <span className="ticker-badge">{peakDistrict}</span>}
            </span>
          )}
          <span className="ticker-divider" />
          <span className="ticker-chip" title="Airshed origin distribution">
            <span className="ticker-icon">{domesticPct > 0 ? '🇮🇳' : '🌐'}</span>
            <span className="ticker-label">Origin:</span>
            <strong className="ticker-val">{domesticPct > 0 ? `${domesticPct}% Domestic` : 'Cross-Border (100%)'}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
