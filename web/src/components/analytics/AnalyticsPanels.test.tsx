import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AerisState } from '@/services/dataContext'
import type { RankedSitesFile, WindFile, SourcesFile, AqiFile, CorridorGeoJSON } from '@/types/schemas'
import RiskDistribution from './RiskDistribution'
import EtaUrgencyTimeline from './EtaUrgencyTimeline'
import WindAtmosphericSummary from './WindAtmosphericSummary'
import MetricCorrelationStrip from './MetricCorrelationStrip'
import AnalyticsView from '@/components/views/AnalyticsView'

let mockState: Partial<AerisState>
vi.mock('@/services/dataContext', () => ({
  useAeris: () => mockState,
}))

const STAMP = '2026-10-10T06:00:00Z'

function mockSitesFile(): RankedSitesFile {
  return {
    generated_at: STAMP,
    exposed_population: {
      estimate: 425000,
      low: 380000,
      high: 470000,
      data_available: true,
    },
    sites: [
      {
        rank: 1,
        site_id: 'site-1',
        name: 'Urgent City Hospital',
        type: 'hospital',
        lat: 28.6,
        lon: 77.2,
        occupancy: 450,
        eta_hours: 1.5,
        pm25_delta_ugm3: 185,
        risk_score: 0.92,
        source_id: 'src-1',
      },
      {
        rank: 2,
        site_id: 'site-2',
        name: 'Central High School',
        type: 'school',
        lat: 28.7,
        lon: 77.3,
        occupancy: 1200,
        eta_hours: 4.0,
        pm25_delta_ugm3: 95,
        risk_score: 0.72,
        source_id: 'src-1',
      },
      {
        rank: 3,
        site_id: 'site-3',
        name: 'Suburban Primary School',
        type: 'school',
        lat: 29.1,
        lon: 77.1,
        occupancy: 600,
        eta_hours: 12.0,
        pm25_delta_ugm3: 45,
        risk_score: 0.48,
        source_id: 'src-1',
      },
      {
        rank: 4,
        site_id: 'site-4',
        name: 'Rural Clinic',
        type: 'hospital',
        lat: 31.2,
        lon: 76.5,
        occupancy: 80,
        eta_hours: 30.0,
        pm25_delta_ugm3: 15,
        risk_score: 0.22,
        source_id: 'src-2',
      },
    ],
  }
}

function mockWindFile(): WindFile {
  return {
    generated_at: STAMP,
    source: 'ERA5',
    points: [
      {
        lat: 28.6,
        lon: 77.2,
        hours: [
          {
            t: STAMP,
            u_ms: -3.2,
            v_ms: -2.1,
            speed_ms: 3.8,
            dir_from_deg: 315, // NW
            pblh_m: 420,
          },
        ],
      },
    ],
  }
}

function mockSourcesFile(): SourcesFile {
  return {
    generated_at: STAMP,
    sources: [
      {
        id: 'src-1',
        type: 'agricultural_fire',
        lat: 30.5,
        lon: 75.8,
        fire_count: 14,
        total_frp_mw: 680,
        radius_km: 12,
        first_seen: STAMP,
        last_seen: STAMP,
        confidence: 0.95,
        emission_strength: 0.85,
      },
    ],
  }
}

function mockAqiFile(): AqiFile {
  return {
    generated_at: STAMP,
    stations: [
      {
        id: 'stn-delhi-1',
        name: 'Anand Vihar, Delhi',
        lat: 28.65,
        lon: 77.31,
        pm25: 340,
        pm10: 480,
        aqi: 412,
        aqi_category: 'Severe',
        observed_at: STAMP,
        source: 'CPCB',
      },
    ],
  }
}

function mockCorridorFile(): CorridorGeoJSON {
  return {
    type: 'FeatureCollection',
    generated_at: STAMP,
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[76, 29], [77, 29], [77, 30], [76, 29]]],
        },
        properties: {
          kind: 'band',
          source_id: 'src-1',
          hour_from: 0,
          hour_to: 2,
          risk: 0.85,
          pm25_delta_ugm3: 185,
        },
      },
    ],
  }
}

beforeEach(() => {
  mockState = {
    rankedSites: mockSitesFile(),
    wind: mockWindFile(),
    sources: mockSourcesFile(),
    aqi: mockAqiFile(),
    corridor: mockCorridorFile(),
    exposedPopulation: 425000,
    avgAqi: 412,
    setActiveTab: vi.fn(),
    setFlyToLocation: vi.fn(),
    interventionScenario: 'none',
    setInterventionScenario: vi.fn(),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RiskDistribution component', () => {
  it('renders risk score tiers with facility counts and occupancy', () => {
    render(<RiskDistribution />)
    expect(screen.getByText('Facility Risk Score Distribution')).toBeTruthy()
    expect(screen.getByText('Very High')).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Medium')).toBeTruthy()
    expect(screen.getByText('Low')).toBeTruthy()
    // 450 occupancy in Very High
    expect(screen.getByText('450')).toBeTruthy()
  })

  it('renders empty fallback when no sites', () => {
    mockState.rankedSites = { generated_at: STAMP, exposed_population: { estimate: 0, low: 0, high: 0 }, sites: [] }
    render(<RiskDistribution />)
    expect(screen.getByText('No facility data available.')).toBeTruthy()
  })
})

describe('EtaUrgencyTimeline component', () => {
  it('highlights immediate <2h risk receptors and provides location navigation', async () => {
    const user = userEvent.setup()
    render(<EtaUrgencyTimeline />)
    expect(screen.getByText(/1 Urgent Receptors \(<2h\)/)).toBeTruthy()

    // Click quick action to fly to location
    const locateBtn = screen.getByRole('button', { name: /Locate First/ })
    await user.click(locateBtn)
    expect(mockState.setFlyToLocation).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Urgent City Hospital' })
    )
    expect(mockState.setActiveTab).toHaveBeenCalledWith('map')
  })
})

describe('WindAtmosphericSummary component', () => {
  it('computes wind speed, cardinal direction and PBLH inversion quality', () => {
    render(<WindAtmosphericSummary />)
    expect(screen.getByText('Atmospheric Transport & Dispersion')).toBeTruthy()
    expect(screen.getByText('3.8')).toBeTruthy()
    expect(screen.getAllByText('NW').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('420')).toBeTruthy()
    expect(screen.getByText(/Poor \(Inversion Trapping\)/)).toBeTruthy()
  })

  it('displays fallback when wind data is absent', () => {
    mockState.wind = null
    render(<WindAtmosphericSummary />)
    expect(screen.getByText('Wind forecast data unavailable.')).toBeTruthy()
  })
})

describe('MetricCorrelationStrip component', () => {
  it('displays cross-domain pipeline with FRP, peak delta, and mean AQI', () => {
    render(<MetricCorrelationStrip />)
    expect(screen.getByText('Cross-Domain Signal Pipeline')).toBeTruthy()
    expect(screen.getByText('680')).toBeTruthy() // FRP MW
    expect(screen.getByText('+185')).toBeTruthy() // PM2.5 delta
    expect(screen.getByText('412')).toBeTruthy() // Mean AQI
    expect(screen.getByText(/Scientific Provenance/)).toBeTruthy()
  })
})

describe('Enhanced AnalyticsView view', () => {
  it('renders navigation tabs and switches sections correctly', async () => {
    const user = userEvent.setup()
    render(<AnalyticsView />)

    // Check KPI cards
    expect(screen.getByText('Mean Plume ΔPM2.5')).toBeTruthy()
    expect(screen.getByText('Peak Ground Station AQI')).toBeTruthy()
    expect(screen.getByText('High Heuristic Risk Receptors')).toBeTruthy()
    expect(screen.getByText('Modelled Exposed Population')).toBeTruthy()
    expect(screen.getByText('Historical Model Validation')).toBeTruthy()

    // Check station list and category chip
    expect(screen.getByText('Anand Vihar, Delhi')).toBeTruthy()
    expect(screen.getAllByText('Severe').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('PM10: 480')).toBeTruthy()

    // Switch section tab to Facilities
    const facTab = screen.getByRole('button', { name: /Facilities & Risk/ })
    await user.click(facTab)
    expect(screen.getByText('Facility Risk Score Distribution')).toBeTruthy()
    expect(screen.getByText('Plume Arrival ETA Timeline')).toBeTruthy()

    // Switch section tab to Atmospheric
    const atmoTab = screen.getByRole('button', { name: /Atmospheric & Weather/ })
    await user.click(atmoTab)
    expect(screen.getByText('Atmospheric Transport & Dispersion')).toBeTruthy()
  })

  it('contains Latitude Band column in table and histogram Y-axis ticks', () => {
    render(<AnalyticsView />)
    expect(screen.getByText('Latitude Band')).toBeTruthy()
    expect(screen.getByText('% At Risk')).toBeTruthy()
    expect(screen.getByText('Very High Risk')).toBeTruthy()
  })
})
