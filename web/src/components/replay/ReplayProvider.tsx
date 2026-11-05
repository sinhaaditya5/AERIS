/**
 * ReplayProvider — Isolated context for Forecast Replay.
 * Reads AerisContext data once on mount (snapshot semantics).
 * Never triggers dashboard-wide re-renders.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import { useAeris, type BasemapMode } from '@/services/dataContext'
import { useTheme } from '@/services/themeContext'
import type {
  SourcesFile, CorridorGeoJSON, RankedSitesFile, ActionsFile, WindFile,
} from '@/types/schemas'
import { chapterFromTime, type ReplayChapter } from './replayPure'

const CHAPTER_STEPS: ReplayChapter[] = ['source', 'movement', 'exposure', 'action']
const CHAPTER_SEEK_HOURS: Record<ReplayChapter, number> = {
  source: 0,
  movement: 0.5,
  exposure: 4,
  action: 12,
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface ReplayData {
  sources:      SourcesFile | null
  corridor:     CorridorGeoJSON | null
  rankedSites:  RankedSitesFile | null
  actions:      ActionsFile | null
  wind:         WindFile | null
  /** forecast_start from corridor, or null if absent */
  forecastStart: string | null
}

export interface ReplayState extends ReplayData {
  packId:             string
  chapter:            ReplayChapter
  tHours:             number
  playing:            boolean
  loop:               boolean
  basemapMode:        BasemapMode
  highlightedSiteId:  string | null

  setChapter:            (c: ReplayChapter) => void
  setTHours:             (t: number) => void
  setPlaying:            (v: boolean) => void
  setLoop:               (v: boolean) => void
  setBasemapMode:        (mode: BasemapMode) => void
  setHighlightedSiteId:  (id: string | null) => void
  stepForward:           (delta?: number) => void
  stepBackward:          (delta?: number) => void
  nextChapter:           () => void
  prevChapter:           () => void
  seekChapter:           (c: ReplayChapter) => void

  /** Ref exposed for rAF loop to read tHours without causing re-renders */
  tHoursRef:  React.MutableRefObject<number>
  playingRef: React.MutableRefObject<boolean>
  loopRef:    React.MutableRefObject<boolean>
}

const ReplayContext = createContext<ReplayState | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ReplayProvider({ children }: { children: React.ReactNode }) {
  const aeris = useAeris()
  const theme = useTheme()

  // Snapshot the live data once on mount — replay is a static story
  const snapshotRef = useRef<ReplayData | null>(null)
  if (snapshotRef.current === null) {
    snapshotRef.current = {
      sources:       aeris.sources,
      corridor:      aeris.corridor,
      rankedSites:   aeris.rankedSites,
      actions:       aeris.actions,
      wind:          aeris.wind,
      forecastStart: aeris.corridor?.forecast_start ?? null,
    }
  }
  const snap = snapshotRef.current!

  // Initialize basemap mode matching theme if matchBasemap is true
  const initialBasemap: BasemapMode = theme.settings.matchBasemap
    ? (theme.isDark ? 'dark' : 'topo')
    : 'dark'

  // ── State ──────────────────────────────────────────────────────────────────
  const [chapter, setChapterState] = useState<ReplayChapter>('source')
  const [tHours,  setTHoursState]  = useState<number>(0)
  const [playing, setPlayingState] = useState(false)
  const [loop,    setLoopState]    = useState(false)
  const [basemapMode, setBasemapModeState] = useState<BasemapMode>(initialBasemap)
  const [highlightedSiteId, setHighlightedSiteId] = useState<string | null>(null)

  const tHoursRef  = useRef(tHours)
  const playingRef = useRef(playing)
  const loopRef    = useRef(loop)

  useEffect(() => { loopRef.current = loop }, [loop])

  // Read initial t from URL hash: #replay=live&t=2.5
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/[#&]t=([0-9.]+)/)
    if (match) {
      const t = Math.max(0, Math.min(24, parseFloat(match[1])))
      if (Number.isFinite(t)) {
        setTHoursState(t)
        tHoursRef.current = t
        setChapterState(chapterFromTime(t))
      }
    }
  }, [])

  const setChapter = useCallback((c: ReplayChapter) => {
    setChapterState(c)
  }, [])

  const setTHours = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(24, t))
    setTHoursState(clamped)
    tHoursRef.current = clamped
    // Update hash without pushing a history entry
    const existingHash = window.location.hash
    const packMatch = existingHash.match(/replay=([^&]+)/)
    const packId    = packMatch ? packMatch[1] : 'live'
    window.history.replaceState(null, '', `#replay=${packId}&t=${clamped.toFixed(2)}`)
    setChapterState(prev => {
      const auto = chapterFromTime(clamped)
      return auto !== prev ? auto : prev
    })
  }, [])

  const setPlaying = useCallback((v: boolean) => {
    setPlayingState(v)
    playingRef.current = v
  }, [])

  const setLoop = useCallback((v: boolean) => {
    setLoopState(v)
    loopRef.current = v
  }, [])

  const setBasemapMode = useCallback((m: BasemapMode) => {
    setBasemapModeState(m)
  }, [])

  const stepForward = useCallback((delta = 0.25) => {
    setTHours(Math.min(24, tHoursRef.current + delta))
  }, [setTHours])

  const stepBackward = useCallback((delta = 0.25) => {
    setTHours(Math.max(0, tHoursRef.current - delta))
  }, [setTHours])

  const seekChapter = useCallback((c: ReplayChapter) => {
    setChapterState(c)
    setTHours(CHAPTER_SEEK_HOURS[c])
  }, [setTHours])

  const nextChapter = useCallback(() => {
    const curIdx = CHAPTER_STEPS.indexOf(chapter)
    if (curIdx < CHAPTER_STEPS.length - 1) {
      seekChapter(CHAPTER_STEPS[curIdx + 1])
    }
  }, [chapter, seekChapter])

  const prevChapter = useCallback(() => {
    const curIdx = CHAPTER_STEPS.indexOf(chapter)
    if (curIdx > 0) {
      seekChapter(CHAPTER_STEPS[curIdx - 1])
    }
  }, [chapter, seekChapter])

  const value: ReplayState = {
    ...snap,
    packId: 'live',
    chapter,
    tHours,
    playing,
    loop,
    basemapMode,
    highlightedSiteId,
    setChapter,
    setTHours,
    setPlaying,
    setLoop,
    setBasemapMode,
    setHighlightedSiteId,
    stepForward,
    stepBackward,
    nextChapter,
    prevChapter,
    seekChapter,
    tHoursRef,
    playingRef,
    loopRef,
  }

  return (
    <ReplayContext.Provider value={value}>
      {children}
    </ReplayContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReplay(): ReplayState {
  const ctx = useContext(ReplayContext)
  if (!ctx) throw new Error('useReplay must be used inside <ReplayProvider>')
  return ctx
}
