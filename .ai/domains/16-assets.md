# 16-assets.md — Fixed Asset Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/16-assets.md`

---

## 1. Executive Summary & Purpose

Tracks physical asset inventory, hardware tagging (NFC/QR), custodian assignments, purchase/warranty tracking, repair history, and straight-line/WDV depreciation calculations.

## 2. Key Capabilities
* **NFC/QR Asset Tagging**: Instant hardware scan matching in `assets` table.
* **Custodian Assignment**: Binding laptops, projectors, and furniture to staff or rooms.
* **Service History Log**: Tracking repair dates, service costs, and maintenance logs (`asset_service_history`).

---

# 17-communication.md — Communication & Engagement Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/17-communication.md`

---

## 1. Executive Summary & Purpose

Delivers multi-channel announcements, emergency mass broadcasts, circular PDFs, events, decision polls, and role-gated chat messaging between leadership, staff, students, and parents.

## 2. Key Capabilities
* **Targeted Announcements**: Priority-based broadcasts scoped by role, department, or campus.
* **Document Circulars**: Official circular publishing with download tracking (`circular_downloads`).
* **Institutional Events Calendar**: Event management with RSVP response tracking (`event_rsvps`).
* **Decision Polls**: Single-vote voting polls (`poll_responses`).

---

# 18-documents.md — Document & Media Library Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/18-documents.md`

---

## 1. Executive Summary & Purpose

Centralizes document storage, digital certificate generation, MediaHive file indexing, signed link sharing, and range-request video/audio streaming.

## 2. Key Capabilities
* **MediaHive Folder Architecture**: Hierarchical media library (`media_folders`, `media_assets`).
* **Secure Link Sharing**: Password-protected and expiring share links (`media_share_links`).
* **Chunked Upload Pipeline**: Uploading large media files with SHA-256 integrity verification (`media_uploads`).

---

# 19-helpdesk.md — IT Support & Helpdesk Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/19-helpdesk.md`

---

## 1. Executive Summary & Purpose

Manages internal IT, facilities, HR, and administrative support tickets, agent assignments, comment threads, and resolution SLAs.

## 2. Key Capabilities
* **Ticket Management**: Category, priority, status tracking (`help_desk_tickets`).
* **Ticket Discussion Thread**: Staff and IT support agent comments (`help_desk_comments`).
* **SLA Resolution Tracking**: Recording resolution timestamps and service performance.

---

# 20-visitors.md — Gate Visitor Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/20-visitors.md`

---

## 1. Executive Summary & Purpose

Governs gate-level visitor pre-registration, walk-in check-in, identity document verification, host staff approval, and check-out tracking for campus security.

## 2. Key Capabilities
* **Visitor Log**: Name, ID type, ID number, vehicle number, host staff assignment (`visitors`).
* **Host Staff Notification**: Real-time push alert to staff member when visitor arrives at gate.
* **Overstay Alerts**: Security workspace alert when visitor check-out exceeds duration limit.
