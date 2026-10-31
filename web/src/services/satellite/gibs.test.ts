import { describe, it, expect } from 'vitest'
import {
  GIBS_LAYERS,
  DEFAULT_GIBS_LAYER_ID,
  NASA_GIBS_ACKNOWLEDGEMENT,
  buildGibsTileUrl,
  buildGibsTileTemplateUrls,
  getModelDerivedDate,
  getSafeGibsObservationDate,
  isTodayGibsCompositeLikelyReady,
  shiftDateDays,
  resolveGibsLayer,
  isValidDateString,
  formatUtcDateString,
  buildWorldviewUrl,
} from './gibs'

describe('NASA GIBS Layer Configuration & Verification', () => {
  it('contains verified candidate sensors including NOAA-21 equivalent', () => {
    expect(GIBS_LAYERS[DEFAULT_GIBS_LAYER_ID]).toBeDefined()
    expect(GIBS_LAYERS.VIIRS_NOAA20_CorrectedReflectance_TrueColor).toBeDefined()
    expect(GIBS_LAYERS.VIIRS_NOAA21_CorrectedReflectance_TrueColor).toBeDefined()
    expect(GIBS_LAYERS.VIIRS_SNPP_CorrectedReflectance_TrueColor).toBeDefined()
    expect(GIBS_LAYERS.MODIS_Terra_CorrectedReflectance_TrueColor).toBeDefined()
    expect(GIBS_LAYERS.MODIS_Aqua_CorrectedReflectance_TrueColor).toBeDefined()
  })

  it('uses GoogleMapsCompatible_Level9 and maxZoom 9 across all true color layers', () => {
    for (const layer of Object.values(GIBS_LAYERS)) {
      expect(layer.tileMatrixSet).toBe('GoogleMapsCompatible_Level9')
      expect(layer.maxZoom).toBe(9)
      expect(layer.format).toBe('image/jpeg')
      expect(layer.period).toBe('P1D')
    }
  })

  it('contains the exact NASA GIBS acknowledgement line', () => {
    expect(NASA_GIBS_ACKNOWLEDGEMENT).toBe(
      "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
    )
  })

  it('resolves unknown layer IDs to the default NOAA-20 VIIRS layer', () => {
    expect(resolveGibsLayer(null).id).toBe(DEFAULT_GIBS_LAYER_ID)
    expect(resolveGibsLayer(undefined).id).toBe(DEFAULT_GIBS_LAYER_ID)
    expect(resolveGibsLayer('unknown_sensor').id).toBe(DEFAULT_GIBS_LAYER_ID)
    expect(resolveGibsLayer('VIIRS_NOAA21_CorrectedReflectance_TrueColor').id).toBe(
      'VIIRS_NOAA21_CorrectedReflectance_TrueColor'
    )
  })
})

describe('GIBS URL Builder', () => {
  it('correctly constructs WMTS RESTful tile URL template with placeholders', () => {
    const url = buildGibsTileUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '2026-10-08')
    expect(url).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-10-08/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'
    )
  })

  it('fills numeric tile coordinates and custom subdomains when provided', () => {
    const url = buildGibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', '2026-10-24', {
      subdomain: 'b',
      z: 6,
      y: 27,
      x: 45,
    })
    expect(url).toBe(
      'https://gibs-b.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-10-24/GoogleMapsCompatible_Level9/6/27/45.jpg'
    )
  })

  it('builds round-robin template URLs for gibs-a, gibs-b, gibs-c', () => {
    const urls = buildGibsTileTemplateUrls('VIIRS_SNPP_CorrectedReflectance_TrueColor', '2026-10-08')
    expect(urls).toHaveLength(3)
    expect(urls[0]).toContain('https://gibs-a.earthdata.nasa.gov')
    expect(urls[1]).toContain('https://gibs-b.earthdata.nasa.gov')
    expect(urls[2]).toContain('https://gibs-c.earthdata.nasa.gov')
    expect(urls[0]).toContain('VIIRS_SNPP_CorrectedReflectance_TrueColor')
    expect(urls[0]).toContain('2026-10-08')
  })

  it('rejects invalid or malformed dates', () => {
    expect(() => buildGibsTileUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'invalid-date')).toThrow()
    expect(() => buildGibsTileUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '2026/10/08')).toThrow()
    expect(() => buildGibsTileUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '2026-02-31')).toThrow()
    expect(() => buildGibsTileTemplateUrls('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '')).toThrow()
  })
})

describe('Date Helpers & Default Date Logic', () => {
  it('validates YYYY-MM-DD date strings accurately', () => {
    expect(isValidDateString('2026-10-08')).toBe(true)
    expect(isValidDateString('2026-02-28')).toBe(true)
    expect(isValidDateString('2026-02-29')).toBe(false) // 2026 is not a leap year
    expect(isValidDateString('2024-02-29')).toBe(true)  // 2024 is a leap year
    expect(isValidDateString('2026-13-01')).toBe(false)
    expect(isValidDateString('bad')).toBe(false)
  })

  it('derives default date from archived run forecast_start and chosen horizon', () => {
    const forecastStart = '2026-10-08T06:00:00Z'
    const simulatedNow = new Date('2026-10-25T12:00:00Z')

    // 08 Oct 06:00 UTC + 4h = 08 Oct 10:00 UTC -> 2026-10-08
    expect(getModelDerivedDate(forecastStart, 4, simulatedNow)).toBe('2026-10-08')

    // 08 Oct 06:00 UTC + 20h = 09 Oct 02:00 UTC -> 2026-10-09
    expect(getModelDerivedDate(forecastStart, 20, simulatedNow)).toBe('2026-10-09')
  })

  it('clamps future forecast times to today UTC date so future dates are never requested', () => {
    const today = new Date('2026-10-25T08:00:00Z')
    const forecastStart = '2026-10-25T18:00:00Z'

    // 25 Oct 18:00 UTC + 24h = 26 Oct 18:00 UTC -> should clamp to today (2026-10-25)
    expect(getModelDerivedDate(forecastStart, 24, today)).toBe('2026-10-25')
  })

  it('falls back to today UTC when forecast_start is missing or invalid', () => {
    const today = new Date('2026-10-25T12:00:00Z')
    expect(getModelDerivedDate(null, 4, today)).toBe('2026-10-25')
    expect(getModelDerivedDate(undefined, 8, today)).toBe('2026-10-25')
    expect(getModelDerivedDate('corrupt-date', 2, today)).toBe('2026-10-25')
  })

  it('shifts dates forward and backward cleanly', () => {
    expect(shiftDateDays('2026-10-08', 1, '2026-10-25')).toBe('2026-10-09')
    expect(shiftDateDays('2026-10-08', -1, '2026-10-25')).toBe('2026-10-07')
    expect(shiftDateDays('2026-10-01', -1, '2026-10-25')).toBe('2026-09-30')
    // Clamping to max date
    expect(shiftDateDays('2026-10-25', 1, '2026-10-25')).toBe('2026-10-25')
  })

  it('safely determines when today composite is published (after 15:00 UTC)', () => {
    expect(isTodayGibsCompositeLikelyReady(new Date('2026-10-25T10:00:00Z'))).toBe(false)
    expect(isTodayGibsCompositeLikelyReady(new Date('2026-10-25T14:59:59Z'))).toBe(false)
    expect(isTodayGibsCompositeLikelyReady(new Date('2026-10-25T15:00:00Z'))).toBe(true)
    expect(isTodayGibsCompositeLikelyReady(new Date('2026-10-25T20:00:00Z'))).toBe(true)
  })

  it('automatically falls back to yesterday when requesting today before 15:00 UTC', () => {
    const morning = new Date('2026-10-25T08:00:00Z')
    const safeMorning = getSafeGibsObservationDate('2026-10-25T06:00:00Z', 0, morning)
    expect(safeMorning.date).toBe('2026-10-24')
    expect(safeMorning.isYesterdayFallback).toBe(true)

    const evening = new Date('2026-10-25T16:00:00Z')
    const safeEvening = getSafeGibsObservationDate('2026-10-25T06:00:00Z', 0, evening)
    expect(safeEvening.date).toBe('2026-10-25')
    expect(safeEvening.isYesterdayFallback).toBe(false)
  })
})

describe('NASA Worldview Link Builder', () => {
  it('generates verified Worldview URL containing layers, coordinates, and date', () => {
    const url = buildWorldviewUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '2026-10-08')
    expect(url).toContain('https://worldview.earthdata.nasa.gov/')
    expect(url).toContain('VIIRS_NOAA20_CorrectedReflectance_TrueColor')
    expect(url).toContain('t=2026-10-08')
    expect(url).toContain('v=')
  })
})
