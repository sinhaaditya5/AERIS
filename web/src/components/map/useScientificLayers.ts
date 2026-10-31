import { useEffect, type RefObject } from 'react'
import type { Map, GeoJSONSource } from 'maplibre-gl'
import type { BasemapMode } from '../../services/dataContext'
import type { CorridorGeoJSON, RankedSitesFile, WindFile } from '../../types/schemas'
import { setupMapLayers } from './mapStyles'
import { corridorAtHorizon, etaMilestones, windVectorsGeoJson, receptorsGeoJson } from './mapData'
import type { ObservationHeatmap } from './heatmap'

interface Options {
  mode: BasemapMode
  corridor: CorridorGeoJSON | null
  horizon: number
  heatmap: ObservationHeatmap
  heatmapEnabled: boolean
  opacity: number
  showPlume?: boolean
  showBorder?: boolean
  supported: boolean
  wind?: WindFile | null
  rankedSites?: RankedSitesFile | null
  selectedSiteId?: string | null
  showWind?: boolean
  showReceptors?: boolean
}

// Rehydrate the current data on every style load. No polling timers survive unmount.
export function useScientificLayers(mapRef: RefObject<Map | null>, options: Options) {
  const {
    mode,
    corridor,
    horizon,
    heatmap,
    heatmapEnabled,
    opacity,
    showPlume = true,
    showBorder = true,
    supported,
    wind = null,
    rankedSites = null,
    selectedSiteId = null,
    showWind = true,
    showReceptors = true,
  } = options

  useEffect(() => {
    const map = mapRef.current
    if (!map || !supported) return
    const sync = () => {
      setupMapLayers(map, mode)
      const source = map.getSource('corridor') as GeoJSONSource
      if (source) {
        source.setData(corridorAtHorizon(corridor, horizon) as Parameters<GeoJSONSource['setData']>[0])
      }
      const etaSource = map.getSource('corridor-eta') as GeoJSONSource
      if (etaSource) {
        etaSource.setData(etaMilestones(corridor))
      }
      for (const id of ['plume-fill', 'plume-line', 'plume-centerline', 'corridor-eta-circles', 'corridor-eta-labels']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showPlume ? 'visible' : 'none')
      }
      for (const id of ['india-border-line', 'india-border-halo']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showBorder ? 'visible' : 'none')
      }

      // Atmospheric wind vectors
      if (map.getSource('wind-vectors')) {
        const windData = windVectorsGeoJson(wind)
        ;(map.getSource('wind-vectors') as GeoJSONSource).setData(windData as Parameters<GeoJSONSource['setData']>[0])
        const windVis = showWind ? 'visible' : 'none'
        if (map.getLayer('wind-vectors-line')) map.setLayoutProperty('wind-vectors-line', 'visibility', windVis)
        if (map.getLayer('wind-vectors-arrows')) map.setLayoutProperty('wind-vectors-arrows', 'visibility', windVis)
      }

      // Sensitive receptors WebGL layer
      if (map.getSource('ranked-receptors')) {
        const receptorsData = receptorsGeoJson(rankedSites)
        ;(map.getSource('ranked-receptors') as GeoJSONSource).setData(receptorsData as Parameters<GeoJSONSource['setData']>[0])
        const receptorsVis = showReceptors ? 'visible' : 'none'
        for (const id of ['receptor-circles', 'receptor-symbols', 'receptor-selection-halo']) {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', receptorsVis)
        }
        if (typeof map.setFilter === 'function' && map.getLayer('receptor-selection-halo')) {
          map.setFilter('receptor-selection-halo', ['==', ['get', 'site_id'], selectedSiteId || ''])
        }
      }

      if (heatmapEnabled && heatmap.samples) {
        if (!map.getSource('observed-pm25')) map.addSource('observed-pm25', { type: 'geojson', data: heatmap.geojson })
        else (map.getSource('observed-pm25') as GeoJSONSource).setData(heatmap.geojson)
        if (!map.getLayer('observed-pm25-cells')) map.addLayer({
          id: 'observed-pm25-cells', type: 'fill', source: 'observed-pm25',
          paint: {
            'fill-color': ['case', ['<=', ['get', 'mean'], 10], '#440154', ['<=', ['get', 'mean'], 25], '#414487', ['<=', ['get', 'mean'], 50], '#2a788e', ['<=', ['get', 'mean'], 100], '#22a884', ['<=', ['get', 'mean'], 200], '#7ad151', '#fde725'],
            'fill-opacity': opacity, 'fill-outline-color': '#ffffff',
          },
        })
        map.setPaintProperty('observed-pm25-cells', 'fill-opacity', opacity)
      } else {
        if (map.getLayer('observed-pm25-cells')) map.removeLayer('observed-pm25-cells')
        if (map.getSource('observed-pm25')) map.removeSource('observed-pm25')
      }
    }
    map.on('style.load', sync)
    map.on('load', sync)
    // isStyleLoaded also waits for every source worker and tile load. Those
    // may be pending after the one-time load event, which must not drop a
    // toggle or opacity/horizon change. getStyle is available once the
    // stylesheet itself is initialized and permits source/layer mutations.
    if (map.getStyle()) sync()
    return () => { map.off('style.load', sync); map.off('load', sync) }
  }, [
    mapRef,
    mode,
    corridor,
    horizon,
    heatmap,
    heatmapEnabled,
    opacity,
    showPlume,
    showBorder,
    supported,
    wind,
    rankedSites,
    selectedSiteId,
    showWind,
    showReceptors,
  ])
}
