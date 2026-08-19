# Multi-Region Edge Caching & Content Delivery Guide

**Sprint Reference:** Sprint-034 (v3.18.0)  
**Classification:** Enterprise Platform Architecture Guide  
**Target Audience:** DevOps, Frontend Engineers, Cloud Platform Teams

---

## 1. Caching Policies & Header Matrix

| Policy | Cache-Control Header | CDN Header | Surrogate-Key Example | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`PUBLIC_IMMUTABLE`** | `public, max-age=31536000, immutable` | `public, max-age=31536000` | `static-assets` | Static JS/CSS/Fonts |
| **`PUBLIC_SEMI_STATIC`** | `public, s-maxage=60, stale-while-revalidate=300` | `public, s-maxage=120` | `inst-101 dept-math` | Course catalogs, departments |
| **`PUBLIC_MEDIA_THUMBNAIL`** | `public, max-age=604800, stale-while-revalidate=86400` | `public, max-age=604800` | `media-img-123 inst-101` | Public student avatars, thumbnails |
| **`PRIVATE_DYNAMIC`** | `private, no-cache, no-store, must-revalidate` | `no-store` | *(None)* | Auth, payments, grades, audit logs |

---

## 2. Emergency Cache Invalidation API

Cache purges can be triggered via HMAC-signed POST requests:

```bash
# Calculate HMAC SHA-256 signature
PAYLOAD='{"tags": ["inst-101", "dept-math"]}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$EDGE_PURGE_SECRET" | awk '{print $2}')

# Send purge request
curl -X POST https://thaibahive.com/api/system/edge-cache/purge \
  -H "Content-Type: application/json" \
  -H "x-edge-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```
