# Vercel Production Environment Variables Checklist

This document is the deployment reference for configuring environment variables in the Vercel Dashboard for the **ThaibaHive** production deployment.

---

## 1. Required Variables (Mandatory for Production Boot)

| Variable Name | Description / Example | Security Requirement |
|---|---|---|
| `AUTH_JWT_SECRET` | Primary JWT signing secret used by `@thaiba/auth`. | Must be >= 32 cryptographically secure characters. |
| `DATABASE_URL` | Supabase **Transaction Pooler** connection string (Port 6543). <br>`postgres://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` | Never connect Vercel directly to port 5432 to avoid connection starvation. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Canonical production domain URL. <br>`https://thaiba-hive.vercel.app` (or custom domain `https://app.thaiba.edu`) | Must be a valid HTTPS URL with no trailing slash. |
| `SYSTEM_UPDATE_SECRET` | Secret authorizing internal system health and update routines. | Min 16 characters. |
| `CRON_SECRET` | Secret verifying automated cron invocations (e.g. Vercel Cron or GitHub Actions triggers). | Min 16 characters. |
| `NEXTAUTH_SECRET` | Secret used for NextAuth session encryption. | Min 32 characters. |

---

## 2. Supabase Storage & SDK Variables

| Variable Name | Target Value / Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client SDK. Ensure RLS is active on all tables. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key (used for server-side signed URLs and storage management). |
| `STORAGE_BUCKET_NAME` | `uploads` (Bucket must be configured as **Private** in Supabase Storage dashboard). |

---

## 3. Performance & Connection Tuning

| Variable Name | Recommended Production Value | Notes |
|---|---|---|
| `DB_POOL_MAX` | `3` | Caps Postgres client pool size per serverless lambda instance. Vercel automatically scales lambdas, so keeping this low (3) protects Supavisor pooler capacity. |
| `DB_SSL` | `true` | Enforces SSL connection encryption to Supabase. |
| `DB_IDLE_TIMEOUT_MS` | `30000` | 30 seconds idle connection release. |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | 5 seconds fast-fail connection timeout. |

---

## 4. Cryptographic Security Keys

| Variable Name | Description | Length Requirement |
|---|---|---|
| `PII_ENCRYPTION_KEY` | AES-256 encryption key for student/staff sensitive data fields. | Min 32 chars |
| `RECEIPT_SIGNING_KEY` | Key for cryptographic receipt signatures. | Min 32 chars |
| `RECEIPT_SIGNING_SECRET` | Secret for receipt verification HMAC. | Min 32 chars |
| `PAYMENT_ENCRYPTION_KEY` | Payment records encryption key. | Min 32 chars |
| `DOC_SIGNING_SECRET` | Document tamper-evident signing secret. | Min 32 chars |
| `EVENT_TICKET_KEY` | QR code ticket HMAC key. | Min 32 chars |
| `ENGAGE_AUTH_SECRET` | Mobile/Web Engage communication secret. | Min 32 chars |
| `VISITOR_HMAC_SECRET` | Security badge generation secret. | Min 32 chars |
| `HEALER_SECRET` | Autonomous healing webhook authorization secret. | Min 32 chars |
| `MDM_ENROLLMENT_TOKEN` | Mobile Device Management provisioning token. | Min 32 chars |

---

## 5. Third-Party Integrations & Observability

| Variable Name | Description |
|---|---|
| `SENTRY_DSN` | Sentry error tracking endpoint. |
| `REDIS_URL` / `UPSTASH_REDIS_REST_URL` | Upstash / Redis connection string for distributed rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |
| `RESEND_API_KEY` | Transactional email provider API key. |
| `EMAIL_FROM` | `ThaibaHive <noreply@thaiba.edu>` |
| `SMS_GATEWAY_API_URL` & `SMS_GATEWAY_API_KEY` | SMS gateway endpoints. |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key for mobile push notifications. |

---

## 6. Pre-Deployment Verification Checklist

Before pushing to production:
1. [ ] **Supabase Row Level Security**: Run `scripts/db/enable-rls.sql` in Supabase SQL editor.
2. [ ] **Supabase Storage**: Confirm `uploads` bucket is set to **Private**.
3. [ ] **Postgres Port Verification**: Confirm `DATABASE_URL` uses port `6543` (Transaction Pooler).
4. [ ] **Unique Constraint Audit**: Run `staff_institutions` duplicate check query from `docs/SUPABASE_RUNBOOK.md`.
5. [ ] **GitHub Secrets**: Ensure `DIRECT_DATABASE_URL` (port 5432), `BACKUP_S3_BUCKET`, and AWS credentials are added to repository secrets for automated backups and migrations.
