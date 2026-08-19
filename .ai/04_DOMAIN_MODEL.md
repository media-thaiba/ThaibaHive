# 04_DOMAIN_MODEL.md — Business Domain Entity Specifications

> **Classification**: Enterprise Domain & Data Model Specification  
> **Source of Truth**: `.ai/04_DOMAIN_MODEL.md`

---

## 1. Core Domain Entity Index

This document defines the primary business entities operating within ThaibaHive Institution OS, their ownership boundaries, lifecycles, and cross-domain relationships.

---

## 2. Entity Specifications

### 2.1 Identity Entities

#### 1. Staff (`staff`)
* **Purpose**: Represents an employee (teacher, administrator, accountant, driver, warden, caregiver) working within an institution.
* **Ownership**: Owned globally by the Group, assigned to institutions via `staff_institutions` and departments via `staff_departments`.
* **Lifecycle**: `Onboarding` ──► `Active` ──► `On Leave` ──► `Suspended` ──► `Offboarded`.
* **Business Rules**:
  * Must have a unique `email` and `employeeId`.
  * Incremental `tokenVersion` invalidates all active sessions immediately upon increment.
  * Biometric embeddings (`faceEmbedding`) must be stored AES-256-GCM encrypted.

#### 2. Student / Beneficiary (`students`)
* **Purpose**: Master record of a student, resident, inmate, ward, or candidate receiving education, care, or training.
* **Ownership**: Scoped to an `institutionId` (mandatory).
* **Lifecycle**: `Applicant` ──► `Admitted` ──► `Active Boarder/Student` ──► `Graduated / Transferred` ──► `Alumnus`.
* **Business Rules**:
  * `admissionNo` MUST be unique per institution (`idx_students_inst_admission_no`).
  * Soft-deleted via `isActive = false` to preserve financial and attendance history.

#### 3. Guardian (`guardians` & `student_guardians`)
* **Purpose**: Represents a parent, legal guardian, sponsor, or authorized contact linked to a student.
* **Ownership**: Shared across institutions (a single parent can have children in multiple campuses).
* **Lifecycle**: Created during student intake; remains active while any linked student is active.
* **Business Rules**:
  * `canPickup` flag explicitly controls gate pickup permissions.
  * `isEmergencyContact` flag dictates primary incident notification priority.

---

### 2.2 Financial & Operational Entities

#### 4. Financial Transaction (`financial_transactions`)
* **Purpose**: Canonical ledger record of income or expenditure across campus operations.
* **Ownership**: Scoped to `institutionId`.
* **Lifecycle**: `Draft` ──► `Posted` ──► `Reconciled` (Immutable once posted).
* **Business Rules**:
  * Requires non-null `amount`, `type` (`income` | `expense`), and `transactionDate`.
  * Mutations must emit an entry to `audit_log`.

#### 5. Fee Account & Receipt (`fee_accounts`, `fee_invoices`, `fee_receipts`)
* **Purpose**: Tracks student fee schedules, waivers, applied penalties, and collected payments.
* **Ownership**: Linked to `studentId` and scoped to `institutionId`.
* **Lifecycle**: `Generated` ──► `Partially Paid` ──► `Paid` ──► `Overdue`.
* **Business Rules**:
  * Fee collection generates an instant, tamper-proof receipt record.
  * Auto-credits the institutional General Ledger account upon posting.

#### 6. Asset & Inventory Item (`assets`, `inventory_items`)
* **Purpose**: Represents high-value equipment (computers, vehicles, furniture) or consumable stock (stationery, mess groceries).
* **Ownership**: Scoped to `institutionId` and optional `departmentId`.
* **Lifecycle**: `Procured` ──► `In Stock` ──► `Assigned` ──► `Under Maintenance` ──► `Disposed`.
* **Business Rules**:
  * High-value assets tagged with unique NFC/QR codes.
  * Inventory triggers automatic purchase requisitions when stock drops below Reorder Point (ROP).

---

### 2.3 Campus & Infrastructure Entities

#### 7. Class & Section (`classes`, `class_sections`)
* **Purpose**: Defines an academic or training classroom group.
* **Ownership**: Scoped to `institutionId`, `departmentId`, and `academicYearId`.
* **Lifecycle**: Created per academic session; archived upon session rollover.
* **Business Rules**:
  * Assigned to a primary homeroom teacher (`teacherId`).
  * Evaluated against `capacity` limits.

#### 8. Hostel Room & Bed (`hostel_rooms`, `hostel_allocations`)
* **Purpose**: Defines residential beds within dormitories, orphanages, or moral academies.
* **Ownership**: Scoped to `institutionId` and residential block.
* **Lifecycle**: `Vacant` ──► `Occupied` ──► `Reserved` ──► `Under Maintenance`.
* **Business Rules**:
  * Bed allocation requires verified active student status and fee clearance.
  * Night outpass check-out automatically updates bed presence status.

#### 9. Vehicle & Transit Route (`vehicles`, `transport_routes`)
* **Purpose**: Represents institutional buses, vans, and their scheduled passenger stops.
* **Ownership**: Scoped to `institutionId`.
* **Lifecycle**: `Operational` ──► `In Transit` ──► `Service Required` ──► `Decommissioned`.
* **Business Rules**:
  * Passenger assignments map students to specific route stops.
  * GPS presence logs stream vehicle coordinates during active trip hours.

---

### 2.4 Governance & Audit Entities

#### 10. Audit Event & Activity Log (`audit_log`, `activity_logs`)
* **Purpose**: Provides an immutable compliance trail for system actions, data mutations, and security events.
* **Ownership**: System-wide, tagged with `staffId` and `institutionId`.
* **Lifecycle**: Append-only; strictly immutable.
* **Business Rules**:
  * `audit_log` records structured JSON diffs of sensitive changes (grades, payments, role grants).
  * Cannot be edited or deleted via any user interface or standard API.
