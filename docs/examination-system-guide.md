# Examination Management System User & Technical Guide

**Version:** 1.0.0  
**Module:** Academics & Examinations  
**Sprint:** EXAM-ENG-004  
**Last Updated:** 2026-07-31  

---

## Overview

The **Examination Management System** enables full examination lifecycle management across 23+ campuses. It automates exam session creation, subject mapping, fee-clearance locked hall ticket generation, double-blind teacher mark entry, 10-point GPA calculation, class tabulation registers, and encrypted PDF report card delivery to the parent portal.

---

## Key Features & Workflows

### 1. Examination Setup Wizard (`/examinations`)
- Step-by-step modal wizard for configuring exam sessions (`Draft` -> `Scheduled` -> `Ongoing` -> `Evaluation` -> `Published`).
- Maps course subjects, max marks, passing thresholds, room venues, and examination time slots.
- Selects institutional grading scale matrices (10-point GPA, US Letter Grade, or Percentage Pass).

### 2. Fee-Clearance Hall Tickets & Invigilator QR Scanner
- Real-time fee balance validation: blocks hall ticket issuance for students with unpaid fee dues (> $0).
- Supports administrative manual overrides (`exam:override_fee_lock`) with mandatory audit reason notes.
- Generates cryptographically signed QR codes (`HMAC-SHA256`) for instant entrance verification by invigilators (`/api/examinations/hall-tickets/verify`).

### 3. Double-Blind Teacher Mark Entry Portal
- Grid table keyboard navigation for entering cohort subject marks.
- Out-of-bounds red alert status for invalid mark entries (`marksObtained > maxMarks` or negative).
- **Double-Blind Mode:** Replaces candidate names and roll numbers with randomized evaluator code tokens (`EVAL-XXXX`).
- Real-time grade preview and total mark computation.

### 4. Tabulation Register & Performance Analytics (`/examinations/tabulation`)
- Class-wide mark matrix displaying student rank, subject scores, grand total, percentage, SGPA, and result status (`PASS`, `FAIL`, `COMPARTMENT`).
- Cohort performance metrics: pass percentage, class average score, and top rank list.
- Integrated with Sprint-002 Export Engine for multi-format exports (CSV, Excel `.xlsx`, PDF).

### 5. Encrypted Student Report Cards (`/examinations/report-cards`)
- Printable PDF report card generator matching institutional layouts.
- Optional DOB password encryption (`DDMMYYYY`) for parent portal security.
- One-click publication API updating student and parent portal access.

---

## Permission Matrix (RBAC)

| Role | Exam Setup | Issue Hall Ticket | Enter Marks | Moderate Marks | Publish Results | Override Fee Lock |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Principal** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **HOD** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Staff / Teacher** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## Technical Architecture

- **Database Schemas:** `exams`, `exam_schedules`, `hall_tickets`, `mark_entries`, `tabulation_registers`, `grade_scales`, `exam_audit_logs`.
- **ORMs:** Dual-dialect Drizzle ORM (`packages/db/schema.ts` for SQLite dev / `packages/db/schema.pg.ts` for PostgreSQL prod).
- **Security:** HMAC-SHA256 QR payload signatures, DDE formula injection sanitization (`'`), 6-tier RBAC permission guards (`requireAuth`).
