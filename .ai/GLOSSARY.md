# GLOSSARY.md — ThaibaHive Institution OS Business Glossary

> **Classification**: Authoritative Terminology & Business Concept Registry  
> **Source of Truth**: `.ai/GLOSSARY.md`

---

## 1. Core Organizational Concepts

* **Institution OS**: The overarching campus operating system (ThaibaHive) providing identity, financial, security, academic, and operational services to diverse campus typologies.
* **Institution**: A top-level legal or administrative campus entity (e.g., Thaiba Garden School, Thaiba Nursing College, Thaiba Orphanage Home).
* **Campus**: The physical property, location, and infrastructure boundaries belonging to an Institution.
* **Department**: An organizational subdivision within an institution (e.g., Computer Science Dept, IT Infrastructure Dept, Accounts Dept).
* **Sub-Department**: A specialized operational sub-unit within a Department (e.g., Hardware Support Unit within IT Dept).
* **Academic Year**: The active fiscal and academic operational cycle (e.g., 2025–2026) governing classes, registrations, and fee structures.

---

## 2. Identity & Personas

* **Student**: A registered pupil enrolled in an academic or vocational program.
* **Staff**: An employee (teacher, administrator, cashier, driver, warden, caregiver) working within an institution.
* **Guardian**: A parent, legal guardian, sponsor, or emergency contact linked to one or more students.
* **Beneficiary**: A resident, ward, or individual receiving care, shelter, or support in an orphanage, care home, or NGO program.
* **Boarder**: A student or resident allocated a bed within an institutional hostel or dormitory facility.
* **Applicant**: A prospective candidate undergoing the admissions intake pipeline.
* **Donor**: A philanthropic individual or organizational sponsor funding scholarships, orphanages, or NGO grants.
* **Volunteer**: A non-salaried worker contributing time or services to NGO or campus initiatives.

---

## 3. Experience & Workflow Concepts

* **Workspace**: A role-tailored operational dashboard (e.g., Principal Workspace, Cashier Workspace) aggregating widgets, alerts, and actions required for daily work.
* **Wizard**: A step-by-step interactive workflow (e.g., Admission Wizard) replacing multi-field administrative forms.
* **Universal Search**: Global `Cmd+K` lookup engine executing fuzzy queries across all entities simultaneously.
* **Universal Timeline**: An immutable chronological feed of lifecycle events associated with a specific entity (Student, Asset, Vehicle, Financial Transaction).
* **Domain Event**: A structured JSON message emitted by system actions to trigger real-time updates, notifications, and automations.
* **Automation Recipe**: A pre-configured *Trigger → Condition → Action* rule executing cross-domain tasks automatically.
* **AI Playbook**: Pre-defined operational logic guiding the ambient AI assistant in performing investigations, generating draft reports, or issuing reminders.

---

## 4. Operational & Governance Concepts

* **Audit Log**: An immutable, append-only security table (`audit_log`) recording structured JSON diffs of sensitive operations for legal and financial compliance.
* **General Ledger (GL)**: The master double-entry financial record where all fee receipts, expense vouchers, and payroll transactions are posted.
* **Reorder Point (ROP)**: Minimum stock quantity threshold triggering an automatic inventory replenishment purchase request.
* **Outpass**: An authorized digital permit allowing a hostel boarder or resident to leave campus premises for a specified duration.
* **Biometric Consent**: A GDPR/privacy compliant record (`student_biometric_consents`) granting permission to store encrypted facial vectors for attendance and access control.
* **Night Roll Call**: Daily residential verification register recording boarder presence at dormitory curfew hours.
