# AERIS Environmental Threat Evaluation Matrix & Receptor Ranking Formulation

This document details the scoring algorithm, vulnerability indices, and composite threat metrics implemented across the AERIS exposure ranking engine (`models/exposure/rank_sites.py`) and presented in `/shield`.

---

## 1. Exposure Scoring Formulation

AERIS evaluates site-level vulnerability using a multi-factor risk score ($R$) calculated for each sensitive facility $i$ (school or hospital) located within an active plume corridor:

$$R_i = \left( \frac{\Delta \text{PM}_{2.5, i}}{\text{PM}_{2.5, \text{thresh}}} \right) \times W_{\text{type}, i} \times \exp\left( - \lambda \cdot \text{ETA}_i \right)$$

Where:
- $\Delta \text{PM}_{2.5, i}$ is the modelled incremental particulate concentration arriving at site $i$ ($\mu\text{g/m}^3$).
- $\text{PM}_{2.5, \text{thresh}}$ is the National Ambient Air Quality standard threshold ($60\,\mu\text{g/m}^3$ for 24-hr mean).
- $W_{\text{type}, i}$ is the receptor vulnerability weighting:
  - **Hospitals / Critical Care Units**: $W = 2.0$ (High vulnerability due to inpatient respiratory load).
  - **Primary & Secondary Schools**: $W = 1.6$ (High vulnerability due to pediatric lung development).
  - **Other Public Receptors**: $W = 1.0$.
- $\lambda$ is the temporal urgency decay constant ($\lambda \approx 0.25\,\text{hr}^{-1}$), placing highest priority on sites with $\text{ETA} < 2\,\text{hours}$.

---

## 2. Risk Classification Tiers

Computed risk scores map directly into the UI status chips on `/shield` and `/dashboard`:

| Computed Score ($R$) | UI Severity Chip | Prescribed Response Directive |
|---|---|---|
| **$R \ge 3.0$** | `CRITICAL` (Red) | Immediate HVAC air recirculation switch, deploy mobile mist cannons, suspend outdoor activities. |
| **$1.5 \le R < 3.0$** | `HIGH` (Orange) | Alert facility administration; prepare indoor N95 / HEPA filtration spaces. |
| **$0.7 \le R < 1.5$** | `CAUTION` (Amber) | Advisory notice; monitor local AQI sensor feeds for confirmation. |
| **$R < 0.7$** | `OK` (Green) | Baseline surveillance; no emergency intervention required. |

---

## 3. Scientific Disclaimers & Model Bounds

1. Scores represent **uncalibrated relative risk heuristics**, not absolute medical incidence rates.
2. The arrival times are driven by Open-Meteo GFS wind forecasts and have not undergone empirical backtesting against historic station measurements.
3. Every card in `/shield` visibly links to the model limits disclaimer in accordance with AERIS data integrity standards.
