import type { FeatureCollection, Point, Feature } from 'geojson'
import { getRiskLevel, type CorridorGeoJSON, type RankedSitesFile, type WindFile } from '../../types/schemas'
import { isValidSubcontinentCoord } from './mapStyles'

export function corridorAtHorizon(corridor: CorridorGeoJSON | null, horizon: number) {
  return { type: 'FeatureCollection' as const, features: (corridor?.features ?? []).filter(f => f.properties.kind === 'centerline' || f.properties.hour_from <= horizon) }
}

export function etaMilestones(corridor: CorridorGeoJSON | null): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: (corridor?.features ?? []).flatMap(f => {
    if (f.properties.kind !== 'centerline' || f.geometry.type !== 'LineString') return []
    const coordinates = f.geometry.coordinates
    return f.properties.points_eta_hours.flatMap((eta, index) => [2, 4, 8, 12, 18, 24].includes(eta) && coordinates[index] ? [{
      type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: coordinates[index] },
      properties: { eta, label: `${f.properties.source_id} +${eta}h` },
    }] : [])
  }) }
}

export function windVectorsGeoJson(wind: WindFile | null): FeatureCollection {
  if (!wind?.points || !Array.isArray(wind.points)) return { type: 'FeatureCollection', features: [] }
  const features: Feature[] = []
  for (const pt of wind.points) {
    if (!isValidSubcontinentCoord(pt.lat, pt.lon)) continue
    const hour = pt.hours?.[0]
    if (!hour || typeof hour.speed_ms !== 'number' || !Number.isFinite(hour.speed_ms) || hour.speed_ms <= 0.1) continue
    const u = hour.u_ms
    const v = hour.v_ms
    if (!Number.isFinite(u) || !Number.isFinite(v)) continue
    const speed = Math.max(hour.speed_ms, 0.5)
    // Scale line length to ~0.16 degrees for cartographic clarity
    const scale = 0.16
    const dLon = (u / speed) * scale
    const dLat = (v / speed) * scale
    const flowAngle = (Math.atan2(u, v) * 180 / Math.PI + 360) % 360

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [pt.lon, pt.lat],
          [pt.lon + dLon, pt.lat + dLat],
        ],
      },
      properties: {
        speed_ms: hour.speed_ms,
        speed_kmh: Math.round(hour.speed_ms * 3.6),
        dir_from_deg: hour.dir_from_deg,
        flow_angle: flowAngle,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function receptorsGeoJson(rankedSites: RankedSitesFile | null): FeatureCollection {
  if (!rankedSites?.sites || !Array.isArray(rankedSites.sites)) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: rankedSites.sites
      .filter(site => isValidSubcontinentCoord(site.lat, site.lon))
      .map(site => {
        const riskTier = getRiskLevel(site.risk_score)
        return {
          type: 'Feature',
          id: site.site_id,
          geometry: {
            type: 'Point',
            coordinates: [site.lon, site.lat],
          },
          properties: {
            site_id: site.site_id,
            name: site.name,
            type: site.type,
            risk_score: site.risk_score,
            risk_tier: riskTier,
            eta_hours: site.eta_hours,
            pm25_delta_ugm3: site.pm25_delta_ugm3,
            occupancy: site.occupancy,
          },
        }
      }),
  }
}
