# Production Configuration & Performance Infrastructure Guide

**Sprint:** Sprint-014 (v2.6.0)  
**Task ID:** MHD-017  
**Scope:** SMS Gateway API Setup & Redis 7.x Cluster Containerized Environment

---

## 1. SMS Gateway Production Configuration

ThaibaHive uses a REST-based SMS dispatch interface to send emergency notifications, attendance alert SMS to parents, and security OTPs.

### Environment Variables (.env.production)

```env
SMS_GATEWAY_API_URL=https://api.your-sms-provider.com/v1/send
SMS_GATEWAY_API_KEY=your_sms_gateway_api_key_here
SMS_GATEWAY_SENDER_ID=THAIBA
SMS_GATEWAY_MAX_RETRIES=3
SMS_GATEWAY_TIMEOUT_MS=5000
```

### Supported SMS Gateways

1. **Twilio**: Set `SMS_GATEWAY_API_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
2. **MSG91 / Infobip**: Standard JSON REST payload format.

### Token-Bucket Rate Limiting

Dispatches are governed by a token-bucket rate limiter (`src/lib/rate-limiter/sms-rate-limiter.ts`) ensuring compliance with provider quotas (default: 50 msg/sec per campus tenant).

---

## 2. Redis 7.x Cluster Setup for Performance Testing

For multi-campus deployments or local cluster performance benchmarking, a 6-node Redis Cluster (3 masters, 3 replicas) is provided.

### Architecture

- **Hashtag Sharding**: Key names follow `thaiba:{tenant_id}:*` to ensure all key operations for a tenant route to the same slot hash.
- **Node Allocation**:
  - `redis-node-1` (7001) - Master A
  - `redis-node-2` (7002) - Master B
  - `redis-node-3` (7003) - Master C
  - `redis-node-4` (7004) - Replica A
  - `redis-node-5` (7005) - Replica B
  - `redis-node-6` (7006) - Replica C

### Running Local Redis Cluster

```bash
docker-compose -f docker-compose.redis-cluster.yml up -d
```

### Verifying Cluster Health

```bash
docker exec redis-node-1 redis-cli -p 7001 CLUSTER INFO
```

Expected output:
```
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_known_nodes:6
```

### Application Connection

Set in `.env.production`:
```env
REDIS_CLUSTER_NODES=localhost:7001,localhost:7002,localhost:7003
```
