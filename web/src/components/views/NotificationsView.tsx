/**
 * AERIS Incident & Notification Operations Console
 * Full-page tactical view for environmental hazard triage, telemetry diagnostics, and incident log audits.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import type { AerisNotification, AlertCategory, AlertSeverity } from '@/types/notifications'
import './NotificationsView.css'

// 2D: Relative timestamp helper — shows "3 min ago", "1 hr ago", etc.
function timeAgo(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function absoluteTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type SortField = 'severity' | 'timestamp' | 'category'
type SortDir = 'asc' | 'desc'

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 4,
  warning: 3,
  advisory: 2,
  system: 1,
}

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

  // Raw search string (bound to input) + debounced query (used for filter)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 3C: Debounce search — only refilter 150ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 150)
    return () => clearTimeout(t)
  }, [searchQuery])

  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all')
  // 2A: Category filter — completes the NotificationFilter type contract
  const [categoryFilter, setCategoryFilter] = useState<'all' | AlertCategory>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // 2B: Sortable table state
  const [sortField, setSortField] = useState<SortField>('severity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // 3A: Memoize filter badge counts — avoids inline .filter() calls on every render
  const counts = useMemo(() => ({
    all: notifications.length,
    critical: notifications.filter(n => n.severity === 'critical').length,
    warning: notifications.filter(n => n.severity === 'warning').length,
    advisory: notifications.filter(n => n.severity === 'advisory').length,
    system: notifications.filter(n => n.severity === 'system').length,
    fire: notifications.filter(n => n.category === 'fire').length,
    receptor: notifications.filter(n => n.category === 'receptor').length,
    action: notifications.filter(n => n.category === 'action').length,
    meteorology: notifications.filter(n => n.category === 'meteorology').length,
    telemetry: notifications.filter(n => n.category === 'telemetry').length,
    unread: unreadCount,
  }), [notifications, unreadCount])

  // KPI sub-counts
  const receptorAlertsCount = counts.receptor
  const thermalAlertsCount = counts.fire

  // Filtered Alerts (debounced search, severity, category, unread)
  const filteredAlerts = useMemo(() => {
    return notifications.filter(n => {
      if (severityFilter !== 'all' && n.severity !== severityFilter) return false
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false
      if (unreadOnly && n.isRead) return false
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.toLowerCase()
        const matchTitle = n.title.toLowerCase().includes(q)
        const matchDesc = n.message.toLowerCase().includes(q)
        const matchSource = n.sourceName.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchSource) return false
      }
      return true
    })
  }, [notifications, severityFilter, categoryFilter, unreadOnly, debouncedQuery])

  // 2B: Apply table sort on top of filteredAlerts
  const sortedAlerts = useMemo(() => {
    if (viewMode !== 'table') return filteredAlerts
    return [...filteredAlerts].sort((a, b) => {
      let cmp = 0
      if (sortField === 'severity') {
        cmp = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
      } else if (sortField === 'timestamp') {
        cmp = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category)
      }
      return sortDir === 'desc' ? cmp : -cmp
    })
  }, [filteredAlerts, viewMode, sortField, sortDir])

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        return prev
      }
      setSortDir('desc')
      return field
    })
  }, [])

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

  // A4: Keyboard shortcut — Shift+F focuses the search box
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Helper: sort icon for table headers
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="sort-icon-neutral" />
    return sortDir === 'desc'
      ? <ChevronDown size={11} className="sort-icon-active" />
      : <ChevronUp size={11} className="sort-icon-active" />
  }

  return (
    <div className="notifications-view">
      {/* KPI Metric Summary Cards */}
      <div className="notif-kpi-grid" role="list" aria-label="Incident summary metrics">
        <div className="notif-kpi-card" role="listitem">
          <div className="notif-kpi-icon-wrap total" aria-hidden="true">
            <Bell size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{notifications.length}</span>
            <span className="notif-kpi-label">Active Hazards &amp; Events</span>
          </div>
        </div>

        <div className="notif-kpi-card" role="listitem">
          <div className="notif-kpi-icon-wrap critical" aria-hidden="true">
            <ShieldAlert size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{criticalCount}</span>
            <span className="notif-kpi-label">Critical Immediate Alerts</span>
          </div>
        </div>

        <div className="notif-kpi-card" role="listitem">
          <div className="notif-kpi-icon-wrap facilities" aria-hidden="true">
            <Flame size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{receptorAlertsCount + thermalAlertsCount}</span>
            <span className="notif-kpi-label">Receptors &amp; Outbreaks</span>
          </div>
        </div>

        <div className="notif-kpi-card" role="listitem">
          <div className="notif-kpi-icon-wrap telemetry" aria-hidden="true">
            <Zap size={22} />
          </div>
          <div className="notif-kpi-info">
            <span className="notif-kpi-value">{staleFeeds.length}</span>
            <span className="notif-kpi-label">Degraded Data Feeds</span>
          </div>
        </div>
      </div>

      {/* Control & Search Toolbar */}
      <div className="notif-toolbar-card" role="search">
        <div className="notif-toolbar-top">
          <div className="notif-search-box">
            <Search size={16} className="notif-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="notif-search"
              type="search"
              className="notif-search-input"
              placeholder="Search incidents, facilities, or sources… (Shift+F)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Filter incidents by keyword"
            />
          </div>

          <div className="notif-actions-group">
            <button
              className="notif-tool-btn"
              onClick={refreshData}
              disabled={loading || refreshing}
              type="button"
              title="Refresh environmental feeds"
              aria-label="Refresh environmental feeds"
            >
              <RefreshCw size={13} className={loading || refreshing ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                className="notif-tool-btn"
                onClick={markAllAsRead}
                type="button"
                aria-label={`Mark all ${unreadCount} notifications as read`}
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
              aria-label="Clear all read incidents"
            >
              <Trash2 size={13} />
              <span>Clear Read</span>
            </button>

            <button
              className="notif-tool-btn"
              onClick={() => triggerTestNotification('critical')}
              type="button"
              title="Execute diagnostic drill alert"
              aria-label="Trigger test diagnostic alert"
            >
              <AlertTriangle size={13} />
              <span>Trigger Test Alert</span>
            </button>

            <button
              className="notif-tool-btn primary"
              onClick={handleExportCSV}
              type="button"
              title="Export incident audit log to CSV"
              aria-label="Export incident log to CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Severity Filter Pills & View Toggles */}
        <div className="notif-filter-row">
          <div className="notif-filter-pills" role="group" aria-label="Filter by severity">
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('all')}
              aria-pressed={severityFilter === 'all'}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`notif-filter-pill severity-critical ${severityFilter === 'critical' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('critical')}
              aria-pressed={severityFilter === 'critical'}
            >
              Critical ({counts.critical})
            </button>
            <button
              type="button"
              className={`notif-filter-pill severity-warning ${severityFilter === 'warning' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('warning')}
              aria-pressed={severityFilter === 'warning'}
            >
              Warning ({counts.warning})
            </button>
            <button
              type="button"
              className={`notif-filter-pill severity-advisory ${severityFilter === 'advisory' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('advisory')}
              aria-pressed={severityFilter === 'advisory'}
            >
              Advisory ({counts.advisory})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${severityFilter === 'system' ? 'active' : ''}`}
              onClick={() => setSeverityFilter('system')}
              aria-pressed={severityFilter === 'system'}
            >
              System ({counts.system})
            </button>
            <button
              type="button"
              className={`notif-filter-pill unread-pill ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(v => !v)}
              aria-pressed={unreadOnly}
            >
              Unread ({counts.unread})
            </button>
          </div>

          <div className="notif-view-mode-toggle" role="group" aria-label="Switch view mode">
            <button
              type="button"
              className={`notif-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`notif-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table View"
              aria-pressed={viewMode === 'table'}
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* 2A: Category Filter Row */}
        <div className="notif-filter-row notif-category-row">
          <div className="notif-filter-pills" role="group" aria-label="Filter by category">
            <span className="notif-filter-label">Category:</span>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
            >
              All
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'fire' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('fire')}
              aria-pressed={categoryFilter === 'fire'}
            >
              🔥 Fire ({counts.fire})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'receptor' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('receptor')}
              aria-pressed={categoryFilter === 'receptor'}
            >
              🏥 Receptor ({counts.receptor})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'action' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('action')}
              aria-pressed={categoryFilter === 'action'}
            >
              🛡 Action ({counts.action})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'meteorology' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('meteorology')}
              aria-pressed={categoryFilter === 'meteorology'}
            >
              ⛅ AQI ({counts.meteorology})
            </button>
            <button
              type="button"
              className={`notif-filter-pill ${categoryFilter === 'telemetry' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('telemetry')}
              aria-pressed={categoryFilter === 'telemetry'}
            >
              ⚡ Telemetry ({counts.telemetry})
            </button>
          </div>

          {/* A2: Live result count for screen readers */}
          <p
            className="notif-result-count"
            aria-live="polite"
            aria-atomic="true"
          >
            {filteredAlerts.length} incident{filteredAlerts.length !== 1 ? 's' : ''} shown
          </p>
        </div>
      </div>

      {/* Main Content: Grid or Table */}
      {filteredAlerts.length === 0 ? (
        <div className="notif-view-empty" role="status">
          <CheckCircle2 size={40} color="#059669" />
          <h3>No matching incidents</h3>
          <p>
            No environmental hazard alerts match the current filter selection. Adjust the threshold in Settings
            or clear the active filters.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        // A1: aria-live region so screen readers announce list changes
        <div
          className="notif-cards-grid"
          role="region"
          aria-label="Incident alerts"
          aria-live="polite"
        >
          {filteredAlerts.map(item => (
            <div
              key={item.id}
              className={`notif-card-item severity-${item.severity} ${!item.isRead ? 'unread' : ''}`}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 180px' }}
            >
              {/* 2C: Unread pulse dot */}
              {!item.isRead && (
                <span
                  className={`notif-unread-dot dot-${item.severity}`}
                  aria-label="Unread notification"
                  role="status"
                />
              )}

              <div className="notif-card-header">
                <div className="notif-card-tags">
                  <span className={`notif-card-tag ${item.severity}`}>{item.severity}</span>
                  <span className="notif-card-tag system">{item.category}</span>
                </div>
                {/* 2D: Relative timestamp with absolute on hover */}
                <span
                  className="notif-card-time"
                  title={absoluteTime(item.timestamp)}
                  aria-label={`Received ${absoluteTime(item.timestamp)}`}
                >
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                  {timeAgo(item.timestamp)}
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
                    aria-label={`Inspect incident: ${item.title}`}
                  >
                    <MapPin size={12} aria-hidden="true" />
                    <span>Inspect Target</span>
                    <ArrowRight size={12} aria-hidden="true" />
                  </button>

                  {!item.isRead && (
                    <button
                      className="notif-card-dismiss-btn"
                      onClick={() => markAsRead(item.id)}
                      type="button"
                      aria-label={`Mark "${item.title}" as read`}
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
                  aria-label={`Dismiss incident: ${item.title}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 2B: Sortable table view
        <div className="notif-table-wrap" role="region" aria-label="Incident alerts table">
          <table className="notif-table" aria-label="Sortable incident log">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="notif-sort-btn"
                    onClick={() => handleSort('severity')}
                    aria-sort={sortField === 'severity' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Severity <SortIcon field="severity" />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="notif-sort-btn"
                    onClick={() => handleSort('category')}
                    aria-sort={sortField === 'category' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Category <SortIcon field="category" />
                  </button>
                </th>
                <th>Incident Details</th>
                <th>Provenance Source</th>
                <th>
                  <button
                    type="button"
                    className="notif-sort-btn"
                    onClick={() => handleSort('timestamp')}
                    aria-sort={sortField === 'timestamp' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Timestamp <SortIcon field="timestamp" />
                  </button>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAlerts.map(item => (
                <tr key={item.id} className={!item.isRead ? 'unread' : ''}>
                  <td>
                    {/* 2C: Unread dot in table too */}
                    <div className="notif-table-severity-cell">
                      {!item.isRead && <span className={`notif-unread-dot dot-${item.severity} dot-inline`} aria-label="Unread" />}
                      <span className={`notif-card-tag ${item.severity}`}>{item.severity}</span>
                    </div>
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
                  {/* 2D: Relative timestamp with absolute in title */}
                  <td title={absoluteTime(item.timestamp)} style={{ whiteSpace: 'nowrap' }}>
                    {timeAgo(item.timestamp)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="notif-card-action-btn"
                        onClick={() => handleInspect(item)}
                        type="button"
                        aria-label={`Inspect: ${item.title}`}
                      >
                        <span>Inspect</span>
                      </button>
                      <button
                        className="notif-card-dismiss-btn"
                        onClick={() => dismissNotification(item.id)}
                        type="button"
                        aria-label={`Dismiss: ${item.title}`}
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
