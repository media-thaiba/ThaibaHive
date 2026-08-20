# Chaos Mesh Operations & Safety Runbook

## Overview

The ThaibaHive Chaos Mesh enables controlled injection of network, latency, certificate, and state anomalies into the environment to validate resilience and verify automatic failover systems.

## Available Fault Injectors

1. **Network Partition (`NETWORK_PARTITION`)**:
   - Isolates specific subnet boundaries (e.g., edge gateway to internal auth service).
   - Verifies circuit breaker tripping and fallback cache activation.

2. **Packet Corruption (`PACKET_CORRUPTION`)**:
   - Injects random bit-flips into request payload bodies.
   - Verifies HMAC / SHA-256 integrity validation and immediate reject behavior.

3. **Latency & Jitter Injection (`LATENCY_INJECTION`)**:
   - Injects Gaussian-distributed artificial delays (50ms–500ms).
   - Verifies upstream HTTP timeout handling and adaptive rate limiting.

4. **CA Intermediate Compromise (`CA_COMPROMISE`)**:
   - Simulates immediate intermediate certificate authority compromise.
   - Verifies mTLS mesh revocation checks and automated key re-issuance.

5. **Token Replay Simulator (`TOKEN_REPLAY_INJECTION`)**:
   - Replays expired / captured JWT tokens and DPoP proofs.
   - Verifies DPoP nonce verification and JTI cache rejection.

6. **Dual-Store Split-Brain (`SPLIT_BRAIN_INJECTION`)**:
   - Simulates write divergence between primary and replica database instances.
   - Verifies conflict resolution and read-only failover routing.

## Safety Guardrails & Emergency Procedures

- **Automated Trip Thresholds**:
  - Maximum Error Rate: `1.0%`
  - Maximum P99 Latency: `1,000ms`
  - Maximum Consecutive Health Check Failures: `2`
- **Instant Kill-Switch Execution**:
  - Command: `POST /api/admin/security/predictive-resilience/chaos/abort`
  - Or via UI button in the Admin Radar: Emergency Kill-Switch.
  - Aborts all active injectors in $< 100\text{ms}$ and restores original baseline routing.
