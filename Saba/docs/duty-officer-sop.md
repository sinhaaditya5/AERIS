# Standard Operating Procedure (SOP): Emergency Duty Officer Incident Triage

**Document Reference**: AERIS-SOP-2026-OCT-01  
**Target Audience**: CAQM Control Room Duty Officers, DPCC Air Quality Supervisors, District Emergency Operations Centers (DEOCs).  
**Effective Period**: Active throughout the post-monsoon stubble burning cycle (15 October – 30 November).

---

## 1. Operational Purpose

AERIS is designed to transform air quality management from a post-hoc reporting activity into an anticipatory decision-support workflow. Traditional monitoring announces hazardous PM2.5 levels only after populations have inhaled toxic concentrations. This SOP establishes clear, actionable operating procedures for duty officers utilizing AERIS during high-intensity smoke transport episodes across Delhi NCR.

---

## 2. Shift Readiness & Console Initialization

At the start of every 8-hour watch shift:

1. **Verify Console Health & Provenance**:
   - Navigate to `/settings`.
   - Confirm that the live telemetry indicator displays green (`LIVE FEED CONNECTED`).
   - If the banner indicates `STALE SNAPSHOTS DETECTED` or `DATA > 60 MIN OLD`, check data ingestion logs before making critical enforcement decisions.
2. **Theme Calibration**:
   - Day shifts (06:00 – 18:00): Select **Forest Theme** (`--accent: pine`) or **Field Daylight** if operating portable equipment.
   - Night shifts (18:00 – 06:00): Select **Night Watch Theme** (`--accent: teal`) to reduce glare and preserve night vision.
3. **Check Pipeline Cadence**:
   - Active fires refresh every 15 minutes via NASA FIRMS VIIRS.
   - Ground station AQI updates every 30 minutes via OpenAQ / CPCB.
   - 48-hour atmospheric wind forecast refreshes hourly via Open-Meteo GFS.

---

## 3. Incident Triage Workflow

```
[Satellite Cluster Ingest]
            │
            ▼
┌───────────────────────────────┐
│ Fire Radiative Power (FRP)    │
│  > 150 MW or Cluster Size > 15│
└───────────────┬───────────────┘
                │
        YES ────┴──── NO ──► Standard Background Monitoring
        │
        ▼
┌───────────────────────────────┐
│ Plume Trajectory Intersect    │
│ Delhi NCR Corridor < 4h ETA?  │
└───────────────┬───────────────┘
                │
        YES ────┴──── NO ──► Regional District Notice (Advisory Only)
        │
        ▼
┌───────────────────────────────┐
│ Receptor Exposure Check       │
│ Priority Schools/Hospitals > 5│
└───────────────┬───────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│ ESCALATION TIER 1 / TIER 2 ACTIVATION                   │
│ 1. Bedrock Action Plan Verification                     │
│ 2. Automated Advisory Issuance to Municipal Bodies     │
│ 3. Dispatch Field Enforcement Teams to Source Corridor │
└────────────────────────────────────────────────────────┘
```

---

## 4. Threat Matrix & Escalation Levels

| Threat Tier | Visual Indicator | Trigger Criteria | Duty Officer Action |
|---|---|---|---|
| **Tier 0: Nominal** | Green (`--status-ok`) | FRP < 50 MW; wind carrying smoke away from NCR; AQI < 150. | Routine hourly status check. |
| **Tier 1: Elevated** | Amber (`--status-caution`) | FRP 50–150 MW; corridor ETA 4–8 hours; sensitive sites < 10. | Notify municipal ward officers; prep mechanical road sweepers. |
| **Tier 2: Severe** | Orange (`--status-high`) | Corridor ETA 2–4 hours; estimated PM2.5 surge > 80 µg/m³; hospitals in path. | Issue pre-arrival alert to medical superintendents; halt open construction. |
| **Tier 3: Emergency** | Red (`--status-critical`) | Corridor ETA < 2 hours; PM2.5 surge > 150 µg/m³; cluster FRP > 300 MW. | Escalate to CAQM Central Command; initiate GRAP Stage IV emergency measures. |

---

## 5. Reviewing Bedrock Action Plans

1. Navigate to `/dashboard` and inspect the **AI Action Plan** panel.
2. Verify that each recommendation cites specific ranked receptors from `/shield`.
3. Confirm the generator stamp (`bedrock:claude-3-5-sonnet`, `bedrock:nova-pro`, or `rules_engine`).
4. **Mandatory Disclaimer Check**: The action plan is advisory decision support. Officers must cross-reference actual wind shear and station ground-truth before issuing mandatory public curfews or school closures.
