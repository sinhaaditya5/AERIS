# Operator Alert Dispatch Protocol & Municipal Escalation Matrix

## 1. Overview and Operational Purpose

The AERIS Operator Alert Dispatch Protocol governs how predictive smoke plume trajectories, receptor exposure estimations, and automated Amazon Bedrock action plans translate into real-world civil responses. 

During the critical post-monsoon stubble burning period (mid-October to late November), the delay between satellite observation and field intervention must be minimized. This document outlines the technical and operational dispatch workflows connecting the AERIS Web Operations Console to local enforcement teams, municipal corporations, healthcare institutions, and educational authorities across the Indo-Gangetic Plain.

---

## 2. Threat Classification & Alert Tiers

AERIS evaluates incident severity using a composite of total Fire Radiative Power ($\Sigma \text{FRP}$), projected advection arrival time ($\text{ETA}$), and downwind population receptor vulnerability ($V_{\text{receptor}}$).

| Alert Tier | Trigger Thresholds | Target Receptors | Primary Objective |
| :--- | :--- | :--- | :--- |
| **Tier 1: Environmental Advisory** | Projected $\Delta\text{PM}_{2.5} < 35\,\mu\text{g/m}^3$<br>$\text{ETA} > 8\text{ h}$ | General public, municipal street sweeping teams | Mechanical sweeping, water misting scheduling, public health advisory |
| **Tier 2: High Threat Warning** | Projected $\Delta\text{PM}_{2.5} \in [35, 120]\,\mu\text{g/m}^3$<br>$\text{ETA} \in [4, 8]\text{ h}$ | Outpatient clinics, primary & middle schools, transit hubs | Recirculation air filtering, sports suspension, diesel generator restrictions |
| **Tier 3: Emergency Corridor Surge** | Projected $\Delta\text{PM}_{2.5} > 120\,\mu\text{g/m}^3$<br>$\text{ETA} < 4\text{ h}$ | Hospitals (neonatal/ICU), elderly care facilities, high-density residential | GRAP Stage IV emergency measures, heavy truck diversions, clean-air shelters |

---

## 3. Automated Dispatch Pipeline

```
  +--------------------------------+
  |  AERIS Ingestion & Advection   |
  +---------------+----------------+
                  |
                  v
  +--------------------------------+
  |  Bedrock Action Agent (JSON)   |
  +---------------+----------------+
                  |
                  v
  +--------------------------------+
  |  Operator Console Review /     |
  |  Auto-Approve Bypass Threshold |
  +---------------+----------------+
          |               |
   (Manual Release) (Critical Auto-Push)
          |               |
          +-------+-------+
                  |
                  v
  +--------------------------------+
  | Multi-Agency Dispatch Gateway  |
  +---+------------+-----------+---+
      |            |           |
      v            v           v
   District     Schools     Hospitals
  Magistrates  & Daycares   & Clinics
   (NIC SMS)    (Direct)    (Gov Cloud)
```

### 3.1. Operator Validation vs. Autonomous Dispatch
1. **Standard Workflow (Human-in-the-Loop)**:
   - Duty officers at the CAQM / DPCC Operations Console view pending Bedrock action cards in `/actions`.
   - Operators verify spatial plume contours against live VIIRS detection clusters and ground CPCB telemetry.
   - One-click authorization signs and dispatches the tactical packet within the 3-minute SLA window.
2. **Autonomous Fast-Path (Tier 3 Surge)**:
   - If an active plume corridor is moving at $\ge 25\text{ km/h}$ with an estimated arrival under 120 minutes at high-density hospital clusters, the system enters autonomous broadcast mode.
   - Instant webhooks broadcast encrypted alerts directly to the State Disaster Management Authority (SDMA) API endpoints.

---

## 4. Multi-Agency Payload Specifications

All dispatch messages are structured using standardized JSON payloads compliant with the Common Alerting Protocol (CAP-IN).

```json
{
  "identifier": "AERIS-DISPATCH-20261018-0914-DELHI-SOUTH",
  "sender": "caqm-duty-officer@aeris.internal",
  "sent": "2026-10-18T09:14:22Z",
  "status": "Actual",
  "msgType": "Alert",
  "scope": "Restricted",
  "info": {
    "category": "Env",
    "event": "Smoke Corridor Advection Surge",
    "urgency": "Immediate",
    "severity": "Severe",
    "certainty": "Observed",
    "headline": "Severe Crop Smoke Plume Approaching South Delhi Corridor",
    "description": "High-density plume corridor originating from Patiala/Sangrur cluster (FRP: 1,840 MW). Projected arrival in 160 minutes.",
    "responseType": "Prepare",
    "parameter": {
      "projectedDeltaPM25": "148 ug/m3",
      "corridorETA": "2026-10-18T11:55:00Z",
      "bedrockActionPlanId": "act_bedrock_77491"
    },
    "area": {
      "areaDesc": "South Delhi, Saket, Hauz Khas Receptor Zone",
      "polygon": "28.524,77.198 28.535,77.215 28.512,77.230 28.500,77.202 28.524,77.198"
    }
  }
}
```

---

## 5. Escalation Tiers & Incident Contacts

### 5.1. Regional Nodal Responsibilities
- **Punjab / Haryana Patrol Units**: Direct coordinate push to agricultural field flying squads for targeted stubble quenching.
- **Traffic Police Command (Delhi NCR)**: Pre-emptive diversion of non-essential BS-III petrol and BS-IV diesel commercial freight at border checkpoints.
- **Directorate of Education**: Rapid text broadcast to school principals to seal ventilation dampers and restrict outdoor athletics.
- **Directorate General of Health Services (DGHS)**: Emergency oxygen reserve verification and nebulizer inventory readiness across government medical colleges.

---

## 6. Audit Trail & Verification

Every alert dispatched produces an immutable record stored in AWS S3 and logged in CloudWatch with the following parameters:
- `dispatch_id`: UUIDv4
- `trigger_source_cluster_id`: Correlated satellite cluster
- `operator_badge_id`: Identification of officer authorizing release
- `delivery_ack_latency_ms`: Round-trip acknowledgment from SMS and webhook relays
