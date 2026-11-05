import { useMemo } from 'react'
import { Wind as WindIcon, Compass, Gauge, Layers } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import './WindAtmosphericSummary.css'

export default function WindAtmosphericSummary() {
  const { wind } = useAeris()

  const {
    avgSpeed,
    minSpeed,
    maxSpeed,
    dominantDeg,
    dominantCardinal,
    avgPblh,
    pblhQuality,
  } = useMemo(() => {
    if (!wind?.points?.length) {
      return {
        avgSpeed: null,
        minSpeed: null,
        maxSpeed: null,
        dominantDeg: null,
        dominantCardinal: null,
        avgPblh: null,
        pblhQuality: null,
      }
    }

    const currentHours = wind.points.map(p => p.hours[0]).filter(Boolean)
    const speeds = currentHours.map(h => h.speed_ms).filter(Number.isFinite)
    const dirs = currentHours.map(h => h.dir_from_deg).filter(Number.isFinite)
    const pblhs = currentHours.map(h => h.pblh_m).filter((v): v is number => v != null && Number.isFinite(v))

    const avgSpd = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null
    const minSpd = speeds.length ? Math.min(...speeds) : null
    const maxSpd = speeds.length ? Math.max(...speeds) : null

    // Circular mean for wind direction
    let domDeg: number | null = null
    let domCard: string | null = null
    if (dirs.length) {
      const sinMean = dirs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0) / dirs.length
      const cosMean = dirs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0) / dirs.length
      domDeg = Math.round(((Math.atan2(sinMean, cosMean) * 180) / Math.PI + 360) % 360)
      const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
      domCard = cardinals[Math.round(domDeg / 22.5) % 16]
    }

    const avgPbl = pblhs.length ? Math.round(pblhs.reduce((a, b) => a + b, 0) / pblhs.length) : null

    let quality = 'Normal'
    if (avgPbl != null) {
      if (avgPbl < 500) quality = 'Poor (Inversion Trapping)'
      else if (avgPbl < 1200) quality = 'Moderate (Ventilation)'
      else quality = 'Good (Deep Dispersion)'
    }

    return {
      avgSpeed: avgSpd != null ? Math.round(avgSpd * 10) / 10 : null,
      minSpeed: minSpd != null ? Math.round(minSpd * 10) / 10 : null,
      maxSpeed: maxSpd != null ? Math.round(maxSpd * 10) / 10 : null,
      dominantDeg: domDeg,
      dominantCardinal: domCard,
      avgPblh: avgPbl,
      pblhQuality: quality,
    }
  }, [wind])

  if (!wind || !wind.points?.length) {
    return (
      <div className="analytics-panel wind-atmospheric">
        <div className="panel-header">
          <div>
            <div className="wind-title-row">
              <WindIcon size={16} />
              <h2 className="panel-title">Atmospheric Transport &amp; Mixing</h2>
            </div>
            <p className="panel-sub">ERA5 meteorological parameters influencing regional smoke drift</p>
          </div>
        </div>
        <p className="panel-sub" style={{ marginTop: '14px' }}>Wind forecast data unavailable.</p>
      </div>
    )
  }

  // Pointer angle: wind coming FROM dominantDeg flows TOWARD dominantDeg + 180
  const arrowAngle = dominantDeg != null ? (dominantDeg + 180) % 360 : 0

  return (
    <div className="analytics-panel wind-atmospheric">
      <div className="panel-header">
        <div>
          <div className="wind-title-row">
            <WindIcon size={16} />
            <h2 className="panel-title">Atmospheric Transport &amp; Dispersion</h2>
          </div>
          <p className="panel-sub">
            ERA5 Reanalysis wind vectors and Planetary Boundary Layer Height (PBLH) across observation grid.
          </p>
        </div>
      </div>

      <div className="wind-body">
        {/* Compass Rose SVG */}
        <div className="compass-wrap" title={`Prevailing direction: ${dominantCardinal} (${dominantDeg}°)`}>
          <svg viewBox="0 0 120 120" className="compass-svg" aria-label="Wind Compass Rose">
            <circle cx="60" cy="60" r="50" className="compass-outer" />
            <circle cx="60" cy="60" r="38" className="compass-inner" />
            
            {/* Ticks & cardinal letters */}
            <text x="60" y="20" textAnchor="middle" className="compass-label-card">N</text>
            <text x="104" y="64" textAnchor="middle" className="compass-label-card">E</text>
            <text x="60" y="108" textAnchor="middle" className="compass-label-card">S</text>
            <text x="16" y="64" textAnchor="middle" className="compass-label-card">W</text>

            {/* Direction Arrow */}
            {dominantDeg != null && (
              <g transform={`rotate(${arrowAngle} 60 60)`} className="compass-arrow-group">
                <line x1="60" y1="60" x2="60" y2="24" className="compass-arrow-stem" />
                <polygon points="60,18 55,28 65,28" className="compass-arrow-head" />
                <circle cx="60" cy="60" r="4" className="compass-center-dot" />
              </g>
            )}
          </svg>
          <div className="compass-meta">
            <span className="compass-card-text">{dominantCardinal ?? '—'}</span>
            <span className="compass-deg-text">{dominantDeg != null ? `${dominantDeg}°` : ''}</span>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="wind-stats-grid">
          <div className="wind-stat-item">
            <div className="wind-stat-head">
              <Compass size={13} />
              <span className="wind-stat-label">Prevailing Flow</span>
            </div>
            <div className="wind-stat-val-row">
              <span className="wind-stat-val">{dominantCardinal ?? 'N/A'}</span>
              <span className="wind-stat-unit">({dominantDeg}° origin)</span>
            </div>
            <span className="wind-stat-sub">Advects smoke southward into NCR</span>
          </div>

          <div className="wind-stat-item">
            <div className="wind-stat-head">
              <Gauge size={13} />
              <span className="wind-stat-label">Transport Speed</span>
            </div>
            <div className="wind-stat-val-row">
              <span className="wind-stat-val">{avgSpeed ?? '—'}</span>
              <span className="wind-stat-unit">m/s</span>
            </div>
            <span className="wind-stat-sub">
              Range: {minSpeed ?? '—'} to {maxSpeed ?? '—'} m/s
            </span>
          </div>

          <div className="wind-stat-item">
            <div className="wind-stat-head">
              <Layers size={13} />
              <span className="wind-stat-label">Mixing Height (PBLH)</span>
            </div>
            <div className="wind-stat-val-row">
              <span className="wind-stat-val">{avgPblh != null ? avgPblh.toLocaleString() : '—'}</span>
              <span className="wind-stat-unit">meters</span>
            </div>
            <span className="wind-stat-sub">
              Vertical cap on particulate ventilation
            </span>
          </div>

          <div className="wind-stat-item">
            <div className="wind-stat-head">
              <WindIcon size={13} />
              <span className="wind-stat-label">Dispersion Regime</span>
            </div>
            <div className="wind-stat-val-row">
              <span className={`pblh-badge ${avgPblh != null && avgPblh < 600 ? 'trap' : 'normal'}`}>
                {pblhQuality ?? 'Unavailable'}
              </span>
            </div>
            <span className="wind-stat-sub">
              {avgPblh != null && avgPblh < 600
                ? 'Thermal inversion traps surface emissions'
                : 'Particulate dilution permitted by boundary layer'}
            </span>
          </div>
        </div>
      </div>

      <p className="wind-disclaimer">
        Boundary layer height represents the atmospheric mixing ceiling. Shallow PBLH (&lt;500m) in late autumn evenings suppresses smoke dispersal, sharply inflating ground-level PM2.5 even under moderate farm emission rates.
      </p>
    </div>
  )
}

