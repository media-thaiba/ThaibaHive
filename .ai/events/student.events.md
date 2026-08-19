# student.events.md — Student Lifecycle Domain Event Catalog

> **Classification**: Event Specification Catalog  
> **Source of Truth**: `.ai/events/student.events.md`

---

## 1. StudentAdmitted Event

* **Purpose**: Emitted when a candidate completes intake and becomes an active student record.
* **Producer**: Admissions Wizard (`/api/academic/students`).
* **Consumers**: Fee Engine, Hostel Allocator, Library Circulation, Parent Experience Portal.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "StudentAdmitted",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "studentId": "UUID",
    "admissionNo": "2026-0891",
    "classId": "UUID",
    "academicYearId": "UUID"
  }
  ```
* **Trigger**: Final step execution of Admission Wizard.
* **Validation**: Unique `admissionNo` check passed; mandatory fields verified.
* **Audit**: Entry written to `audit_log` and `activity_logs`.
* **Notifications**: Welcome email sent to student/guardian; SMS containing portal access credentials.
* **Automation Opportunities**: Triggers automatic fee invoice generation for admission dues.

---

## 2. StudentTransferred Event

* **Purpose**: Emitted when a student is transferred between classes, sections, or group campuses.
* **Producer**: Student Management Service (`PATCH /api/academic/students/[id]`).
* **Consumers**: Transport Manager, Hostel Coordinator, Class Register Engine.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "StudentTransferred",
    "timestamp": "ISO-8601",
    "sourceInstitutionId": "UUID",
    "targetInstitutionId": "UUID",
    "studentId": "UUID",
    "previousClassId": "UUID",
    "newClassId": "UUID"
  }
  ```
* **Trigger**: Administrative transfer execution.
* **Validation**: Requires `students:transfer` permission.
* **Audit**: Written to `audit_log`.
* **Notifications**: Transit update notification sent to guardians.
