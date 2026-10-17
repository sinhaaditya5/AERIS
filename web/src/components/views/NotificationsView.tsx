/**
 * AERIS Incident & Notification Operations Console
 * Full-page tactical view for environmental hazard triage, telemetry diagnostics, and incident log audits.
 */

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Table as TableIcon,
  Trash2,
  Zap,
} from 'lucide-react'
import { useNotifications } from '@/services/notificationContext'
import { useAeris } from '@/services/dataContext'
import type { AerisNotification, AlertSeverity } from '@/types/notifications'
import './NotificationsView.css'

export default function NotificationsView() {
  const {
    notifications,
    unreadCount,
    criticalCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllRead,
    triggerTestNotification,
  } = useNotifications()

  const { setFlyToLocation, setActiveTab, staleFeeds, refreshData, refreshing, loading } = useAeris()

  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // KPI Calculations
  const receptorAlertsCount = useMemo(
    () => notifications.filter(n => n.category === 'receptor').length,
    [notifications]
  )
  const thermalAlertsCount = useMemo(
    () => notifications.filter(n => n.category === 'fire').length,
    [notifications]
  )

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return notifications.filter(n => {
      if (severityFilter !== 'all' && n.severity !== severityFilter) return false
      if (unreadOnly && n.isRead) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = n.title.toLowerCase().includes(q)
        const matchDesc = n.message.toLowerCase().includes(q)
        const matchSource = n.sourceName.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchSource) return false
      }
      return true
    })
  }, [notifications, severityFilter, unreadOnly, searchQuery])

  // Incident Navigation Action
  const handleInspect = (item: AerisNotification) => {
    markAsRead(item.id)

    if (item.targetPayload && item.targetPayload.lon != null && item.targetPayload.lat != null) {
      setFlyToLocation({
        lon: item.targetPayload.lon,
        lat: item.targetPayload.lat,
        zoom: item.targetPayload.zoom ?? 12,
        name: item.targetPayload.name ?? item.title,
      })
    }

    if (item.targetTab) {
      setActiveTab(item.targetTab)
    }
  }

  // Export Incident Log (CSV)
  const handleExportCSV = () => {
    if (notifications.length === 0) return

    const headers = ['ID', 'Severity', 'Category', 'Title', 'Message', 'Timestamp', 'Source', 'Read_Status']
    const rows = notifications.map(n => [
      `"${n.id}"`,
      `"${n.severity}"`,
      `"${n.category}"`,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.message.replace(/"/g, '""')}"`,
      `"${n.timestamp}"`,
      `"${n.sourceName}"`,
      `"${n.isRead ? 'Read' : 'Unread'}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `aeris_incident_log_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="notifications-view">
      {/* KPI Metric Summary Cards */}
      <div className="notif-kpi-grid">
        <div className="notif-kpi-card">
          <div className="notif-kpi-icon-wrap total">
            <Bell size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{notifications.length}</span>
            <span className="notif-kpi-label">Active Hazards &amp; Events</span>
          </div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-icon-wrap critical">
            <ShieldAlert size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{criticalCount}</span>
            <span className="notif-kpi-label">Critical Immediate Alerts</span>
          </div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-icon-wrap facilities">
            <Flame size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{receptorAlertsCount + thermalAlertsCount}</span>
            <span className="notif-kpi-label">Receptors &amp; Outbreaks</span>
          </div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-icon-wrap telemetry">
            <Zap size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{staleFeeds.length}</span>
            <span className="notif-kpi-label">Degraded Data Feeds</span>
          </div>
        </div>
      </div>

      {/* Control & Search Toolbar */}
      <div className="notif-toolbar-card">
        <div className="notif-toolbar-top">
          <div className="notif-search-box">
            <Search size={16} className="notif-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="notif-search-input"
              placeholder="Search incidents, facilities, or sources..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Filter incidents"
            />
          </div>

          <div className="notif-actions-group">
            <button
              className="notif-tool-btn"
              onClick={refreshData}
              disabled={loading || refreshing}
              type="button"
              title="Refresh environmental feeds"
            >
              <RefreshCw size={13} className={loading || refreshing ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                className="notif-tool-btn"
                onClick={markAllAsRead}
                type="button"
              >
                <CheckCircle2 size={13} />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              className="notif-tool-btn"
              onClick={clearAllRead}
              type="button"
              title="Clear all read incidents from queue"
            >
              <Trash2 size={13} />
              <span>Clear Read</span>
            </button>

            <button
              className="notif-tool-btn"
              onClick={() => triggerTestNotification('critical')}
              type="button"
              title="Execute diagnostic drill alert"
            >
              <AlertTriangle size={13} />
              <span>Trigger Test Alert</span>
            </button>

            <button
              className="notif-tool-btn primary"
              onClick={handleExportCSV}
              type="button"
              title="Export incident audit log to CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & View Toggles */}
        <div className="notif-filter-row">
          <div className="notif-filter-pills">
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('all')}
            >
              All Severities ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('critical')}
            >
              Critical ({notifications.filter(n => n.severity === 'critical').length})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'warning' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('warning')}
            >
              Warning ({notifications.filter(n => n.severity === 'warning').length})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'advisory' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('advisory')}
            >
              Advisory ({notifications.filter(n => n.severity === 'advisory').length})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'system' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('system')}
            >
              System ({notifications.filter(n => n.severity === 'system').length})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(v => !v)}
            >
              Unread Only ({unreadCount})
            </button>
          </div>

          <div className="notif-view-mode-toggle">
            <button
              type="button"
              className={`notif-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`notif-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table View"
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Grid or Table */}
      {filteredAlerts.length === 0 ? (
        <div className="notif-view-empty">
          <CheckCircle2 size={40} color="#059669" />
          <h3>No matching incidents</h3>
          <p>
            No environmental hazard alerts match the current filter selection. Adjust the threshold in Settings
            or clear the active filters.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="notif-cards-grid">
          {filteredAlerts.map(item => (
            <div
              key={item.id}
              className={`notif-card-item severity-${item.severity} ${!item.isRead ? 'unread' : ''}`}
            >
              <div className="notif-card-header">
                <div className="notif-card-tags">
                  <span className={`notif-card-tag ${item.severity}`}>{item.severity}</span>
                  <span className="notif-card-tag system">{item.category}</span>
                </div>
                <span className="notif-card-time">
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="notif-card-body">
                <h4 className="notif-card-title">{item.title}</h4>
                <p className="notif-card-desc">{item.message}</p>
                <div className="notif-card-source">
                  <span>Provenance: {item.sourceName}</span>
                </div>
              </div>

              <div className="notif-card-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="notif-card-action-btn"
                    onClick={() => handleInspect(item)}
                    type="button"
                  >
                    <MapPin size={12} />
                    <span>Inspect Target</span>
                    <ArrowRight size={12} />
                  </button>

                  {!item.isRead && (
                    <button
                      className="notif-card-dismiss-btn"
                      onClick={() => markAsRead(item.id)}
                      type="button"
                    >
                      Mark Read
                    </button>
                  )}
                </div>

                <button
                  className="notif-card-dismiss-btn"
                  onClick={() => dismissNotification(item.id)}
                  type="button"
                  title="Dismiss incident from list"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="notif-table-wrap">
          <table className="notif-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Incident Details</th>
                <th>Provenance Source</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(item => (
                <tr key={item.id} className={!item.isRead ? 'unread' : ''}>
                  <td>
                    <span className={`notif-card-tag ${item.severity}`}>{item.severity}</span>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>{item.category}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong>{item.title}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.message}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-tertiary)' }}>{item.sourceName}</span>
                  </td>
                  <td>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="notif-card-action-btn"
                        onClick={() => handleInspect(item)}
                        type="button"
                      >
                        <span>Inspect</span>
                      </button>
                      <button
                        className="notif-card-dismiss-btn"
                        onClick={() => dismissNotification(item.id)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
