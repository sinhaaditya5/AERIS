import { useMemo } from 'react'
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import { getRiskLevel } from '@/types/schemas'
import type { RankedSite } from '@/types/schemas'
import './RiskDistribution.css'

export default function RiskDistribution() {
  const { rankedSites } = useAeris()
  const sites = useMemo(() => rankedSites?.sites ?? [], [rankedSites])

  const tiers = useMemo(() => {
    const vh = sites.filter((s: RankedSite) => getRiskLevel(s.risk_score) === 'very-high')
    const h = sites.filter((s: RankedSite) => getRiskLevel(s.risk_score) === 'high')
    const m = sites.filter((s: RankedSite) => getRiskLevel(s.risk_score) === 'medium')
    const l = sites.filter((s: RankedSite) => getRiskLevel(s.risk_score) === 'low')

    const occ = (arr: RankedSite[]) => arr.reduce((acc, s) => acc + (s.occupancy ?? 0), 0)
    const total = sites.length || 1

    return [
      {
        id: 'very-high',
        label: 'Very High',
        range: 'Score ≥ 0.85',
        color: 'var(--risk-critical, #C92A2A)',
        bg: 'var(--risk-critical-bg, #FFF0F0)',
        count: vh.length,
        pct: (vh.length / total) * 100,
        occupancy: occ(vh),
        icon: ShieldAlert,
      },
      {
        id: 'high',
        label: 'High',
        range: '0.65 – 0.84',
        color: 'var(--risk-high, #D4620A)',
        bg: 'var(--risk-high-bg, #FFF4EC)',
        count: h.length,
        pct: (h.length / total) * 100,
        occupancy: occ(h),
        icon: AlertTriangle,
      },
      {
        id: 'medium',
        label: 'Medium',
        range: '0.40 – 0.64',
        color: 'var(--risk-caution, #B45309)',
        bg: 'var(--risk-caution-bg, #FFFBEB)',
        count: m.length,
        pct: (m.length / total) * 100,
        occupancy: occ(m),
        icon: AlertCircle,
      },
      {
        id: 'low',
        label: 'Low',
        range: '< 0.40',
        color: 'var(--risk-ok, #166534)',
        bg: 'var(--risk-ok-bg, #F0FDF4)',
        count: l.length,
        pct: (l.length / total) * 100,
        occupancy: occ(l),
        icon: CheckCircle,
      },
    ]
  }, [sites])

  if (!sites.length) {
    return (
      <div className="analytics-panel risk-distribution">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Risk Score Distribution</h2>
            <p className="panel-sub">Heuristic composite score across all ranked facilities</p>
          </div>
        </div>
        <p className="panel-sub" style={{ marginTop: '14px' }}>No facility data available.</p>
      </div>
    )
  }

  return (
    <div className="analytics-panel risk-distribution">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Facility Risk Score Distribution</h2>
          <p className="panel-sub">
            Composite heuristic classification across {sites.length} ranked institutions.
          </p>
        </div>
      </div>

      {/* Proportional Stacked Bar */}
      <div className="risk-dist-bar-wrap">
        <div className="risk-dist-bar" role="progressbar" aria-label="Risk score distribution meter">
          {tiers.map(t => (
            t.pct > 0 && (
              <div
                key={t.id}
                className={`risk-tier-seg seg-${t.id}`}
                style={{ width: `${t.pct}%`, background: t.color }}
                title={`${t.label}: ${t.count} facilities (${Math.round(t.pct)}%)`}
              />
            )
          ))}
        </div>
      </div>

      {/* Detail Table */}
      <div className="risk-table-wrap">
        <table className="risk-tier-table">
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Score Range</th>
              <th scope="col" style={{ textAlign: 'right' }}>Facilities</th>
              <th scope="col" style={{ textAlign: 'right' }}>Share</th>
              <th scope="col" style={{ textAlign: 'right' }}>Known Capacity</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(t => {
              const Icon = t.icon
              return (
                <tr key={t.id}>
                  <td>
                    <div className="tier-cell-name">
                      <span className="tier-dot" style={{ background: t.color }} />
                      <Icon size={14} style={{ color: t.color, flexShrink: 0 }} />
                      <strong>{t.label}</strong>
                    </div>
                  </td>
                  <td className="tier-range">{t.range}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.count}</td>
                  <td style={{ textAlign: 'right' }}>{Math.round(t.pct)}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {t.occupancy > 0 ? t.occupancy.toLocaleString() : '0'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="risk-dist-note">
        Composite risk score incorporates modelled ETA, ΔPM2.5 plume increment, and institution receptor vulnerability. It is a prioritization heuristic, not an epidemiological dose-response determination.
      </p>
    </div>
  )
}

