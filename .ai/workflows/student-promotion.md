# student-promotion.md — Batch Student Promotion Workflow

> **Classification**: Workflow Specification  
> **Source of Truth**: `.ai/workflows/student-promotion.md`

---

## 1. Workflow Purpose
To execute annual session-end batch promotions moving eligible student cohorts from Grade/Level N to Grade/Level N+1 across an institution.

## 2. Steps
1. **Academic Year Setup**: Verify target Academic Year is configured and active.
2. **Eligibility Evaluation**: System evaluates student exam results, attendance percentage, and fee clearance status.
3. **Draft Promotion List**: Principal/HOD reviews auto-generated promotion register.
4. **Batch Execution**: System updates `classId` and `academicYearId` on student records; archives historic enrollment.
5. **Events & Audit**: Emits `StudentPromoted` events and logs complete promotion batch to `audit_log`.

---

# fee-collection.md — Student Fee Collection Workflow

## 1. Workflow Purpose
To structure, present, collect, and reconcile recurring tuition, transport, and hostel fees.

## 2. Steps
1. **Invoice Generation**: System generates monthly/term fee invoices for active rosters.
2. **Notice & Reminders**: System sends payment notifications to parents via App Push/SMS.
3. **Payment Settlement**: Cashier collects counter cash/card or parent pays online via payment gateway.
4. **Receipt Generation**: System issues digital receipt PDF, updates invoice state to `Paid`, and posts credit entry to General Ledger.
5. **Events & Audit**: Emits `FeePaid` event and logs receipt transaction to `audit_log`.

---

# leave-approval.md — Multi-Tier Leave Approval Workflow

## 1. Workflow Purpose
To govern staff leave applications, coverage verification, and multi-tier supervisor approvals.

## 2. Steps
1. **Leave Application**: Staff member submits leave request specifying leave type and date range.
2. **Balance Check**: System validates requested days against remaining `leave_balances`.
3. **HOD Review**: Department Head reviews and approves/rejects -> State becomes `pending_admin`.
4. **Admin Clearance**: Principal/Admin grants final approval -> State becomes `approved`.
5. **Coverage & Payroll**: System alerts Substitution Engine to re-assign classes and updates Loss-of-Pay (LOP) payroll tally if unexcused.
