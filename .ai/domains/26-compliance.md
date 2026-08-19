# 26-compliance.md — Regulatory Compliance & Audit Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/26-compliance.md`

---

## 1. Executive Summary & Purpose

Ensures institutions strictly comply with government educational boards, tax regulations, labor laws, child protection policies, and non-profit trust mandates.

## 2. Key Capabilities
* **Inspection Data Pack Generator**: One-click assembly of required compliance documents for board inspections.
* **Child Protection Compliance Tracker**: Monitoring mandatory staff safety background checks and consent records.
* **Statutory Tax & Audit Support**: Exporting audit log trails, GST/TDS summaries, and non-profit trust filings.

---

# 27-marketplace.md — Marketplace & Extension Registry Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/27-marketplace.md`

---

## 1. Executive Summary & Purpose

Manages the internal App Registry, department app assignments, and dynamic feature enablement per institution type without structural code modifications.

## 2. Key Capabilities
* **App Catalog**: Registering instant and restricted workspace apps (`marketplace_apps`).
* **Department App Assignments**: Assigning optional modules to specific departments (`user_app_assignments`).
* **Access Requests & Approvals**: Routing staff application access requests (`access_requests`).

---

# 28-automation.md — Process Automation Engine Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/28-automation.md`

---

## 1. Executive Summary & Purpose

Executes 100+ pre-configured cross-domain automation recipes responding to event triggers, cron schedules, and metric threshold breaches.

## 2. Key Capabilities
* **Event-Trigger-Action Engine**: Asynchronous processing of domain event payloads.
* **Recipe Dispatcher**: Executing 100 non-blocking automation recipes (`.ai/automation/recipes.md`).
* **Scheduled Cron Runner**: Running daily midnight fee evaluations and 1st-of-month invoicing routines.

---

# 29-ai-services.md — Ambient AI System Services Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/29-ai-services.md`

---

## 1. Executive Summary & Purpose

Provides background administrative AI intelligence across attendance anomaly investigation, predictive inventory replenishment, smart fee reminder scheduling, and executive brief synthesis.

## 2. Key Capabilities
* **Draft & Propose Pattern**: AI generates draft tasks, pre-filled requisitions, and proposed schedules requiring human sign-off.
* **Operational Playbooks**: Executing playbooks defined in `.ai/automation/ai-playbooks.md`.
* **Proactive Intelligence**: Anomaly detection alerts pushed directly to workspace dashboards.

---

# 30-platform-services.md — Core Platform Infrastructure Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/30-platform-services.md`

---

## 1. Executive Summary & Purpose

Provides core system infrastructure services: Auth Guard, JWT Session Management, Realtime SSE Hub, Push Notifications, Storage Proxy, and Middleware Hardening.

## 2. Key Capabilities
* **Stateless Auth Guard**: Enforcing `requireAuth(handler, permission)` on all API routes.
* **Realtime SSE Broadcast Engine**: Streaming presence, live alerts, and institution events.
* **Supabase Storage Proxy**: Secure chunked upload and range-stream download proxy `/api/upload/files/[...path]`.
