# Operational Guide: Cloudflare & AWS Edge WAF Automation Setup

## 1. Overview
The SOAR Edge Firewall Orchestrator (`EdgeFirewallOrchestrator`) manages real-time synchronization between local IP reputation bans and upstream Cloudflare and AWS WAF edge firewalls.

## 2. Configuration Parameters

### Cloudflare IP Access Rules
Set the following environment variables:
- `CLOUDFLARE_API_TOKEN`: Scoped API token with `Zone.Firewall Services:Edit` permissions.
- `CLOUDFLARE_ZONE_ID`: Zone identifier for the enterprise domain.

### AWS WAF IPSet Integration
Set the following environment variables:
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: AWS IAM credentials with `wafv2:UpdateIPSet` and `wafv2:GetIPSet`.
- `AWS_REGION`: Target region (e.g. `us-east-1` for global CloudFront or regional ALB).
- `AWS_WAF_IPSET_ID` & `AWS_WAF_IPSET_NAME`: Target IPSet identifier and name.

## 3. Parallel Dispatch & SAGA Rollback
- **Block Dispatch**: Invokes `EdgeFirewallOrchestrator.blockIp(ip, reason)`. Dispatches blocks to Cloudflare Access Rules and AWS WAF IPSets concurrently in `Promise.allSettled()`.
- **Compensation Rollback**: On downstream playbook failure, calls `EdgeFirewallOrchestrator.unblockIp(ip, cloudflareRuleId)`. Deletes the Cloudflare rule and updates the AWS WAF IPSet to remove the blocked IP.
