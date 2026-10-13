# AERIS Frontend Data Layer Integration & Schema Validation

This document describes the client-side data ingestion, runtime type validation, and fallback mechanisms connecting the AERIS web dashboard to backend API routes and preserved snapshot archives.

---

## 1. Data Flow Architecture

The AERIS web frontend operates under a strict dual-mode ingestion model:

```
[Local / Static Mode] ──► Reads web/public/data/*.json (Preserved real snapshots)
           ▲
           │ Configured via VITE_API_BASE_URL
           ▼
[Live AWS API Mode]  ──► Calls API Gateway HTTP API routes (/summary, /sources, etc.)
```

### Response Envelope Contract
Every API endpoint returns an envelope containing freshness metadata:
```json
{
  "generated_at": "2026-10-14T01:30:00.000Z",
  "age_seconds": 184,
  "stale": false,
  "data": { ... }
}
```

---

## 2. Runtime Schema Validation via Zod

To protect the UI from unexpected payload shifts or partial network payloads, API responses are parsed through strict Zod schemas (`web/src/types/schemas.ts`):

```ts
import { z } from 'zod';

export const SourceClusterSchema = z.object({
  cluster_id: z.string(),
  latitude: z.number().min(28.0).max(32.5),
  longitude: z.number().min(73.5).max(77.5),
  frp_mw: z.number().nonnegative(),
  fire_count: z.number().int().positive(),
  confidence: z.enum(['low', 'nominal', 'high']),
  classification: z.enum(['stubble_burning', 'other_fire']),
  detected_at: z.string().datetime(),
});

export const CorridorTimeBandSchema = z.object({
  band: z.enum(['0-2h', '2-4h', '4-8h', '8-24h']),
  eta_hours: z.number(),
  centerline: z.array(z.tuple([z.number(), z.number()])),
  polygon: z.any(), // GeoJSON Polygon
  estimated_pm25_increase: z.number().nonnegative(),
});
```

If validation fails, the UI does not crash; instead, an error boundary captures the validation fault and renders a fallback banner while logging the schema disparity to `console.warn`.

---

## 3. Stale Data & 404 Degradation Handling

In adherence to the core AERIS principle—**"Real production data only; never invent default weather or synthetic readings"**:
- If an endpoint returns `404 no_data`, the UI presents a distinct grey state indicating the sensor or feed is offline.
- If `stale: true` is returned, a warning badge is displayed with the exact data age. Stale data is never masked as live.
