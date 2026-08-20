# Dynamic Emergency Wayfinding & Evacuation Operations Manual

## 1. 3D Wayfinding Graph Model
The spatial wayfinding graph comprises multi-floor directed vertices and weighted edges:
- **Node Types**: `room_entrance`, `hallway_intersection`, `stairwell`, `elevator`, `emergency_exit`, `outdoor_gate`.
- **Edge Attributes**: `distanceMeters`, `transitTimeSeconds`, `isStepFree`, `isBlocked`, `hazardLevel`.
- **Accessibility Filtering**: Enforces step-free paths (elevators/ramps) for wheelchair and mobility-impaired occupants.

## 2. Real-Time Dynamic Hazard Avoidance
When a hazard is declared (smoke, fire, structural collapse, or chemical spill):
1. **Edge Invalidation**: Connected edges are marked `isBlocked = true` and `hazardLevel = "fire"`.
2. **Sub-5-Second Re-Routing**: `EmergencyEvacuationRouter` computes the new shortest topological path to the nearest safe designated exit across all building zones in under 5 seconds.
3. **SOAR & Emergency Broadcast**: Automatically pushes evacuation turn-by-turn routes to mobile app compass screens (`/portal/facilities` and Flutter client).

## 3. Crowd Egress Flow Simulation
The `CrowdFlowSimulator` simulates evacuation egress rates:
- Standard Door Capacity: $1.5\text{ persons/second}$ per meter of doorway width.
- Bottleneck Detection: Flags exits with queue backlogs $> 50$ persons or exit delays $> 60\text{ seconds}$.
- Egress Verification: Confirms $100\%$ evacuation rate within regulatory NFPA/OSHA building safety limits.

## 4. API & Simulation Execution
- `POST /api/twin/wayfinding` — Compute standard or accessible indoor navigation route.
- `POST /api/twin/emergency/simulate` — Trigger dynamic incident scenario with simulated occupant populations.
