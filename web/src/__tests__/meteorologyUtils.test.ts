import { describe, it, expect } from 'vitest'
import {
  weatherPath,
  findNearestGridPoint,
  convertWindSpeed,
  getVentilationTier,
  getStagnationRisk,
  getBeaufortScale,
  isDelhiInflowSector,
  isNocturnalHour,
  computeWindRose,
  METEOROLOGICAL_PRESETS,
  SECTORS,
} from '@/utils/meteorologyUtils'
import type { WindPoint, WindHour } from '@/types/schemas'

describe('meteorologyUtils pure functions', () => {
  describe('weatherPath', () => {
    it('generates expected SVG path and matches regression requirement', () => {
      expect(weatherPath([100, null, 0], 100)).toMatch(/^M50\.0,20\.0 M730\.0,185\.0$/)
    })

    it('generates an enclosed area path when area=true', () => {
      const path = weatherPath([50, 100], 100, true)
      expect(path).toContain('Z')
      expect(path).toContain('L730.0,185')
    })

    it('returns empty string for empty or all-null arrays', () => {
      expect(weatherPath([], 100)).toBe('')
      expect(weatherPath([null, null], 100)).toBe('')
    })
  })

  describe('findNearestGridPoint', () => {
    const mockPoints: WindPoint[] = [
      { lat: 28.5, lon: 77.2, hours: [] },
      { lat: 30.2, lon: 75.8, hours: [] },
      { lat: 31.6, lon: 74.9, hours: [] },
    ]

    it('snaps accurately to the closest candidate', () => {
      const nearest = findNearestGridPoint(28.52, 77.19, mockPoints)
      expect(nearest).not.toBeNull()
      expect(nearest?.lat).toBe(28.5)
      expect(nearest?.lon).toBe(77.2)
    })

    it('returns null on empty or null points array', () => {
      expect(findNearestGridPoint(28.5, 77.2, [])).toBeNull()
      expect(findNearestGridPoint(28.5, 77.2, null)).toBeNull()
    })
  })

  describe('convertWindSpeed', () => {
    it('converts to km/h by default', () => {
      const res = convertWindSpeed(10, 'kmh')
      expect(res.primaryVal).toBe('36.0')
      expect(res.primaryUnit).toBe('km/h')
      expect(res.secondaryVal).toBe('10.00')
      expect(res.secondaryUnit).toBe('m/s')
    })

    it('converts to m/s when specified', () => {
      const res = convertWindSpeed(5.25, 'ms')
      expect(res.primaryVal).toBe('5.25')
      expect(res.primaryUnit).toBe('m/s')
      expect(res.secondaryVal).toBe('18.9')
      expect(res.secondaryUnit).toBe('km/h')
    })

    it('converts to knots when specified', () => {
      const res = convertWindSpeed(10, 'knots')
      expect(res.primaryVal).toBe('19.4')
      expect(res.primaryUnit).toBe('kt')
    })

    it('handles negative or invalid numbers safely', () => {
      const res = convertWindSpeed(-5, 'kmh')
      expect(res.primaryVal).toBe('0.0')
    })
  })

  describe('getVentilationTier', () => {
    it('identifies critical poor ventilation below 2,000 m²/s', () => {
      const tier = getVentilationTier(1500)
      expect(tier.tier).toBe('poor')
      expect(tier.label).toContain('Poor')
      expect(tier.badgeClass).toBe('pill-danger')
    })

    it('identifies moderate ventilation between 2,000 and 6,000 m²/s', () => {
      const tier = getVentilationTier(3500)
      expect(tier.tier).toBe('moderate')
      expect(tier.badgeClass).toBe('pill-moderate')
    })

    it('identifies good ventilation above 6,000 m²/s', () => {
      const tier = getVentilationTier(8000)
      expect(tier.tier).toBe('good')
      expect(tier.badgeClass).toBe('pill-ok')
    })

    it('handles null and invalid values safely', () => {
      const tier = getVentilationTier(null)
      expect(tier.tier).toBe('unknown')
      expect(tier.badgeClass).toBe('pill-neutral')
    })
  })

  describe('getStagnationRisk', () => {
    it('identifies severe inversion trap under calm winds and collapsed PBLH', () => {
      const res = getStagnationRisk(1.2, 180)
      expect(res.level).toBe('critical')
      expect(res.badgeClass).toBe('pill-danger')
    })

    it('identifies favorable dispersion when mixing is deep', () => {
      const res = getStagnationRisk(5.0, 1500)
      expect(res.level).toBe('favorable')
      expect(res.badgeClass).toBe('pill-ok')
    })

    it('handles null PBLH safely', () => {
      const res = getStagnationRisk(2.0, null)
      expect(res.level).toBe('unknown')
    })
  })

  describe('getBeaufortScale', () => {
    it('classifies speeds accurately across thresholds', () => {
      expect(getBeaufortScale(0.2).description).toBe('Calm')
      expect(getBeaufortScale(1.0).description).toBe('Light Air')
      expect(getBeaufortScale(2.5).description).toBe('Light Breeze')
      expect(getBeaufortScale(4.5).description).toBe('Gentle Breeze')
      expect(getBeaufortScale(6.5).description).toBe('Moderate Breeze')
      expect(getBeaufortScale(9.5).description).toBe('Fresh Breeze')
      expect(getBeaufortScale(12.0).description).toBe('Strong Breeze')
      expect(getBeaufortScale(15.0).description).toBe('Near Gale / Gale')
    })
  })

  describe('isDelhiInflowSector', () => {
    it('flags North-Westerly directions between 280° and 340°', () => {
      expect(isDelhiInflowSector(315)).toBe(true) // NW
      expect(isDelhiInflowSector(290)).toBe(true) // WNW
      expect(isDelhiInflowSector(335)).toBe(true) // NNW
    })

    it('rejects easterly, southerly, and divergent directions', () => {
      expect(isDelhiInflowSector(90)).toBe(false)  // E
      expect(isDelhiInflowSector(180)).toBe(false) // S
      expect(isDelhiInflowSector(45)).toBe(false)  // NE
      expect(isDelhiInflowSector(260)).toBe(false) // WSW
    })
  })

  describe('isNocturnalHour', () => {
    it('identifies nocturnal hours in IST (18:00 to 06:00 IST)', () => {
      // 18:30 UTC = 00:00 IST (Midnight) -> Nocturnal
      expect(isNocturnalHour('2026-10-06T18:30:00Z')).toBe(true)
      // 22:30 UTC = 04:00 IST (Pre-dawn) -> Nocturnal
      expect(isNocturnalHour('2026-10-06T22:30:00Z')).toBe(true)
      // 06:30 UTC = 12:00 IST (Noon) -> Daytime
      expect(isNocturnalHour('2026-10-06T06:30:00Z')).toBe(false)
    })
  })

  describe('computeWindRose', () => {
    it('aggregates frequencies and highlights inflow corridor', () => {
      const mockHours: WindHour[] = [
        { t: '2026-10-06T00:00:00Z', u_ms: 1, v_ms: 1, speed_ms: 3, dir_from_deg: 0, pblh_m: 500 }, // N
        { t: '2026-10-06T01:00:00Z', u_ms: 1, v_ms: 1, speed_ms: 4, dir_from_deg: 315, pblh_m: 600 }, // NW (inflow)
      ]

      const rose = computeWindRose(mockHours)
      expect(rose).toHaveLength(16)
      const nSector = rose.find(r => r.sector === 'N')
      const nwSector = rose.find(r => r.sector === 'NW')

      expect(nSector?.count).toBe(1)
      expect(nSector?.percent).toBe(50)
      expect(nSector?.isInflowCorridor).toBe(false)

      expect(nwSector?.count).toBe(1)
      expect(nwSector?.percent).toBe(50)
      expect(nwSector?.isInflowCorridor).toBe(true)
    })
  })

  describe('METEOROLOGICAL_PRESETS', () => {
    it('includes all original 6 presets with exact coordinates for backward compatibility', () => {
      const delhi = METEOROLOGICAL_PRESETS.find(p => p.name.startsWith('Delhi NCR'))
      expect(delhi?.lat).toBe(28.5)
      expect(delhi?.lon).toBe(77.2)

      const sangrur = METEOROLOGICAL_PRESETS.find(p => p.name.startsWith('Sangrur'))
      expect(sangrur?.lat).toBe(30.2)
      expect(sangrur?.lon).toBe(75.8)
    })

    it('contains expanded presets across Delhi NCR, Punjab, and Haryana', () => {
      expect(METEOROLOGICAL_PRESETS.length).toBeGreaterThanOrEqual(18)
      expect(METEOROLOGICAL_PRESETS.some(p => p.region === 'Delhi NCR')).toBe(true)
      expect(METEOROLOGICAL_PRESETS.some(p => p.region === 'Punjab')).toBe(true)
      expect(METEOROLOGICAL_PRESETS.some(p => p.region === 'Haryana')).toBe(true)
    })
  })
})

