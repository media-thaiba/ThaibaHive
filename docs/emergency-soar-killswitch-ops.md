# Operational Guide: Emergency SOAR Killswitch & Incident Operations

## 1. Overview
The Emergency SOAR Killswitch provides a platform-wide circuit breaker that immediately halts all autonomous playbook execution and action dispatch in the event of misconfiguration or automated response loop anomalies.

## 2. Engaging the Killswitch

### Via UI Control Center
1. Navigate to `/admin/security/orchestration`.
2. Locate the **Emergency SOAR Killswitch** card at the top right of the dashboard.
3. Click **"Engage Emergency Killswitch"**.
4. Confirm the prompt to immediately pause all autonomous orchestration.

### Via API Route
```bash
curl -X POST https://api.thaibahive.local/api/admin/security/soar/metrics \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Via Environment Configuration
Set `SOAR_ENGINE_ENABLED=false` in the deployment environment and reload services.

## 3. Post-Engagement Behavior
- All incoming threat triggers return execution status `CANCELLED`.
- Action handlers are bypassed.
- No local or edge WAF blocks are placed.
- Existing bans remain unaffected until `--emergency-revert-all` is executed if needed:
```bash
pnpm soar:simulate --emergency-revert-all
```
