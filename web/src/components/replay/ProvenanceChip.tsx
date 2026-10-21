/** ProvenanceChip — persistent disclaimer, never unmounts during replay. */
import { useState } from 'react'
import { useReplay } from './ReplayProvider'

export default function ProvenanceChip() {
  const { packId, forecastStart } = useReplay()
  const [expanded, setExpanded] = useState(false)

  const isLive = packId === 'live'
  const chipText = isLive
    ? 'Modelled forecast — not ground truth'
    : 'Modelled replay of an archived run. Not live.'

  const tooltipText = isLive
    ? [
        'This replay uses the current forecast run loaded by the dashboard.',
        'It is a modelled output, not a real-time or historically verified record.',
        forecastStart ? `Forecast reference: ${forecastStart}` : 'Forecast reference time unavailable.',
        'Wind transport is from a single representative grid point, not a spatial mean.',
        'Operational validation: NOT ESTABLISHED.',
      ].join(' ')
    : [
        'This is a replay of an archived modelled run.',
        'It does not represent current atmospheric conditions.',
        'Operational validation: NOT ESTABLISHED.',
      ].join(' ')

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
          {tooltipText}
        </div>
      )}
    </div>
  )
}
