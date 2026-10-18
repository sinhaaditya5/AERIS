# End-to-End Data Provenance Tracking & Cryptographic Audit Matrix

## 1. Principles of Data Lineage in AERIS

Environmental decision intelligence requires total accountability. When an emergency advisory or school closure recommendation is issued, municipal officers, administrative courts, and scientific oversight bodies must be able to verify exactly which satellite observations, meteorological forecasts, and model runs triggered the alert.

AERIS implements **Strict Deterministic Provenance (SDP)** across every stage of the pipeline:

```
[NASA VIIRS Overpass] ──┐
                        ├──► [Source Clustering] ──► [Plume Corridor] ──► [Exposure Intersect] ──► [Bedrock Action]
[GFS Wind Forecast]   ──┘           │                        │                    │                     │
                               SHA-256                  SHA-256              SHA-256               SHA-256
                               Hash: S_1                Hash: P_1            Hash: E_1             Hash: A_1
```

---

## 2. Lineage Chain Data Model

Every API payload and stored database record contains a `provenance` block linking directly back to parent hashes:

```json
{
  "advection_corridor_id": "corr_20261018_1200_delhi",
  "generated_at": "2026-10-18T12:02:14.281Z",
  "provenance": {
    "pipeline_git_commit": "3b609e0a",
    "model_version": "v2.4.1-gaussian-advection",
    "inputs": {
      "fire_cluster_id": "clust_sangrur_0481",
      "fire_input_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "satellite_sources": [
        {"sensor": "VIIRS-SNPP", "granule_time": "2026-10-18T11:42:00Z"},
        {"sensor": "VIIRS-NOAA20", "granule_time": "2026-10-18T11:48:00Z"}
      ],
      "weather_source": {
        "model": "NOAA-GFS-0.25deg",
        "cycle": "2026-10-18T06:00:00Z",
        "forecast_step": "+6h",
        "hash": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"
      }
    },
    "execution": {
      "compute_target": "aws-lambda-eu-central-1-aeris-corridor",
      "duration_ms": 1420,
      "memory_used_mb": 248
    },
    "self_hash": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
  }
}
```

---

## 3. Statutory Re-Simulation Guarantee

A core mandate of the AERIS system is that any historical corridor and action plan can be bit-for-bit reproduced:

1. **Frozen Input Snapshots**: Raw CSV and NetCDF files retrieved from external APIs are stored permanently in Amazon S3 Intelligent-Tiering with Write-Once-Read-Many (WORM) Object Lock.
2. **Deterministic Random Seed**: All stochastic dispersion iterations (such as puff trajectory Monte Carlo perturbation) use fixed seeds derived from `SHA-256(satellite_hash + forecast_cycle)`.
3. **Execution Verification CLI**:
   ```bash
   python -m pipeline.verify_provenance \
     --corridor-id corr_20261018_1200_delhi \
     --expected-hash b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
   ```

---

## 4. UI Provenance Inspector

The AERIS Operator Console incorporates a dedicated **Telemetry Provenance Modal** on all map layers and action cards:
- Clicking the `Source Lineage` pill opens an interactive graph visualizing the sensor-to-action dependency tree.
- Operators can copy the cryptographic fingerprint to provide sworn evidence in CAQM regulatory enforcement proceedings.
- If upstream satellite telemetry was interpolated or delayed, a visual amber warning badge `PROVENANCE_IMPAIRED` indicates degraded data integrity.
