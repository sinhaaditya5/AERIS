/**
 * Unit tests for replayPure.ts
 * Run with: npm test (Vitest)
 */
import { describe, it, expect } from 'vitest'
import {
  chapterFromTime,
  formatEta,
  formatScrubberLabel,
  formatOccupancy,
  formatGenerator,
  compassLabel,
  filteredCorridorFeatures,
  sourcesCentroid,
} from './replayPure'
import type { CorridorGeoJSON, SourcesFile } from '@/types/schemas'

// ── chapterFromTime ───────────────────────────────────────────────────────────

describe('chapterFromTime', () => {
  it('returns source at t=0', () => expect(chapterFromTime(0)).toBe('source'))
  it('returns source at t=0.4', () => expect(chapterFromTime(0.4)).toBe('source'))
  it('returns movement at t=0.5', () => expect(chapterFromTime(0.5)).toBe('movement'))
  it('returns movement at t=3.9', () => expect(chapterFromTime(3.9)).toBe('movement'))
  it('returns exposure at t=4', () => expect(chapterFromTime(4)).toBe('exposure'))
  it('returns exposure at t=11.9', () => expect(chapterFromTime(11.9)).toBe('exposure'))
  it('returns action at t=12', () => expect(chapterFromTime(12)).toBe('action'))
  it('returns action at t=24', () => expect(chapterFromTime(24)).toBe('action'))
})

// ── formatEta ─────────────────────────────────────────────────────────────────

describe('formatEta', () => {
  it('returns dash for NaN', () => expect(formatEta(NaN)).toBe('—'))
  it('returns dash for negative', () => expect(formatEta(-1)).toBe('—'))
  it('returns < 1 hour for 0', () => expect(formatEta(0)).toBe('< 1 hour'))
  it('returns < 1 hour for 0.5', () => expect(formatEta(0.5)).toBe('< 1 hour'))
  it('returns T+1h for exactly 1', () => expect(formatEta(1)).toBe('T+1h'))
  it('returns T+2h 15m for 2.25', () => expect(formatEta(2.25)).toBe('T+2h 15m'))
  it('returns T+8h for 8', () => expect(formatEta(8)).toBe('T+8h'))
  it('rounds minutes correctly', () => expect(formatEta(1.5)).toBe('T+1h 30m'))
})

// ── formatScrubberLabel ───────────────────────────────────────────────────────

describe('formatScrubberLabel', () => {
  it('handles 0', () => expect(formatScrubberLabel(0)).toBe('T+0h'))
  it('handles 2.25', () => expect(formatScrubberLabel(2.25)).toBe('T+2h 15m'))
  it('handles 24', () => expect(formatScrubberLabel(24)).toBe('T+24h'))
})

// ── formatOccupancy ───────────────────────────────────────────────────────────

describe('formatOccupancy', () => {
  it('returns unrecorded for null', () => expect(formatOccupancy(null)).toBe('unrecorded'))
  it('returns unrecorded for undefined', () => expect(formatOccupancy(undefined)).toBe('unrecorded'))
  it('formats number', () => expect(formatOccupancy(1200)).toBe('1,200'))
  it('handles 0', () => expect(formatOccupancy(0)).toBe('0'))
})

// ── formatGenerator ───────────────────────────────────────────────────────────

describe('formatGenerator', () => {
  it('returns fallback for null', () => expect(formatGenerator(null)).toBe('Rule-based plan (fallback)'))
  it('returns fallback for empty string', () => expect(formatGenerator('')).toBe('Rule-based plan (fallback)'))
  it('returns fallback for whitespace', () => expect(formatGenerator('   ')).toBe('Rule-based plan (fallback)'))
  it('returns value verbatim', () => expect(formatGenerator('Claude 3.5')).toBe('Claude 3.5'))
  it('returns rules string verbatim', () => expect(formatGenerator('rules')).toBe('rules'))
})

// ── compassLabel ──────────────────────────────────────────────────────────────

describe('compassLabel', () => {
  it('0 deg = N', () => expect(compassLabel(0)).toBe('N'))
  it('90 deg = E', () => expect(compassLabel(90)).toBe('E'))
  it('180 deg = S', () => expect(compassLabel(180)).toBe('S'))
  it('270 deg = W', () => expect(compassLabel(270)).toBe('W'))
  it('45 deg = NE', () => expect(compassLabel(45)).toBe('NE'))
  it('360 deg wraps to N', () => expect(compassLabel(360)).toBe('N'))
})

// ── filteredCorridorFeatures ──────────────────────────────────────────────────

const makeCorridorBand = (hourFrom: number, hourTo: number) => ({
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[[0,0],[0,1],[1,1],[1,0],[0,0]]],
  },
  properties: { kind: 'band', source_id: 'src_001', hour_from: hourFrom, hour_to: hourTo, risk: 0.5, pm25_delta_ugm3: 15 },
})
const makeCorridorCenterline = () => ({
  type: 'Feature' as const,
  geometry: { type: 'LineString' as const, coordinates: [[0,0],[1,1]] },
  properties: { kind: 'centerline', source_id: 'src_001', points_eta_hours: [0, 1] },
})

const mockCorridor: CorridorGeoJSON = {
  type: 'FeatureCollection',
  generated_at: '2026-10-08T14:52:16Z',
  features: [
    makeCorridorBand(0, 2),
    makeCorridorBand(2, 4),
    makeCorridorBand(4, 8),
    makeCorridorCenterline(),
  ] as CorridorGeoJSON['features'],
}

describe('filteredCorridorFeatures', () => {
  it('returns nothing for null corridor', () => {
    expect(filteredCorridorFeatures(null, 5)).toHaveLength(0)
  })
  it('shows band h0-2 only at t=0', () => {
    const feats = filteredCorridorFeatures(mockCorridor, 0)
    expect(feats.length).toBe(1)
    expect((feats[0].properties as any).hour_from).toBe(0)
  })
  it('shows bands h0-2 and h2-4 at t=2', () => {
    const feats = filteredCorridorFeatures(mockCorridor, 2)
    const bands = feats.filter(f => (f.properties as any).kind === 'band')
    expect(bands.length).toBe(2)
  })
  it('shows all 3 bands + centerline at t=5', () => {
    const feats = filteredCorridorFeatures(mockCorridor, 5)
    expect(feats.length).toBe(4)
  })
  it('hides centerline at t=0', () => {
    const feats = filteredCorridorFeatures(mockCorridor, 0)
    expect(feats.every(f => (f.properties as any).kind !== 'centerline')).toBe(true)
  })
  it('shows centerline at t=0.5', () => {
    const feats = filteredCorridorFeatures(mockCorridor, 0.5)
    expect(feats.some(f => (f.properties as any).kind === 'centerline')).toBe(true)
  })
})

// ── sourcesCentroid ───────────────────────────────────────────────────────────

describe('sourcesCentroid', () => {
  it('returns null for null input', () => expect(sourcesCentroid(null)).toBeNull())
  it('returns null for empty sources', () => {
    const sf: SourcesFile = {
      generated_at: '2026-10-08T00:00:00Z',
      sources: [],
    }
    expect(sourcesCentroid(sf)).toBeNull()
  })
  it('returns centroid for two sources', () => {
    const sf: SourcesFile = {
      generated_at: '2026-10-08T00:00:00Z',
      sources: [
        {
          id: 'a', type: 'stubble_burning', lat: 30, lon: 74,
          fire_count: 1, total_frp_mw: 10, radius_km: 5,
          first_seen: '2026-10-07T07:44:00Z', last_seen: '2026-10-07T08:00:00Z',
          confidence: 0.8, emission_strength: 0.5,
        },
        {
          id: 'b', type: 'stubble_burning', lat: 32, lon: 76,
          fire_count: 2, total_frp_mw: 20, radius_km: 8,
          first_seen: '2026-10-07T07:44:00Z', last_seen: '2026-10-07T08:00:00Z',
          confidence: 0.8, emission_strength: 0.7,
        },
      ],
    }
    const centroid = sourcesCentroid(sf)
    expect(centroid).not.toBeNull()
    expect(centroid![0]).toBeCloseTo(75)
    expect(centroid![1]).toBeCloseTo(31)
  })
})
