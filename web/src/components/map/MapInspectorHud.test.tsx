import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MapInspectorHud, { type InspectorTarget } from './MapInspectorHud'
import type { RankedSite, Source, SiteAction } from '@/types/schemas'

const mockSite: RankedSite = {
  rank: 1,
  site_id: 's_0446',
  name: 'Akash Hospital, Ballabgarh',
  type: 'hospital',
  lat: 28.328,
  lon: 77.294,
  occupancy: 1200,
  eta_hours: 0.5,
  pm25_delta_ugm3: 15.0,
  risk_score: 0.88,
  source_id: 'src_001',
}

const mockDirective: SiteAction = {
  priority: 1,
  site_id: 's_0446',
  who: 'Medical Director, Akash Hospital',
  action: 'Activate hospital HVAC HEPA filtration in ICU wards',
  reason: 'ETA 0.5h, forecast PM2.5 delta +15 µg/m³',
  deadline_hours: 0.5,
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

describe('MapInspectorHud', () => {
  it('renders site details with risk tier and actionable emergency directive', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()
    const onOpenActions = vi.fn()
    const onOpenFullMap = vi.fn()

    const target: InspectorTarget = {
      type: 'site',
      site: mockSite,
      actionDirective: mockDirective,
    }

    render(
      <MapInspectorHud
        target={target}
        onClose={onClose}
        onFocus={onFocus}
        onOpenActionsModal={onOpenActions}
        onOpenFullMap={onOpenFullMap}
      />
    )

    expect(screen.getByText('Akash Hospital, Ballabgarh')).toBeTruthy()
    expect(screen.getByText('🏥 Hospital')).toBeTruthy()
    expect(screen.getByText(/Very High/)).toBeTruthy()
    expect(screen.getByText('~0.5h')).toBeTruthy()
    expect(screen.getByText('+15 µg/m³')).toBeTruthy()
    expect(screen.getByText('Priority #1 Mitigation')).toBeTruthy()
    expect(screen.getByText(/Medical Director, Akash Hospital/)).toBeTruthy()
    expect(screen.getByText(/Activate hospital HVAC HEPA filtration/)).toBeTruthy()
  })

  it('triggers onFocus, onOpenActionsModal, and onOpenFullMap button clicks', async () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()
    const onOpenActions = vi.fn()
    const onOpenFullMap = vi.fn()

    const target: InspectorTarget = {
      type: 'site',
      site: mockSite,
      actionDirective: mockDirective,
    }

    render(
      <MapInspectorHud
        target={target}
        onClose={onClose}
        onFocus={onFocus}
        onOpenActionsModal={onOpenActions}
        onOpenFullMap={onOpenFullMap}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Focus Site' }))
    expect(onFocus).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Action Plan' }))
    expect(onOpenActions).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Full Map' }))
    expect(onOpenFullMap).toHaveBeenCalledOnce()
  })

  it('renders fire cluster details in source mode', () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: InspectorTarget = {
      type: 'source',
      source: mockSource,
      isPeak: true,
    }

    render(
      <MapInspectorHud
        target={target}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText('Source Cluster #src_001')).toBeTruthy()
    expect(screen.getByText('⚡ PEAK EMITTER')).toBeTruthy()
    expect(screen.getByText('676 MW')).toBeTruthy()
    expect(screen.getByText('215')).toBeTruthy()
    expect(screen.getByText('95%')).toBeTruthy()
    expect(screen.getByText(/India \(Punjab\/Haryana\)/)).toBeTruthy()
  })

  it('closes on close button click and on Escape key press', async () => {
    const onClose = vi.fn()
    const onFocus = vi.fn()

    const target: InspectorTarget = {
      type: 'waypoint',
      eta: 4,
    }

    render(
      <MapInspectorHud
        target={target}
        onClose={onClose}
        onFocus={onFocus}
      />
    )

    expect(screen.getByText('T+4 Hours Trajectory Milestone')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Close waypoint inspector' }))
    expect(onClose).toHaveBeenCalledOnce()

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
