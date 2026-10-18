# Offline GIS Tile Caching & Vector Layer Synchronization Strategy

## 1. Architectural Overview

The AERIS web application relies heavily on high-precision geospatial visualization using MapLibre GL. Because environmental inspection teams and agricultural enforcement patrols routinely deploy into rural areas with weak, degraded, or non-existent cellular reception, the mapping engine must support comprehensive offline and low-bandwidth operational caching.

This specification details the multi-tiered vector tile caching hierarchy, Service Worker asset caching, and dynamic GeoJSON delta synchronization.

---

## 2. Multi-Tier Map Caching Hierarchy

```
+--------------------------------------------------------------+
| 1. In-Memory MapLibre Tile Cache (LRU: 50 MB / ~250 tiles)    |
+--------------------------------------------------------------+
                               ▲
                               │ Cache Miss
+--------------------------------------------------------------+
| 2. Browser CacheStorage / ServiceWorker (PMTiles: ~180 MB)   |
|    - Punjab, Haryana & Delhi NCR Basemap (Zoom 6 to 14)       |
+--------------------------------------------------------------+
                               ▲
                               │ Stale / Cache Miss
+--------------------------------------------------------------+
| 3. IndexedDB Dynamic Ephemeral Store                         |
|    - Active Plume Polygons (GeoJSON)                         |
|    - VIIRS Fire Detection Points                             |
|    - Sensitive Receptors (Schools, Hospitals, Clinics)        |
+--------------------------------------------------------------+
                               ▲
                               │ Network Available
+--------------------------------------------------------------+
| 4. CloudFront Edge CDN / AWS S3 Vector Tile Origin           |
+--------------------------------------------------------------+
```

---

## 3. Vector Basemap Pre-bundling (PMTiles)

Rather than requesting thousands of individual raster PNGs or PBF vector tiles over high-latency cellular connections, AERIS utilizes **PMTiles** (single-file cloud-optimized archive format):

1. **Regional Extent**:
   - Longitude: $74.0^\circ\text{E}$ to $78.5^\circ\text{E}$
   - Latitude: $28.0^\circ\text{N}$ to $32.5^\circ\text{N}$
2. **Zoom Level Tiers**:
   - `Z5` to `Z9`: Broad regional overview, major highways, state boundaries, district outlines (Total size: ~18 MB).
   - `Z10` to `Z12`: Tehsil boundaries, secondary roads, canal networks, village clusters (Total size: ~65 MB).
   - `Z13` to `Z14`: High-density urban corridors (Delhi NCR, Ludhiana, Jalandhar, Amritsar) with building footprints (Total size: ~98 MB).
3. **Protocol Adapter**:
   - A custom MapLibre protocol adapter (`pmtiles://`) interceptor routes tile lookups through an embedded HTTP range-request resolver connected to Service Worker cache.

---

## 4. Ephemeral GeoJSON Delta Synchronization

While basemaps remain static across seasons, smoke plumes and fire clusters change every 15 to 30 minutes. To avoid redownloading full GeoJSON feature collections on every telemetry cycle:

### 4.1. Differential Patching Algorithm
```typescript
interface SpatialDeltaPacket {
  sequenceId: number;
  timestamp: string;
  addedOrUpdatedFeatures: GeoJSON.Feature[];
  removedFeatureIds: Array<string | number>;
  corridorBounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
}
```

1. **ID Hashing**: Each satellite fire detection has an immutable deterministic ID derived from `round(lat, 4)_round(lon, 4)_acq_time`.
2. **Local Merging**:
   - The client retrieves `/api/v1/corridor/diff?since_seq={currentSeq}`.
   - The local GeoJSON source in MapLibre updates only modified features via `source.setData()` using buffered animation frames to prevent canvas flicker.
   - Expired plume polygons ($> 24\text{ hours}$) are evicted from IndexedDB to maintain client performance.

---

## 5. WebGL Memory Lifecycle & Garbage Collection

Continuous map panning and high-frequency polygon refreshes can introduce WebGL context exhaustion on lower-spec field laptops:

- **Context Loss Prevention**: The MapLibre instance listens for `webglcontextlost` and gracefully restores rendering states without reloading the application.
- **Source Eviction**: Inactive spatial layers (e.g., historical plume buffers from previous operational shifts) are removed from the style tree rather than simply hidden with `visibility: none`.
- **Texture Downsampling**: On integrated Intel GPUs with $\le 2\text{ GB}$ shared VRAM, plume heatmaps render at half resolution with bicubic interpolation on the fragment shader.

---

## 6. Service Worker Deployment Manifest

```javascript
// aeris-sw-tiles.js - Cache Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.endsWith('.pmtiles') || url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.open('aeris-gis-v1').then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});
```
