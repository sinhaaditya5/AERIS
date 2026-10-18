# AERIS Frontend & Operations Documentation Index

Welcome to the central documentation, engineering specifications, and field operations hub for the AERIS web application, operator command console, and emergency procedures.

---

## 📑 Documentation Index

### 1. Architecture & Design Systems
- **[Design Token Architecture & Color Mechanics](design-system-tokens.md)**: Specifications for Forest, Night Watch, Field Daylight, immutable emergency tokens, and typography scaling.
- **[MapLibre GL GIS Architecture & Layer Lifecycle](maplibre-gis-architecture.md)**: WebGL layer management, dynamic basemap swapping, and GeoJSON diff updates.
- **[Offline GIS Tile Caching & Vector Layer Sync Strategy](gis-tile-caching-strategy.md)**: PMTiles archive pre-caching, ServiceWorker CacheStorage, and low-bandwidth rural offline resilience.
- **[Reusable UI Component Catalog](ui-component-catalog.md)**: Reference guide for StatCards, SingleLineHUD, SquircleBadges, and live pulsating indicators.
- **[Frontend Data Layer & Schema Validation](data-layer-integration.md)**: Dual-mode ingestion, Zod schema validation, and stale data degradation rules.

### 2. Operational Procedures & Field Runbooks
- **[Emergency Duty Officer Standard Operating Procedure (SOP)](duty-officer-sop.md)**: Triage workflows, escalation tiers, and Bedrock action plan review protocols during stubble burning events.
- **[Operator Alert Dispatch Protocol & Municipal Escalation Matrix](operator-alert-dispatch-protocol.md)**: CAP-IN payload specifications, municipal dispatch channels, and autonomous tier-3 surge bypass.
- **[Rugged Laptop Field Deployment Guide](field-deployment-guide.md)**: Direct sunlight calibration, offline caching, and battery conservation profiles for field patrols.
- **[Field Hardware Power Budget & Rugged Battery Management](battery-thermal-management.md)**: Display power optimization across themes, thermal throttling governors, and pure sine vehicle inverters.
- **[Control Room Incident Drill & Emergency Runbook](incident-response-runbook.md)**: Simulation checklists, multi-agency escalation workflows, and post-incident review (PIR) protocols.
- **[Environmental Threat Evaluation Matrix](threat-matrix-guide.md)**: Multi-factor risk formulations, receptor vulnerability weighting, and emergency alert levels.
- **[Clean-Air Shelter Routing & Sensitive Receptor Protocols](evacuation-shelter-routing.md)**: HVAC filtration standards, corridor-aware transit routing, and neonatal/ICU evacuation workflows.
- **[Tactical UAV / Drone Reconnaissance Integration](drone-reconnaissance-integration.md)**: Bridging satellite 375m pixels with cadastral Khasra parcel verification and Section 65B legal evidence chains.

### 3. Atmospheric Physics, Modeling & Benchmarking
- **[Planetary Boundary Layer Collapse & Nocturnal Inversion Trap Dynamics](solar-radiation-thermal-budget.md)**: Thermodynamics of dusk boundary layer collapse, vertical eddy dampening, and evening concentration surge models.
- **[High-Wind Advection & Inversion Breakdown Runbook](high-wind-event-runbook.md)**: Western Disturbance frontal passage handling, rapid 30-degree wind shift recomputation, and emergency console alerts.
- **[Smoke Dispersion Benchmarks vs Reference Trajectory Models](synthetic-smoke-dispersion-benchmarks.md)**: Quantitative validation of AERIS Gaussian puff advection against NOAA HYSPLIT and WRF-Chem reference baselines.

### 4. Telemetry, Sensor Calibration & Data Governance
- **[Telemetry Latency SLAs & Edge Polling Schedules](telemetry-latency-sla.md)**: End-to-end 22-minute latency budget, SWR edge caching, and degraded mode indicators.
- **[Sensor Calibration Drift & Humidity Compensation Guide](sensor-calibration-drift-guide.md)**: Piecewise k-Kohler hygroscopic aerosol growth correction, Hampel outlier filtering, and CPCB reference OLS recalibration.
- **[End-to-End Data Provenance Tracking & Cryptographic Audit Matrix](data-provenance-audit-matrix.md)**: SHA-256 parent lineage chaining, deterministic statutory re-simulation guarantees, and UI lineage modals.
- **[Amazon Bedrock Prompt Governance & Deterministic Safety Rails](bedrock-prompt-governance.md)**: Temperature locks, anti-hallucination groundings, Zod schema validation firewalls, and 7-year audit retention.

### 5. Engineering Quality, Accessibility & Multilingual Operations
- **[WCAG 2.1 AA/AAA Accessibility Verification](accessibility-audit-wcag.md)**: Contrast ratio matrices across themes, color-blind-safe plume ramps, keyboard navigation, and reduced motion.
- **[Regional Multilingual Operator Guidelines (Hindi, Punjabi & English)](multi-language-operator-guidelines.md)**: Trilingual environmental lexicon, Noto Sans WebGL glyph shaping, and regional SMS templates.
- **[Frontend Performance Tuning Roadmap](performance-optimization-plan.md)**: Route-level chunking, Web Worker spatial intersections, and WebGL memory lifecycle.
- **[Cross-Browser & Hardware Acceleration Matrix](browser-compatibility-matrix.md)**: Browser engine tiers, CSS feature fallbacks, and WebGL 2.0 requirements.
- **[Mobile & Tactical Tablet Responsive Strategy](mobile-responsive-strategy.md)**: Touch ergonomics, breakpoint systems, and collapsible off-canvas drawer navigation.
- **[End-to-End Testing & Visual Regression Protocol](e2e-testing-strategy.md)**: Playwright regression baselines, MSW integration, and static snapshot validation.

---

## 📊 Reports & Quality Audits
- **[Pre-Season Operational Readiness & Verification Report (18-Oct-2026)](../reports/system-readiness-checklist-18-oct-2026.md)**: Full pre-peak season audit of telemetry latency, advection engine speed, Bedrock determinism, and Web Vitals.
- **[Comprehensive Frontend Audit Report (14-Oct-2026)](../reports/frontend-report-14-oct-2026.md)**: Initial audit of UI components, latency profiles, accessibility scores, and optimization roadmap.
