# High-Wind Advection & Inversion Breakdown Runbook

## 1. Meteorological Dynamics & Trigger Conditions

The Indo-Gangetic Plain in late October is typically characterized by meteorological stagnation: weak surface winds ($< 5\text{ km/h}$), shallow planetary boundary layer heights ($< 350\text{ m}$), and strong thermal inversions that trap agricultural smoke close to the surface.

However, the passage of mid-latitude synoptic systems known as **Western Disturbances (WD)** introduces sudden, high-velocity wind events and abrupt inversion breakdowns:
1. **Pre-Frontal Stagnation**: Severe accumulation of biomass smoke directly over source districts (Sangrur, Patiala, Kaithal).
2. **Frontal Passage / Inversion Breakdown**: Surface winds accelerate rapidly to $20\text{--}40\text{ km/h}$, breaking the thermal cap and flushing millions of tons of concentrated particulates downwind along the north-west corridor into Delhi NCR within $3\text{ to }6\text{ hours}$.
3. **Post-Frontal Dispersion**: Clean, dry air clears the corridor, followed by temperature drops and re-establishment of ground inversions.

---

## 2. Emergency Rapid Recomputation Triggers

Under steady conditions, AERIS updates smoke plume corridors on a standard 30-minute interval. During synoptic transitions, this cadence is inadequate to capture rapid front propagation.

AERIS monitors real-time GFS / ECMWF and automated weather station (AWS) anemometers. A **Rapid Recomputation Event (RRE)** is automatically triggered when:
- **Wind Direction Shift**: $\Delta \theta \ge 30^\circ$ within a rolling 60-minute window.
- **Wind Speed Acceleration**: $\Delta u \ge 5.0\text{ m/s}$ ($18\text{ km/h}$) within 30 minutes.
- **Boundary Layer Depth Change**: $\Delta \text{PBL} \ge 300\text{ m}$ in 2 hours.

```
AWS Anemometer / GFS Cycle
         │
         ▼
[Delta Evaluator Lambda]
  ├── Direction Shift > 30°? ──► YES ──┐
  └── Velocity Shift > 5 m/s?  ──► YES ──┤
                                       ▼
                       [Trigger Immediate Corridor Recompute]
                                       │
                                       ▼ (Sub-minute priority queue)
                       [Update Webhook to Operations Console]
                                       │
                                       ▼
                       [Display Banner: "RAPID_FRONT_INCURSION"]
```

---

## 3. Operator Console Tactical Protocol

When a Rapid Recomputation Event is broadcast, the AERIS web interface switches to **High-Mobility Incursion Mode**:

1. **Map Camera Auto-Frame**: The MapLibre viewport smoothly pans and zooms out to fit the elongated advection vector from the border of Punjab across Haryana down to Greater Noida.
2. **Time-to-Impact Re-calibration**: Receptors that were previously ranked as $> 12\text{ hours}$ away are re-ordered into the $< 4\text{ hours}$ critical triage drawer.
3. **Audio-Visual Notification**: A high-contrast yellow/black hazard banner flashes at the top of the command console:
   ```
   ⚠️ RAPID FRONTAL ADVECTIVE SURGE DETECTED (32 KM/H NW)
   Estimated Delhi Arrival Accelerated by 260 Minutes. Review Updated Receptor Impact.
   ```

---

## 4. Multi-Agency Field Directives During High Wind

- **Construction & Demolition Sites**: Mandate immediate cessation of dry cutting and earth moving; strong winds mobilize surface dust in tandem with incoming smoke plumes.
- **Smog Gun & Mist Cannon Deployment**: Shift water misting units from central commercial districts to the north-western perimeter highway corridor (KMP Expressway / Singhu Border) to intercept the leading edge of the plume.
- **Traffic Signal Phasing**: Implement green corridor priority for emergency ambulance routes linking secondary clinics to major tertiary hospitals with central filtration.
