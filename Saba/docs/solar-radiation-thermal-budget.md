# Planetary Boundary Layer Collapse & Nocturnal Inversion Trap Dynamics

## 1. Thermodynamic Context in the Indo-Gangetic Basin

A defining characteristic of winter air pollution across northern India is the dramatic diurnal cycle of the **Planetary Boundary Layer (PBL)** height. Agricultural residue burning in Punjab and Haryana typically peaks in the late afternoon (14:30 to 17:30 IST) following daytime paddy harvesting.

This timing coincides with the collapse of convective boundary layer mixing, causing smoke emissions to be trapped within an extremely shallow nocturnal surface layer.

```
PBL Depth (m)
 1800 ┼──────────────────────── Daytime Convective Layer (Dilution)
      │                     ╭──────────╮
 1200 ┼                    ╭╯          ╰╮
      │                   ╭╯            ╰╮
  600 ┼                  ╭╯              ╰╮
      │                 ╭╯                ╰╮
  150 ┼─────────────────╯                  ╰──────────────── Nocturnal Ground Inversion Trap
      └─┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──
        00 02 04 06 08 10 12 14 16 18 20 22 24  Local Time (IST)
                               ▲
                       Peak Stubble Burning
```

---

## 2. Nocturnal Compression & Ground Concentration Formulation

During daytime convective mixing, emitted pollutants are distributed vertically across a large atmospheric volume $H_{\text{PBL}} \approx 1,500\text{ m}$. As solar insolation wanes, radiative ground cooling rapidly produces a negative vertical temperature gradient ($\frac{\partial T}{\partial z} > 0$), terminating vertical eddies.

The effective ground-level concentration $C(x, y, 0)$ is inversely proportional to the mixing depth $H_{\text{mix}}$:

$$C(x, y, 0) = \frac{Q}{\pi \cdot u \cdot \sigma_y \cdot \sigma_z} \sum_{n=-\infty}^{\infty} \exp\left( -\frac{(2n H_{\text{mix}})^2}{2\sigma_z^2} \right)$$

When $H_{\text{mix}}$ drops from $1,500\text{ m}$ to $180\text{ m}$ between 16:30 and 19:30 IST:
- Effective dilution volume contracts by a factor of $\approx 8.3\times$.
- Even with constant emission rate $Q$, ground-level concentration surges dramatically.
- Agricultural smoke emitted in late afternoon is effectively preserved within an atmospheric "duct", advecting horizontally towards Delhi NCR with minimal vertical dispersion.

---

## 3. AERIS Advection Model Adjustments

To avoid underestimating evening ground-level PM2.5 impact, the AERIS advection engine incorporates time-dependent boundary layer ceiling clamping:

1. **Hourly PBL Dynamic Scaling**:
   - The advection solver queries the GFS boundary layer depth variable (`HPBL`) for each timestep.
   - If $\text{HPBL} < 200\text{ m}$, the vertical dispersion parameter $\sigma_z$ is capped at $\sigma_{z,\max} = 0.8 \times \text{HPBL}$.
2. **Plume Rise Buoyancy Threshold**:
   - High-FRP fires ($\text{FRP} > 500\text{ MW}$) generate initial thermal buoyancy.
   - If calculated plume rise height exceeds the nocturnal inversion lid ($z_{\text{plume}} > H_{\text{mix}}$), the lofted fraction of the smoke is partitioned into a decoupled upper-troposphere transport layer that does not immediately impact ground receptors.

```python
def compute_effective_mixing_ceiling(gfs_hpbl: float, local_hour_ist: int) -> float:
    """Clamps atmospheric mixing depth during nocturnal inversion transitions."""
    if 18 <= local_hour_ist or local_hour_ist <= 7:
        # Nocturnal inversion clamp
        return max(120.0, min(gfs_hpbl, 280.0))
    return max(350.0, gfs_hpbl)
```

---

## 4. Operational Recommendations for Control Room Staff

- **Evening Surge Readiness**: Night-shift duty officers starting at 19:00 IST must anticipate sharp receptor index escalations even if satellite fire counts from earlier in the afternoon appeared modest.
- **Ventilation Damper Directives**: Commercial buildings and hospitals must be advised to engage indoor recirculating air purifiers before 18:00 IST, prior to the arrival of the nocturnal inversion plume front.
