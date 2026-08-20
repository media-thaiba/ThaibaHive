# System Resilience Benchmark Scoring Guide

## Overview

The System Resilience Scoring Algorithm continuously quantifies ThaibaHive's overall resilience against outages, cyberattacks, network partitions, and infrastructure degradation.

## Scoring Vector Weights

$$\text{Composite Score} = \sum_{i=1}^5 (w_i \times S_i)$$

| Vector | Weight ($w_i$) | Factors Evaluated |
| :--- | :--- | :--- |
| **Fault Tolerance & Chaos Mesh** | $30\%$ | Successful chaos recovery rate, blast radius containment, zero lingering artifacts |
| **Recovery Time & MTTR** | $25\%$ | Mean Time to Recovery (seconds), failover duration, circuit breaker reset speed |
| **Zero-Trust Micro-Segmentation** | $20\%$ | Device trust posture, mTLS coverage %, active strict segmentation policies |
| **Predictive Hardening Readiness** | $15\%$ | Bayesian forecast accuracy, early warning lead time, preemptive SOAR automation |
| **Audit Cryptographic Health** | $10\%$ | Merkle tree integrity, ZKP proof generation speed, attestation coverage |

## Tier Classifications

- **RESILIENT ($\ge 85.0$)**: Optimal resilience posture. Full autonomous mitigation enabled.
- **ACCEPTABLE ($70.0 - 84.9$)**: Stable resilience posture with minor non-blocking gaps.
- **DEGRADED ($50.0 - 69.9$)**: Elevated vulnerability to cascading faults. Preemptive hardening advised.
- **CRITICAL ($< 50.0$)**: Immediate administrative remediation required.
