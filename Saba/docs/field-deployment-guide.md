# AERIS Field Deployment Guide: Rugged Laptop & Offline Protocol

**Applicability**: Field Inspection Teams, Mobile Ground-Truth Verification Units, Rural District Environment Officers.  
**Hardware Profile**: Panasonic Toughbook / Dell Latitude Rugged Extreme (touchscreen, stylus, matte outdoor display, IP65 rated).

---

## 1. Operating in High-Ambient Sunlight

Field teams tracking stubble fires across agricultural belts in Sangrur, Ludhiana, Karnal, and Rohtak operate in open fields under intense direct sunlight. Standard glossy screens suffer from severe specular reflection.

### Recommended Display Settings
1. **Activate Field Daylight Theme**:
   - Open AERIS -> Navigate to `/settings`.
   - Select **Base Theme: Field Daylight**.
   - Ensure the basemap style is set to **CARTO Positron High-Contrast**.
2. **Key Visual Characteristics**:
   - The theme applies `#E6EBEE` high-albedo matte grey page canvas.
   - All card borders are forced to `2px solid #1B2B38` to prevent bounding box edge bleed.
   - Contrast is boosted to **16.5:1** for primary text and numerical indicators.

---

## 2. Intermittent Connectivity & Offline Caching

Cellular data coverage (4G/LTE) along farm borders is frequently subject to signal dropouts and bandwidth throttling.

### Architectural Fallback Behavior
- **Preserved Snapshot Replay**:
  - If network requests fail with `ERR_INTERNET_DISCONNECTED` or timeout after 8 seconds, AERIS gracefully falls back to the last successfully cached local state in `IndexedDB` / `localStorage`.
- **Stale Data Banners**:
  - When the app is serving cached offline data, the header ribbon automatically mounts an amber caution pill:
    ```
    ⚠️ OFFLINE CACHE ACTIVE · LAST REAL REFRESH: 14-OCT-2026 14:30 IST
    ```
  - Stale markers are explicitly pinned to all ETA countdowns to prevent false operational certainty.

---

## 3. Battery Preservation Profile

To maximize operating time on rugged laptops during extended field patrols without vehicle DC charging:

1. **Activate Compact Density**:
   - In `/settings`, toggle **Density: Compact**. This decreases DOM node footprint and reduces map viewport recalculations.
2. **Limit Map Framerate**:
   - The field profile clamps MapLibre GL frame loop to 30 FPS when the camera is stationary.
   - Disables continuous terrain pitch tilting, locking camera pitch to `0°` (nadir view) to eliminate 3D polygon vertex transformation overhead on integrated GPUs.
