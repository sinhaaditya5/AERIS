import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import type { Map } from 'maplibre-gl'
import type { AqiFile } from '../../types/schemas'
import { buildObservationHeatmap, observationBounds } from './heatmap'

export function useObservationHeatmap(aqi: AqiFile | null, mapRef: RefObject<Map | null>, supported: boolean) {
  const [enabled, setEnabled] = useState(false)
  const [opacity, setOpacity] = useState(0.7)
  const [now, setNow] = useState(() => Date.now())
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    let attachedMap: Map | null = null
    let retryTimer: number | null = null
    const loaded = () => {
      setReady(true)
      if (retryTimer !== null) {
        window.clearInterval(retryTimer)
        retryTimer = null
      }
    }
    const attach = () => {
      const map = mapRef.current
      if (cancelled || !map || !supported) return
      if (!attachedMap) {
        attachedMap = map
        map.on('load', loaded)
        map.on('idle', loaded)
      }
      if (typeof map.loaded === 'function' && map.loaded()) {
        loaded()
      } else if (typeof (map as any).isStyleLoaded === 'function' && (map as any).isStyleLoaded()) {
        loaded()
      } else if ((map as any)._loaded) {
        loaded()
      }
    }
    // The map's constructor effect may run after this hook's mount effect.
    if (mapRef.current) attach()
    else queueMicrotask(attach)
    retryTimer = window.setInterval(attach, 100)
    return () => {
      cancelled = true
      if (retryTimer !== null) window.clearInterval(retryTimer)
      attachedMap?.off('load', loaded)
      attachedMap?.off('idle', loaded)
    }
  }, [mapRef, supported])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const data = useMemo(() => buildObservationHeatmap(aqi, now), [aqi, now])
  const fit = useCallback(() => {
    const bounds = observationBounds(data)
    const map = mapRef.current
    if (!map || !bounds || !supported) return
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 35, maxZoom: 11, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 })
  }, [data, mapRef, supported])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !supported || !enabled) return
    const update = () => {
      const b = map.getBounds()
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
    map.on('moveend', update)
    update()
    return () => { map.off('moveend', update) }
  }, [mapRef, supported, enabled])
  return { data, enabled, setEnabled, opacity, setOpacity, bounds, fit: ready ? fit : undefined }
}
