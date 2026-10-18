# Clean-Air Shelter Routing & Sensitive Receptor Evacuation Protocols

## 1. Operational Framework

During extreme meteorological stagnation events coinciding with peak agricultural stubble burning, regional ground concentrations of $\text{PM}_{2.5}$ frequently surpass $500\,\mu\text{g/m}^3$ (Hazardous / Emergency category). In such severe scenarios, in-situ sheltering without mechanical air purification poses acute life-safety hazards to vulnerable populations.

This protocol establishes the tactical criteria for designating municipal **Clean-Air Shelters**, routing high-risk sensitive receptors, and orchestrating emergency patient transfers.

---

## 2. Receptor Vulnerability Hierarchy

AERIS categorizes ground receptors into four distinct vulnerability classes ($V_1$ through $V_4$), prioritized dynamically when plume corridor ETA falls below critical response horizons.

```
+--------------------------------------------------------------+
| Class V4 (Immediate Critical Life Safety)                   |
| - Neonatal Intensive Care Units (NICUs)                      |
| - Pediatric Respiratory Emergency Wards                      |
| - Pulmonary Rehabilitation & Ventilator Care Centers         |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| Class V3 (Severe Vulnerability)                             |
| - Geriatric Care Homes & Assisted Living Facilities          |
| - Primary Daycare Centers & Pre-Schools (< 5 years)          |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| Class V2 (Elevated Sensitivity)                             |
| - Secondary & Higher Secondary Residential Schools           |
| - Outpatient Cardiac & Dialysis Centers                      |
+--------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| Class V1 (General Population Density)                        |
| - High-density transit interchanges & outdoor bazaars        |
+--------------------------------------------------------------+
```

---

## 3. Clean-Air Shelter Qualification Criteria

Facilities designated as official civil clean-air refuges must satisfy stringent environmental engineering specifications:

| Requirement Parameter | Minimum Operational Threshold | Preferred Standard |
| :--- | :--- | :--- |
| **HVAC Filtration Rating** | Minimum MERV-13 inline filter | HEPA H14 (99.995% particulate capture) |
| **Indoor $\text{PM}_{2.5}$ Maintenance** | $\le 25\,\mu\text{g/m}^3$ continuous | $\le 12\,\mu\text{g/m}^3$ continuous |
| **Air Exchange & $\text{CO}_2$ Control** | Indoor $\text{CO}_2 < 1,000\text{ ppm}$ | Dedicated energy recovery ventilation (ERV) |
| **Building Infiltration** | Double vestibule / airlock entry | Positive pressure differential ($+10\text{ to }+25\text{ Pa}$) |
| **Emergency Power Backup** | 8-hour continuous UPS/Generator | 24-hour dedicated fuel reserve |

### 3.1. Primary Designated Refuge Types
1. **Underground Metro Concourses**: Deep underground stations (e.g., Delhi Metro Violet and Yellow Lines) engineered with heavy industrial air filtration plants.
2. **Institutional Convention Centers**: Modern civic auditoriums and university stadiums fitted with central sealed HVAC and HEPA recirculators.
3. **Tertiary Care Hospital Sealed Wings**: Positive-pressure isolation wards pre-cleared for vulnerable community triage.

---

## 4. Corridor-Aware Tactical Evacuation Routing

Standard GPS navigation systems optimize strictly for vehicular transit duration. Under toxic smoke incursions, routing ambulances or school buses through the densest advection core exposes occupants to acute chemical trauma.

AERIS implements **Corridor-Aware Minimized Exposure Routing (CAMER)**:

$$\text{Cost}(\text{Path } P) = \int_{P} \left( \alpha \cdot \text{TravelTime}(s) + \beta \cdot \text{Concentration}_{\text{PM}_{2.5}}(s, t) \right) \, ds$$

Where:
- $s$ is the spatial coordinate along the route.
- $t = t_0 + \text{Elapsed}(s)$ accounts for dynamic plume advection while the vehicle is in motion.
- $\alpha, \beta$ are weighting coefficients shifting emphasis towards atmospheric safety when transporting $V_4$ patients.

---

## 5. Web Console Evacuation Triage Integration

The AERIS operator interface (`/receptors` view) incorporates emergency routing actions directly into the receptor detail drawer:
- **"Locate Nearest Clean Refuge"**: Calculates the lowest-exposure transit corridor to the nearest vetted facility within a 15 km radius.
- **"Generate Transfer Manifest"**: Pre-populates medical logistics forms for district health officers, specifying oxygen tank requirements and destination ICU capacity.
