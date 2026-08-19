# 03-student-lifecycle.md — Student & Beneficiary Lifecycle Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/03-student-lifecycle.md`

---

## 1. Executive Summary & Purpose

The Student Lifecycle Domain tracks the 360-degree progression of a student, resident, ward, or beneficiary from enrollment through graduation, transfer, or alumni archiving. It manages class allocations, annual batch promotions, Transfer Certificates (TC), and historical academic records.

---

## 2. Business Scope & Capabilities

* **Active Student Directory**: Searchable, filterable student catalog.
* **Batch Promotion Engine**: End-of-year automated grade advancement based on exam and fee eligibility.
* **Inter-Campus Transfer System**: Moving records seamlessly between group institutions.
* **Transfer Certificate (TC) Generator**: One-click certificate generation with automated department clearance checks.

---

## 3. State Machine & Rules

```
[ Enrolled ] ──► [ Active ] ──(Promote)──► [ Grade N+1 ] ──(Graduate)──► [ Graduated ] ──► [ Alumnus ]
                    │
                    ├─(Suspend)─► [ Suspended ]
                    │
                    └─(Transfer)─► [ Transferred ]
```

* **Clearance Rule**: TC issuance requires zero balance across Fees, Hostel, Library, and Assets.

---

# 04-academics.md — Academic & Curriculum Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/04-academics.md`

---

## 1. Executive Summary & Purpose

Governs class structures, academic years, sections, subject catalogs, syllabus tracking, master timetable generation, and teacher substitution management.

## 2. Key Capabilities
* **Academic Years & Sessions**: Session start/end date configuration (`academic_years`).
* **Classes & Sections**: Homeroom teacher assignment, grade levels, and room allocations (`classes`, `class_sections`).
* **Master Timetable Generator**: Automated period scheduling preventing teacher and room clashes.
* **Teacher Substitution Engine**: Real-time free teacher allocation during staff leave.

---

# 05-attendance.md — Student & Staff Attendance Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/05-attendance.md`

---

## 1. Executive Summary & Purpose

Provides multi-channel attendance logging for staff and students using NFC, QR code, facial recognition, and manual registers. Calculates lateness, shift grace periods, loss-of-pay (LOP), and presence verification.

## 2. Key Capabilities
* **Bulk Class Attendance API**: `POST /api/academic/attendance/bulk` with register summary updates (`attendance_register`).
* **Staff Attendance Engine**: Check-in/check-out logs (`attendance_logs`) with geofence and Wi-Fi SSID verification.
* **Biometric Integration**: Hands-free facial recognition matching against encrypted vectors.
* **Attendance Anomaly AI**: Automatic detection of 15% attendance drops triggering investigation workflows.
