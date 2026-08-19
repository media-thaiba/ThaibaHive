# API Gateway & Upstream Firewall Integration Guide

**Version:** 1.0 (Sprint-038)  
**Author:** Implementation Engineer  
**Classification:** Operational Runbook  

---

## 1. Overview

ThaibaHive synchronizes application-layer IP quarantines with upstream edge firewalls (Cloudflare and AWS WAF) so that malicious IPs are dropped at the network edge before hitting origin application servers.

---

## 2. Configuration Options

Set the environment variable `EDGE_WAF_PROVIDER`:
- `cloudflare`: Dispatches to Cloudflare IP Access Rules API.
- `aws`: Dispatches to AWS WAF IP Sets.
- `mock`: Default testing and staging dry-run mode.
- `none`: Completely disables outbound firewall dispatch.

---

## 3. Cloudflare Configuration

```env
EDGE_WAF_PROVIDER=cloudflare
CLOUDFLARE_API_TOKEN=<cloudflare-api-token>
CLOUDFLARE_ZONE_ID=<zone-id>
CLOUDFLARE_EMAIL=security@thaibahive.org
```

---

## 4. AWS WAF Configuration

```env
EDGE_WAF_PROVIDER=aws
AWS_WAF_IPSET_ID=<ip-set-id>
AWS_WAF_IPSET_NAME=ThaibaHiveQuarantineSet
AWS_WAF_SCOPE=REGIONAL
AWS_REGION=us-east-1
```

---

## 5. Webhook Ingestion

External edge firewalls can notify ThaibaHive of upstream challenge failures and high-threat blocks via:
```http
POST /api/webhooks/edge-security
Content-Type: application/json

{
  "eventType": "WAF_BLOCK_EVENT",
  "ipAddress": "198.51.100.45",
  "reason": "SQLi injection pattern blocked by edge firewall",
  "threatLevel": "CRITICAL"
}
```
