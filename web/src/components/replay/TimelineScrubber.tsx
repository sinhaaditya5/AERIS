/**
 * TimelineScrubber — range input + play/pause + speed selector + T+Xh label.
 * Playback driven by requestAnimationFrame (speed × real seconds = model hours).
 */
import { useEffect, useRef, useState } from 'react'
import { useReplay } from './ReplayProvider'
import { formatScrubberLabel } from './replayPure'

const MAX_HOURS = 24

/** Chapter waypoints shown on tick labels */
const WAYPOINTS: { t: number; emoji: string; label: string }[] = [
  { t: 0,    emoji: '🔥', label: 'T+0h' },
  { t: 0.5,  emoji: '💨', label: 'T+0.5h' },
  { t: 4,    emoji: '🏥', label: 'T+4h' },
  { t: 12,   emoji: '🛡️', label: 'T+12h' },
  { t: 24,   emoji: '',   label: 'T+24h' },
]

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: '0.5×', value: 0.5 },
  { label: '1×',   value: 1   },
  { label: '2×',   value: 2   },
  { label: '4×',   value: 4   },
]

export default function TimelineScrubber() {
  const { tHours, playing, setTHours, setPlaying, tHoursRef, playingRef } = useReplay()
  const [speed, setSpeed] = useState(1)

  const rafRef        = useRef<number>(0)
  const lastTimeRef   = useRef<number>(0)
  const speedRef      = useRef(speed)

  // Keep speedRef in sync without re-creating the rAF loop
  useEffect(() => { speedRef.current = speed }, [speed])

  // ── Playback rAF loop ────────────────────────────────────────────────────
  useEffect(() => {
    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) { lastTimeRef.current = 0; return }
      if (lastTimeRef.current === 0) { lastTimeRef.current = now; return }

      const dt   = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      const next = tHoursRef.current + dt * speedRef.current
      if (next >= MAX_HOURS) {
        setTHours(MAX_HOURS)
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
    if (tHours >= MAX_HOURS) {
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
    if (e.key === 'ArrowRight') { e.preventDefault(); setTHours(Math.min(MAX_HOURS, tHours + 0.25)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setTHours(Math.max(0, tHours - 0.25)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setTHours(Math.min(MAX_HOURS, tHours + 1)) }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setTHours(Math.max(0, tHours - 1)) }
  }

  const label     = formatScrubberLabel(tHours)
  const fillPct   = `${((tHours / MAX_HOURS) * 100).toFixed(2)}%`

  return (
    <div className="replay-timeline-bar" role="group" aria-label="Replay timeline controls">

      {/* Play / Pause */}
      <button
        type="button"
        className={`replay-play-btn${playing ? ' is-playing' : ''}`}
        onClick={togglePlay}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* Speed selector */}
      <div className="replay-speed-group" role="group" aria-label="Playback speed">
        {SPEED_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`replay-speed-btn${speed === opt.value ? ' active' : ''}`}
            aria-pressed={speed === opt.value}
            onClick={() => setSpeed(opt.value)}
            title={`${opt.label} speed`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Scrubber track */}
      <div className="replay-scrubber-wrap">
        <datalist id="replay-ticks">
          {WAYPOINTS.map(w => <option key={w.t} value={w.t} />)}
        </datalist>
        <input
          id="replay-scrubber"
          type="range"
          className="replay-scrubber"
          style={{ '--rp-fill-pct': fillPct } as React.CSSProperties}
          min={0}
          max={MAX_HOURS}
          step={0.25}
          value={tHours}
          list="replay-ticks"
          aria-label={`Replay time, currently ${label}`}
          aria-valuemin={0}
          aria-valuemax={MAX_HOURS}
          aria-valuenow={tHours}
          aria-valuetext={label}
          onChange={handleScrub}
          onKeyDown={handleKeyDown}
        />
        {/* Waypoint tick labels */}
        <div className="replay-tick-labels" aria-hidden="true">
          {WAYPOINTS.map(w => (
            <span
              key={w.t}
              className="replay-tick-label"
              style={{ left: `${(w.t / MAX_HOURS) * 100}%` }}
              data-waypoint={w.emoji || undefined}
            >
              <span className="replay-tick-label-pip" />
              <span className="replay-tick-label-text">{w.label}</span>
            </span>
          ))}
        </div>
        {/* Keyboard hint — desktop only (hidden on mobile via CSS) */}
        <div className="replay-keyboard-hint" aria-hidden="true">
          <kbd>←</kbd><kbd>→</kbd> ±15 min
          <span aria-hidden="true">·</span>
          <kbd>Space</kbd> play/pause
          <span aria-hidden="true">·</span>
          <kbd>↑</kbd><kbd>↓</kbd> ±1 h
        </div>
      </div>

      {/* Current time label */}
      <span className="replay-time-label" aria-live="polite" aria-atomic="true">
        {label}
      </span>
    </div>
  )
}
