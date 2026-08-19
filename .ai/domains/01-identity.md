# 01-identity.md — Master Identity & Access Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/01-identity.md`  
> **Target Alignment**: SAP SuccessFactors / Okta Universal Directory / Workday Identity Standard

---

## 1. Executive Summary & Purpose

The Identity & Access Management (IAM) Domain serves as the foundational trust and identity anchor for ThaibaHive Institution OS. It provides centralized master identity management, multi-role relationship mapping, cryptographic biometric vector protection, authentication tokens, and granular permission enforcement across all 23+ group campuses and diverse institution typologies.

---

## 2. Business Scope & Capabilities

### In Scope
* **Master Person Registry**: Single Canonical Person Record for all individuals (`staff`, `students`, `guardians`, `beneficiaries`, `donors`, `vendors`).
* **Multi-Role Association**: Attaching multiple dynamic functional roles to a single physical identity without data duplication.
* **Cryptographic Biometric Vault**: AES-256-GCM encrypted storage of facial vectors (`facenet-512d-v1`), NFC card tag bindings, and fingerprint hashes.
* **Session & Security Tokens**: JWT issuance, httpOnly session management, single-click global token revocation (`tokenVersion`).
* **Privacy & Biometric Consent**: GDPR/DPDP compliant consent tracking for biometric storage (`student_biometric_consents`).

### Out of Scope
* Hardware driver manufacture (handled via mobile app & peripheral integrations).
* External commercial identity verification providers (handled via `integrations.md` OAuth hooks).

---

## 3. Primary Domain Actors

| Actor | Role Description |
| :--- | :--- |
| **Super Admin** | System-wide identity policy controller, emergency access revoker. |
| **Institution Admin** | Campus-level identity lifecycle manager, role assigner. |
| **HR Manager** | Staff identity provisioner during onboarding. |
| **Admissions Officer** | Student candidate identity creator. |
| **All Users** | Individual profile self-service view and credential updates. |

---

## 4. Business Objects & Rules

### Core Business Objects
* `MasterPerson`: Global individual record (`id`, `firstName`, `lastName`, `email`, `phone`).
* `StaffIdentity`: Staff extension record (`employeeId`, `designation`, `role`, `tokenVersion`).
* `StudentIdentity`: Student extension record (`admissionNo`, `institutionId`, `classId`).
* `BiometricVault`: AES-encrypted feature vectors and NFC tag mappings.

### Core Business Rules
1. **Single Identity Rule**: An individual MUST exist only once as a `MasterPerson`.
2. **Strict Institution Isolation**: Student identities MUST be scoped to an `institutionId`.
3. **Biometric Vault Rule**: Facial vectors MUST be stored encrypted (`iv:authTag:ciphertext`) and require active consent.
4. **Instant Token Revocation**: Incrementing `tokenVersion` MUST immediately invalidate all active user sessions across web and mobile.

---

## 5. Master Permission Matrix

| Role | `identity:read` | `identity:create` | `identity:update` | `identity:delete` | `biometric:enroll` | `biometric:revoke` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Institution Admin**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **HR Manager** | ✅ | ✅ (Staff) | ✅ (Staff) | ❌ | ✅ | ❌ |
| **Admissions Officer**| ✅ | ✅ (Student)| ✅ (Student)| ❌ | ✅ | ❌ |
| **Teacher** | ✅ (Class) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Accountant** | ✅ (Read) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Warden** | ✅ (Block) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Parent / Student** | ✅ (Self) | ❌ | ✅ (Self) | ❌ | ❌ | ❌ |

---

## 6. Database Schemas & Data Modeling

### Tables & Relationships
* `staff`: Primary staff identity master table (`id` PK, `email` UNIQUE, `employeeId` UNIQUE, `nfcTagId` UNIQUE).
* `students`: Primary student identity master table (`id` PK, `institutionId` FK, `admissionNo`).
* `guardians` & `student_guardians`: Parent identity master and junction table.
* `student_biometric_consents`: Consent audit ledger.

### Indexes & Constraints
* Composite Unique Index: `idx_students_inst_admission_no` ON (`institutionId`, `admissionNo`).
* Unique Index: `idx_staff_nfc_tag` ON (`nfcTagId`).

---

## 7. UX & Workspaces Specification

* **Workspaces Integration**: Identity controls embedded within HR Workspace, Admissions Wizard, and Profile Settings.
* **Universal Search (`Cmd+K`)**: Returns person results tagged by role ("Staff", "Student", "Guardian").
* **Universal Timeline**: Embeds personal milestone feed (Onboarded, NFC Tag Assigned, Role Updated).

---

## 8. Operational Edge Cases & Security

* **Duplicate Admission Number Attempts**: Prevented via DB composite index; returns HTTP 409 Conflict.
* **Lost NFC Card Replacement**: Old card status set to `revoked` in `nfc_cards` history; new tag bound seamlessly.
* **Token Invalidation on Termination**: Staff offboarding triggers instant `tokenVersion` increment.
