/** ChapterNav — vertical pill list on desktop, horizontal pills on mobile. */
import { useRef } from 'react'
import { useReplay } from './ReplayProvider'
import { CHAPTERS, type ReplayChapter } from './replayPure'

export default function ChapterNav() {
  const { chapter, setChapter, setTHours } = useReplay()
  // Track manual override to suppress auto-advance for 3 seconds
  const manualOverrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSelect = (id: ReplayChapter) => {
    setChapter(id)
    // Seek timeline to the chapter start time
    const seekMap: Record<ReplayChapter, number> = {
      source:   0,
      movement: 0.5,
      exposure: 4,
      action:   12,
    }
    setTHours(seekMap[id])
    // Lock auto-advance for 3s after manual selection
    if (manualOverrideTimerRef.current) clearTimeout(manualOverrideTimerRef.current)
    manualOverrideTimerRef.current = setTimeout(() => {
      manualOverrideTimerRef.current = null
    }, 3000)
  }

  return (
    <nav
      className="replay-chapter-nav"
      aria-label="Forecast replay chapters"
    >
      <div
        className="replay-chapter-list"
        role="tablist"
        aria-orientation="vertical"
      >
        {CHAPTERS.map((c, idx) => (
          <button
            key={c.id}
            id={`replay-chapter-${c.id}`}
            role="tab"
            type="button"
            aria-selected={chapter === c.id}
            aria-controls={`replay-panel-${c.id}`}
            className={`replay-chapter-btn ${chapter === c.id ? 'active' : ''}`}
            onClick={() => handleSelect(c.id)}
          >
            <span className="replay-chapter-num" aria-hidden="true">{idx + 1}</span>
            <span className="replay-chapter-icon" aria-hidden="true">{c.icon}</span>
            <span className="replay-chapter-label">{c.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
