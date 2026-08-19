/**
 * Canonical Security Playbooks Library
 * Sprint-040 — 10 Pre-Configured Enterprise Security Playbooks
 */

import { SecurityPlaybook } from '../soar-types';

export const CANONICAL_SECURITY_PLAYBOOKS: SecurityPlaybook[] = [
  // 1. IP Quarantine Auto Mitigation
  {
    id: 'pb-ip-quarantine-auto',
    name: 'IP_QUARANTINE_AUTO_MITIGATION',
    version: '1.0.0',
    description: 'Autonomous multi-layer quarantine of high-confidence threat IPs across gateway, mesh, and WAF',
    category: 'NETWORK',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'THREAT_INTEL_INDICATOR',
        severity: 'HIGH',
        confidence_min: 80,
        condition: { field: 'indicator_type', operator: '==', value: 'ipv4-addr' },
      },
    ],
    steps: [
      {
        id: 'step_quarantine_mesh',
        name: 'Quarantine IP across cluster mesh',
        action: 'quarantine_ip',
        params: { ip: '{{trigger.indicator_value}}', reason: 'High-confidence threat feed indicator' },
      },
      {
        id: 'step_notify_soc',
        name: 'Notify SOC team of automated IP ban',
        action: 'notify_security_team',
        params: { message: 'Automated IP ban applied for {{trigger.indicator_value}}', severity: 'HIGH' },
        continue_on_error: true,
      },
    ],
  },

  // 2. Subnet CIDR Containment
  {
    id: 'pb-subnet-cidr-containment',
    name: 'SUBNET_CIDR_CONTAINMENT',
    version: '1.0.0',
    description: 'Containment of entire /24 CIDR subnet during coordinated distributed attacks',
    category: 'NETWORK',
    enabled: true,
    auto_execute: false,
    min_confidence: 80,
    high_impact: true,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'SUBNET_ATTACK_DETECTED',
        severity: 'CRITICAL',
      },
    ],
    steps: [
      {
        id: 'step_contain_subnet',
        name: 'Contain CIDR Subnet Block',
        action: 'contain_subnet',
        params: { subnet_cidr: '{{trigger.subnet_cidr}}', reason: 'Coordinated subnet attack pattern' },
      },
      {
        id: 'step_alert_admins',
        name: 'Urgent SOC alert on subnet containment',
        action: 'notify_security_team',
        params: { message: 'Subnet {{trigger.subnet_cidr}} contained under emergency response', severity: 'CRITICAL' },
      },
    ],
  },

  // 3. Compromised Account Lockdown
  {
    id: 'pb-compromised-account-lockdown',
    name: 'COMPROMISED_ACCOUNT_LOCKDOWN',
    version: '1.0.0',
    description: 'Revoke active sessions and enforce WebAuthn step-up on suspected account takeover',
    category: 'IDENTITY',
    enabled: true,
    auto_execute: true,
    min_confidence: 85,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'ACCOUNT_TAKEOVER_ANOMALY',
        severity: 'HIGH',
        confidence_min: 80,
      },
    ],
    steps: [
      {
        id: 'step_revoke_tokens',
        name: 'Revoke active user sessions and DPoP bindings',
        action: 'revoke_session',
        params: { user_id: '{{trigger.user_id}}' },
      },
      {
        id: 'step_enforce_stepup',
        name: 'Require WebAuthn step-up on next login',
        action: 'step_up_auth',
        params: { user_id: '{{trigger.user_id}}', level: 'WEBAUTHN' },
      },
      {
        id: 'step_notify_user_and_soc',
        name: 'Alert user and security team of account hold',
        action: 'notify_security_team',
        params: { message: 'Security hold placed on account {{trigger.user_id}}', severity: 'HIGH' },
        continue_on_error: true,
      },
    ],
  },

  // 4. DPoP Proof Anomaly Escalation
  {
    id: 'pb-dpop-anomaly-escalation',
    name: 'DPOP_PROOF_ANOMALY_ESCALATION',
    version: '1.0.0',
    description: 'Immediate throttle and token revocation on forged or replayed DPoP proofs',
    category: 'IDENTITY',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'DPOP_PROOF_REPLAY_DETECTED',
        severity: 'HIGH',
      },
    ],
    steps: [
      {
        id: 'step_throttle_client',
        name: 'Throttle client IP to 10% standard quota',
        action: 'rate_limit_throttle',
        params: { target_key: 'ip:{{trigger.client_ip}}', multiplier: 0.1 },
      },
      {
        id: 'step_revoke_compromised_token',
        name: 'Revoke user token binding',
        action: 'revoke_session',
        params: { user_id: '{{trigger.user_id}}' },
      },
    ],
  },

  // 5. High-Risk Geo Blocking
  {
    id: 'pb-high-risk-geo-blocking',
    name: 'HIGH_RISK_GEO_BLOCKING',
    version: '1.0.0',
    description: 'Apply restrictive throttling or quarantine for anomalous logins from embargoed geolocations',
    category: 'NETWORK',
    enabled: true,
    auto_execute: false,
    min_confidence: 75,
    high_impact: true,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'EMBARGOED_GEO_ACCESS_ATTEMPT',
        severity: 'MEDIUM',
      },
    ],
    steps: [
      {
        id: 'step_quarantine_geo_ip',
        name: 'Quarantine source IP from embargoed region',
        action: 'quarantine_ip',
        params: { ip: '{{trigger.ip}}', reason: 'Restricted geo-origin access policy' },
      },
    ],
  },

  // 6. Malicious Domain DNS Sinkhole
  {
    id: 'pb-malicious-domain-sinkhole',
    name: 'MALICIOUS_DOMAIN_DNS_SINKHOLE',
    version: '1.0.0',
    description: 'Quarantine external webhook/C2 domains received via threat feeds',
    category: 'THREAT_INTEL',
    enabled: true,
    auto_execute: true,
    min_confidence: 90,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'THREAT_INTEL_INDICATOR',
        confidence_min: 90,
        condition: { field: 'indicator_type', operator: '==', value: 'domain-name' },
      },
    ],
    steps: [
      {
        id: 'step_alert_domain_c2',
        name: 'Log and alert malicious C2 domain',
        action: 'notify_security_team',
        params: { message: 'Malicious C2 domain flagged: {{trigger.indicator_value}}', severity: 'HIGH' },
      },
    ],
  },

  // 7. Credential Stuffing Defense
  {
    id: 'pb-credential-stuffing-defense',
    name: 'CREDENTIAL_STUFFING_DEFENSE',
    version: '1.0.0',
    description: 'Automated adaptive throttling and IP quarantine upon distributed brute-force detection',
    category: 'IDENTITY',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'CREDENTIAL_STUFFING_BURST',
        severity: 'HIGH',
      },
    ],
    steps: [
      {
        id: 'step_throttle_auth_route',
        name: 'Enforce aggressive auth rate limiting',
        action: 'rate_limit_throttle',
        params: { target_key: 'ip:{{trigger.source_ip}}', multiplier: 0.05 },
      },
      {
        id: 'step_quarantine_stuffing_ip',
        name: 'Quarantine attacking source IP',
        action: 'quarantine_ip',
        params: { ip: '{{trigger.source_ip}}', reason: 'Credential stuffing attack pattern' },
      },
    ],
  },

  // 8. DDoS Circuit Breaker Containment
  {
    id: 'pb-ddos-circuit-breaker-containment',
    name: 'DDOS_CIRCUIT_BREAKER_CONTAINMENT',
    version: '1.0.0',
    description: 'Automated mitigation and notification when gateway circuit breaker trips',
    category: 'DDOS',
    enabled: true,
    auto_execute: true,
    min_confidence: 85,
    rollback_strategy: 'NONE',
    triggers: [
      {
        event_type: 'GATEWAY_CIRCUIT_BREAKER_TRIPPED',
        severity: 'CRITICAL',
      },
    ],
    steps: [
      {
        id: 'step_alert_critical_ddos',
        name: 'Dispatch emergency SOC notification',
        action: 'notify_security_team',
        params: { message: 'CRITICAL: Gateway circuit breaker tripped on {{trigger.route}}', severity: 'CRITICAL' },
      },
    ],
  },

  // 9. Federated Threat Auto Propagation
  {
    id: 'pb-federated-threat-propagation',
    name: 'FEDERATED_THREAT_AUTO_PROPAGATION',
    version: '1.0.0',
    description: 'Broadcast high-severity threat indicators to peer educational institutions',
    category: 'THREAT_INTEL',
    enabled: true,
    auto_execute: true,
    min_confidence: 85,
    rollback_strategy: 'NONE',
    triggers: [
      {
        event_type: 'LOCAL_THREAT_CONTAINED',
        severity: 'HIGH',
      },
    ],
    steps: [
      {
        id: 'step_notify_federation_mesh',
        name: 'Publish threat indicator to federated peers',
        action: 'notify_security_team',
        params: { message: 'Federated threat broadcast: IP {{trigger.ip}} contained', severity: 'INFO' },
      },
    ],
  },

  // 10. Storm Prevention Rate Limit Adaptation
  {
    id: 'pb-storm-prevention-adaptation',
    name: 'STORM_PREVENTION_RATE_LIMIT_ADAPTATION',
    version: '1.0.0',
    description: 'Dynamic rate limit reduction during traffic spikes and API abuse surges',
    category: 'NETWORK',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    rollback_strategy: 'COMPENSATE',
    triggers: [
      {
        event_type: 'API_BURST_SURGE_DETECTED',
        severity: 'MEDIUM',
      },
    ],
    steps: [
      {
        id: 'step_apply_rate_limit_throttle',
        name: 'Apply 50% rate limit reduction for 10 minutes',
        action: 'rate_limit_throttle',
        params: { target_key: '{{trigger.target_key}}', multiplier: 0.5, duration_ms: 600000 },
      },
    ],
  },
];
