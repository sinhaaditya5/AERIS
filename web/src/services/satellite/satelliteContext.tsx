import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  DEFAULT_GIBS_LAYER_ID,
  getModelDerivedDate,
  formatUtcDateString,
  isValidDateString,
  shiftDateDays,
} from './gibs'

export type SatelliteCompareMode = 'swipe' | 'fade'

export interface SatelliteCheckContextValue {
  isOpen: boolean
  openSatelliteCheck: (opener?: HTMLElement | null) => void
  closeSatelliteCheck: () => void
  mode: SatelliteCompareMode
  setMode: (mode: SatelliteCompareMode) => void
  splitPercent: number
  setSplitPercent: (percent: number) => void
  fadeOpacity: number
  setFadeOpacity: (opacity: number) => void
  layerId: string
  setLayerId: (layerId: string) => void
  date: string
  setDate: (date: string) => void
  stepDate: (deltaDays: number) => void
  resetToModelTime: (forecastStart?: string | null, horizonHours?: number) => void
  isOnline: boolean
  isInfoOpen: boolean
  setIsInfoOpen: (open: boolean) => void
  openerElement: HTMLElement | null
}

const SatelliteCheckContext = createContext<SatelliteCheckContextValue | null>(null)

export function SatelliteCheckProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  // Default to fade on narrow screens (<= 640px) to prevent drag gesture collisions
  const [mode, setMode] = useState<SatelliteCompareMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      return 'fade'
    }
    return 'swipe'
  })
  const [splitPercent, setSplitPercent] = useState<number>(50)
  const [fadeOpacity, setFadeOpacity] = useState<number>(0.65)
  const [layerId, setLayerId] = useState<string>(DEFAULT_GIBS_LAYER_ID)
  const [date, setDateState] = useState<string>(() => formatUtcDateString(new Date()))
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })

  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const setDate = useCallback((newDate: string) => {
    if (isValidDateString(newDate)) {
      const todayStr = formatUtcDateString(new Date())
      setDateState(newDate > todayStr ? todayStr : newDate)
    }
  }, [])

  const stepDate = useCallback((deltaDays: number) => {
    setDateState(prev => shiftDateDays(prev, deltaDays, formatUtcDateString(new Date())))
  }, [])

  const resetToModelTime = useCallback((forecastStart?: string | null, horizonHours: number = 0) => {
    const derived = getModelDerivedDate(forecastStart, horizonHours, new Date())
    setDateState(derived)
  }, [])

  const openSatelliteCheck = useCallback((opener?: HTMLElement | null) => {
    if (opener) {
      openerRef.current = opener
    }
    setIsOpen(true)
  }, [])

  const closeSatelliteCheck = useCallback(() => {
    setIsOpen(false)
    setIsInfoOpen(false)
    if (openerRef.current) {
      openerRef.current.focus()
      openerRef.current = null
    }
  }, [])

  const value: SatelliteCheckContextValue = {
    isOpen,
    openSatelliteCheck,
    closeSatelliteCheck,
    mode,
    setMode,
    splitPercent,
    setSplitPercent,
    fadeOpacity,
    setFadeOpacity,
    layerId,
    setLayerId,
    date,
    setDate,
    stepDate,
    resetToModelTime,
    isOnline,
    isInfoOpen,
    setIsInfoOpen,
    openerElement: openerRef.current,
  }

  return (
    <SatelliteCheckContext.Provider value={value}>
      {children}
    </SatelliteCheckContext.Provider>
  )
}

const DEFAULT_SATELLITE_CONTEXT: SatelliteCheckContextValue = {
  isOpen: false,
  openSatelliteCheck: () => {},
  closeSatelliteCheck: () => {},
  mode: 'swipe',
  setMode: () => {},
  splitPercent: 50,
  setSplitPercent: () => {},
  fadeOpacity: 0.65,
  setFadeOpacity: () => {},
  layerId: DEFAULT_GIBS_LAYER_ID,
  setLayerId: () => {},
  date: formatUtcDateString(new Date()),
  setDate: () => {},
  stepDate: () => {},
  resetToModelTime: () => {},
  isOnline: true,
  isInfoOpen: false,
  setIsInfoOpen: () => {},
  openerElement: null,
}

export function useSatelliteCheck(): SatelliteCheckContextValue {
  const ctx = useContext(SatelliteCheckContext)
  return ctx ?? DEFAULT_SATELLITE_CONTEXT
}
