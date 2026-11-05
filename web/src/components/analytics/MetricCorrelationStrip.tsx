import { useMemo } from 'react'
import { Flame, Wind, Activity, ArrowRight, Info } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import { CorridorGeoJSONSchema } from '@/types/schemas'
import './MetricCorrelationStrip.css'

export default function MetricCorrelationStrip() {
  const { sources, corridor, avgAqi } = useAeris()

  const totalFrp = useMemo(() => {
    if (!sources?.sources?.length) return null
    return Math.round(sources.sources.reduce((sum, s) => sum + s.total_frp_mw, 0))
  }, [sources])

  const peakDelta = useMemo(() => {
    if (!corridor) return null
    const parsed = CorridorGeoJSONSchema.safeParse(corridor)
    if (!parsed.success) return null
    let max = 0
    for (const f of parsed.data.features) {
      if (f.properties.kind === 'band') {
        max = Math.max(max, f.properties.pm25_delta_ugm3)
      }
    }
    return max > 0 ? Math.round(max) : null
  }, [corridor])

  return (
    <div className="analytics-panel metric-correlation">
      <div className="panel-header">
        <div>
          <div className="corr-title-row">
            <h2 className="panel-title">Cross-Domain Signal Pipeline</h2>
            <span className="corr-provenance-tag">Uncoupled Observational Chain</span>
          </div>
          <p className="panel-sub">
            Direct comparison between satellite thermal radiative power, modeled plume concentration, and ground sensor observations.
          </p>
        </div>
      </div>

      <div className="correlation-chain">
        {/* Node 1: Satellite FRP */}
        <div className="corr-node">
          <div className="corr-node-header">
            <span className="corr-icon-wrap frp-icon">
              <Flame size={14} />
            </span>
            <span className="corr-step-label">Satellite Influx</span>
          </div>
          <div className="corr-val-row">
            <span className="corr-val" style={{ color: totalFrp && totalFrp > 500 ? 'var(--risk-critical)' : 'var(--risk-high)' }}>
              {totalFrp != null ? totalFrp.toLocaleString() : 'Unavailable'}
            </span>
            <span className="corr-unit">MW FRP</span>
          </div>
          <span className="corr-sub">NASA VIIRS Thermal Clusters</span>
        </div>

        {/* Link 1 */}
        <div className="corr-link">
          <span className="corr-link-tag">Disperses</span>
          <ArrowRight size={16} className="corr-arrow" />
        </div>

        {/* Node 2: Plume Concentration */}
        <div className="corr-node">
          <div className="corr-node-header">
            <span className="corr-icon-wrap plume-icon">
              <Wind size={14} />
            </span>
            <span className="corr-step-label">Atmospheric Plume</span>
          </div>
          <div className="corr-val-row">
            <span className="corr-val" style={{ color: peakDelta && peakDelta > 150 ? 'var(--risk-critical)' : 'var(--risk-high)' }}>
              {peakDelta != null ? `+${peakDelta}` : 'Unavailable'}
            </span>
            <span className="corr-unit">µg/m³ PM2.5</span>
          </div>
          <span className="corr-sub">Peak Corridor Increment</span>
        </div>

        {/* Link 2 */}
        <div className="corr-link">
          <span className="corr-link-tag">Overlays</span>
          <ArrowRight size={16} className="corr-arrow" />
        </div>

        {/* Node 3: Ground Station Reading */}
        <div className="corr-node">
          <div className="corr-node-header">
            <span className="corr-icon-wrap aqi-icon">
              <Activity size={14} />
            </span>
            <span className="corr-step-label">Receptor Reality</span>
          </div>
          <div className="corr-val-row">
            <span className="corr-val" style={{ color: avgAqi && avgAqi > 300 ? 'var(--risk-critical)' : 'var(--risk-high)' }}>
              {avgAqi ?? 'Unavailable'}
            </span>
            <span className="corr-unit">Mean AQI</span>
          </div>
          <span className="corr-sub">CPCB / DPCC Monitoring Grid</span>
        </div>
      </div>

      <div className="corr-disclaimer">
        <Info size={14} className="corr-info-icon" />
        <span>
          <strong>Scientific Provenance:</strong> Satellite fire radiative energy, advection smoke dispersion, and surface monitor readings are distinct systems with different spatial scales. A high thermal signature drives high modeled delta, but ambient ground monitors measure cumulative airshed pollution from all local and regional sources.
        </span>
      </div>
    </div>
  )
}

