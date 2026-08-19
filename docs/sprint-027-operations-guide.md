# Sprint-027 Database Queue & Personalization Auditing Operations Guide

This guide describes the operational architecture, query patterns, and maintenance procedures introduced in Sprint-027.

---

## 1. Database-Backed Job Queue System

The report generation queue has been transitioned from volatile in-memory storage to a persistent database-backed architecture utilizing two primary tables: `scheduled_jobs` and `job_executions`.

### Concurrency and Locking Strategy

To support horizontal scaling and clustered environments, the queue claims jobs using **Optimistic Locking with Conditional Updates** instead of blocking database transaction locks:
1. The queue queries for the next pending job with a status of `'queued'`.
2. It attempts to atomically update the job status:
   ```sql
   UPDATE scheduled_jobs 
   SET status = 'processing', updated_at = ? 
   WHERE id = ? AND status = 'queued';
   ```
3. The queue checks the number of affected rows. If rows affected is `1`, the node successfully claims the job. If it is `0`, another node has already claimed it; the loop continues without conflict.
4. Concurrency is limited to a maximum of **2 active executions** per server node.

### Retry Logic and Backoff

If a background job fails, the execution attempt is logged in the `job_executions` table.
- **Retry Limit**: Fails are retried up to **3 times**.
- **Exponential Backoff**: The delay between retries scales exponentially:
  - Attempt 1: 2 seconds
  - Attempt 2: 4 seconds
  - Attempt 3: 8 seconds
  - After 3 failed attempts, the job is marked as `'failed'` in the `scheduled_jobs` table.

---

## 2. Relational Database Personalization Auditing

All user workspace customization layout updates are logged in the `preference_audit_log` table for compliance tracking.

### Asynchronous Write Pipeline

To ensure response latency remains under 50ms, preference updates are written to the database **asynchronously**:
- The API route fetches the `oldValue` of the preference configuration.
- The update is executed and saved to `workspace_preferences`.
- The `logPreferenceChange` method is invoked asynchronously (decoupled background Promise handles) so that database writing time does not block the user-facing PUT response.

### Maintenance Pruning

An automated maintenance routine is exposed to purge old logs and avoid database size bloat:
```typescript
PreferenceAuditService.pruneOldAuditLogs(retentionDays = 90);
```
This prunes all audit entries older than the threshold and returns the count of deleted rows.

### Security and Isolation

- Read operations on the `preference_audit_log` are restricted strictly to security operators holding the `super_admin` role.
- Tenant isolation is strictly enforced at query level: all workspace data selections are scoped to the institution resolved from the authenticated user session context.
