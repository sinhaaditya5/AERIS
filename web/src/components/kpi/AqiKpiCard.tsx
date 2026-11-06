/**
 * AqiKpiCard — real regional average AQI from OpenAQ / CPCB stations
 */
import { useAeris } from '@/services/dataContext'
import { getFeedFreshness } from '@/services/api'
import { useClock } from '@/components/status/useClock'

function aqiCategory(val: number): string {
  if (val <= 50) return 'Good'
  if (val <= 100) return 'Satisfactory'
  if (val <= 200) return 'Moderate'
  if (val <= 300) return 'Poor'
  if (val <= 400) return 'Very Poor'
  return 'Severe'
}

function aqiCategoryColor(val: number): string {
  if (val <= 50) return 'var(--risk-ok, #15803D)'
  if (val <= 100) return 'var(--risk-ok, #166534)'
  if (val <= 200) return 'var(--risk-caution, #B45309)'
  if (val <= 300) return 'var(--risk-high, #C2410C)'
  return 'var(--risk-critical, #C92A2A)'
}

export default function AqiKpiCard() {
  const { avgAqi, aqi } = useAeris()
  const now = useClock()

  const reporting = aqi?.stations.filter(station => station.aqi != null && Number.isFinite(station.aqi) && station.aqi >= 0) ?? []

  const displayAqi = avgAqi ?? '—'
  const category = avgAqi != null ? aqiCategory(avgAqi) : 'No data'
  const statusColor = avgAqi != null ? aqiCategoryColor(avgAqi) : 'var(--text-disabled)'

  const observationStates = reporting.map(station => getFeedFreshness('aqi', station.observed_at, now))
  const isStale = observationStates.some(state => state.status === 'stale')
  const unknownAge = reporting.length === 0 || observationStates.some(state => state.status === 'unknown')
  const ageLabel = isStale ? 'Archived observations' : unknownAge ? 'Observation age unknown' : 'Recent observations'

  return (
    <div
      className="metric-card card"
      title={`Observed station average across ${reporting.length} reporting stations: ${displayAqi} (${category}). ${ageLabel}. This is not an exposure estimate or plume attribution.`}
    >
      <div className="metric-icon" style={{ background: 'var(--accent-surface, #E8F2EB)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #22734F)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
        </svg>
      </div>
      <div className="metric-body">
        <div className="aqi-label-row">
          <span className="metric-label" style={{ marginBottom: 0 }}>Observed AQI average</span>
          {(isStale || unknownAge) && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--risk-caution, #B45309)',
                background: 'var(--risk-caution-bg, rgba(234, 179, 8, 0.15))',
                padding: '1px 5px',
                borderRadius: '4px',
                whiteSpace: 'normal',
              }}
              title="Age is measured from station observations against the current clock, independently of file generation."
            >
              {ageLabel}
            </span>
          )}
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{displayAqi}</span>
          <span className="aqi-status-badge">
            <span className="aqi-status-dot" style={{ backgroundColor: statusColor }} />
            {category}
          </span>
        </div>
      </div>
    </div>
  )
}
