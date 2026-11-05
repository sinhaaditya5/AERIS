/**
 * TimelineScrubber — range input + fine-grained step controls + speed selector
 * + dual clock readout + loop toggle + global keyboard hotkeys + synchronized AQI sparkline.
 * Playback driven by requestAnimationFrame (speed × real seconds = model hours).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RotateCcw, Repeat, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TrendingUp,
} from 'lucide-react'
import { useReplay } from './ReplayProvider'
import {
  formatScrubberLabel, formatWallClock, regionalExposureCurve,
} from './replayPure'

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
  const {
    tHours, playing, loop, corridor, forecastStart,
    setTHours, setPlaying, setLoop,
    stepForward, stepBackward, nextChapter, prevChapter,
    tHoursRef, playingRef, loopRef,
  } = useReplay()

  const [speed, setSpeed] = useState(1)

  const rafRef      = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const speedRef    = useRef(speed)

  // Keep speedRef in sync without re-creating the rAF loop
  useEffect(() => { speedRef.current = speed }, [speed])

  // ── Playback rAF loop ────────────────────────────────────────────────────
  useEffect(() => {
    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) { lastTimeRef.current = 0; return }
      if (lastTimeRef.current === 0) { lastTimeRef.current = now; return }

      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      const next = tHoursRef.current + dt * speedRef.current
      if (next >= MAX_HOURS) {
        if (loopRef.current) {
          setTHours(0)
        } else {
          setTHours(MAX_HOURS)
          setPlaying(false)
        }
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

  // ── Global Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'textarea' || (tag === 'input' && (e.target as HTMLInputElement).type !== 'range')) {
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (e.shiftKey) stepBackward(1)
        else stepBackward(0.25)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.shiftKey) stepForward(1)
        else stepForward(0.25)
      } else if (e.key === '[' || e.key === '{') {
        e.preventDefault()
        prevChapter()
      } else if (e.key === ']' || e.key === '}') {
        e.preventDefault()
        nextChapter()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setTHours(0)
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setLoop(!loop)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, stepBackward, stepForward, prevChapter, nextChapter, setTHours, setLoop, loop])

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setTHours(val)
    if (playing) setPlaying(false)
  }

  const label       = formatScrubberLabel(tHours)
  const wallClock   = formatWallClock(forecastStart, tHours)
  const fillPct     = `${((tHours / MAX_HOURS) * 100).toFixed(2)}%`
  const playheadPct = (tHours / MAX_HOURS) * 100

  // ── Regional AQI / PM2.5 Exposure Curve Sparkline ────────────────────────
  const exposureCurve = useMemo(() => regionalExposureCurve(corridor), [corridor])
  const maxDelta = useMemo(() => {
    return Math.max(1, ...exposureCurve.map(p => p.peakPm25Delta))
  }, [exposureCurve])

  const sparklineSvgPath = useMemo(() => {
    if (exposureCurve.length === 0) return ''
    const pts = exposureCurve.map(pt => {
      const x = (pt.hour / MAX_HOURS) * 100
      const y = 100 - (pt.peakPm25Delta / maxDelta) * 85
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M 0,100 L ${pts.join(' L ')} L 100,100 Z`
  }, [exposureCurve, maxDelta])

  return (
    <div className="replay-footer-container">
      {/* ── Top Micro-Bar: Regional Sparkline & Context ──────────────────── */}
      {exposureCurve.length > 1 && (
        <div className="replay-sparkline-row" aria-hidden="true">
          <div className="replay-sparkline-badge">
            <TrendingUp size={11} />
            <span>Regional Airshed PM2.5 Delta Profile</span>
          </div>
          <div className="replay-sparkline-track">
            <svg
              className="replay-sparkline-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--rp-accent)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--rp-accent)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d={sparklineSvgPath} fill="url(#sparkGradient)" />
            </svg>
            {/* Synchronized Sparkline Needle */}
            <div
              className="replay-sparkline-cursor"
              style={{ left: `${playheadPct}%` }}
            />
          </div>
          <span className="replay-sparkline-peak">
            Peak: +{maxDelta.toFixed(0)} µg/m³
          </span>
        </div>
      )}

      {/* ── Main Scrubber Cockpit Bar ────────────────────────────────────── */}
      <div className="replay-timeline-bar" role="group" aria-label="Replay timeline controls">

        {/* Transport Step & Play Controls */}
        <div className="replay-transport-cluster" role="group" aria-label="Playback control buttons">
          {/* Prev Chapter */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={prevChapter}
            title="Previous chapter ([)"
            aria-label="Previous chapter"
          >
            <SkipBack size={13} />
          </button>

          {/* -1 Hour */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={() => stepBackward(1)}
            title="Step backward 1 hour (Shift+Left)"
            aria-label="Step backward 1 hour"
          >
            <ChevronsLeft size={13} />
          </button>

          {/* -15 Minutes */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={() => stepBackward(0.25)}
            title="Step backward 15 minutes (Left)"
            aria-label="Step backward 15 minutes"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Play / Pause Main Trigger */}
          <button
            type="button"
            className={`replay-play-btn${playing ? ' is-playing' : ''}`}
            onClick={togglePlay}
            aria-label={playing ? 'Pause replay' : 'Play replay'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing ? '⏸' : '▶'}
          </button>

          {/* +15 Minutes */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={() => stepForward(0.25)}
            title="Step forward 15 minutes (Right)"
            aria-label="Step forward 15 minutes"
          >
            <ChevronRight size={13} />
          </button>

          {/* +1 Hour */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={() => stepForward(1)}
            title="Step forward 1 hour (Shift+Right)"
            aria-label="Step forward 1 hour"
          >
            <ChevronsRight size={13} />
          </button>

          {/* Next Chapter */}
          <button
            type="button"
            className="replay-step-btn"
            onClick={nextChapter}
            title="Next chapter (])"
            aria-label="Next chapter"
          >
            <SkipForward size={13} />
          </button>

          {/* Loop Mode Toggle */}
          <button
            type="button"
            className={`replay-step-btn loop-btn${loop ? ' active' : ''}`}
            onClick={() => setLoop(!loop)}
            title={loop ? 'Continuous loop active (L)' : 'Enable continuous loop (L)'}
            aria-label={loop ? 'Continuous loop enabled' : 'Continuous loop disabled'}
            aria-pressed={loop}
          >
            <Repeat size={12} />
          </button>

          {/* Reset to T+0h */}
          <button
            type="button"
            className="replay-step-btn reset-btn"
            onClick={() => setTHours(0)}
            title="Reset to T+0h (R)"
            aria-label="Reset to beginning"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Speed Selector */}
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
          {/* Keyboard hints */}
          <div className="replay-keyboard-hint" aria-hidden="true">
            <kbd>Space</kbd> play/pause
            <span aria-hidden="true">·</span>
            <kbd>←</kbd><kbd>→</kbd> ±15m
            <span aria-hidden="true">·</span>
            <kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd> ±1h
            <span aria-hidden="true">·</span>
            <kbd>[</kbd><kbd>]</kbd> chapter
            <span aria-hidden="true">·</span>
            <kbd>R</kbd> reset
            <span aria-hidden="true">·</span>
            <kbd>L</kbd> loop
          </div>
        </div>

        {/* Dual Clock Readout */}
        <div className="replay-dual-clock-box">
          <span className="replay-time-label" aria-live="polite" aria-atomic="true">
            {label}
          </span>
          {wallClock && (
            <span className="replay-wallclock-sub" title="Estimated local observation timestamp">
              {wallClock}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
