# Live Threat Intelligence Graph Guide

## Overview

The ThaibaHive Threat Intelligence Graph normalizes diverse threat intelligence feeds (STIX/TAXII 2.1) and internal security telemetry into an interconnected bidirectional graph.

## Entity Schema

### Node Types
- `ThreatActor`: Adversary groups (e.g., APT29, FIN7).
- `AttackPattern`: MITRE ATT&CK techniques (e.g., T1110, T1078).
- `Vulnerability_CVE`: Known common vulnerabilities and exposures.
- `Malware`: Malicious software / payloads.
- `Infrastructure_IP`: C2 IP addresses and malicious CIDRs.
- `SystemAsset`: Internal services, databases, gateways, and auth clusters.
- `SecurityControl`: Defensive controls, WAF rules, and ZASM policies.

### Edge Types
- `TARGETS`: ThreatActor $\to$ SystemAsset
- `USES_TECHNIQUE`: ThreatActor $\to$ AttackPattern
- `EXPLOITS`: AttackPattern $\to$ Vulnerability_CVE
- `DEPLOYED_ON`: Malware $\to$ Infrastructure_IP
- `AFFECTS_ASSET`: Vulnerability_CVE $\to$ SystemAsset
- `MITIGATES`: SecurityControl $\to$ AttackPattern
- `CONNECTS_TO`: SystemAsset $\to$ SystemAsset
- `INDICATES_COMPROMISE`: Infrastructure_IP $\to$ SystemAsset

## Graph Queries & Shortest Attack Path Traversal

- **Query**: `POST /api/admin/security/predictive-resilience/graph/paths`
- **Output**:
  - `shortestPath`: Sequence of graph entities forming the most probable attack chain.
  - `chokePoints`: High-centrality intermediate nodes where defensive micro-segmentation stops the entire attack vector.
  - `blastRadius`: Percentage of total internal assets at risk if the attacker reaches the terminal node.
