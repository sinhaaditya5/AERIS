# Tactical UAV / Drone Reconnaissance Integration & Ground Stubble Verification

## 1. Bridging the Satellite-to-Cadastral Resolution Gap

Satellite instruments such as Suomi NPP and NOAA-20/21 VIIRS provide rapid regional thermal detection across thousands of square kilometers. However, the spatial pixel footprint ($375\text{ m} \times 375\text{ m}$ at nadir, degrading to $\approx 800\text{ m}$ off-nadir) cannot definitively isolate individual agricultural land parcel boundaries (Khasra numbers) or differentiate between a permitted small waste fire and full-field paddy stubble combustion.

AERIS bridges this resolution gap by coordinating **Tactical UAV Reconnaissance**. High-priority satellite clusters generate automated flight mission corridors for regional district drone squads.

```
Satellite VIIRS Thermal Anomaly (375m pixel)
                 │
                 ▼
[AERIS Clustering & Prioritization Engine]
                 │
                 ▼
[Automated Drone Mission Dispatcher]
  - GeoJSON Bounding Polygon
  - Khasra Cadastral Parcel Overlay
  - Optimized Flight Waypoint Generator (KML / MAVLink)
                 │
                 ▼
[Field UAV Deployment (Thermal IR + 4K Optical)]
                 │
                 ▼ (5G Live Stream & Geotagged Stills)
[AERIS Operator Console Incident Ledger]
  - Definite Fire Confirmation
  - Parcel Cadastral Identification
  - Statutory Enforcement Package
```

---

## 2. Flight Path Generation & Spatial Constraints

When an active cluster has $\Sigma \text{FRP} > 150\text{ MW}$ and is within 10 km of an active flying patrol:
1. **Bounding Polygon Buffer**: The convex hull of the VIIRS detections is expanded by $250\text{ m}$ to account for orbital georeferencing jitter.
2. **Flight Altitude & Nadir Coverage**: Missions are planned at an Above Ground Level (AGL) altitude of $90\text{--}120\text{ m}$, providing a Ground Sample Distance (GSD) of $< 3.5\text{ cm/pixel}$ in RGB and $< 12\text{ cm/pixel}$ in radiometric thermal IR.
3. **MAVLink / KML Export**: The AERIS console generates standard flight mission packages importable into QGroundControl, DJI Pilot, and Autel Mission Hub.

---

## 3. UAV Telemetry & Media Ingestion API

Field drones equipped with onboard cellular edge transmitters stream telemetry directly to AERIS:

```http
POST /api/v1/uav/observation
Content-Type: application/json
Authorization: Bearer uav_squad_punjab_pat_09

{
  "uav_id": "UAV-PATIALA-04",
  "operator_id": "OFFICER-HR-8821",
  "correlated_cluster_id": "clust_sangrur_0481",
  "timestamp": "2026-10-18T12:45:10Z",
  "drone_telemetry": {
    "latitude": 30.2841,
    "longitude": 75.9214,
    "altitude_agl_m": 105.4,
    "heading_deg": 184.2
  },
  "ground_truth_status": "CONFIRMED_ACTIVE_STUBBLE_BURNING",
  "estimated_burned_area_acres": 4.8,
  "cadastral_khasra_id": "PB-SGR-NAB-482/1",
  "media_evidence": {
    "thermal_snapshot_url": "s3://aeris-evidence-vault/uav/20261018/uav_04_thermal_1245.jpg",
    "rgb_snapshot_url": "s3://aeris-evidence-vault/uav/20261018/uav_04_rgb_1245.jpg",
    "evidence_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
  }
}
```

---

## 4. Chain of Custody & Statutory Enforcement

Evidence captured via the UAV integration protocol complies with the Indian Evidence Act (Section 65B electronic record certification):
- **Cryptographic Time-stamping**: Images are watermarked with GPS coordinates, flight altitude, and NTP time-stamped signatures.
- **Immediate Administrative Notice**: Once verified, the AERIS system pre-compiles the statutory environmental compensation violation notice for review and signature by the competent Sub-Divisional Magistrate (SDM).
