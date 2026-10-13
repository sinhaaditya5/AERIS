# AERIS Design Token Architecture & Color Mechanics

This document outlines the design token system, color mechanics, and dynamic theming architecture used across the AERIS emergency decision dashboard (`web/src/index.css` and associated React components).

---

## 1. Design Token Philosophy

AERIS is an emergency incident dashboard used by CAQM (Commission for Air Quality Management) and DPCC (Delhi Pollution Control Committee) duty officers in two distinct operational environments:
1. **Control Room Operations (Night / Low Light)**: High-stress, multi-screen consoles requiring low eyestrain and high information density.
2. **Rugged Field Laptops (Daylight / High Glare)**: High ambient sunlight requiring elevated contrast ratios, crisp borders, and zero chromatic wash-out.

To support both operating environments without code duplication or runtime CSS recalculation overhead, AERIS uses **CSS Custom Properties (CSS variables)** mapped to semantic functional roles rather than hardcoded hex values.

---

## 2. Core Theme Tokens

### 2.1 Forest Theme (Default Operational State)
Designed for standard daytime indoor control rooms. Provides a grounded, calming aesthetic with high legibility.
- `--bg-page`: `#F2F5F2` (Warm slate-grey page canvas)
- `--bg-card`: `#FFFFFF` (Crisp neutral white card background)
- `--bg-elevated`: `#EAEFEA` (Subtle elevation for headers, tables, and toolbars)
- `--border-subtle`: `#DCE4DC` (Delicate structural dividers)
- `--border-strong`: `#CBD6CB` (Card outlines and actionable widget borders)
- `--text-primary`: `#1A2621` (High contrast forest slate)
- `--text-secondary`: `#4A5D54` (Muted functional captions)
- `--text-muted`: `#788B82` (De-emphasized metadata and timestamps)
- `--accent`: `#22734F` (Deep Pine Green primary accent)
- `--accent-hover`: `#1B5E40` (Focused/hovered state)
- `--accent-subtle`: `#E8F3ED` (Pill backgrounds and selected item highlights)

### 2.2 Night Watch Theme (Control Room Night Operations)
Designed for low-light control rooms to minimize ocular fatigue during extended shifts. Paired with CARTO Dark Matter basemap cartography.
- `--bg-page`: `#0E1B26` (Deep oceanic slate dark canvas)
- `--bg-card`: `#152635` (Muted navy card container)
- `--bg-elevated`: `#1D3244` (Elevated headers, active tabs, and modals)
- `--border-subtle`: `#22384C` (Low-contrast structural dividers)
- `--border-strong`: `#2E4B64` (Defined container edges and interactive bounds)
- `--text-primary`: `#E6F0F6` (Luminescent cool white for rapid glanceability)
- `--text-secondary`: `#9AB3C5` (Balanced secondary guidance text)
- `--text-muted`: `#648096` (Non-critical timeline intervals and stale markers)
- `--accent`: `#3DC6B8` (Signal Teal high-visibility accent)
- `--accent-hover`: `#52D6C9` (Active teal highlight)
- `--accent-subtle`: `rgba(61, 198, 184, 0.12)` (Tinted badges and hover fills)

### 2.3 Field Daylight Theme (Rugged Outdoor Operations)
Designed for field teams inspecting stubble-burning clusters under direct sunlight in Punjab and Haryana.
- `--bg-page`: `#E6EBEE` (High-albedo daylight grey background)
- `--bg-card`: `#FFFFFF` (Stark opaque white surface)
- `--bg-elevated`: `#D9E1E6` (Solid structural dividers with zero transparency)
- `--border-subtle`: `#B8C5CE` (Prominent structural dividers)
- `--border-strong`: `#1B2B38` (2px reinforced solid borders for stark contrast)
- `--text-primary`: `#0A141C` (Deepest near-black for maximum sunlight contrast)
- `--text-secondary`: `#243746` (Strong secondary text)
- `--text-muted`: `#526878` (Legible outdoor metadata)
- `--accent`: `#0B5D3B` (High-saturation Emerald Green)
- `--accent-hover`: `#08492E` (Active state)
- `--accent-subtle`: `#D1E6DC` (Unambiguous daylight selection highlights)

---

## 3. Immutable Emergency Severity Tokens

Emergency status and risk classification tokens **must never invert or lose semantic clarity** across any theme. These tokens represent life-safety critical classifications:

| Semantic Token | Hex Value | Operational Meaning |
|---|---|---|
| `--status-critical` | `#DC2626` | Imminent severe exposure (AQI > 400, ETA < 2h, High Vulnerability) |
| `--status-high` | `#EA580C` | Elevated alert tier (AQI 301–400, ETA 2–4h, Hospitals/Schools) |
| `--status-caution` | `#D97706` | Moderate risk warning (AQI 201–300, ETA 4–8h) |
| `--status-ok` | `#16A34A` | Baseline acceptable readings (AQI < 100, Minimal Plume Impact) |
| `--status-stale` | `#D97706` | Cached or delayed satellite feed requiring fallback notice |
| `--status-modelled`| `#4F46E5` | Uncalibrated physics simulation chip indicator |

### Plume Arrival Ramp Tokens
- `0–2 h (Imminent Impact)`: `#DC2626` (Red-600)
- `2–4 h (Early Warning)`: `#EA580C` (Orange-600)
- `4–8 h (Advisory Window)`: `#F59E0B` (Amber-500)
- `8–24 h (Forecast Monitoring)`: `#3B82F6` (Blue-500)

When `--color-blind-safe: true` is toggled in user preferences, the plume ramp transitions to a high-distinction Viridis/Tol-derived palette ensuring zero confusion between amber and red under deuteranopia and protanopia.

---

## 4. Typography Scaling Tokens

The application supports responsive typography scaling toggles:
- **Standard Scale (14px baseline)**:
  - `--font-size-xs`: `0.75rem` (12px)
  - `--font-size-sm`: `0.8125rem` (13px)
  - `--font-size-base`: `0.875rem` (14px)
  - `--font-size-lg`: `1.0rem` (16px)
  - `--font-size-xl`: `1.25rem` (20px)
- **Enhanced Legibility Scale (16px baseline)**:
  - Scaled by factor `1.14x` to optimize legibility on high-DPI ruggedized monitors and multi-window command walls.

---

## 5. Zero-FOUC Implementation

Theme attributes are injected directly onto the root `<html>` element:
```html
<html data-theme="forest" data-accent="pine" data-density="comfortable" data-font-scale="standard">
```
To prevent Flash of Unstyled Content (FOUC), an inline blocking IIFE script in `web/index.html` resolves `localStorage` and system media queries before initial paint.
