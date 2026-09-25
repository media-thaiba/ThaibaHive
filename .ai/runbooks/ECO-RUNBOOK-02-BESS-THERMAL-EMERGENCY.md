# ECO-RUNBOOK-02: BESS Battery Thermal Runaway Prevention & Emergency Containment

**Module**: ECO-MESH / NetZeroOS  
**Severity**: Critical / Life Safety  
**Target Systems**: Battery Energy Storage System (500 kWh LFP), HVAC Chiller, Fire Suppression (Novec 1230 / Aerosol)  

---

## 1. Overview
Protocol for managing thermal anomalies, off-gas detection, and emergency containment within the campus central battery container.

---

## 2. Threshold Matrix

| Level | Cell Temp | Ambient Temp | Action / Intervention |
|---|---|---|---|
| **Normal** | $20^\circ\text{C} - 35^\circ\text{C}$ | $< 30^\circ\text{C}$ | Standard operational dispatch ($0.5\text{C}$ max rate) |
| **Warning** | $35^\circ\text{C} - 45^\circ\text{C}$ | $30^\circ\text{C} - 40^\circ\text{C}$ | Derate C-rate to $0.25\text{C}$, ramp liquid cooling chiller to $100\%$ |
| **Critical** | $45^\circ\text{C} - 55^\circ\text{C}$ | $> 40^\circ\text{C}$ | Immediate charge/discharge shutdown, isolate DC contactors |
| **Emergency** | $> 55^\circ\text{C}$ or Gas Detect | Any | Automatic tripping of Main DC shunt trip, activate suppression system, sound campus horn |

---

## 3. Containment Sequence
1. **DC Isolation**: Shunt trip disconnects high-voltage DC rack contactors in $< 20\text{ ms}$.
2. **Cooling Override**: Liquid chillers switch to emergency refrigerant dump mode.
3. **Fire Suppression**: Dual-stage aerosol / clean-agent flood activates if CO / VOC off-gassing exceeds $50\text{ ppm}$.
4. **Campus Incident Dispatch**: Automatically triggers SOAR incident ticket and TWIN-OPS facility evacuation zone.
