/** ChapterNav — vertical stepper on desktop, horizontal pills on mobile. */
import { useRef } from 'react'
import { useReplay } from './ReplayProvider'
import { CHAPTERS, type ReplayChapter } from './replayPure'

/** Human-readable time range hint per chapter */
const CHAPTER_HINTS: Record<ReplayChapter, string> = {
  source:   'T+0h',
  movement: 'T+0.5h → T+4h',
  exposure: 'T+4h → T+12h',
  action:   'T+12h → T+24h',
}

/** Seek target when chapter is manually selected */
const SEEK_MAP: Record<ReplayChapter, number> = {
  source:   0,
  movement: 0.5,
  exposure: 4,
  action:   12,
}

/** Chapters in order — used to determine "completed" status */
const CHAPTER_ORDER: ReplayChapter[] = ['source', 'movement', 'exposure', 'action']

export default function ChapterNav() {
  const { chapter, setChapter, setTHours } = useReplay()
  const manualOverrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeIdx = CHAPTER_ORDER.indexOf(chapter)

  const handleSelect = (id: ReplayChapter) => {
    setChapter(id)
    setTHours(SEEK_MAP[id])
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
        {CHAPTERS.map((c, idx) => {
          const isActive    = chapter === c.id
          const isCompleted = idx < activeIdx

          let classNames = 'replay-chapter-btn'
          if (isActive)    classNames += ' active'
          if (isCompleted) classNames += ' completed'

          return (
            <button
              key={c.id}
              id={`replay-chapter-${c.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`replay-panel-${c.id}`}
              className={classNames}
              onClick={() => handleSelect(c.id)}
            >
              <span className="replay-chapter-num" aria-hidden="true">
                {isCompleted
                  ? null /* checkmark rendered via CSS ::after */
                  : <span className="replay-chapter-num-text">{idx + 1}</span>
                }
              </span>
              <span className="replay-chapter-icon" aria-hidden="true">{c.icon}</span>
              <span className="replay-chapter-info">
                <span className="replay-chapter-label">{c.label}</span>
                <span className="replay-chapter-time-hint" aria-hidden="true">
                  {CHAPTER_HINTS[c.id]}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
