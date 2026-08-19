# Authoring Guide: Security Playbook Authoring & Schema Specification

## 1. Playbook Schema Standard
All security playbooks are defined as structured JSON/TypeScript definitions validated against `SecurityPlaybookSchema` via Zod.

```json
{
  "id": "pb-network-botnet-containment",
  "name": "NETWORK_BOTNET_CONTAINMENT",
  "version": "1.0.0",
  "description": "Quarantines confirmed botnet C2 IP and propagates block to Edge WAF",
  "category": "NETWORK",
  "enabled": true,
  "auto_execute": true,
  "min_confidence": 80,
  "high_impact": false,
  "rollback_strategy": "COMPENSATE",
  "triggers": [
    {
      "event_type": "THREAT_INTEL_INDICATOR",
      "severity": "HIGH",
      "condition": {
        "field": "threat_type",
        "operator": "==",
        "value": "botnet_c2"
      }
    }
  ],
  "steps": [
    {
      "id": "step_quarantine_ip",
      "name": "Local Gateway Quarantine",
      "action": "quarantine_ip",
      "params": {
        "ip": "{{trigger.indicator_value}}",
        "reason": "Autonomous Botnet C2 containment",
        "duration_seconds": 86400
      },
      "timeout_ms": 5000
    },
    {
      "id": "step_edge_waf",
      "name": "Upstream Cloudflare/AWS WAF Sync",
      "action": "sync_edge_waf",
      "params": {
        "ip": "{{trigger.indicator_value}}",
        "action": "BLOCK"
      },
      "timeout_ms": 5000
    }
  ]
}
```

## 2. Dynamic Parameter Paths
- `{{trigger.property}}` — Values extracted from the incoming threat trigger.
- `{{steps.<step_id>.output.property}}` — Output properties returned by previously completed steps.
- `{{target.value}}` / `{{target.type}}` — Primary target entity under response.

## 3. Playbook Validation
Validate playbooks prior to registration using `PlaybookValidator.validate(playbook)` or via `POST /api/admin/security/soar/playbooks`.
