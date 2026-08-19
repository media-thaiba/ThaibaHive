# Operational Runbook: AWS WAF SigV4 Integration & Webhook Security

## Overview
Outbound firewall block synchronization dispatches IP/CIDR bans to AWS WAF IPSet v2 endpoints with cryptographically signed AWS Signature Version 4 (SigV4) headers. Inbound webhook callbacks from Cloudflare and AWS are validated using HMAC-SHA256 and drift prevention.

## Signing Architecture
- **Canonical Request Construction**: Formatted according to AWS SigV4 specification.
- **HMAC Signing Chain**: `HMAC-SHA256(kSecret, "AWS4" + date) -> kDate -> kRegion -> kService -> kSigning`.
- **Retry Policy**: Full jitter exponential backoff up to 5 attempts for transient network or rate limiting errors (HTTP 429/503).

## Webhook Validation
- Constant-time HMAC comparison prevents timing side-channel analysis.
- Maximum allowable timestamp drift is 300 seconds (5 minutes) to protect against replay attacks.
