/** ProvenanceChip — persistent disclaimer with glassmorphic structured tooltip. */
import { useState } from 'react'
import { useReplay } from './ReplayProvider'

interface TooltipRow {
  icon: string
  text: string
}

export default function ProvenanceChip() {
  const { packId, forecastStart } = useReplay()
  const [expanded, setExpanded] = useState(false)

  const isLive = packId === 'live'

  const chipText = isLive
    ? 'Modelled forecast — not ground truth'
    : 'Modelled replay of an archived run. Not live.'

  const tooltipRows: TooltipRow[] = isLive
    ? [
        {
          icon: '📡',
          text: 'This replay uses the current forecast run loaded by the dashboard.',
        },
        {
          icon: '⚗️',
          text: 'It is a modelled output, not a real-time or historically verified record.',
        },
        {
          icon: '🕐',
          text: forecastStart
            ? `Forecast reference: ${forecastStart}`
            : 'Forecast reference time unavailable.',
        },
        {
          icon: '🌬️',
          text: 'Wind transport is from a single representative grid point, not a spatial mean.',
        },
        {
          icon: '⚠️',
          text: 'Operational validation: NOT ESTABLISHED.',
        },
      ]
    : [
        {
          icon: '📦',
          text: 'This is a replay of an archived modelled run.',
        },
        {
          icon: '📍',
          text: 'It does not represent current atmospheric conditions.',
        },
        {
          icon: '⚠️',
          text: 'Operational validation: NOT ESTABLISHED.',
        },
      ]

  return (
    <div className="replay-provenance-chip" role="status" aria-live="polite">
      <span className="replay-provenance-dot" aria-hidden="true" />
      <span className="replay-provenance-text">{chipText}</span>
      <button
        type="button"
        className="replay-provenance-info-btn"
        aria-label="Show data provenance details"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
      >
        ⓘ
      </button>
      {expanded && (
        <div className="replay-provenance-tooltip" role="tooltip">
          {tooltipRows.map((row, i) => (
            <div key={i} className="replay-provenance-tooltip-row">
              <span className="replay-provenance-tooltip-icon" aria-hidden="true">
                {row.icon}
              </span>
              <span>{row.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
