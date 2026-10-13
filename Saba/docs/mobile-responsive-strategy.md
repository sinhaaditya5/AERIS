# AERIS Mobile & Tactical Tablet Responsive Strategy

This document outlines the responsive viewport layout system, touch ergonomics, and collapsible drawer patterns implemented in AERIS for emergency vehicle tablets and mobile command units.

---

## 1. Breakpoint Architecture

AERIS categorizes client viewports into three primary operational tiers:

```css
/* Mobile tactical phone (inspectors on foot) */
@media (max-width: 640px) { ... }

/* Tactical vehicle tablet (mounted iPads / Toughpads in response vans) */
@media (min-width: 641px) and (max-width: 1024px) { ... }

/* Multi-monitor desktop workstation (central command room) */
@media (min-width: 1025px) { ... }
```

---

## 2. Touch Target Ergonomics

To accommodate operators wearing protective gloves or operating in vibrating emergency vehicles:
- All interactive buttons and map toggles enforce a minimum touch bounding box of **44px × 44px**.
- Tab headers convert from a horizontal bar into a swipeable bottom navigation ribbon on viewports `< 768px`.
- Tap feedback utilizes active CSS scaling (`transform: scale(0.97)`) for immediate tactile confirmation.

---

## 3. Collapsible Drawer & Off-Canvas Map Controls

On smaller viewports, the Map Explorer (`/map`) maximizes screen real estate:
- The tabular facility list collapses into an off-canvas drawer that can be dragged up from the bottom sheet.
- The SingleLineHUD pins to the top screen edge with icon-only badges to conserve vertical space.
