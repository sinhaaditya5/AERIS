# AERIS Smoke Transport Plume Visualization & Contour Specification

This document provides the mathematical and cartographic specifications for rendering Gaussian puff dispersion corridors on the AERIS MapLibre GL canvas.

---

## 1. Dispersion Physics & Time-Band Advection

The AERIS plume corridor model (`models/plume/`) calculates downwind advection of particulate matter using a simplified Gaussian puff baseline advected by Open-Meteo GFS forecast wind fields. The output is discretized into four discrete arrival corridors:

```
[Candidate Source: Punjab / Haryana]
       │
       ▼ (Wind Advection Vector)
┌──────────────────────────────────────────────┐
│ 1. Band 0–2h  : Immediate Impact Zone        │
├──────────────────────────────────────────────┤
│ 2. Band 2–4h  : Early Action Corridor        │
├──────────────────────────────────────────────┤
│ 3. Band 4–8h  : Tactical Advisory Corridor   │
├──────────────────────────────────────────────┤
│ 4. Band 8–24h : Regional Forecast Perimeter  │
└──────────────────────────────────────────────┘
```

---

## 2. Cartographic Styling & Opacity Hierarchy

To ensure viewers can distinguish intersecting puff envelopes without visual mud, the MapLibre layers apply an inverted alpha gradient where imminent plumes have higher visual prominence:

| Time Band | Stroke Color | Fill RGBA | Stroke Width | Dashboard Semantics |
|---|---|---|---|---|
| **0–2 h** | `#DC2626` | `rgba(220, 38, 38, 0.45)` | `2.5px` | Imminent impact; primary emergency action window |
| **2–4 h** | `#EA580C` | `rgba(234, 88, 12, 0.35)` | `2.0px` | Pre-arrival alert; municipal dispatch window |
| **4–8 h** | `#F59E0B` | `rgba(245, 158, 11, 0.25)` | `1.5px` (Dashed) | Tactical advisory; logistics preparation |
| **8–24 h**| `#3B82F6` | `rgba(59, 130, 246, 0.15)` | `1.0px` (Dotted) | Regional forecast boundary |

---

## 3. Interactive Timeline Scrubbing

The SingleLineHUD on `/map` provides a time-slider scrubber:
- Allows operators to isolate specific time slices (`T+2h`, `T+4h`, `T+8h`, `T+24h`).
- MapLibre uses a client-side filter expression:
  ```json
  ["<=", ["get", "eta_hours"], activeTimeFilter]
  ```
- Filtering triggers zero network queries, operating instantaneously on the preloaded GeoJSON dataset.
