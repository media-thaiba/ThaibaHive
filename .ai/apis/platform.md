# inventory.md & procurement.md — Stock & Procurement API Specifications

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/erp/inventory/items` | List Consumable Stock | `inventory:read` |
| `POST` | `/api/erp/inventory/issue` | Issue Stock to Staff/Dept | `inventory:issue` |
| `GET` | `/api/purchases` | List Purchase Requisitions | `procurement:request` |
| `POST` | `/api/purchases` | Create Purchase Request | `procurement:request` |

---

# assets.md — Asset Management API Specification

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assets` | Search & List Fixed Assets | `assets:register` |
| `POST` | `/api/assets` | Register & Tag New Asset | `assets:register` |

---

# documents.md & communication.md — Media & Notice API Specifications

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | List Broadcast Notices | `announcements:read` |
| `POST` | `/api/announcements` | Create Announcement | `announcements:create` |
| `POST` | `/api/upload` | Chunked File Upload Proxy | `media:upload` |
| `GET` | `/api/upload/files/[...path]` | Stream File Asset | Public / Authorized |

---

# platform.md & automation.md — System & Automation API Specifications

| Method | Endpoint Path | Purpose | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/system/health` | System Health Diagnostic | `system:telemetry` |
| `GET` | `/api/activity-logs` | Fetch System Activity Stream | `system:telemetry` |
| `GET` | `/api/notifications` | Fetch User Notifications | Authenticated |
| `PUT` | `/api/notifications/[id]` | Mark Notification Read | Authenticated |
