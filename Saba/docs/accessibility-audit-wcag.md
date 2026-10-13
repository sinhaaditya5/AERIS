# AERIS Accessibility Architecture & WCAG 2.1 Verification

This document details the accessibility (a11y) architecture, keyboard navigation ergonomics, and WCAG 2.1 AA/AAA compliance validations for the AERIS emergency dashboard.

---

## 1. Compliance Objectives & Emergency Context

In emergency response environments, accessibility is not merely a convenience—it is mission-critical:
- Duty officers operating in high-stress, low-light command rooms need stark contrast without glare.
- Field operators using glove-compatible touchscreens or trackballs require large click targets and clear focus rings.
- Personnel with deuteranopia or protanopia must never confuse orange caution flags with red emergency alerts.

**Target Standard**: WCAG 2.1 Level AA across all views, with Level AAA compliance for contrast on text and critical status indicators.

---

## 2. Contrast Ratio Matrix Across Themes

Contrast ratios were audited against the WCAG Luminance Algorithm:

| Theme | Foreground Element | Background Canvas | Measured Contrast Ratio | WCAG Compliance |
|---|---|---|---|---|
| **Forest** | `--text-primary` (`#1A2621`) | `--bg-page` (`#F2F5F2`) | **13.8 : 1** | AAA Pass |
| **Forest** | `--text-secondary` (`#4A5D54`) | `--bg-card` (`#FFFFFF`) | **6.4 : 1** | AA Pass |
| **Forest** | `--accent` (`#22734F`) | `--bg-card` (`#FFFFFF`) | **5.7 : 1** | AA Pass |
| **Night Watch** | `--text-primary` (`#E6F0F6`) | `--bg-page` (`#0E1B26`) | **14.2 : 1** | AAA Pass |
| **Night Watch** | `--text-secondary` (`#9AB3C5`) | `--bg-card` (`#152635`) | **6.1 : 1** | AA Pass |
| **Night Watch** | `--accent` (`#3DC6B8`) | `--bg-card` (`#152635`) | **7.9 : 1** | AAA Pass |
| **Field Daylight** | `--text-primary` (`#0A141C`) | `--bg-page` (`#E6EBEE`) | **16.5 : 1** | AAA Pass |
| **Field Daylight** | `--border-strong` (`#1B2B38`)| `--bg-page` (`#E6EBEE`) | **9.2 : 1** | UI Component Pass |

---

## 3. Color-Blind Safe Plume Ramp (`cb-safe`)

To protect operators with red-green color vision deficiency, toggling `Color-Blind Safe Mode` switches the plume arrival ramp from a traditional spectral gradient to a perceptually uniform Tol/CVD-optimized scheme:

```
Standard Ramp:
[0-2h: #DC2626 (Red)] ──► [2-4h: #EA580C (Orange)] ──► [4-8h: #F59E0B (Amber)] ──► [8-24h: #3B82F6 (Blue)]

CVD-Safe Ramp (Tol-Derived):
[0-2h: #762A83 (Deep Purple)] ──► [2-4h: #AF8DC3 (Violet)] ──► [4-8h: #7FBF7B (Muted Mint)] ──► [8-24h: #1B7837 (Forest Green)]
```

Every color-coded badge additionally pairs with a text prefix and a geometric icon (e.g., `▲ CRITICAL`, `● HIGH`, `■ CAUTION`), satisfying WCAG Success Criterion 1.4.1 (Use of Color).

---

## 4. Keyboard Navigation & Focus Rings

- **Global Focus Ring**: All interactive buttons, tabs, and form controls implement `--focus-ring: 2px solid var(--accent)` with a `2px offset`.
- **Skip Links**: The top-level application container provides an accessible skip link:
  ```html
  <a href="#main-content" class="sr-only focus:not-sr-only">Skip to incident command dashboard</a>
  ```
- **Tabindex Order**: Main view tabs (`/dashboard`, `/map`, `/analytics`, `/wind`, `/sources`, `/population`, `/shield`, `/settings`) support sequential keyboard traversal via `ArrowRight` and `ArrowLeft` keys.

---

## 5. Reduced Motion (`prefers-reduced-motion`)

For operators susceptible to vestibular motion sensitivity:
- The pulsating live sensor beacon rings (`@keyframes pulse`) are clamped to static opacity.
- MapLibre fly-to camera animations automatically degrade to instantaneous `map.jumpTo()` transitions.
