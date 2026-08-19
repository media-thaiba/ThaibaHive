# Runbook: Security Playbook Authoring & Validation Guide

## Overview
This guide provides standards and syntax specifications for authoring, validating, and registering enterprise security playbooks in ThaibaHive.

---

## 1. Playbook Schema
Playbooks are defined as declarative JSON objects validated against `PlaybookDefinitionSchema`:

```json
{
  "id": "pb-custom-waf-throttle",
  "name": "CUSTOM_WAF_THROTTLE",
  "version": "1.0.0",
  "category": "NETWORK",
  "enabled": true,
  "auto_execute": true,
  "min_confidence": 85,
  "high_impact": false,
  "rollback_strategy": "COMPENSATE",
  "triggers": [
    {
      "event_type": "RATE_LIMIT_EXCEEDED",
      "severity": "HIGH",
      "condition": {
        "field": "violation_count",
        "operator": ">=",
        "value": 100
      }
    }
  ],
  "steps": [
    {
      "id": "step_throttle_ip",
      "name": "Apply Aggressive Throttle",
      "action": "rate_limit_throttle",
      "params": {
        "key": "{{trigger.ip}}",
        "max_requests": 5,
        "window_seconds": 60
      },
      "timeout_ms": 5000
    }
  ]
}
```

---

## 2. Dynamic Interpolation Syntax
Use double curly brackets `{{path}}` to interpolate dynamic variables from context:
- `{{trigger.field_name}}` — Access properties from the incoming threat trigger.
- `{{steps.step_id.output.property}}` — Access returned outputs from previous pipeline steps.
- `{{target.value}}` — Access primary target entity value (IP, user ID, subnet).

---

## 3. Built-in Action Handlers
| Action Name | Description | Compensation Support |
|---|---|---|
| `quarantine_ip` | Banned across gateway and in-memory store | ✅ Reverse unban |
| `contain_subnet` | Banned entire /24 CIDR subnet | ✅ Reverse unban |
| `revoke_session` | Revokes specific user JWT session | ❌ Non-reversible |
| `identity_lockdown` | Complete account security hold | ✅ Unlocks account |
| `sync_edge_waf` | Dispatches block to Cloudflare & AWS WAF | ✅ Deletes edge rule |
| `rate_limit_throttle` | Applies temporary strict rate limit tier | ❌ Auto-expires |
| `notify_security_team`| Dispatches critical SOC alert | ❌ Notification only |
| `dispatch_webhook` | Calls external SIEM or webhook endpoint | ❌ Webhook dispatch |

---

## 4. Validation & Deployment
Always validate new playbooks with `PlaybookValidator.validate(playbook)` or via `POST /api/admin/security/soar/playbooks`.
