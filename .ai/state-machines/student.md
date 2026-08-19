# student.md — Student & Beneficiary Lifecycle State Machine

> **Classification**: State Machine Engine Specification  
> **Source of Truth**: `.ai/state-machines/student.md`

---

## 1. Lifecycle State Machine Diagram

```
[ Applicant ] ──(Admit Workflow)──► [ Enrolled ] ──(Class Allocation)──► [ Active ]
                                                                             │
    ┌──────────────────────┬──────────────────────┬──────────────────────────┤
    │ (Suspend)            │ (Leave of Absence)   │ (Graduate)               │ (Transfer)
    ▼                      ▼                      ▼                          ▼
[ Suspended ]         [ On Leave ]           [ Graduated ]            [ Transferred ]
    │                      │                      │                          │
    └──────(Reinstate)─────┴──────(Return)────────┴─────► [ Alumnus ] ◄──────┘
```

---

## 2. Allowed State Transitions

| From State | Allowed To State | Trigger / Action | Approval Required |
| :--- | :--- | :--- | :--- |
| `Applicant` | `Enrolled` | Admission Wizard Completion + Fee Paid | Admission Officer |
| `Enrolled` | `Active` | Class Section & Roster Allocation | Class Teacher / Registrar |
| `Active` | `On Leave` | Long-term Medical / Personal Leave Request | Principal Approval |
| `On Leave` | `Active` | Leave Expiry & Re-joining Verification | Principal Clearance |
| `Active` | `Suspended` | Disciplinary Action Event | Disciplinary Board / Principal |
| `Suspended` | `Active` | Suspension Reinstatement Order | Principal Approval |
| `Active` | `Graduated` | Final Term Exam Completion & Fee Clearance | Registrar / Principal |
| `Active` | `Transferred` | Inter-campus or TC Issuance Workflow | Administrative Director |
| `Graduated` | `Alumnus` | Automated Year-End Batch Transition | None (Automatic) |

---

## 3. Forbidden Transitions
* `Applicant` ──► `Graduated` (Direct jump prohibited).
* `Suspended` ──► `Graduated` (Must be reinstated to `Active` first).
* `Alumnus` ──► `Active` (Re-admission requires a new enrollment record).

---

# staff.md — Staff Employment Lifecycle State Machine

```
[ Prospect ] ──► [ Onboarding ] ──► [ Active ] ──(Leave)──► [ On Leave ]
                                        │
                                        ├─(Suspend)─► [ Suspended ]
                                        │
                                        └─(Offboard)─► [ Offboarded ] ──► [ Archived ]
```

* **Rules**: Transitioning to `Offboarded` or `Suspended` MUST increment `staff.tokenVersion` to immediately terminate all active web/mobile sessions.

---

# fee.md — Fee Invoice Lifecycle State Machine

```
[ Draft ] ──► [ Generated ] ──► [ Partially Paid ] ──► [ Paid ]
                   │                     │
                   ├─(Overdue)───────────┤
                   ▼                     ▼
             [ Overdue ] ───────► [ Waived / Cancelled ]
```

* **Rules**: Invoices in `Paid` state CANNOT transition to `Draft` or `Cancelled`. Adjustments require a formal refund or credit note entry.

---

# admission.md — Candidate Admission Intake State Machine

```
[ Inquiry ] ──► [ Form Submitted ] ──► [ Screening / Test ] ──► [ Selected ] ──► [ Fee Pending ] ──► [ Enrolled ]
                       │                        │                    │
                       └─(Reject)───────────────┴─(Reject)───────────┴─(Cancel)──► [ Rejected / Cancelled ]
```
