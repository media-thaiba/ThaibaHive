# 06-examinations.md — Examination & Assessment Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/06-examinations.md`

---

## 1. Executive Summary & Purpose

Manages the assessment lifecycle—exam term setup, hall ticket generation, mark entry registers, tabulation registers, double-blind evaluation, grading scale rules, and report card publishing.

## 2. Key Capabilities
* **Assessment Configuration**: Term exams, unit tests, practicals, vivas, and assignment weightages.
* **Hall Ticket Generator**: Biometric QR hall tickets with fee-clearance validation.
* **Mark Entry & Tabulation Register (TR)**: Secure mark entry portal with double-blind evaluation choices.
* **Report Card Publishing**: Multi-template report card PDFs published directly to Parent App.

---

# 07-fee-management.md — Fee & Revenue Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/07-fee-management.md`

---

## 1. Executive Summary & Purpose

Structures, assigns, collects, adjusts, and audits student fees, mess charges, transport fees, and recurring dues across institutions.

## 2. Key Capabilities
* **Flexible Fee Structure Builder**: Tuition, admission, exam, hostel, transport, and activity fee structures.
* **Concession & Scholarship Manager**: Percentage or fixed waivers with approval workflows.
* **Multi-Channel Collection**: Cash counter, online payment gateway (eSewa/Khalti/Stripe), POS, bank transfer.
* **Automated Digital Receipts**: Instant receipt generation with GL posting.

---

# 08-finance.md — Financial Operations & Institutional Accounting Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/08-finance.md`

---

## 1. Executive Summary & Purpose

Maintains double-entry accounting, general ledgers, chart of accounts, institutional budgets, vendor payments, expense reimbursements, and audit compliance across all group campuses.

## 2. Key Capabilities
* **Multi-Tier Chart of Accounts (COA)**: Tailored COA for non-profits, schools, and trusts.
* **General Ledger Posting Engine**: Automatic credit/debit postings from fee collections, payroll, and purchase orders.
* **Budget Allocation & Variance Tracking**: Pre-approval expense checks against department budget lines.
* **Expense Claims & Requisitions**: 3-stage approval workflow (HOD → Accounts → Finance Director).

---

# 09-payroll.md — Staff Payroll Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/09-payroll.md`

---

## 1. Executive Summary & Purpose

Computes monthly staff salaries, incorporates attendance LOP deductions, calculates tax/provident fund deductions, generates payslips, and executes bank payout files.

## 2. Key Capabilities
* **Salary Structure Configurator**: Basic, HRA, allowance, PF, ESI, and tax deduction rules.
* **Automated Monthly Payroll Engine**: Incorporates worked days, unexcused absence LOP, and approved overtime.
* **Payslip Generator & Bank File Exporter**: Encrypted PDF payslip delivery and direct bank payout file export.

---

# 10-human-resources.md — Human Resources & Appraisal Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/10-human-resources.md`

---

## 1. Executive Summary & Purpose

Governs employee onboarding, employment contracts, performance appraisals, probation tracking, staff transfers, and offboarding clearance workflows.

## 2. Key Capabilities
* **Onboarding & Offboarding Wizards**: Guided checklist workflows for new hires and exiting staff.
* **Performance Reviews**: Periodic appraisal forms (`performance_reviews`) with goal tracking.
* **Staff Transfer & Promotion Engine**: Inter-departmental and inter-campus employee reassignment.
