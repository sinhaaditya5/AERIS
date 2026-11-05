import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, ChevronDown, ChevronRight, FileText, Hospital, School } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import type { SiteAction } from '@/types/schemas'
import './RecommendedActions.css'
import { actionKey, useActionChecklist } from '@/components/agent/actionChecklist'
import { buildCsv, downloadText } from '@/components/views/csv'
import { advisoryDeadline, deadlineUrgency } from '@/components/agent/advisoryEvidence'

type Lang = 'en' | 'hi'

interface GroupedDirective {
  actionText: string
  title: string
  facilityType: 'school' | 'hospital' | 'mixed'
  items: SiteAction[]
  earliestDeadline: number
  highestPriority: number
}

function getCondensedTitle(action: string, count: number, facilityType: 'school' | 'hospital' | 'mixed'): string {
  const typePlural = facilityType === 'school' ? 'schools' : facilityType === 'hospital' ? 'hospitals' : 'facilities'
  const a = action.toLowerCase()
  if (a.includes('assembly') || a.includes('indoors'))
    return `Move morning assembly indoors (${count} ${typePlural})`
  if (a.includes('hepa') || a.includes('hvac'))
    return `Activate HVAC/HEPA filtration (${count} ${typePlural})`
  if (a.includes('suspend') || a.includes('outdoor'))
    return `Suspend outdoor activities (${count} ${typePlural})`
  if (a.includes('mask') || a.includes('n95'))
    return `Distribute protective masks (${count} ${typePlural})`
  if (a.includes('evacuate') || a.includes('evacuation'))
    return `Initiate evacuation protocol (${count} ${typePlural})`
  if (a.includes('water') || a.includes('hydrate'))
    return `Distribute hydration support (${count} ${typePlural})`
  if (a.includes('close') || a.includes('shut'))
    return `Close / shut down facility (${count} ${typePlural})`
  if (a.includes('alert') || a.includes('notify'))
    return `Send staff alert notifications (${count} ${typePlural})`
  return `${action.slice(0, 48)}… (${count} ${typePlural})`
}

export default function RecommendedActions() {
  const { actions, rankedSites, setShowActionsModal } = useAeris()
  const { checked, toggle: toggleCheck, setMany } = useActionChecklist()

  // --- UI state ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'group-0': true, 'group-1': true })
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({})
  const [lang, setLang] = useState<Lang>('en')

  // Filter: 'hospital' | 'school' | 'urgent' | 'unmarked'
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  // Sort: 'priority' | 'deadline'
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority')

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  const toggleGroup = (groupKey: string) =>
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))

  const toggleReason = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedReasons(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleGroupAll = (groupItems: SiteAction[], allChecked: boolean) =>
    setMany(groupItems.map(item => actionKey(actions?.generated_at, item)), !allChecked)

  // Site lookup map
  const siteMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string; lat: number; lon: number }>()
    if (rankedSites?.sites) {
      for (const s of rankedSites.sites) {
        map.set(s.site_id, { name: s.name, type: s.type, lat: s.lat, lon: s.lon })
      }
    }
    return map
  }, [rankedSites])

  // Build + filter + sort groups
  const groups: GroupedDirective[] = useMemo(() => {
    if (!actions?.actions) return []

    // Group by action text
    const map = new Map<string, SiteAction[]>()
    actions.actions.forEach(a => {
      const list = map.get(a.action) ?? []
      list.push(a)
      map.set(a.action, list)
    })

    let result = Array.from(map.entries()).map(([actionText, items]) => {
      const types = items.map(it =>
        siteMap.get(it.site_id)?.type ?? (it.who.toLowerCase().includes('hospital') ? 'hospital' : 'school')
      )
      const allSchool = types.every(t => t === 'school')
      const allHosp   = types.every(t => t === 'hospital')
      const facilityType: 'school' | 'hospital' | 'mixed' = allSchool ? 'school' : allHosp ? 'hospital' : 'mixed'
      const earliestDeadline = Math.min(...items.map(i => i.deadline_hours))
      const highestPriority  = Math.min(...items.map(i => i.priority))
      return { actionText, title: getCondensedTitle(actionText, items.length, facilityType), facilityType, items, earliestDeadline, highestPriority }
    })

    // Apply filters
    if (activeFilters.has('hospital')) result = result.filter(g => g.facilityType === 'hospital' || g.facilityType === 'mixed')
    if (activeFilters.has('school'))   result = result.filter(g => g.facilityType === 'school'   || g.facilityType === 'mixed')
    if (activeFilters.has('urgent'))   result = result.filter(g => g.earliestDeadline <= 2)
    if (activeFilters.has('unmarked')) {
      result = result.map(g => ({
        ...g,
        items: g.items.filter(i => !checked[actionKey(actions.generated_at, i)]),
      })).filter(g => g.items.length > 0)
    }

    // Sort
    result.sort((a, b) =>
      sortBy === 'priority'
        ? a.highestPriority - b.highestPriority
        : a.earliestDeadline - b.earliestDeadline
    )

    return result
  }, [actions, siteMap, activeFilters, sortBy, checked])

  const totalActionsCount    = actions?.actions.length ?? 0
  const totalDispatchedCount = (actions?.actions ?? []).filter(a => !!checked[actionKey(actions?.generated_at, a)]).length
  const progressPct          = totalActionsCount > 0 ? Math.round((totalDispatchedCount / totalActionsCount) * 100) : 0
  const hasSummaryHi         = !!actions?.summary_hi

  const handleExportCsv = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!actions) { setShowActionsModal(true); return }
    const headers = ['Priority', 'Site ID', 'Site Name', 'Recipient', 'Recommendation', 'Scheduling value and declared reference (not a live countdown)', 'Local Checklist', 'Reason']
    const rows = actions.actions.map(a => [a.priority, a.site_id, siteMap.get(a.site_id)?.name ?? a.site_id, a.who, a.action, advisoryDeadline(actions, a.deadline_hours), checked[actionKey(actions.generated_at, a)] ? 'MARKED LOCALLY' : 'UNMARKED', a.reason])
    downloadText(`AERIS_Recommendations_${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(headers, rows))
  }

  return (
    <div className="rec-actions card">
      {/* ── Header ── */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 className="section-title">Recommended Actions</h3>
          {totalActionsCount > 0 && (
            <span
              className="rec-actions-status-pill"
              aria-live="polite"
              title={`Showing ${totalActionsCount} field directives across ${groups.length} grouped operation categories`}
            >
              {totalDispatchedCount}/{totalActionsCount} marked locally · {groups.length} groups
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Hindi toggle — only shown when summary_hi is available */}
          {hasSummaryHi && (
            <button
              type="button"
              className={`lang-toggle-btn ${lang === 'hi' ? 'active' : ''}`}
              onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              title="Toggle language: English / हिंदी"
            >
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
          )}
          <button
            className="section-link export-btn"
            onClick={handleExportCsv}
            title="Download recommendation CSV with local checklist marks"
            type="button"
          >
            <FileText size={12} />
            <span>Export ↓</span>
          </button>
        </div>
      </div>

      {/* ── Summary strip (Hindi or English) ── */}
      {actions?.summary && (
        <p className="rec-summary-text">
          {lang === 'hi' && actions.summary_hi ? actions.summary_hi : actions.summary}
        </p>
      )}

      <p className="panel-sub">Local review checklist only; no alerts are sent.</p>

      {/* ── Progress bar ── */}
      {totalActionsCount > 0 && (
        <div className="rec-progress-wrap">
          <div
            className="rec-progress-track"
            role="progressbar"
            aria-label="Recommendations marked locally"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="rec-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="rec-progress-label">{progressPct}% complete</span>
        </div>
      )}

      {/* ── Filter + Sort bar ── */}
      {totalActionsCount > 0 && (
        <div className="rec-filter-bar">
          {(['hospital', 'school', 'urgent', 'unmarked'] as const).map(f => (
            <button
              key={f}
              type="button"
              className={`filter-pill ${activeFilters.has(f) ? 'active' : ''}`}
              onClick={() => toggleFilter(f)}
              aria-pressed={activeFilters.has(f)}
            >
              {f === 'hospital' ? '🏥' : f === 'school' ? '🏫' : f === 'urgent' ? '⚡' : '○'}{' '}
              {f === 'urgent' ? '≤ 2h' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div className="filter-sort-sep" />
          <button
            type="button"
            className={`filter-pill sort-pill ${sortBy === 'deadline' ? 'active' : ''}`}
            onClick={() => setSortBy(s => s === 'priority' ? 'deadline' : 'priority')}
            title={`Currently sorting by ${sortBy}. Click to toggle.`}
          >
            ↕ {sortBy === 'priority' ? 'Priority' : 'Deadline'}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {groups.length === 0 && (
        <div className="rec-empty-state">
          {totalActionsCount === 0 ? (
            <>
              <span className="rec-empty-icon">📋</span>
              <strong className="rec-empty-title">No active directives</strong>
              <p className="rec-empty-sub">AERIS will generate recommendations once AQI data and site rankings are loaded.</p>
              <button type="button" className="rec-empty-cta" onClick={() => setShowActionsModal(true)}>
                View Advisory Details
              </button>
            </>
          ) : (
            <>
              <span className="rec-empty-icon">🔍</span>
              <strong className="rec-empty-title">No matches</strong>
              <p className="rec-empty-sub">No groups match the active filters. Clear filters to see all directives.</p>
              <button type="button" className="rec-empty-cta" onClick={() => setActiveFilters(new Set())}>
                Clear Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Grouped directives ── */}
      <div className="actions-grouped-scrollable">
        {groups.map((group, gIdx) => {
          const groupKey = `group-${gIdx}`
          const isExpanded = !!expandedGroups[groupKey]
          const groupCheckedCount = group.items.filter(i => !!checked[actionKey(actions?.generated_at, i)]).length
          const isAllChecked = groupCheckedCount === group.items.length

          return (
            <div key={groupKey} className={`directive-group-card priority-${Math.min(group.highestPriority, 3)}`}>
              {/* Group header */}
              <div
                className="directive-group-header"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} group: ${group.title}`}
                onClick={() => toggleGroup(groupKey)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(groupKey) } }}
              >
                <div className="directive-header-left">
                  <span className="group-expand-btn" aria-hidden="true">
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                  <span className="group-facility-icon">
                    {group.facilityType === 'hospital'
                      ? <Hospital size={14} className="icon-hospital" />
                      : group.facilityType === 'school'
                        ? <School size={14} className="icon-school" />
                        : <Building2 size={14} className="icon-mixed" />
                    }
                  </span>
                  <div className="group-title-wrap">
                    <span className="directive-group-title">{group.title}</span>
                    <span className="directive-meta-sub">
                      Priority #{group.highestPriority} · Scheduling value {group.earliestDeadline}h
                    </span>
                  </div>
                </div>

                <div className="directive-header-right" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`group-batch-toggle ${isAllChecked ? 'all-done' : ''}`}
                    onClick={() => toggleGroupAll(group.items, isAllChecked)}
                    title={isAllChecked ? 'Unmark all locally in group' : 'Mark all locally in group'}
                  >
                    {isAllChecked && <CheckCircle2 size={13} />}
                    <span>{groupCheckedCount}/{group.items.length} Ready</span>
                  </button>
                </div>
              </div>

              {/* Sub-items */}
              {isExpanded && (
                <ul className="directive-sub-items-list">
                  {group.items.map(item => {
                    const id = actionKey(actions?.generated_at, item)
                    const isDone = !!checked[id]
                    const siteInfo = siteMap.get(item.site_id)
                    const siteName = siteInfo?.name ?? item.who.split(',')[1]?.trim() ?? item.site_id
                    const isReasonOpen = !!expandedReasons[id]
                    const urgency = deadlineUrgency(item.deadline_hours)

                    return (
                      <li key={id} className={`action-row priority-p${Math.min(item.priority, 3)} ${isDone ? 'done' : ''}`}>
                        <div className="action-row-main">
                          <label className="action-check-label">
                            <input
                              type="checkbox"
                              className="action-checkbox"
                              checked={isDone}
                              onChange={() => toggleCheck(id)}
                              aria-label={`Mark recommendation for ${siteName} locally`}
                            />
                            <span className="checkmark" />
                          </label>

                          <div className="action-body">
                            <div className="action-site-header">
                              <span className="action-site-name">{siteName}</span>
                              <span className="action-site-id">#{item.site_id}</span>
                              <span
                                className={`action-deadline-badge urgency-${urgency}`}
                                title={advisoryDeadline(actions, item.deadline_hours)}
                              >
                                ⏱ {item.deadline_hours}h
                              </span>
                            </div>
                            <div className="action-who-role">{item.who}</div>
                          </div>

                          <button
                            type="button"
                            className="reason-toggle-btn"
                            onClick={e => toggleReason(id, e)}
                            title={`Show reason for ${siteName}`}
                            aria-expanded={isReasonOpen}
                            aria-label={`${isReasonOpen ? 'Hide' : 'Show'} trigger reason for ${siteName}`}
                          >
                            <span>Reason</span>
                            {isReasonOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </button>
                        </div>

                        {isReasonOpen && (
                          <div className="action-reason-drawer">
                            <span className="reason-label">Trigger Condition:</span>
                            <span className="reason-text">{item.reason}</span>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
