# AERIS MapLibre GL GIS Architecture & Layer Lifecycle

This document specifies the WebGL geospatial rendering engine, layer lifecycle management, and cartographic performance optimizations implemented in AERIS (`web/src/components/Map.tsx`).

---

## 1. Cartographic Stack Overview

AERIS integrates **MapLibre GL JS** (v4.7+) as its primary spatial analysis and emergency visualization canvas. The map operates in an unprojected EPSG:3857 (Web Mercator) coordinate reference frame centered over the National Capital Region (NCR) and agricultural source belts in Punjab and Haryana.

### Geographical Bounding Box
- **West Longitude**: `73.5° E` (Western Punjab border)
- **East Longitude**: `77.5° E` (Eastern Delhi NCR peri-urban fringe)
- **South Latitude**: `28.0° S` (Southern Haryana / Gurugram)
- **North Latitude**: `32.5° N` (Northern Punjab / Amritsar)

---

## 2. Dynamic Basemap Tile Strategies

To maintain operational visual coherence across daylight and nocturnal missions, MapLibre dynamically mounts vector/raster basemaps synchronized with the active application theme:

| Application Theme | Basemap Style | Tile Provider | Rationale |
|---|---|---|---|
| **Forest** | CARTO Voyager / Positron | CARTO Raster CDN | Neutral slate tones that let fire clusters and red/amber plumes pop clearly |
| **Night Watch** | CARTO Dark Matter | CARTO Raster CDN | Deep black/charcoal canvas eliminating screen backlight glare in dark rooms |
| **Field Daylight** | CARTO Positron High-Contrast | CARTO Raster CDN | High-key cartography ensuring road networks and state borders remain visible outdoors |

Basemap swaps are executed via `map.setStyle()` with an atomic layer state reconciliation hook that re-attaches application GeoJSON sources without discarding user camera bearing or pitch.

---

## 3. Data Layers & Layer Lifecycle

AERIS structures its tactical operational picture across five independent WebGL layers:

```
[Top Viewport Layer]
  │
  ├── 5. Sensitive Receptors (Schools & Hospitals) [Circle & Symbol Layer]
  │      - Filtered by ETA risk severity
  │      - Dynamic cluster radius based on zoom level
  │
  ├── 4. Ground AQI Monitoring Stations [Circle Layer + Pulse Animation]
  │      - Color-coded by observed PM2.5 / CPCB index
  │      - Live pulse ring for stations updated within < 30 min
  │
  ├── 3. Candidate Fire Source Clusters [Circle + Heatmap Layer]
  │      - Scaled exponentially by Fire Radiative Power (FRP, MW)
  │      - Cluster centroid marked with stubble-burning probability ring
  │
  ├── 2. Smoke Transport Plume Corridors [Fill + Line Layer]
  │      - Gaussian puff time-band advection polygons (0-2h, 2-4h, 4-8h, 8-24h)
  │      - Semi-transparent gradient fills (opacity 0.25 to 0.70)
  │      - Anti-aliased centerline with forward propagation arrows
  │
  └── 1. Atmospheric Wind Streamlines [Vector Line Layer]
         - Open-Meteo 48h GFS wind field advection vectors
[Basemap Layer]
```

---

## 4. Performance Optimizations & WebGL Pooling

### 4.1 Feature State & Diff-Only Updates
Rather than recreating GeoJSON sources on every 15-minute pipeline poll, AERIS employs `map.getSource(id).setData(newGeoJson)`. Static receptor geometries (3,132 schools and hospitals) are loaded once and updated in-place via `setFeatureState` for dynamic attributes such as `arrival_eta_mins` and `predicted_pm25_delta`.

### 4.2 WebGL Context Preservation
On component unmount or rapid tab navigation between `/map` and `/dashboard`, the MapLibre canvas is kept warm or cleanly detached via `map.remove()` to prevent `CONTEXT_LOST_WEBGL` exceptions on resource-constrained field hardware.

### 4.3 Click Hit Testing & Hover Debouncing
- Pointer move events are debounced using `requestAnimationFrame` to maintain consistent 60 FPS scrolling and panning.
- Interactive hit testing utilizes `map.queryRenderedFeatures()` with an 8px bounding radius to accommodate field touch inputs.
