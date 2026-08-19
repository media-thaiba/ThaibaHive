# attendance.events.md — Attendance Domain Event Catalog

> **Classification**: Event Specification Catalog  
> **Source of Truth**: `.ai/events/attendance.events.md`

---

## 1. AttendanceMarked Event

* **Purpose**: Emitted whenever a staff member or student attendance record is logged.
* **Producer**: Attendance Service (`/api/attendance/check-in`, `/api/academic/attendance/bulk`).
* **Consumers**: Realtime SSE Broadcast Engine, Presence Log Monitor, AI Anomaly Engine.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "AttendanceMarked",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "targetType": "student" | "staff",
    "targetId": "UUID",
    "status": "present" | "absent" | "late",
    "method": "manual" | "nfc" | "qr" | "face",
    "markedById": "UUID"
  }
  ```
* **Trigger**: Check-in action or bulk class register submission.
* **Validation**: Target entity must exist and be active; method must match allowed enum.
* **Audit**: Written to `activity_logs`.
* **Notifications**: FCM Push / SMS to guardian if student marked `absent` or `late`.
* **Automation Opportunities**: If student is absent for 3 consecutive days, trigger `StudentAbsent3Days` automation recipe.

---

## 2. AttendanceCorrected Event

* **Purpose**: Emitted when a previously locked or submitted attendance register is modified by an authorized HOD/Admin.
* **Producer**: Attendance Override API (`PATCH /api/attendance/[id]`).
* **Consumers**: Audit Log Service, Summary Recalculator.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "AttendanceCorrected",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "targetId": "UUID",
    "previousStatus": "absent",
    "newStatus": "present",
    "reason": "Medical certificate verified",
    "correctedById": "UUID"
  }
  ```
* **Trigger**: Manual register correction by authorized supervisor.
* **Validation**: Requires `attendance:correct` permission.
* **Audit**: Mandatory log entry written to `audit_log` with before/after diff.
* **Notifications**: Notification to student/guardian confirming attendance status correction.
