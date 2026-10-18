# Telemetry Latency SLAs, Edge Polling Schedules & Offline Resilience

## 1. Scope & System Architecture

AERIS operates as a decision support pipeline where telemetry freshness directly dictates model validity. Because atmospheric transport and fire cluster geometry evolve rapidly, tight latency service-level agreements (SLAs) must be enforced across data ingestion, model execution, API caching, and frontend presentation.

This specification establishes end-to-end telemetry targets, polling configurations, and offline fallback degradation policies.

---

## 2. Ingestion & Modeling Latency Budget

The overall latency target from satellite sensor observation to operator visualization is capped at under **22 minutes** under nominal network conditions.

```
VIIRS Overpass / Sensor Acquisition
         │
         ▼ (T + 12 min NASA FIRMS publication)
Ingest Lambda Execution
         │
         ▼ (T + 2 min DB write & deduplication)
Source Clustering & Gaussian Plume Advection
         │
         ▼ (T + 3 min vector polygon generation)
Bedrock Agent Action Plan Synthesis
         │
         ▼ (T + 2 min LLM inference & schema validation)
CloudFront Cache Invalidation & API Edge Distribution
         │
         ▼ (T + 1 min SWR revalidation)
Operator Console Hydration (< 200 ms render)
```

### 2.1. Ingestion Cadence & Data Source SLAs

| Data Stream | Provider / Protocol | Cadence | Staleness Threshold | Degraded Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Active Fire Detections** | NASA FIRMS (Suomi NPP & NOAA-20/21 VIIRS) | 15 minutes | $> 45\text{ minutes}$ | Mark active clusters as `decaying`, retain polygon with reduced FRP confidence weight. |
| **Ground Air Quality** | CPCB / OpenAQ / CAAQMS (PM2.5, PM10) | 30 minutes | $> 90\text{ minutes}$ | Tag station nodes with warning amber border; interpolate using regional spatial IDW. |
| **Wind & PBL Forecast** | NOAA GFS / Open-Meteo 10m & Boundary Layer | 60 minutes | $> 180\text{ minutes}$ | Lock transport vector to persistence; display prominent banner `STALE_METEOROLOGY`. |
| **Bedrock Action Plans** | AWS Bedrock (Claude 3.5 Sonnet / Haiku fallback) | Triggered per advection run | $> 10\text{ seconds}$ | Fail over to deterministic rules-based template engine; log LLM timeout. |

---

## 3. Web Client Polling & Cache Invalidation

The AERIS Operator Console utilizes SWR (Stale-While-Revalidate) caching with dynamic backoff to conserve network bandwidth on field cellular links while ensuring critical threat alerts are received instantly.

### 3.1. Client Polling Frequencies

- **Active Alerts & Notifications**: 30 seconds
- **Plume Advection Corridors & Arrival Times**: 60 seconds
- **Ground Station PM2.5 Grid**: 120 seconds
- **Receptor Spatial Intersections**: 300 seconds

```typescript
// Web SWR configuration profile
export const AERIS_SWR_TELEMETRY_CONFIG = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 15_000, // 15s request deduplication
  focusThrottleInterval: 30_000,
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
  shouldRetryOnError: (err: unknown) => {
    // Suppress retries on explicit 404 NO_DATA to avoid network thrashes
    return !(err instanceof Response && err.status === 404);
  }
};
```

---

## 4. Edge CDN & Cache-Control Headers

All CloudFront and API Gateway endpoints return explicit cache directives to prevent stale operational intelligence from residing in intermediate browser or ISP proxies:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=60, s-maxage=120, stale-while-revalidate=300
ETag: W/"aeris-v3-corridor-89104"
X-AERIS-Data-Freshness: NOMINAL
X-AERIS-Pipeline-Elapsed-Sec: 14.8
```

If an upstream provider experiences severe outages, the API layer automatically sets:
```http
X-AERIS-Data-Freshness: DEGRADED_STALE
Warning: 110 aeris-ingest "Upstream meteorological forecast delayed > 180 minutes"
```

---

## 5. Offline Field Resilience

Field officers operating rugged tablets in rural Punjab or northern Haryana frequently experience intermittent 4G/LTE drops:

1. **Local IndexedDB Persistence**: The client synchronizes the most recent 12 hours of fire coordinates, receptor polygons, and action checklists into an encrypted local store.
2. **Optimistic Action Check-offs**: When field officers acknowledge or execute an emergency task, status changes are staged locally and flushed to the master AWS queue via exponential backoff once cellular connectivity resumes.
3. **Bandwidth Throttling Profile**: In low-bandwidth environments ($< 250\text{ kbps}$), the frontend automatically suspends satellite raster basemaps and shifts to vector stroke outlines to preserve throughput.
