# AERIS End-to-End Testing & Visual Regression Protocol

This document outlines the testing architecture, Playwright visual regression benchmarks, and Vitest component verification suites for the AERIS web application.

---

## 1. Testing Pyramid Overview

```
       ▲
      / \     E2E Visual Regression (Playwright) - Theme snapshots across Forest, Night Watch, Field
     /   \
    /     \   Integration Tests (Vitest + Testing Library) - ThemeProvider, MapLibre layer lifecycle
   /       \
  /─────────\  Unit Tests (Vitest) - Zod schema validation, date formatting, risk score math
```

---

## 2. Automated Visual Regression Protocol

Visual regression ensures that additions to components do not unintentionally alter established theme styles or break accessibility ratios:

### Test Specs (`web/tests/e2e/themes.spec.ts`)
1. **Forest Baseline Check**: Verify `#F2F5F2` page background, `#FFFFFF` cards, `#22734F` pine accent.
2. **Night Watch Check**: Verify `#0E1B26` dark background, `#152635` cards, `#3DC6B8` signal teal accent, and Dark Matter map style URL.
3. **Field Daylight Check**: Verify `#E6EBEE` high-albedo background, `2px solid #1B2B38` borders, and Positron map style URL.
4. **Theme Persistence Check**: Verify that reloading the browser retains active theme attributes without white flash (zero-FOUC).

---

## 3. Mock Service Worker (MSW) & Static Snapshot Testing

To run tests without requiring AWS network connectivity or live API keys:
- MSW intercepts `/summary`, `/sources`, `/corridor`, and `/sites` requests and returns the real preserved snapshots from `web/public/data/`.
- Validates that UI renders identical DOM trees against both live API envelopes and offline cached records.
