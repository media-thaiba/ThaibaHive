# Risk-Based Authentication & Adaptive Identity Security Guide

## 1. Overview & Architectural Principles

The ThaibaHive Risk-Based Authentication Engine (Sprint-037 / v3.21.0) provides continuous, contextual evaluation of every authentication request across the multi-tenant campus platform. Rather than subjecting every user to disruptive multi-factor challenges at every interaction, the risk engine dynamically calculates an objective, real-time risk score ranging from `0` (clean, verified session) to `100` (critical threat indicator).

The engine operates on zero-trust principles:
1. **Never Trust, Always Verify Context**: Even valid username/password credentials are treated as provisional until contextual telemetry (IP velocity, device signature, geographic continuity) is verified.
2. **Adaptive Escalation**: Low-risk sessions proceed unimpeded with standard token issuance; elevated-risk attempts trigger FIDO2 WebAuthn biometric challenges or encrypted one-time passwords (OTP).
3. **Continuous Evaluation**: Risk is not assessed solely at initial login; ongoing token refresh and high-privilege operations continuously query the scoring engine.

---

## 2. Risk Signals & Scoring Taxonomy

The evaluation pipeline processes five primary heuristics in deterministic sequence:

| Signal Identifier | Evaluation Rule & Calculation Logic | Score Contribution | Risk Weight |
|---|---|---|---|
| `ip_velocity` | Evaluates the count of distinct IP addresses used by the account within a rolling 15-minute sliding window. If $\ge 3$ distinct IPs originate requests for the same user, velocity is flagged. | `+30` | High |
| `geo_impossibility` | Calculates geographic distance between consecutive logins using the spherical Haversine formula over physical coordinates. If effective travel velocity exceeds $1000\text{ km/h}$, geographic impossibility is flagged. | `+40` | Critical |
| `device_drift` | Compares the client composite browser fingerprint (User-Agent, screen resolution, timezone offset, language preferences) against established baseline. If trust score $< 50$, flags major drift; if $50 \le \text{trust} < 70$, flags moderate drift. | `+25` (major)<br>`+10` (moderate) | Medium-High |
| `failed_attempts` | Analyzes rolling failed authentication count for the identity. If $\ge 5$ failures occur in 1 hour, flags brute-force velocity; if $3 \le \text{failures} < 5$, flags moderate failure velocity. | `+35` ($\ge 5$)<br>`+20` ($3-4$) | High |
| `time_anomaly` | Evaluates local institutional timezone. Authentication attempts outside normal operational hours (before 06:00 or after 22:00 local time) add minor contextual penalty. | `+5` | Low |

Scores are additive and capped at a maximum of `100`.

---

## 3. Threat Tier Classification & Action Matrix

The composite numeric score maps directly to four operational threat tiers:

```
Score:  0 ──────── 20 ──────── 50 ──────── 80 ──────── 100
Tier:     [ LOW ]      [ MEDIUM ]    [ HIGH ]    [ CRITICAL ]
Action:    ALLOW         MONITOR      STEP-UP       TERMINATE
```

### Low Tier (`0` – `20`)
- **Assessment**: Benign request from recognized device, consistent geographic location, and normal operating window.
- **Action**: Seamless session creation or token refresh. Issues standard or DPoP-bound token.

### Medium Tier (`21` – `50`)
- **Assessment**: Minor contextual variation (e.g. slight device configuration change or off-hours login).
- **Action**: Session allowed. Dispatches informational audit event to cryptographic log chain (`IDENTITY_STEPUP_TRIGGERED` marked non-blocking).

### High Tier (`51` – `80`)
- **Assessment**: Significant anomaly detected (e.g. sudden IP velocity spike or heavy device drift combined with prior failed attempts).
- **Action**: **Step-Up Authentication Required**. The application server issues an ephemeral step-up challenge token (60-second TTL) and dispatches the `<StepUpChallengeDialog>` modal. Access to protected API endpoints is gated until WebAuthn biometric assertion or OTP validation succeeds.

### Critical Tier (`81` – `100`)
- **Assessment**: High-confidence adversarial activity (e.g. impossible geographic travel speeds $> 1000\text{ km/h}$ combined with multiple brute-force failures).
- **Action**: **Immediate Session Termination & Account Quarantine**. Active sessions are revoked globally across the edge revocation mesh, cryptographic audit alerts are broadcast, and administrative notification is triggered.

---

## 4. Geographic Telemetry & Haversine Impossibility Calculation

Geographic impossibility detection calculates the shortest surface distance between two latitude/longitude points on Earth:

$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)} \right)$$

Where $R = 6371\text{ km}$. Velocity is computed as:

$$v = \frac{d}{\Delta t_{\text{hours}}}$$

If $v > 1000\text{ km/h}$ (faster than standard commercial aviation cruising velocity of $\approx 900\text{ km/h}$), the attempt is categorized as impossible concurrent presence or credential sharing.

IP geolocation results are cached in an in-memory sliding cache with a 24-hour TTL (`geoCache`) to avoid unnecessary network latency during high-frequency requests. If the upstream geolocation provider fails, the lookup degrades gracefully to `null`, ensuring zero downtime for end users while logging a fallback event.

---

## 5. Operational Calibration & Tuning

Administrators can calibrate signal weights and threshold boundaries based on institutional security posture:

```typescript
// Configuration parameters in src/lib/identity/risk-engine.ts
const IP_VELOCITY_WEIGHT = 30;
const GEO_IMPOSSIBILITY_WEIGHT = 40;
const DEVICE_DRIFT_HIGH_WEIGHT = 25;
const FAILED_ATTEMPTS_SPIKE_WEIGHT = 35;
const OFF_HOURS_WEIGHT = 5;

const STEPUP_REQUIRED_THRESHOLD = 51;
const CRITICAL_BLOCK_THRESHOLD = 81;
```

### Calibration Guidelines
1. **Exam / Financial Disbursement Periods**: In high-stakes institutional windows, decrease `STEPUP_REQUIRED_THRESHOLD` to `40` to require step-up verification on moderate drift.
2. **Mobile Roaming Staff**: For faculty traveling between distributed campus centers, increase `MAX_TRAVEL_SPEED_KMH` or allow explicit multi-institution roaming exceptions.

---

## 6. Observability & Alert Integration

Prometheus OpenMetrics exported by the engine:
- `identity_risk_score_distribution{quantile="0.5"}`: Median risk score across user base.
- `identity_risk_score_distribution{quantile="0.95"}`: 95th percentile risk score.
- `identity_stepup_triggered_total`: Cumulative counter of step-up challenges initiated.
- `identity_stepup_completed_total`: Cumulative counter of successfully verified step-up challenges.
- `identity_device_fingerprint_drift_total`: Total device drift events detected.

Target operational SLA: $\text{Step-Up Completion Rate} = \frac{\text{completed}}{\text{triggered}} \ge 95\%$.
