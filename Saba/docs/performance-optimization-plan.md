# AERIS Frontend Performance Optimization & Bundle Tuning Roadmap

This document outlines the performance engineering benchmarks, bundle breakdown, and runtime optimization strategies for the AERIS React 19 application.

---

## 1. Production Bundle Analysis

A baseline build of `web/` yields the following distribution:

```
dist/assets/
├── index-[hash].js        ~ 380 kB (React 19 runtime, lucide-react, UI components)
├── maplibre-[hash].js     ~ 820 kB (MapLibre GL core, WebGL shader pipeline, turf.js)
├── index-[hash].css       ~  42 kB (Tokens, custom properties, reset, view styles)
└── total gzipped:         ~ 310 kB
```

### Critical Performance Targets
- **First Contentful Paint (FCP)**: `< 0.8s` on 4G connections.
- **Largest Contentful Paint (LCP)**: `< 1.6s` (Dashboard KPI card render).
- **Time to Interactive (TTI)**: `< 2.2s` on mid-tier hardware.
- **Cumulative Layout Shift (CLS)**: `< 0.02` (Near zero layout instability).

---

## 2. Dynamic Code Splitting & Route-Level Chunking

To accelerate first-load times on `/dashboard`, heavy geospatial dependencies are split into asynchronous chunks via dynamic `React.lazy()`:

```tsx
// Lazy load spatial views to prevent blocking dashboard initial paint
const MapView = React.lazy(() => import('../views/MapView'));
const WindFlowView = React.lazy(() => import('../views/WindFlowView'));
const PopulationView = React.lazy(() => import('../views/PopulationView'));
```

When users initially open `/dashboard`, only the core operational summary bundle is executed. The ~820 kB MapLibre GL bundle is prefetched in the background via `<link rel="modulepreload">` and mounted when switching to `/map`.

---

## 3. Web Worker Offloading for Spatial Intersections

Client-side spatial intersections (corridor boundary checks against 3,132 receptor points) involve polygon point-in-polygon (PIP) calculations.

### Optimization Pattern
- Heavy spatial computations are dispatched to a dedicated Web Worker (`web/src/workers/spatialWorker.ts`).
- Prevents UI frame drops and preserves a steady 60 FPS on the main browser thread during user interactions.

```ts
// Web Worker dispatch pattern
const worker = new Worker(new URL('../workers/spatialWorker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ plumePolygon, receptors });
worker.onmessage = (e) => {
  setRankedReceptors(e.data.results);
};
```

---

## 4. WebGL Memory Footprint Management

On laptops running multi-hour monitoring shifts:
1. `map.resize()` is debounced to avoid thrashing GPU buffers.
2. Custom image markers (satellite fire icons, school/hospital pins) are compiled into a single shared SDF (Signed Distance Field) sprite sheet.
3. GeoJSON sources use typed array buffers to minimize JavaScript heap retention.
