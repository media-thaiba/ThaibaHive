# 21-security.md — Campus Security & Audit Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/21-security.md`

---

## 1. Executive Summary & Purpose

Governs identity verification, access control gates, biometric encryption, audit logging, emergency broadcast triggers, and security breach prevention across all physical campuses.

## 2. Key Capabilities
* **Immutable Audit Trail**: Capturing detailed JSON diffs for all financial, grade, and security edits (`audit_log`).
* **NFC & Biometric Gate Verification**: Gate reader integration for staff, students, and hostel outpasses.
* **Emergency Lockdown Trigger**: One-click mass broadcast alerting security, staff, and parents.

---

# 22-health.md — Campus Health & Medical Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/22-health.md`

---

## 1. Executive Summary & Purpose

Tracks student/resident medical profiles, emergency contacts, allergy logs, clinic visit records, immunization histories, and prescription dispensations.

## 2. Key Capabilities
* **Medical Profile Registry**: Blood group, chronic conditions, emergency contact details.
* **Clinic Visit Log**: Infirmary check-in records, temperature/symptom logs, and treatment notes.
* **Contagion Outbreak Alerts**: Automated detection of localized symptom spikes triggering health alerts.

---

# 23-parent-experience.md — Parent & Guardian Experience Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/23-parent-experience.md`

---

## 1. Executive Summary & Purpose

Provides parents, legal guardians, and sponsors with a dedicated, secure mobile/web interface to monitor attendance, view report cards, pay fees, track transit buses, and authorize digital outpasses.

## 2. Key Capabilities
* **Multi-Child Dashboard**: Single-login toggle between siblings across different group campuses.
* **Digital Outpass OTP Verification**: Receiving OTPs to authorize weekend hostel leave requests.
* **Realtime Gate & Transit Alerts**: Instant push notification when child checks in/out at gate or boards bus.

---

# 24-staff-experience.md — Staff & Teacher Experience Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/24-staff-experience.md`

---

## 1. Executive Summary & Purpose

Empowers teachers, HODs, and administrators with role-tailored Workspaces, quick attendance marking, task boards, leave applications, daily work report submissions, and payslip access.

## 2. Key Capabilities
* **Teacher Workspace**: Quick class attendance, timetable view, homework assignments, student alerts.
* **Daily Work Reports**: Submitting end-of-day work summaries linked to tasks (`daily_reports`).
* **Self-Service HR & Payslips**: Applying for leaves, viewing attendance logs, downloading encrypted payslips.

---

# 25-analytics.md — Institutional Analytics & BI Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/25-analytics.md`

---

## 1. Executive Summary & Purpose

Aggregates operational, financial, academic, and attendance data streams into executive dashboards, multi-campus comparison reports, and predictive AI analytics.

## 2. Key Capabilities
* **Executive Health Dashboard**: Real-time group-wide KPIs for Chairman, Board, and Principals.
* **Multi-Campus Comparison Matrix**: Side-by-side evaluation of attendance %, fee recovery %, and exam pass rates.
* **AI Predictive Models**: Dropout risk prediction, budget variance forecasting, and inventory depletion velocity.
