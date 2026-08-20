# Campus Fleet Logistics & Safety Runbook

## Scope & Objective
Covers real-time route dispatching, predictive maintenance alerts, and driver shift safety monitoring across institutional shuttle buses and logistics vans.

## Operational Procedures
1. **Dynamic Route Generation**:
   - Routes are generated using the CVRPTW heuristic, balancing vehicle capacity against scheduled pickup requests.
2. **Predictive Maintenance Thresholds**:
   - **Brake Pad Wear > 80%**: Flags urgent maintenance required. Vehicle is immediately removed from autonomous dispatch queue.
   - **Engine Temperature > 105°C**: Dispatches radiator inspection alert.
3. **Safety & Speed Constraints**:
   - Speed limit within campus pedestrian zones: **25.0 km/h** (Critical alert at > 35 km/h).
   - Maximum continuous driver duty time: **4.0 hours**.
