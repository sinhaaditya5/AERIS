# Capture checklist: app screens and data needed per scene

Setup (from repo root): `./start.sh --dev --port 5173`, then `npm run capture` inside `video/` (Playwright + Google Chrome, 1920×1080, Metal GPU, injected cursor). Basemap tiles (Esri) need internet. No keys, tokens or personal data appear: the dashboard is a read-only local session.

| Clip (`raw/`) | Used in | App screen | Data it must show | Files behind it |
|---|---|---|---|---|
| `source_map` | SOURCE | Map Explorer, Full Airshed, Sat basemap | fire clusters, plume bands, AQI station markers; inspector for `src_004`; inspector for an OpenAQ station | `sources.json`, `fires.json`, `aqi.json`, `corridor.geojson` |
| `source_table` | SOURCE | Fire Sources | 10 candidates, FRP 1,278 MW, `src_004` 675.5 MW / 104 fires | `sources.json` |
| `move_map` | MOVE | Map Explorer, Corridor + time chips (Start, +4h, +8h, +24h) | 0–2 / 2–4 / 4–8 / 8–24 h bands, centrelines, ETA markers | `corridor.geojson` |
| `move_dash` | MOVE | Dashboard, ORIGIN → FLOW → IMPACT strip | "Wind from SW (214°) · 10.2 km/h · Open-Meteo GFS · capture 2026-10-07" | `wind.json` |
| `expose_map` | EXPOSE | Map Explorer, search "Akash" → fly-to | Akash Hospital, Ballabgarh in the 0–2 h band, facility markers, NCR corridor | `ranked_sites.json`, `corridor.geojson` |
| `expose_table` | EXPOSE | Population Risk Registry | 7,132,123 · "Threshold sensitivity range: 7,132,123 – 14,488,106" · 230 schools · 214 hospitals · ranked table | `ranked_sites.json` |
| `act_modal` | ACT | Dashboard → *View All Recommendations* modal (Institutional + Authority tabs) | #1 Akash Hospital, deadline 0.5 h, evidence line; CAQM / DPCC / DoE | `actions.json` |
| `act_page` | ACT | Protective Actions | local review checklist, "does not … send alerts" banner | `actions.json` |
| `close_dash` | CLOSE | Dashboard | KPI row 10 · 7.1M · 444 · 179 AQI | all |

Not captured on purpose: **Wind & Weather** view (its panel values come from a different grid cell/frame than the dashboard strip and could not be reconciled with `wind.json`), **Settings** (hard-coded text per `docs/audit/data-authenticity.md` F16), the alert bell (hand-written alerts, F1), and the **What If We Act?** panel (assumed 35%/55% multipliers, not a simulation).

Re-record one clip: `node capture/scenes.mjs source_map`, copy `raw/<clip>.mp4` to `public/clips/`, re-render.
