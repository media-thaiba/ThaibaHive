# SafeCampus OS: Threat Detection Triage & Guard Dispatch Runbook (RUNBOOK-02)

## 1. Threat Classification Matrix
| Threat Type | Default Severity | Auto-Escalation Rule | Primary Action |
|---|---|---|---|
| `perimeter_intrusion` | Critical / High | High security zone or after-hours | Automated guard dispatch + 3D route |
| `crowd_surge` / `stampede_risk` | Critical | Density $> 4.0\text{ p/m}^2$ | Open auxiliary exit gates, notify crowd safety lead |
| `slip_and_fall` | High / Medium | Immobility duration $> 15\text{s}$ | Dispatch medical first-responder guard |
| `camera_tampering` / `occlusion` | High | Luminance variance $< 5.0$ | Flag security tech ticket + dispatch nearest patrol |
| `blacklisted_vehicle` | Critical | Blacklist flag in permit DB | Lock barrier gate, sound gate alert |

## 2. Automated Triage Workflow
1. **Detection & Deduplication**:
   - Threat alert received by `IncidentLedgerEngine`. Deduplicated within a 30-second sliding window per camera zone.
2. **Deterministic Threat Scoring**:
   - `ThreatScoringMatrix` calculates composite risk score based on confidence, after-hours status, and crowd presence.
3. **Guard Dispatch**:
   - Closest on-duty guard identified via 3D Euclidean distance and assigned 3D A* route.
   - Mobile notification delivered to Flutter Guard Patrol terminal with ETA and target coordinates.
