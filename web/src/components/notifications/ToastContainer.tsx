/**
 * AERIS Toast Container Component
 * Displays incoming real-time toasts with pause-on-hover, auto-dismiss, and direct navigation actions.
 */

import { useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useNotifications } from '@/services/notificationContext'
import { useAeris } from '@/services/dataContext'
import type { AerisNotification } from '@/types/notifications'
import './ToastContainer.css'

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: AerisNotification
  onDismiss: (id: string) => void
}) {
  const { setActiveTab, setFlyToLocation } = useAeris()
  const { markAsRead } = useNotifications()
  const [isHovered, setIsHovered] = useState(false)

  // Auto-dismiss after 7 seconds if not hovered
  useEffect(() => {
    if (isHovered) return
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 7000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss, isHovered])

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
        >
          <span>Inspect</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const { activeToasts, dismissToast } = useNotifications()

  if (activeToasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {activeToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
