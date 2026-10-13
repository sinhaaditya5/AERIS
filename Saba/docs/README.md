# AERIS Frontend & Operations Documentation Index

Welcome to the central documentation and engineering specifications hub for the AERIS web application, operator console, and emergency procedures.

---

## 📑 Documentation Index

### 1. Architecture & Design Systems
- **[Design Token Architecture & Color Mechanics](design-system-tokens.md)**: Specifications for Forest, Night Watch, Field Daylight, immutable emergency tokens, and typography scaling.
- **[MapLibre GL GIS Architecture & Layer Lifecycle](maplibre-gis-architecture.md)**: WebGL layer management, dynamic basemap swapping, and GeoJSON diff updates.
- **[Reusable UI Component Catalog](ui-component-catalog.md)**: Reference guide for StatCards, SingleLineHUD, SquircleBadges, and live pulsating indicators.
- **[Frontend Data Layer & Schema Validation](data-layer-integration.md)**: Dual-mode ingestion, Zod schema validation, and stale data degradation rules.

### 2. Operational Procedures & Field Runbooks
- **[Emergency Duty Officer Standard Operating Procedure (SOP)](duty-officer-sop.md)**: Triage workflows, escalation tiers, and Bedrock action plan review protocols during stubble burning events.
- **[Rugged Laptop Field Deployment Guide](field-deployment-guide.md)**: Direct sunlight calibration, offline caching, and battery conservation profiles for field patrols.
- **[Control Room Incident Drill & Emergency Runbook](incident-response-runbook.md)**: Simulation checklists, multi-agency escalation workflows, and post-incident review (PIR) protocols.
- **[Environmental Threat Evaluation Matrix](threat-matrix-guide.md)**: Multi-factor risk formulations, receptor vulnerability weighting, and emergency alert levels.

### 3. Engineering Quality, Accessibility & Testing
- **[WCAG 2.1 AA/AAA Accessibility Verification](accessibility-audit-wcag.md)**: Contrast ratio matrices across themes, color-blind-safe plume ramps, keyboard navigation, and reduced motion.
- **[Frontend Performance Tuning Roadmap](performance-optimization-plan.md)**: Route-level chunking, Web Worker spatial intersections, and WebGL memory lifecycle.
- **[Cross-Browser & Hardware Acceleration Matrix](browser-compatibility-matrix.md)**: Browser engine tiers, CSS feature fallbacks, and WebGL 2.0 requirements.
- **[Mobile & Tactical Tablet Responsive Strategy](mobile-responsive-strategy.md)**: Touch ergonomics, breakpoint systems, and collapsible off-canvas drawer navigation.
- **[End-to-End Testing & Visual Regression Protocol](e2e-testing-strategy.md)**: Playwright regression baselines, MSW integration, and static snapshot validation.

---

## 📊 Reports & Quality Audits
- **[Comprehensive Frontend Audit Report (14-Oct-2026)](../reports/frontend-report-14-oct-2026.md)**: Full audit of UI components, latency profiles, accessibility scores, and optimization roadmap.
