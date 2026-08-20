# Smart Campus HVAC & Energy Optimization Runbook

## Scope & Objective
This runbook covers the operational lifecycle, setpoint tuning, and emergency override procedures for the AIMS Autonomous HVAC and Microgrid energy optimization engines.

## Key Operating Thresholds
- **PMV Comfort Window**: $[-0.5, +0.5]$
- **Max Permitted Setpoint Delta**: $\pm 2.5^\circ\text{C}$ per optimization cycle
- **Max Ramp Rate**: $1.0^\circ\text{C} / \text{hour}$
- **ASHRAE 62.1 Minimum Outdoor Airflow**: $15 \text{ CFM/person} + 0.12 \text{ CFM/sqft}$

## Incident Response & Overrides
1. **Comfort Complaints Alert**:
   - Access Admin Radar UI at `/admin/operations/smart-campus`.
   - Click **MARL Guardrails** and verify zone temperature setpoints.
2. **Emergency Temperature Reversion**:
   - Trigger the **Global Operational Kill-Switch** from the MARL dialog or dispatch a POST to `/api/admin/operations/marl/override` with `{"action": "EMERGENCY_KILL_SWITCH"}`.
   - All dampers and VAV thermostats revert to fixed static setpoints within 15 seconds.
