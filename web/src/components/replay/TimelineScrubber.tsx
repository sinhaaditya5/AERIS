/**
 * TimelineScrubber — range input + play/pause + T+Xh label.
 * Playback driven by requestAnimationFrame (1 real second = 1 model hour).
 */
import { useEffect, useRef } from 'react'
import { useReplay } from './ReplayProvider'
import { formatScrubberLabel } from './replayPure'

const TICK_MARKS = [0, 2, 4, 8, 12, 24]

// 1 real second = 1 model hour (clock speed)
const SPEED_HRS_PER_SEC = 1

export default function TimelineScrubber() {
  const { tHours, playing, setTHours, setPlaying, tHoursRef, playingRef } = useReplay()

  const rafRef      = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // ── Playback rAF loop ────────────────────────────────────────────────────
  useEffect(() => {
    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) { lastTimeRef.current = 0; return }
      if (lastTimeRef.current === 0) { lastTimeRef.current = now; return }

      const dt = (now - lastTimeRef.current) / 1000 // seconds elapsed
      lastTimeRef.current = now

      const next = tHoursRef.current + dt * SPEED_HRS_PER_SEC
      if (next >= 24) {
        setTHours(24)
        setPlaying(false)
        return
      }
      setTHours(next)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePlay = () => {
    if (tHours >= 24) {
      setTHours(0)
      setPlaying(true)
    } else {
      setPlaying(!playing)
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setTHours(val)
    if (playing) setPlaying(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow keys: 15-minute steps
    if (e.key === 'ArrowRight') { e.preventDefault(); setTHours(Math.min(24, tHours + 0.25)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setTHours(Math.max(0,  tHours - 0.25)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setTHours(Math.min(24, tHours + 1)) }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setTHours(Math.max(0,  tHours - 1)) }
  }

  const label = formatScrubberLabel(tHours)

  return (
    <div className="replay-timeline-bar" role="group" aria-label="Replay timeline controls">

      {/* Play / Pause */}
      <button
        type="button"
        className={`replay-play-btn ${playing ? 'is-playing' : ''}`}
        onClick={togglePlay}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* Scrubber track */}
      <div className="replay-scrubber-wrap">
        <datalist id="replay-ticks">
          {TICK_MARKS.map(t => <option key={t} value={t} />)}
        </datalist>
        <input
          id="replay-scrubber"
          type="range"
          className="replay-scrubber"
          min={0}
          max={24}
          step={0.25}
          value={tHours}
          list="replay-ticks"
          aria-label={`Replay time, currently ${label}`}
          aria-valuemin={0}
          aria-valuemax={24}
          aria-valuenow={tHours}
          aria-valuetext={label}
          onChange={handleScrub}
          onKeyDown={handleKeyDown}
        />
        {/* Tick labels */}
        <div className="replay-tick-labels" aria-hidden="true">
          {TICK_MARKS.map(t => (
            <span key={t} className="replay-tick-label" style={{ left: `${(t / 24) * 100}%` }}>
              T+{t}h
            </span>
          ))}
        </div>
      </div>

      {/* Current time label */}
      <span className="replay-time-label" aria-live="polite" aria-atomic="true">
        {label}
      </span>
    </div>
  )
}
