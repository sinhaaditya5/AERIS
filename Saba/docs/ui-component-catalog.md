# AERIS Reusable UI Component Catalog & Interface Patterns

This document cataloging the shared UI component library implemented across the AERIS web dashboard.

---

## 1. Component Philosophy

Every component follows three strict design rules:
1. **Semantic Token Reliance**: No inline hex codes. All colors derive from CSS custom properties (`var(--accent)`, `var(--text-primary)`, `var(--bg-card)`).
2. **Deterministic States**: Every data-bound component handles Loading, Empty (`404 no_data`), Stale, and Live states cleanly.
3. **Emergency Legibility**: Typography hierarchy ensures primary telemetry is readable from 3 meters away on wall displays.

---

## 2. Core Components

### 2.1 StatCard (`web/src/components/StatCard.tsx`)
Displays primary emergency telemetry (e.g., Active Fire Clusters, Peak FRP, Earliest ETA, Exposed Population).
- **Props**:
  - `label`: Descriptive headline string
  - `value`: Primary numerical metric
  - `unit`: Optional unit suffix (`MW`, `hrs`, `k people`)
  - `trend`: Directional delta badge (`↑ 12% vs last run`)
  - `severity`: `'critical' | 'high' | 'caution' | 'ok' | 'neutral'`
  - `icon`: Lucide icon node

### 2.2 SingleLineHUD (`web/src/components/SingleLineHUD.tsx`)
A streamlined, high-density Heads-Up Display floating across the top of `/map`.
- Replaces bulky multi-row filter banners with a sleek 36px horizontal command bar.
- Shows: Active Scenario Badge | Plume Time-Band Filter | Sensor Layer Toggle | Current Wind Vector (`280° @ 14 km/h`).

### 2.3 SquircleBadge (`web/src/components/SquircleBadge.tsx`)
A smooth-cornered indicator pill with subtle border accents used for status classification:
- `variant="critical"`: High-saturation red background with white glyph.
- `variant="caution"`: Amber pill for intermediate arrival bands (4–8h).
- `variant="modelled"`: Indigo badge denoting uncalibrated physics calculation.
- `variant="stale"`: Gold border denoting cached snapshot fallback.

### 2.4 LivePulseBeacon (`web/src/components/LivePulseBeacon.tsx`)
An animated SVG pulsating beacon ring marking live ground stations and newly detected satellite clusters.
- Automatically disables CSS keyframe animation when `reduced-motion` is active.

### 2.5 SourceIntensityWidget (`web/src/components/SourceIntensityWidget.tsx`)
Full-width analytical progress bar visualizing fire radiative energy distribution.
- Displays FRP percentile distributions (0 to 500+ MW).
- Uses linear-gradient fill matching the thermal emission temperature ramp.

### 2.6 AQISpectrumBar (`web/src/components/AQISpectrumBar.tsx`)
Continuous color spectrum reference bar mapping CPCB index values (0 to 500+) with marked threshold tick indicators for Good, Satisfactory, Moderate, Poor, Very Poor, and Severe categories.
