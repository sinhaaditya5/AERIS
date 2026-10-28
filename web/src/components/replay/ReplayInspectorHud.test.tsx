import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReplayInspectorHud, { type ReplayInspectorTarget } from './ReplayInspectorHud'
import type { RankedSite, Source, SiteAction } from '@/types/schemas'

const mockSite: RankedSite = {
  rank: 1,
  site_id: 's_0446',
  name: 'Akash Hospital, Ballabgarh',
  type: 'hospital',
  lat: 28.328,
  lon: 77.294,
  occupancy: 1200,
  eta_hours: 6.5,
  pm25_delta_ugm3: 18.4,
  risk_score: 0.88,
  source_id: 'src_001',
}

const mockDirective: SiteAction = {
  priority: 1,
  site_id: 's_0446',
  who: 'Medical Director, Akash Hospital',
  action: 'Activate hospital HVAC HEPA filtration in ICU wards',
  reason: 'ETA 6.5h, forecast PM2.5 delta +18.4 µg/m³',
  deadline_hours: 6.5,
}

const mockSource: Source = {
  id: 'src_001',
  type: 'candidate',
  lat: 30.245,
  lon: 74.882,
  fire_count: 215,
  total_frp_mw: 676,
  radius_km: 12,
  first_seen: '2026-10-09T02:00:00Z',
  last_seen: '2026-10-09T05:30:00Z',
  confidence: 0.95,
  emission_strength: 0.99,
  territory: 'india',
}

describe('ReplayInspectorHud', () => {
  it('renders site details with approaching status when currentTHours < eta_hours', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'site',
      site: mockSite,
      actionDirective: mockDirective,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={3.0}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText('Akash Hospital, Ballabgarh')).toBeTruthy()
    expect(screen.getByText('🏥 Hospital')).toBeTruthy()
    expect(screen.getByText(/Approaching/)).toBeTruthy()
    expect(screen.getByText(/Arrival in ~3.5h/)).toBeTruthy()
    expect(screen.getByText('~6.5h')).toBeTruthy()
    expect(screen.getByText('+18 µg/m³')).toBeTruthy()
    expect(screen.getByText(/Priority #1 Mitigation Directive/)).toBeTruthy()
    expect(screen.getByText(/Activate hospital HVAC HEPA filtration/)).toBeTruthy()
  })

  it('renders arrived status when currentTHours >= eta_hours', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'site',
      site: mockSite,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={7.0}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText(/Smoke Front Reached/)).toBeTruthy()
    expect(screen.getByText(/T\+6.5h arrival/)).toBeTruthy()
  })

  it('triggers onFocus and onClose button clicks', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'site',
      site: mockSite,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={2.0}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    await user.click(screen.getByRole('button', { name: /Focus Receptor/i }))
    expect(onFocus).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /Close inspector/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key press', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'site',
      site: mockSite,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={2.0}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders fire cluster details for source target', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'source',
      source: mockSource,
      isPeak: true,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={0}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText('Cluster #src_001')).toBeTruthy()
    expect(screen.getByText('🔥 Fire Cluster')).toBeTruthy()
    expect(screen.getByText(/PEAK EMITTER/)).toBeTruthy()
    expect(screen.getByText('676 MW')).toBeTruthy()
    expect(screen.getByText('215')).toBeTruthy()
    expect(screen.getByText('95%')).toBeTruthy()
  })

  it('renders milestone details for waypoint target', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: ReplayInspectorTarget = {
      type: 'waypoint',
      eta: 12,
    }

    render(
      <ReplayInspectorHud
        target={target}
        currentTHours={6}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText(/T\+12 Hours Transport Milestone/)).toBeTruthy()
    expect(screen.getByText('⏱️ Corridor Waypoint')).toBeTruthy()
    expect(screen.getByText('Centerline trajectory marker')).toBeTruthy()
  })
})
