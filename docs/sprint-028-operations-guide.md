# Operations Guide: Sprint-028 Scheduled Report Jobs & Observability

This guide details the operations, APIs, monitoring configurations, and troubleshooting steps for the Scheduled Job Queue, Telemetry Dashboards, and Preference Audit Log systems introduced in Sprint-028.

---

## 1. System Overview

Sprint-028 introduced comprehensive administrative control and observability over database-backed report generation jobs. Report generation tasks (e.g. Attendance, Finance, Academics) are enqueued into the `scheduled_jobs` database queue and processed by an autonomous background worker. Administrators can trigger, pause, resume, or cancel jobs via REST APIs or the administration console.

---

## 2. API Endpoints Reference

### 2.1 Scheduled Jobs List
- **Route:** `GET /api/admin/scheduled-jobs`
- **Access Control:** `super_admin` only
- **Query Parameters:**
  - `status` (optional): `queued` | `processing` | `success` | `failed` | `paused` | `cancelled`
  - `type` (optional): `attendance` | `finance` | `academics`
  - `institutionId` (optional): Filter by institution
  - `limit` (optional): Default 50
  - `offset` (optional): Default 0

### 2.2 Trigger Manual Job
- **Route:** `POST /api/admin/scheduled-jobs`
- **Access Control:** `super_admin` only
- **Request Body:**
  ```json
  {
    "type": "attendance" | "finance" | "academics",
    "format": "pdf" | "excel",
    "institutionId": "string",
    "options": {}
  }
  ```
- **Auditing:** Automatically logs a record in `preference_audit_log` with the key `job_trigger:[jobId]`.

### 2.3 Job Status Control (Pause/Resume/Cancel)
- **Route:** `PATCH /api/admin/scheduled-jobs/[id]`
- **Access Control:** `super_admin` only
- **Request Body:**
  ```json
  {
    "status": "paused" | "queued" | "cancelled"
  }
  ```
- **Transitions Permitted:**
  - `queued` ➔ `paused` (Pause)
  - `paused` ➔ `queued` (Resume - triggers the worker execution immediately)
  - `queued`/`processing`/`paused` ➔ `cancelled` (Cancel - also terminates any active execution and fails the record)
- **Auditing:** Automatically logs a record in `preference_audit_log` with the key `job_status_change:[id]`.

### 2.4 Preference Audit Logs
- **Route:** `GET /api/admin/audit-logs`
- **Access Control:** `super_admin` only
- **Query Parameters:** `page`, `limit`, `userId`, `preferenceKey`, `institutionId`

---

## 3. Observability & Telemetry

### 3.1 EventBus Telemetry Metrics
The queue worker emits three metrics points to the global EventBus:
1. `queue_backlog_size`: Current count of scheduled jobs with `queued` status.
2. `worker_concurrency_load`: Current active workers executing jobs (maximum capability is 2 concurrent slots).
3. `job_failure_retry_rate`: Percentage frequency of execution retries.

### 3.2 SSE Event Stream
- **Endpoint:** `GET /api/admin/swarm/stream`
- Provides real-time SSE updates containing worker metrics.
- The Swarm UI maintains reconnection loops (exponential backoff starting at 2s up to 30s) and automatically degrades to 15s database polling in case of persistent stream drops.

---

## 4. UI Dashboard Administration

### 4.1 Jobs Management Panel
Located at `/admin/scheduled-jobs`:
- Displays all jobs in a tabular list with filtering options.
- Action triggers allow operators to Pause, Resume, or Cancel tasks.
- A manual compile form allows instant task submission.

### 4.2 Swarm Telemetry Charts
Located at `/admin/swarm-intelligence` (under **Queue & Worker Telemetry**):
- Displays AreaChart timelines of backlog counts and worker concurrency.
- Renders the **Active Execution Pipeline Topology** mapping active nodes (Queue node ➔ Worker 1/2 nodes) with animated glows and labeled job identifiers during execution.

---

## 5. Troubleshooting & FAQ

### Q1: A job status is stuck on "processing" indefinitely
- **Cause:** The worker node died or was interrupted mid-execution.
- **Resolution:** Cancel the job manually using the **Cancel** button on `/admin/scheduled-jobs`. This terminates the execution lease and allows you to trigger a new manual compile task.

### Q2: SSE Console shows "connecting" or "disconnected" badge
- **Cause:** Server-Sent Events connection was closed or rate-limited.
- **Resolution:** The page automatically falls back to 15s database polling to fetch stats. Check networking/load-balancer configurations if SSE doesn't recover within 30 seconds.
