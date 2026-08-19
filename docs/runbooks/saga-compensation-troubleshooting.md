# Runbook: SAGA Compensation & Rollback Troubleshooting

## Overview
This runbook provides troubleshooting steps and root-cause analysis procedures when SAGA compensation rollbacks execute or fail within the SOAR engine.

---

## 1. How SAGA Compensation Works
When a playbook execution encounters a fatal step error (and the step lacks `continue_on_error: true`):
1. The execution state transitions from `RUNNING` to `COMPENSATING`.
2. `CompensationHandler` iterates through all previously `COMPLETED` steps in **Last-In, First-Out (LIFO)** order.
3. For each action with an associated `compensate()` handler:
   - IP quarantines are unbanned.
   - Cloudflare and AWS WAF rules are deleted.
   - User security holds are removed.
4. If all reverse handlers succeed, state becomes `COMPENSATED`. If any reverse action fails, state becomes `COMPENSATION_FAILED`.

---

## 2. Investigating Failed Compensations
1. Query the failed execution via `GET /api/admin/security/soar/executions?status=FAILED` or `status=COMPENSATING`.
2. Inspect the step failure logs to identify which reverse action errored (e.g. edge WAF rate limiting or transient network timeout).
3. Manually invoke the reverse compensating action:
   - For Edge WAF: verify rule deletion via Cloudflare Dashboard or AWS WAF console.
   - For Identity: run `revocationStore.unrevokeUser(userId)`.
   - For IP: run `QuarantineManager.getInstance().unban(ip)`.

---

## 3. Telemetry & Metrics
Monitor the Prometheus metric:
`soar_compensations_total{playbook="...", status="FAILED"}`
Alert if compensation failures exceed 0 over a 15-minute window.
