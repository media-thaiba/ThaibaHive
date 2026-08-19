# 02-admissions.md — Admissions & Enrollment Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/02-admissions.md`

---

## 1. Executive Summary & Purpose

The Admissions & Enrollment Domain governs the front-end candidate pipeline across schools, colleges, hostels, orphanages, and skill centers. It manages initial inquiry registration, multi-step application forms, entrance screening, interview ratings, fee settlement, and automated student identity enrollment.

---

## 2. Business Scope & Capabilities

### Capabilities
* **Intake Campaign Management**: Configuring admission quotas, application deadlines, and fee structures per academic year.
* **Public & Portal Application Wizards**: Step-by-step intake forms supporting applicant, parent, and document uploads.
* **Screening & Test Scheduling**: Hall ticket generation for entrance exams and interview evaluator assignment.
* **Automated Admission Number Generation**: Customizable institutional prefix and sequence rules.

---

## 3. Workflow & State Machine

```
[ Inquiry ] ──► [ Application Submitted ] ──► [ Screening / Interview ] ──► [ Selected ] ──► [ Fee Paid ] ──► [ Enrolled ]
```

---

## 4. Master Permission Matrix

| Role | `admissions:read` | `admissions:create` | `admissions:evaluate` | `admissions:approve` |
| :--- | :---: | :---: | :---: | :---: |
| **Super Admin / Principal** | ✅ | ✅ | ✅ | ✅ |
| **Admissions Officer** | ✅ | ✅ | ✅ | ✅ |
| **Cashier / Accounts** | ✅ | ❌ | ❌ | ✅ (Fee Check) |
| **Applicant / Parent** | ✅ (Self) | ✅ (Submit) | ❌ | ❌ |

---

## 5. Integrations & Events

* **Events Produced**: `StudentApplicantCreated`, `StudentSelected`, `StudentAdmitted`.
* **Integrations**: Payment Gateway (application fee settlement), SMS/Email (status updates), Resend API.
