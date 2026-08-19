# DDoS Simulation & Synthetic Canary Operations Guide

**Version:** 1.0 (Sprint-038)  
**Author:** Implementation Engineer  
**Classification:** Operational Runbook  

---

## 1. Overview

ThaibaHive uses background synthetic canary probes and an adaptive circuit breaker to maintain platform resilience under heavy traffic spikes, DDoS floods, and upstream network jitter.

---

## 2. Synthetic Canary Probes

- **Interval:** Background runner executes probes every 10 seconds.
- **Canary Endpoints:** `/api/health`, `/api/system/metrics`, `/api/auth/status`.
- **Metrics Collected:** p50, p95, p99 gateway processing latency and error rate.
- **Healthy Thresholds:** p95 latency < 100ms and error rate < 5%.

---

## 3. Circuit Breaker States

```
 [ CLOSED ] ──(3 consecutive probe failures)──> [ OPEN (Degraded Mode) ]
     ▲                                                    │
     │                                                    │ (15s cooldown)
     │                                                    ▼
     └────────(3 consecutive good probes)────── [ HALF_OPEN ]
```

### Degraded Mode Request Shedding Rules:
1. **Never Shed:** Super Admin & Admin authenticated operations.
2. **Shed in Open State:** Public unauthenticated queries and heavy export jobs (CSV/PDF) returning `503 Service Unavailable (Degraded Mode)`.

---

## 4. Running Attack Simulations

```bash
# Execute local attack simulation harness
pnpm test:ddos

# Run k6 DDoS burst simulation (1000+ RPS)
k6 run k6/ddos-burst-simulation.js

# Run k6 rate limit verification load test
k6 run k6/gateway-rate-limit-load.js
```
