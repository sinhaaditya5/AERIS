import { useEffect, useRef } from 'react'
import { X, ShieldAlert, Database, Info, FileText, CheckCircle2, ChevronDown } from 'lucide-react'
import { useAeris } from '@/services/dataContext'
import './DataModelNotesDrawer.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  activeSection?: string | null
}

export default function DataModelNotesDrawer({ isOpen, onClose, activeSection }: Props) {
  const { sources, corridor, aqi, rankedSites, actions } = useAeris()
  const drawerRef = useRef<HTMLElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus()
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!sources && !corridor && !isOpen) return null

  const legacySources = sources?.provenance?.artifact_status === 'ARCHIVED_LEGACY'
  const legacyCorridor = corridor?.provenance?.artifact_status === 'ARCHIVED_LEGACY'

  return (
    <>
      {isOpen && (
        <div
          className="notes-drawer-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={drawerRef}
        className={`data-notes-drawer ${isOpen ? 'is-open' : 'is-closed'}`}
        role="complementary"
        aria-label="Model provenance and scientific limitations"
        aria-hidden={!isOpen}
      >
        <div className="notes-drawer-header">
          <div className="notes-drawer-title-group">
            <div className="notes-drawer-icon">
              <Database size={16} />
            </div>
            <div>
              <h2 className="notes-drawer-title">Data &amp; Model Notes</h2>
              <span className="notes-drawer-sub">Model provenance, scientific limitations &amp; integrity caveats</span>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="notes-drawer-close-btn"
            onClick={onClose}
            aria-label="Close notes drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="notes-drawer-body">
          {/* Section 1: Provenance and Exact Disclosures */}
          <section className="notes-section" id="section-provenance">
            <div className="notes-section-head">
              <ShieldAlert size={14} className="notes-sec-ico" />
              <h3>Model Evidence and Limitations</h3>
            </div>
            <div className="notes-prose">
              <p>
                {legacySources
                  ? 'Archived ten-source detector output; this is not the current detector replay. Original input and parameter bindings were not recorded.'
                  : 'Candidate source types, confidence and emission strength are heuristic proxies, not verified land use, probabilities or measured emission mass.'}
              </p>
              <p>
                {legacyCorridor
                  ? 'Archived legacy corridor: obsolete concentration and risk floors. These simulation values are not current Gaussian model output, observed PM2.5 or calibrated forecasts.'
                  : 'Corridor PM2.5 is a source-band grid/time peak, not receptor concentration. Parameters are uncalibrated unless independent calibration evidence is provided; risk is not health probability.'}
              </p>
              <p>
                Arrival times are relative to forecast start. Population is a spatial proxy. Saved recommendations require human review against current observations; they are not operational, medical or legal instructions. The observed PM2.5 layer shows station readings without interpolation.
              </p>

              <details className="notes-provenance-details" open={activeSection === 'provenance'}>
                <summary>Inspect source and corridor provenance</summary>
                <div className="provenance-pre-wrap">
                  {([['sources', sources], ['corridor', corridor]] as const).map(([kind, data]) => (
                    <div key={kind} className="provenance-block">
                      <h4>{kind}: {data?.provenance?.artifact_status ?? 'Provenance unavailable'}</h4>
                      <pre tabIndex={0} aria-label={`${kind} provenance details`}>
                        {JSON.stringify(data?.provenance ?? { artifact_status: 'UNVERSIONED_UNKNOWN', generated_at: data?.generated_at ?? null }, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </section>

          {/* Section 2: Map & Plume Dispersion */}
          <section className="notes-section" id="section-map">
            <div className="notes-section-head">
              <Info size={14} className="notes-sec-ico" />
              <h3>Map &amp; Dispersion Model (Corridors)</h3>
            </div>
            <div className="notes-prose">
              <p><strong>Forecast Start:</strong> {corridor?.forecast_start ?? 'Unavailable'}. Time controls select cumulative dispersion bands; full centrelines and milestone ETA ticks remain as forecast context.</p>
              <p>Modelled band peaks are maximum values across reported source bands in each interval, not uniform receptor concentrations or additive exposures.</p>
              <p>Facility markers on the map show up to 8 ranked sites in the active corridor. The facility table contains the full 444-receptor registry.</p>
            </div>
          </section>

          {/* Section 3: Thermal FIRMS Cluster Sources */}
          <section className="notes-section" id="section-sources">
            <div className="notes-section-head">
              <Info size={14} className="notes-sec-ico" />
              <h3>Source Candidates &amp; Satellite Detections</h3>
            </div>
            <div className="notes-prose">
              <p>Fire detections are derived from NASA FIRMS thermal infrared sensor passes. Clustered source coordinates, FRP totals, and confidence levels are uncalibrated heuristics.</p>
              <p><strong>Territory &amp; Origin:</strong> Source territory classifications are strictly factual. If administrative district or state classification is unrecorded in the feed, sources are labeled as "Not classified" and no cross-border attribution is assumed.</p>
            </div>
          </section>

          {/* Section 4: Ground Observations & OpenAQ Feeds */}
          <section className="notes-section" id="section-aqi">
            <div className="notes-section-head">
              <Info size={14} className="notes-sec-ico" />
              <h3>Air Quality Observations (OpenAQ / CPCB)</h3>
            </div>
            <div className="notes-prose">
              <p>Ground station readings represent reporting sensor means in occupied 0.1° cells. No spatial interpolation is performed; unsampled cells are unavailable.</p>
              <p>Observation timestamps reflect station transmission time, which may differ from the feed ingestion capture timestamp. Feed failures retain previously valid observations without relabelling.</p>
            </div>
          </section>

          {/* Section 5: Receptors & Exposed Population */}
          <section className="notes-section" id="section-receptors">
            <div className="notes-section-head">
              <Info size={14} className="notes-sec-ico" />
              <h3>Receptor Sites &amp; Population Sensitivity</h3>
            </div>
            <div className="notes-prose">
              <p>
                <strong>Threshold Sensitivity Range:</strong> {rankedSites?.exposed_population.method ?? 'Population cells inside corridor bands with band risk ≥ 0.30 (estimate). Low: threshold raised to 0.45. High: threshold lowered to 0.15. This is a threshold sensitivity range, not a statistical confidence interval.'}
              </p>
              <p>
                Facility risk score (0.00 to 1.00) is an uncalibrated relative score combining modelled PM2.5 delta and spatial proximity, not an empirical health incident probability.
              </p>
            </div>
          </section>

          {/* Section 6: Counterfactual Scenarios */}
          <section className="notes-section" id="section-whatif">
            <div className="notes-section-head">
              <Info size={14} className="notes-sec-ico" />
              <h3>Intervention Scenarios (What If We Act?)</h3>
            </div>
            <div className="notes-prose">
              <p>
                Scenario reductions (35% partial with school/hospital shielding; 55% with comprehensive NCR-wide intervention) are assumed simulation parameters, not measured effectiveness.
              </p>
            </div>
          </section>

          {/* Section 7: Full Agent Advisory Briefing */}
          {actions?.summary && (
            <section className="notes-section" id="section-advisory">
              <div className="notes-section-head">
                <FileText size={14} className="notes-sec-ico" />
                <h3>Full Advisory Briefing</h3>
              </div>
              <div className="notes-prose">
                <p className="advisory-summary-full">{actions.summary}</p>
                <p className="text-xs text-tertiary">Local checklist only; no alerts or dispatches are transmitted without human officer authorization.</p>
              </div>
            </section>
          )}
        </div>
      </aside>
    </>
  )
}
