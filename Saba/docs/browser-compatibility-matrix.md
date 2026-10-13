# AERIS Browser Compatibility & Hardware Acceleration Matrix

This document defines the supported browser tiers, WebGL acceleration baselines, and CSS feature fallbacks verified across the AERIS web application.

---

## 1. Supported Platform Matrix

| Browser Engine | Minimum Version | Tested Platform | Status | Hardware Acceleration Note |
|---|---|---|---|---|
| **Google Chrome (Blink)** | `118+` | Windows 11, macOS 15, Ubuntu 24.04 | **Tier 1 (Full)** | Hardware WebGL 2.0; zero performance bottlenecks |
| **Microsoft Edge (Blink)** | `118+` | Windows 10/11 Ruggedized Tablets | **Tier 1 (Full)** | Native Direct3D 11 angle backend |
| **Apple Safari (WebKit)** | `17.0+` | iPadOS 17, macOS Sonoma/Sequoia | **Tier 1 (Full)** | Metal-backed WebGL; P3 wide gamut color rendering |
| **Mozilla Firefox (Gecko)** | `120+` | Linux workstation, Windows 11 | **Tier 1 (Full)** | Canvas acceleration; full CSS `color-mix()` support |

---

## 2. Advanced CSS Feature Support & Polyfills

AERIS utilizes modern CSS primitives for its dynamic theming system:
- **`color-mix(in srgb, ...)`**: Used to generate tinted borders and translucent chip backgrounds without Sass/PostCSS compilation.
- **CSS Custom Properties**: Dynamic theme token cascades.
- **Subgrid**: Used in tabular facility listings (`/shield`) for aligned multi-column layouts.

### Feature Detection & Fallback
In legacy browsers lacking `color-mix()` support, an inline CSS fallback sets solid opacity hex fallbacks:
```css
@supports not (color: color-mix(in srgb, red, blue)) {
  .theme-badge {
    background-color: rgba(34, 115, 79, 0.15);
  }
}
```

---

## 3. WebGL Context Fallbacks

If a client device lacks WebGL 2.0 support or experiences GPU crashes:
1. MapLibre GL JS falls back to software rendering (SwiftShader / ANGLE).
2. The UI displays an advisory toast: *"Hardware acceleration unavailable; rendering in compatibility mode."*
3. Anti-aliasing and heavy particle streamlines are disabled to retain responsiveness.
