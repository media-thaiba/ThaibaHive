# ECO-RUNBOOK-04: Campus EV Fleet V2G Bidirectional Dispatch & Schedule Protection

**Module**: ECO-MESH / NetZeroOS  
**Target Systems**: Electric Campus Shuttle Buses, Facilities Vans, OCPP 2.0.1 DC Fast Chargers  

---

## 1. Overview
Operating guidelines for bidirectional Vehicle-to-Grid (V2G) power injection during peak utility pricing hours while guaranteeing 100% departure schedule compliance.

---

## 2. Key Guardrails
1. **Departure Window Protection**: V2G discharge is strictly disabled within $T_{\text{recharge}} + 30\text{ minutes}$ of the vehicle's scheduled route departure.
2. **Target SoC Compliance**: Every vehicle must reach $\ge 85\%\text{ SoC}$ (or custom route requirement) prior to departure.
3. **Minimum Discharge Floor**: No vehicle will be discharged below $25\%\text{ SoC}$ regardless of grid price signals.
4. **Driver Override**: Transport operators may override V2G mode to `urgent_charge` via the mobile app or charging screen.

---

## 3. Peak Price Event Execution
1. Utility TOU Peak pricing triggers at $14:00$ ($\$0.320/\text{kWh}$).
2. `V2GFleetDispatcher` identifies idle parked buses with $> 60\%\text{ SoC}$.
3. Dispatch command sent to OCPP 2.0.1 EVSE: Invert power from vehicle battery into facility AC distribution panel.
4. Shaves up to $120\text{ kW}$ of campus peak demand, reducing monthly demand penalty.
