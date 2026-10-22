/**
 * ReplayView — Root layout, lazy-loaded entry point.
 * Wires ReplayProvider, ReplayMap, ChapterNav, ChapterCard,
 * TimelineScrubber, and ProvenanceChip into the full presentation.
 */
import { useAeris } from '@/services/dataContext'
import { useReplay } from './ReplayProvider'
import { ReplayProvider } from './ReplayProvider'
import ReplayMap         from './ReplayMap'
import ChapterNav        from './ChapterNav'
import ChapterCard       from './ChapterCard'
import TimelineScrubber  from './TimelineScrubber'
import ProvenanceChip    from './ProvenanceChip'
import { CHAPTERS }      from './replayPure'
import './replay.css'

const CHAPTER_INDEX: Record<string, number> = {
  source: 1, movement: 2, exposure: 3, action: 4,
}

function ReplayShell() {
  const { setActiveTab } = useAeris()
  const { chapter, playing } = useReplay()

  const chapterNum   = CHAPTER_INDEX[chapter] ?? 1
  const chapterLabel = CHAPTERS.find(c => c.id === chapter)?.label ?? ''

  return (
    <main
      className={`replay-shell${playing ? ' is-playing' : ''}`}
      data-chapter={chapter}
      role="main"
      aria-label="Forecast Replay"
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="replay-topbar">
        <button
          type="button"
          className="replay-back-btn"
          onClick={() => setActiveTab('dashboard')}
          aria-label="Return to dashboard"
        >
          Dashboard
        </button>
        <h1 className="replay-title">
          Forecast Replay
          <span className="replay-title-badge" aria-label={`Chapter ${chapterNum} of 4: ${chapterLabel}`}>
            {chapterNum} / 4
          </span>
        </h1>
        <div className="replay-topbar-right">
          <ProvenanceChip />
        </div>
      </div>

      {/* ── Body: map + right panel ───────────────────────────────────────── */}
      <div className="replay-body">
        {/* Left: map */}
        <div className="replay-map-area">
          <ReplayMap />
        </div>

        {/* Right: chapter nav + card */}
        <aside className="replay-sidebar" aria-label="Chapter navigation and data">
          <ChapterNav />
          <div className="replay-card-scroll">
            <ChapterCard />
          </div>
        </aside>
      </div>

      {/* ── Bottom: timeline scrubber ─────────────────────────────────────── */}
      <div className="replay-footer">
        <TimelineScrubber />
      </div>
    </main>
  )
}

/** Default export wraps shell in the isolated ReplayProvider. */
export default function ReplayView() {
  return (
    <ReplayProvider>
      <ReplayShell />
    </ReplayProvider>
  )
}
