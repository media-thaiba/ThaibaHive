# Alumni Onboarding & Graduation Transition Standard Operating Procedure (ALUM-021)

## Overview
This runbook guides Registrar Officers and Academic Directors in executing idempotent graduation transitions for graduating student cohorts into verified digital alumni profiles with SHA-256 digital credential hashes.

---

## 1. Pre-Graduation Verification Checklist
1. Confirm all degree requirements and credit audits are satisfied via `COGNITIVE-DEGREE-OS`.
2. Ensure financial clearance is issued via `FinanceOS` (zero outstanding fee dues).
3. Validate student academic records: Full Legal Name, Batch Year, Primary Degree Program, CGPA, Honors/Distinctions.

---

## 2. Cohort Transition Execution
Transitions can be triggered automatically via the end-of-term graduation pipeline or manually via API:

```http
POST /api/alumni/profiles
Content-Type: application/json

{
  "institutionId": "inst_thaiba_central",
  "studentId": "std_2026_9812",
  "firstName": "Amina",
  "lastName": "Hassan",
  "email": "amina.hassan@alumni.thaiba.edu",
  "graduationBatchYear": 2026,
  "primaryDegree": "B.Tech Computer Science & AI",
  "primaryDepartment": "Computer Science & Engineering",
  "privacyConsentLevel": "alumni_only",
  "isMentor": false,
  "isHiring": false
}
```

### Idempotency Guarantee
The `GraduationTransitionEngine` hashes `institutionId | studentId | degreeProgram | graduationDate | cgpa | honors`. Repeat executions for the same student record update existing profiles without creating duplicate identities or breaking credential hashes.

---

## 3. Digital Credential Verification
Every verified graduate is issued an immutable SHA-256 digital credential hash verifiable by third-party background checkers and employers without leaking private student contact details.
