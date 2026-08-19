# admission.md — Admission & Enrollment Workflow Specification

> **Classification**: Enterprise Workflow Architecture  
> **Source of Truth**: `.ai/workflows/admission.md`

---

## 1. Workflow Purpose
To govern the structured intake of candidates into the institution—from inquiry to final class placement and ID issuance—guaranteeing data completeness, biometric consent, and initial fee collection.

---

## 2. Actors & Roles
* **Candidate / Parent**: Submits application and uploads documents.
* **Admission Officer**: Evaluates forms, schedules tests, conducts interviews.
* **Cashier**: Collects admission registration fees.
* **System**: Generates unique `admissionNo`, triggers welcome notifications, provisions student identity.

---

## 3. Entry Conditions
* Open intake session active for the target academic year and institution.
* Candidate submits valid identity information via Admission Wizard.

---

## 4. Workflow Steps

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Candidate Inquiry & Identity Registration                               │
│  - Captures Name, DOB, Gender, Target Grade/Class, Contact Details.               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Guardian Mapping & Document Upload                                      │
│  - Captures Father/Mother/Sponsor details, Birth Cert, Transcripts.              │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Screening, Interview & Selection                                        │
│  - Admission Officer records test score / interview evaluation -> Sets "Selected".│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Registration Fee Collection                                             │
│  - Cashier collects admission fee -> System posts FeePaid event.                 │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Enrollment Finalization & Identity Provisioning                         │
│  - Assigns Class & Section, issues Admission No, registers Biometric Consent.     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Validation & Business Rules
1. `admissionNo` MUST be unique within the institution (`idx_students_inst_admission_no`).
2. Candidate cannot transition to `Enrolled` without paid admission fee receipt.
3. Biometric consent record MUST be signed before issuing NFC card or enrolling facial features.

---

## 6. Events Emitted
* `StudentApplicantCreated`
* `StudentSelected`
* `FeePaid` (Admission Fee)
* `StudentAdmitted`

---

## 7. Rollback & Failure Handling
* If fee payment fails or is cancelled, candidate state reverts to `Fee Pending`.
* If documents fail verification, candidate state changes to `Document Rejected` with alert sent to applicant.

---

## 8. Audit Requirements
* Detailed snapshot of submitted documents, interviewer ratings, and fee receipt numbers logged to `audit_log`.

---

## 9. Automation Opportunities
* Auto-send SMS/Email confirmation upon application receipt.
* Auto-assign class section based on current class capacity balance.
