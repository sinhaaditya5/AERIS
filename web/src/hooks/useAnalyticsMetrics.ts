/**
 * useAnalyticsMetrics — Memoized analytics derivations for the Analytics & Trends tab.
 * Centralises all useMemo computations so individual panels stay lean.
 */
import { useMemo } from 'react'
import { useAeris } from '@/services/dataContext'
import { getRiskLevel } from '@/types/schemas'
import type { RankedSite, AqiStation } from '@/types/schemas'

export interface RiskBuckets {
  veryHigh: RankedSite[]
  high: RankedSite[]
  medium: RankedSite[]
  low: RankedSite[]
}

export interface EtaBucket {
  label: string
  key: string
  min: number
  max: number
  color: string
  sites: RankedSite[]
}

export interface LatitudeBand {
  district: string
  count: number
  maxDelta: number
  totalOcc: number
  vhCount: number
  pctAtRisk: number
}

export interface StationStat {
  station: AqiStation
  aqiClass: string
}

export interface AnalyticsMetrics {
  sites: RankedSite[]
  schools: RankedSite[]
  hospitals: RankedSite[]
  schoolOccupancy: number
  hospitalOccupancy: number

  meanDelta: number | null
  maxStationAqi: { aqi: number | null; name: string }
  severeSiteCount: number
  totalFrp: number

  riskBuckets: RiskBuckets
  popAtRiskByTier: { veryHigh: number; high: number; medium: number; low: number }

  etaBuckets: EtaBucket[]

  histogramBins: { range: string; min: number; max: number; schools: number; hospitals: number; total: number }[]
  maxBinCount: number

  districtGroups: LatitudeBand[]

  stationRows: StationStat[]
}

const ETA_BUCKET_DEFS: Omit<EtaBucket, 'sites'>[] = [
  { label: '<2h',   key: 'critical', min: 0,  max: 2,        color: 'var(--risk-critical)' },
  { label: '2–8h',  key: 'urgent',   min: 2,  max: 8,        color: 'var(--risk-high)' },
  { label: '8–24h', key: 'moderate', min: 8,  max: 24,       color: 'var(--risk-caution)' },
  { label: '>24h',  key: 'low',      min: 24, max: Infinity,  color: 'var(--risk-ok)' },
]

const HIST_BINS = [
  { range: '0–50',  min: 0,   max: 50,       schools: 0, hospitals: 0, total: 0 },
  { range: '50–100', min: 50, max: 100,       schools: 0, hospitals: 0, total: 0 },
  { range: '100–150', min: 100, max: 150,     schools: 0, hospitals: 0, total: 0 },
  { range: '150–200', min: 150, max: 200,     schools: 0, hospitals: 0, total: 0 },
  { range: '≥200',  min: 200, max: Infinity,  schools: 0, hospitals: 0, total: 0 },
]

export function useAnalyticsMetrics(): AnalyticsMetrics {
  const { rankedSites, aqi, sources } = useAeris()

  const sites = useMemo(() => rankedSites?.sites ?? [], [rankedSites])
  const stations = useMemo(() => aqi?.stations ?? [], [aqi])

  // --- Facility splits ---
  const schools = useMemo(() => sites.filter(s => s.type === 'school'), [sites])
  const hospitals = useMemo(() => sites.filter(s => s.type === 'hospital'), [sites])

  const schoolOccupancy = useMemo(
    () => schools.reduce((acc, s) => acc + (s.occupancy ?? 0), 0),
    [schools]
  )
  const hospitalOccupancy = useMemo(
    () => hospitals.reduce((acc, s) => acc + (s.occupancy ?? 0), 0),
    [hospitals]
  )

  // --- KPI summary ---
  const meanDelta = useMemo(() => {
    if (!sites.length) return null
    const sum = sites.reduce((acc, s) => acc + s.pm25_delta_ugm3, 0)
    return Math.round((sum / sites.length) * 10) / 10
  }, [sites])

  const maxStationAqi = useMemo(() => {
    const valid = stations.filter(s => s.aqi != null)
    if (!valid.length) return { aqi: null, name: 'Unavailable' }
    let top = valid[0]
    for (const s of valid) {
      if (s.aqi! > top.aqi!) top = s
    }
    return { aqi: top.aqi!, name: top.name }
  }, [stations])

  const severeSiteCount = useMemo(
    () => sites.filter(s => s.risk_score >= 0.65).length,
    [sites]
  )

  const totalFrp = useMemo(
    () => sources?.sources.reduce((acc, s) => acc + s.total_frp_mw, 0) ?? 0,
    [sources]
  )

  // --- Risk distribution ---
  const riskBuckets = useMemo<RiskBuckets>(() => ({
    veryHigh: sites.filter(s => getRiskLevel(s.risk_score) === 'very-high'),
    high:     sites.filter(s => getRiskLevel(s.risk_score) === 'high'),
    medium:   sites.filter(s => getRiskLevel(s.risk_score) === 'medium'),
    low:      sites.filter(s => getRiskLevel(s.risk_score) === 'low'),
  }), [sites])

  const popAtRiskByTier = useMemo(() => {
    const occ = (arr: RankedSite[]) => arr.reduce((acc, s) => acc + (s.occupancy ?? 0), 0)
    return {
      veryHigh: occ(riskBuckets.veryHigh),
      high:     occ(riskBuckets.high),
      medium:   occ(riskBuckets.medium),
      low:      occ(riskBuckets.low),
    }
  }, [riskBuckets])

  // --- ETA buckets ---
  const etaBuckets = useMemo<EtaBucket[]>(() =>
    ETA_BUCKET_DEFS.map(def => ({
      ...def,
      sites: sites.filter(s => s.eta_hours >= def.min && s.eta_hours < def.max),
    })),
    [sites]
  )

  // --- PM2.5 Histogram ---
  const histogramBins = useMemo(() => {
    const bins = HIST_BINS.map(b => ({ ...b }))
    sites.forEach(s => {
      const b = bins.find(bin => s.pm25_delta_ugm3 >= bin.min && s.pm25_delta_ugm3 < bin.max)
      if (b) {
        b.total++
        if (s.type === 'school') b.schools++
        else b.hospitals++
      }
    })
    return bins
  }, [sites])

  const maxBinCount = useMemo(
    () => Math.max(1, ...histogramBins.map(b => b.total)),
    [histogramBins]
  )

  // --- District/latitude bands ---
  const districtGroups = useMemo<LatitudeBand[]>(() => {
    const map = new Map<string, Omit<LatitudeBand, 'district' | 'pctAtRisk'>>()
    sites.forEach(s => {
      let district = 'Latitude ≤29.3°N'
      if (s.lat > 31.0) district = 'Latitude >31°N'
      else if (s.lat > 30.5) district = 'Latitude (30.5,31]°N'
      else if (s.lat > 30.0) district = 'Latitude (30,30.5]°N'
      else if (s.lat > 29.3) district = 'Latitude (29.3,30]°N'
      const existing = map.get(district) ?? { count: 0, maxDelta: 0, totalOcc: 0, vhCount: 0 }
      existing.count++
      existing.maxDelta = Math.max(existing.maxDelta, s.pm25_delta_ugm3)
      existing.totalOcc += s.occupancy ?? 0
      if (s.risk_score >= 0.85) existing.vhCount++
      map.set(district, existing)
    })
    return Array.from(map.entries()).map(([district, data]) => ({
      district,
      ...data,
      pctAtRisk: data.count > 0 ? Math.round((data.vhCount / data.count) * 100) : 0,
    }))
  }, [sites])

  // --- Station rows with AQI class ---
  const stationRows = useMemo<StationStat[]>(() =>
    stations.map(st => {
      const aqiVal = st.aqi
      const aqiClass = aqiVal == null ? '' : aqiVal > 400 ? 'badge-vh' : aqiVal > 300 ? 'badge-h' : 'badge-m'
      return { station: st, aqiClass }
    }),
    [stations]
  )

  return {
    sites, schools, hospitals, schoolOccupancy, hospitalOccupancy,
    meanDelta, maxStationAqi, severeSiteCount, totalFrp,
    riskBuckets, popAtRiskByTier,
    etaBuckets,
    histogramBins, maxBinCount,
    districtGroups,
    stationRows,
  }
}

