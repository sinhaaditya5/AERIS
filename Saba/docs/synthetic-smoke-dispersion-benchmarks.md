# Smoke Dispersion Benchmarks & Reference Trajectory Model Comparisons

## 1. Motivation & Technical Trade-Offs

Emergency decision support requires a balance between computational fidelity and execution latency:
- **Full Chemical Transport Models (e.g., WRF-Chem, CMAQ)**: Model non-linear secondary aerosol chemistry, turbulent kinetic energy, and full 3D advection. However, they require massive HPC clusters and require $45\text{ to }120\text{ minutes}$ of wall-clock time per forecast cycle.
- **Lagrangian Particle Models (e.g., NOAA HYSPLIT)**: Provide accurate kinematic trajectories but require substantial CPU resources when simulating millions of stochastic smoke particles.
- **AERIS Segmented Gaussian Puff Engine**: Solves advection as discrete, forward-marching Gaussian puffs driven by gridded wind vectors. It executes within **$< 1.5\text{ seconds}$** inside an AWS Lambda function ($512\text{ MB}$ memory), making real-time 15-minute re-evaluation feasible.

This benchmark establishes the quantitative fidelity, spatial error envelopes, and limits of the AERIS approximation against NOAA HYSPLIT reference trajectories.

---

## 2. Benchmark Evaluation Methodology

```
NASA FIRMS Satellite Fire Granule (Sangrur, Punjab)
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
[AERIS Gaussian Puff]     [NOAA HYSPLIT Matrix]
  - Exec Time: 1.2s         - Exec Time: 340s
  - RAM: 180 MB             - RAM: 4.2 GB
       │                         │
       └────────────┬────────────┘
                    ▼
[Trajectory Comparative Differential Evaluator]
  - Centerline Displacement (km)
  - Plume Arrival Time Error (ΔETA min)
  - Cross-Track Spatial Overlap (IoU %)
```

### 2.1. Test Scenarios (Historic Calibration Episodes)
1. **Scenario A (Steady North-Westerly Wind)**: Continuous $15\text{ km/h}$ laminar flow from Sangrur to Delhi NCR under stable inversion conditions.
2. **Scenario B (Synoptic Veering Shift)**: Wind rotating from $310^\circ$ (NW) to $260^\circ$ (W) over an 8-hour advection duration.
3. **Scenario C (Low-Velocity Stagnation)**: Calm surface conditions ($u < 1.5\text{ m/s}$) with high thermal dissipation.

---

## 3. Quantitative Benchmark Results

| Performance Metric | Scenario A (Steady NW) | Scenario B (Veering Shift) | Scenario C (Calm Stagnation) | Target Acceptance Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Centerline Offset @ 100 km** | $4.2\text{ km}$ | $9.8\text{ km}$ | $6.1\text{ km}$ | $< 15.0\text{ km}$ |
| **Centerline Offset @ 250 km (Delhi)** | $11.4\text{ km}$ | $22.1\text{ km}$ | $18.5\text{ km}$ | $< 30.0\text{ km}$ |
| **Arrival Time Error ($\Delta\text{ETA}$)** | $\pm 18\text{ min}$ | $\pm 38\text{ min}$ | $\pm 52\text{ min}$ | $< 60\text{ min}$ |
| **Spatial Polygon IoU ($4\text{ h}$ Buffer)** | $0.81$ | $0.73$ | $0.68$ | $> 0.65$ |
| **Lambda Wall-Clock Compute Time** | $1.18\text{ s}$ | $1.42\text{ s}$ | $1.31\text{ s}$ | $< 3.00\text{ s}$ |

---

## 4. Key Limitations & Operational Guidance

While the AERIS segmented Gaussian puff model provides rapid situational awareness:
1. **Terrain Interception**: It does not simulate micro-scale building drag in the dense urban canyons of Old Delhi.
2. **Secondary Aerosol Chemistry**: Conversion of volatile organic compounds (VOCs) and $\text{NO}_x$ into secondary organic aerosol (SOA) is represented via an empirical decay and formation proxy rather than explicit photochemical mechanisms.
3. **Operational Interpretation**: Duty officers must treat AERIS plume boundaries as indicative probability envelopes rather than absolute deterministic edges.
