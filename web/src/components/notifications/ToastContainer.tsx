/**
 * AERIS Toast Container Component
 * Displays incoming real-time toasts with pause-on-hover, auto-dismiss, progress bar, and direct navigation actions.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useNotifications } from '@/services/notificationContext'
import { useAeris } from '@/services/dataContext'
import type { AerisNotification } from '@/types/notifications'
import './ToastContainer.css'

const TOAST_DURATION_MS = 7000

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: AerisNotification
  onDismiss: (id: string) => void
}) {
  const { setActiveTab, setFlyToLocation } = useAeris()
  const { markAsRead } = useNotifications()

  // B5 FIX: Track remaining time so hover-resume continues from where it paused,
  // not a fresh 7s countdown. We store the wall-clock time when the timer started.
  const [isHovered, setIsHovered] = useState(false)
  const [progress, setProgress] = useState(100) // 100 → 0 over TOAST_DURATION_MS
  const remainingMsRef = useRef(TOAST_DURATION_MS)
  const timerStartRef = useRef<number>(Date.now())
  const rafRef = useRef<number | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Animate the progress bar and schedule auto-dismiss
  useEffect(() => {
    if (isHovered) {
      // Pause: capture remaining time and cancel pending timers
      const elapsed = Date.now() - timerStartRef.current
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    // Resume (or start) from remaining time
    timerStartRef.current = Date.now()
    const startRemaining = remainingMsRef.current

    // Schedule dismiss
    dismissTimerRef.current = setTimeout(() => {
      onDismiss(toast.id)
    }, startRemaining)

    // Animate progress bar via rAF
    const animate = () => {
      const elapsed = Date.now() - timerStartRef.current
      const pct = Math.max(0, ((startRemaining - elapsed) / TOAST_DURATION_MS) * 100)
      setProgress(pct)
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isHovered, toast.id, onDismiss])

  const handleAction = () => {
    markAsRead(toast.id)
    onDismiss(toast.id)

    if (toast.targetPayload && (toast.targetPayload.lon != null && toast.targetPayload.lat != null)) {
      setFlyToLocation({
        lon: toast.targetPayload.lon,
        lat: toast.targetPayload.lat,
        zoom: toast.targetPayload.zoom ?? 12,
        name: toast.targetPayload.name ?? toast.title,
      })
    }

    if (toast.targetTab) {
      setActiveTab(toast.targetTab)
    }
  }

  return (
    <div
      className={`toast-item severity-${toast.severity}`}
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="toast-header">
        <div className="toast-badge-group">
          <span className={`toast-severity-tag ${toast.severity}`}>
            {toast.severity}
          </span>
          <span className="toast-source">{toast.sourceName}</span>
        </div>
        <button
          className="toast-close-btn"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          type="button"
        >
          <X size={14} />
        </button>
      </div>

      <div className="toast-body">
        <h4 className="toast-title">{toast.title}</h4>
        <p className="toast-desc">{toast.message}</p>
      </div>

      <div className="toast-actions">
        <button
          className="toast-action-btn"
          onClick={handleAction}
          type="button"
          aria-label={`Inspect: ${toast.title}`}
        >
          <span>Inspect</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* 2F: Progress bar showing remaining auto-dismiss time — pauses on hover */}
      <div
        className="toast-progress-track"
        aria-hidden="true"
      >
        <div
          className={`toast-progress-bar severity-${toast.severity} ${isHovered ? 'paused' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const { activeToasts, dismissToast } = useNotifications()

  if (activeToasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite" aria-label="Live alert notifications">
      {activeToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
