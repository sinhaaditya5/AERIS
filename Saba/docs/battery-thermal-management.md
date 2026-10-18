# Field Hardware Power Budget, Thermal Throttling & Rugged Battery Management

## 1. Operating Context & Hardware Constraints

Agricultural fire verification teams and mobile air quality audit vans operate in rigorous field environments across rural Punjab, Haryana, and peripheral NCR highways. Field officers frequently spend 8 to 12 hours away from permanent AC power, relying on ruggedized laptops (e.g., Panasonic Toughbook, Dell Latitude Rugged) or Android/iOS tablets mounted on vehicle dashboards.

Continuous WebGL GIS map rendering, real-time cellular polling, and maximum screen brightness to combat direct solar glare can deplete standard laptop batteries in under 2.5 hours. Furthermore, direct dashboard solar radiation can drive device junction temperatures above $80^\circ\text{C}$, triggering harsh OS thermal throttling.

This guide outlines software-level power optimizations, thermal protection governors, and vehicle power inverter standards.

---

## 2. Dynamic Performance Throttling Profile

The AERIS web frontend monitors hardware telemetry (via the modern Battery Status API and device memory hooks) to enforce progressive power conservation:

```typescript
// Power governor state machine
export interface PowerProfile {
  targetFps: number;
  enableHeatmapInterpolation: boolean;
  enablePlumePulseAnimation: boolean;
  pollingIntervalMultiplier: number;
  tileCacheSizeMb: number;
}

export const POWER_PROFILES: Record<'NOMINAL' | 'BATTERY_SAVER' | 'CRITICAL_CONSERVE', PowerProfile> = {
  NOMINAL: {
    targetFps: 60,
    enableHeatmapInterpolation: true,
    enablePlumePulseAnimation: true,
    pollingIntervalMultiplier: 1.0,
    tileCacheSizeMb: 100
  },
  BATTERY_SAVER: {
    targetFps: 30,
    enableHeatmapInterpolation: false,
    enablePlumePulseAnimation: false,
    pollingIntervalMultiplier: 2.0,
    tileCacheSizeMb: 40
  },
  CRITICAL_CONSERVE: {
    targetFps: 15,
    enableHeatmapInterpolation: false,
    enablePlumePulseAnimation: false,
    pollingIntervalMultiplier: 4.0,
    tileCacheSizeMb: 15
  }
};
```

---

## 3. Display Ergonomics & OLED Power Conservation

Display power consumption scales significantly with theme selection and panel technology:

| Theme Mode | Optimal Operating Environment | Panel Power Draw (OLED) | Visual Ergonomics |
| :--- | :--- | :--- | :--- |
| **Field Daylight** | High direct outdoor solar irradiance | High ($100\%$ white background) | Maximum legibility under direct glare; mandatory in open fields. |
| **Night Watch** | Control rooms, night patrols, vehicle cabs | Minimal ($-62\%$ power vs light mode) | Pure black backgrounds (`#0a0f0d`), zero glare, preserves dark adaptation. |
| **Forest Default** | Standard indoor and overcast outdoor use | Moderate (balanced slate/green) | Neutral contrast, optimal for desktop evaluation. |

---

## 4. Vehicle Inverter & Auxiliary Power Guidelines

For patrol vehicles equipped with 12V auxiliary DC sockets:
1. **Pure Sine Wave Inverters**: Field units must utilize pure sine wave inverters rated at $\ge 150\text{ W}$ continuous (avoid modified square-wave inverters which introduce high-frequency switching noise into sensitive GPS and optical sensor interfaces).
2. **Thermal Placement**: Laptops must not be left on vehicle dashboards when stationary; solar heat buildup through windshields can exceed $70^\circ\text{C}$ within 20 minutes, causing thermal shutdown and lithium battery swelling.
3. **USB-PD High Current Ports**: Ensure 65W+ USB-C Power Delivery charging blocks to maintain positive charge rates during active cellular tethering and continuous GPS tracking.
