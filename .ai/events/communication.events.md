# communication.events.md — Communication Domain Event Catalog

> **Classification**: Event Specification Catalog  
> **Source of Truth**: `.ai/events/communication.events.md`

---

## 1. AnnouncementPublished Event

* **Purpose**: Emitted when an official notice is published to target roles, departments, or institutions.
* **Producer**: Announcements Module (`POST /api/announcements`).
* **Consumers**: FCM Push Dispatcher, Email Service, Realtime SSE Hub.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "AnnouncementPublished",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "announcementId": "UUID",
    "title": "Annual Sports Meet Schedule",
    "priority": "normal" | "urgent",
    "targetRole": "staff" | "student" | "parent" | "all"
  }
  ```
* **Trigger**: Announcement publishing action.
* **Notifications**: Immediate push broadcast dispatched to target segment.

---

# transport.events.md — Fleet & Transport Domain Event Catalog

## 1. VehicleStarted Event

* **Purpose**: Emitted when a transit vehicle initiates its scheduled route.
* **Producer**: Fleet Mobile App / GPS IoT Device (`/api/erp/vehicles/trip`).
* **Consumers**: Parent Realtime Transit Monitor, Student Departure Engine.
* **Payload**: `{ eventId, vehicleId, routeId, driverId, startOdometer, timestamp }`.
* **Notifications**: Push alert sent to parents along the route: *"School Bus #4 has departed campus."*

---

# hostel.events.md — Residential & Hostel Domain Event Catalog

## 1. HostelAllocated Event

* **Purpose**: Emitted when a resident is allocated a bed within a dormitory or orphanage block.
* **Producer**: Hostel Allocation Service (`/api/erp/hostel/allocate`).
* **Consumers**: Fee Engine (Billing), Warden Roll Call Register, Student Timeline.
* **Payload**: `{ eventId, studentId, hostelBlock, roomNumber, bedNumber, allocatedAt }`.
* **Notifications**: Confirmation push notification to resident/guardian.

---

# library.events.md — Library Domain Event Catalog

## 1. LibraryBookIssued Event

* **Purpose**: Emitted when a physical book or media asset is checked out to a borrower.
* **Producer**: Circulation Desk (`/api/erp/library/issue`).
* **Consumers**: Student Timeline, Due Date Notification Scheduler.
* **Payload**: `{ eventId, borrowerId, bookId, barcode, issueDate, dueDate }`.

---

# hr.events.md — Human Resources Domain Event Catalog

## 1. LeaveApproved Event

* **Purpose**: Emitted when a staff leave request passes all approval tiers.
* **Producer**: Approvals Center (`PUT /api/leaves/[id]`).
* **Consumers**: Payroll LOP Engine, Teacher Substitution Engine, Work Calendar.
* **Payload**: `{ eventId, staffId, leaveTypeId, startDate, endDate, daysCount, approvedById }`.

---

# automation.events.md — System Automation Domain Event Catalog

## 1. WorkflowCompleted Event

* **Purpose**: Emitted when an automated cross-domain recipe finishes execution.
* **Producer**: Process Automation Engine.
* **Consumers**: Analytics BI Engine, System Telemetry.
* **Payload**: `{ eventId, recipeId, triggeredByEventId, executionDurationMs, status: "success" }`.
