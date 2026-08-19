# Campus Micro-Segmentation & VLAN Steering Guide
**Sprint-041 Operational Guide | AIOS Network Architecture**

---

## 1. Network Topology & Trust-to-VLAN Mapping
ThaibaHive coordinates with campus networking equipment (Cisco/Aruba/OpenFlow switch adapters, Edge Gateways, and host-level Iptables) to dynamically place endpoints into isolated broadcast domains:

| Trust Tier | Score Range | Assigned VLAN | Permitted Access |
|---|---|---|---|
| **HIGH_TRUST** | 80 – 100 | **VLAN 10** | Unrestricted production database, admin APIs, and ERP systems |
| **MEDIUM_TRUST** | 50 – 79 | **VLAN 20** | Academic portals, learning management, and student services |
| **LOW_TRUST** | 20 – 49 | **VLAN 30** | Isolated inspection zone, step-up MFA challenge required |
| **UNTRUSTED** | 0 – 19 | **VLAN 99** | Complete quarantine isolation; zero lateral network access |

---

## 2. Policy Rule Hierarchy & Priority Resolution
- Rule priorities range from `1` (highest priority) to `1000` (lowest priority).
- Explicit `DENY` or `QUARANTINE` rules always supersede conflicting `ALLOW` rules within the same priority tier.
- If no matching rule is found, the engine executes a strict **default-deny** fallback.

---

## 3. Network Enforcement Adapters
- **CampusSwitchAdapter:** Emits 802.1Q dynamic VLAN re-tagging commands via OpenFlow / SNMP / Netconf.
- **EdgeSegmentationAdapter:** Configures perimeter edge proxy ACLs and IP rate limits.
- **IptablesAdapter:** Generates kernel-level packet filter rules (`iptables -A FORWARD ...`).
