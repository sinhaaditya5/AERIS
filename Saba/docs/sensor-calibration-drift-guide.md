# Sensor Calibration Drift, Humidity Compensation & Outlier Rejection Guide

## 1. Introduction & Context

In the Indo-Gangetic Plain, ground-level air quality observations are captured through a heterogeneous network:
1. **Regulatory Reference Stations**: Continuous Ambient Air Quality Monitoring Stations (CAAQMS) operated by the Central Pollution Control Board (CPCB) and DPCC, utilizing beta-attenuation monitors (BAM) and tapered element oscillating microbalances (TEOM).
2. **Hyper-Local Low-Cost Networks**: Optical particle counters (OPC) measuring light scattering across micro-grids.

During post-monsoon and early winter transitions, elevated relative humidity ($\text{RH} > 70\%$) causes hygroscopic growth of sulfate, nitrate, and secondary organic aerosol particles. Uncorrected optical sensors routinely overestimate $\text{PM}_{2.5}$ mass concentration by $40\%$ to $180\%$. 

This document defines the real-time calibration curves, humidity adjustment formulations, and statistical outlier filters deployed in AERIS.

---

## 2. Hygroscopic Particle Growth Correction

To eliminate optical particle inflation caused by ambient moisture condensation, AERIS applies a non-linear k-Kohler hygroscopic correction factor $f(\text{RH})$ prior to spatial advection blending:

$$\text{PM}_{2.5,\text{dry}} = \frac{\text{PM}_{2.5,\text{raw}}}{f(\text{RH})}$$

Where $f(\text{RH})$ is characterized as:

$$f(\text{RH}) = 1 + \kappa \cdot \left( \frac{\text{RH}}{100 - \text{RH}} \right)$$

For typical North Indian agricultural biomass smoke mixed with urban dust, empirical fitting yields:
- $\kappa = 0.28$ for $\text{RH} < 65\%$
- $\kappa = 0.38$ for $65\% \le \text{RH} \le 85\%$
- For $\text{RH} > 85\%$, a saturation cap is enforced at $f(\text{RH}) = 2.45$ to prevent asymptotic over-correction under heavy fog conditions.

```python
def correct_humidity_growth(pm25_raw: float, rh_pct: float) -> float:
    """Applies piecewise hygroscopic correction to raw optical PM2.5 readings."""
    if rh_pct <= 40.0:
        return pm25_raw  # Negligible hygroscopic growth
    
    if rh_pct > 95.0:
        rh_pct = 95.0  # Clamp to avoid division by zero
        
    kappa = 0.28 if rh_pct < 65.0 else 0.38
    f_rh = 1.0 + kappa * (rh_pct / (100.0 - rh_pct))
    f_rh = min(f_rh, 2.45)
    
    return round(pm25_raw / f_rh, 2)
```

---

## 3. Statistical Outlier & Artifact Rejection

Ground telemetry pipelines frequently encounter electrical spikes, pump blockages, and insect ingress. AERIS applies a dual-stage filter:

### 3.1. Hampel Windowed Filter
A rolling 7-observation window ($W = 7$) calculates the local median and Median Absolute Deviation ($\text{MAD}$):

$$\text{MAD} = \text{median}\left( |x_i - \tilde{x}| \right)$$

If an observation exceeds $3.5 \times 1.4826 \times \text{MAD}$ from the rolling median, it is tagged `FLAG_ANOMALOUS_SPIKE` and excluded from plume calibration.

### 3.2. Stuck Value Detection
If a sensor station reports identical numerical floats ($\Delta < 0.01\,\mu\text{g/m}^3$) across $\ge 4$ consecutive 15-minute polling cycles, the sensor is flagged `FLAG_FROZEN_SAMPLE` and demoted to zero weight in the spatial interpolation matrix.

---

## 4. Ground Telemetry Data Quality Flags

The AERIS API exposes standardized data validation quality flags on all station endpoints:

| Quality Flag | Operational Meaning | Map Presentation Style |
| :--- | :--- | :--- |
| `VALID_REGULATORY` | CPCB reference BAM/TEOM within calibration window | Solid circular green node with sharp border |
| `VALID_CORRECTED` | Low-cost optical sensor corrected for humidity | Dotted circular node with confidence badge |
| `FLAG_HIGH_RH` | $\text{RH} > 85\%$, high uncertainty in optical scattering | Yellow hazard ring overlay |
| `FLAG_DRIFT_SUSPECT` | Baseline offset detected relative to neighboring stations | Amber pulsating stroke |
| `FLAG_DISCARDED` | Stuck value or severe physical spike | Greyed out, transparent marker |

---

## 5. Drift Monitoring & Recalibration Triggers

When co-located with a regulatory reference monitor, low-cost optical units compute rolling 48-hour Ordinary Least Squares (OLS) regression:

$$\text{PM}_{2.5,\text{ref}} = m \cdot \text{PM}_{2.5,\text{sensor}} + c$$

- **Slope Drift**: If $m < 0.70$ or $m > 1.35$, a calibration alert is dispatched to maintenance field crews.
- **Baseline Zero Drift**: If $c > 20\,\mu\text{g/m}^3$ during low-pollution clean windows, zero-offset recalibration is flagged in the central telemetry registry.
