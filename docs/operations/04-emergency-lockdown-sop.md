# SafeCampus OS: Campus Emergency Lockdown Standard Operating Procedure (RUNBOOK-04)

## 1. Trigger Criteria & Authorization
Lockdowns may be triggered via:
1. **Admin SafeCampus Cockpit** (`/admin/operations/vision-shield` -> `LOCKDOWN` button) with `vision:lockdown:execute` RBAC permission.
2. **Autonomous Escalation Engine** upon verified active armed intruder or critical perimeter breach.

## 2. NFPA Life Safety Compliance
- **Magnetic Hold-Open Release**: All ingress doors secure against external entry.
- **Fail-Safe Egress**: In accordance with NFPA 101 Life Safety Code, all exit pathways and doors remain freely openable from the interior without keys or specialized tools.
- **Emergency Illumination**: Path illumination switches to 100% lumens along primary evacuation corridors.

## 3. ECO-MESH Microgrid Islanding & Power Priority
- When `triggerEcoMeshIslanding: true` is set, the system signals ECO-MESH to:
  - Isolate campus microgrid from public utility grid.
  - Lock minimum 40% BESS battery SoC reserve for emergency security & lighting.
  - Shed non-critical HVAC and EV charging loads.

## 4. All-Clear & Recovery Procedure
```http
POST /api/vision/lockdown
Content-Type: application/json

{
  "action": "lift_lockdown",
  "lockdownId": "lck_1724234567"
}
```
- Restores normal door access permissions and dims egress illumination to standard energy-saving profiles.
