# Operational Runbook: Enterprise Threat Intelligence Federation (STIX 2.1 / TAXII 2.1)

## Overview
ThaibaHive v3.23.0 implements automated bidirectional threat intelligence federation. The system polls external TAXII 2.1 collections, parses STIX 2.1 threat indicators, auto-quarantines high-confidence malicious IPs/CIDRs, and exposes a privacy-preserving STIX 2.1 export endpoint for inter-campus collective defense.

## Key Capabilities
1. **Automated TAXII 2.1 Feed Polling**: Periodic polling with ETag 304 caching and jittered exponential retry backoff.
2. **STIX 2.1 Pattern Parsing**: Extracts `[ipv4-addr:value = '...']`, `[network-traffic:dst_ref.value = '.../24']`, and domain indicators.
3. **Automated Quarantine & Reputation Adjustment**:
   - Confidence $\ge$ Configured Threshold (default 80%): Instant 24-hour IP quarantine across cluster.
   - Confidence < Threshold: Reputation penalty signal recorded in IP reputation engine.
4. **Federated Threat Sharing**: Export sanitized STIX 2.1 bundles via `/api/security/threat-intel/federation` (RFC 1918 subnets and internal user PII stripped).

## Troubleshooting & Diagnostics
- **Check Feed Health**: Navigate to `/admin/security/threat-intel` to inspect feed status, last sync timestamp, and imported indicator counts.
- **Manual Sync**: Click `Sync All Feeds` in the admin UI or POST `{ action: "sync_now" }` to `/api/admin/security/threat-intel/feeds`.
- **Feed Failure Resolution**:
  1. Verify feed credentials and endpoint reachability.
  2. Inspect Prometheus metric `threat_intel_indicators_imported_total`.
  3. Verify upstream TAXII server returns valid STIX 2.1 bundles.
