# triggers.md — Automation Engine Trigger Specifications

> **Classification**: Event & Cron Trigger Specifications  
> **Source of Truth**: `.ai/automation/triggers.md`

---

## 1. Trigger Architecture

The Automation Engine in ThaibaHive Institution OS consumes three categories of triggers:
1. **Domain Event Triggers**: Asynchronous execution triggered by domain events (e.g., `FeePaid`, `AttendanceMarked`).
2. **Scheduled Cron Triggers**: Time-based batch triggers (e.g., daily midnight fee checks, 1st-of-month invoice generation).
3. **Threshold & Anomaly Triggers**: State evaluations triggered when metrics cross pre-configured bounds (e.g., ROP breaches, attendance drops > 15%).

---

## 2. Trigger Registration Specifications

| Trigger ID | Type | Source / Schedule | Condition Evaluated | Target Automation Recipe |
| :--- | :--- | :--- | :--- | :--- |
| `TRG-ATT-001` | Event | `AttendanceMarked` | Status = "absent" x 3 consecutive days | Recipe 1 (3-Day Absence Escalation) |
| `TRG-ATT-002` | Cron | `0 10 * * 1-5` (10 AM Mon-Fri)| Class register unsubmitted | Recipe 8 (Class Attendance Reminder) |
| `TRG-FIN-001` | Cron | `0 0 1 * *` (1st of month) | Active student rosters | Recipe 21 (Monthly Fee Invoicing) |
| `TRG-FIN-002` | Event | `FeeOverdue` | Balance > 0 and Due Date < Today | Recipe 23 (Late Fee Escalation) |
| `TRG-INV-001` | Threshold | Stock Consumption | Item Quantity <= Reorder Point | Recipe 41 (ROP Auto-Requisition) |
| `TRG-HST-001` | Event | Outpass Expiry | Gate return tap missing past expiry | Recipe 61 (Outpass Violation Alert) |
| `TRG-HR-001` | Cron | `0 0 25 * *` (25th of month)| Active staff employment records | Recipe 82 (Monthly Payroll Run) |
| `TRG-AI-001` | Anomaly | AI Background Stream | Attendance drop > 15% across campus | Recipe 100 (AI Operations Executive Brief) |

---

# ai-playbooks.md — Ambient AI Operational Playbooks

> **Classification**: AI Agent Operational Boundaries & Decision Logic  
> **Source of Truth**: `.ai/automation/ai-playbooks.md`

---

## 1. AI Operating Principles & Safety Guards

1. **Non-Irreversible Action Guard**: Ambient AI agents MUST NEVER perform irreversible financial transactions, delete identity records, or issue final grade cards without explicit human approval.
2. **Draft & Propose Pattern**: AI output MUST take the form of pre-filled draft requisitions, draft reports, suggested schedules, or proposed reminder schedules requiring human sign-off.
3. **Audit Visibility**: All AI inference actions and recommendations MUST be logged to `activity_logs`.

---

## 2. Master AI Operational Playbooks

### Playbook 1: Attendance Investigation Assistant
* **Inputs**: Daily attendance logs, student historical attendance, medical leave records.
* **Decision Logic**: Identifies unexcused absence patterns, checks for localized illness spikes across classes, and cross-references parent contact history.
* **Outputs**: Drafts an Attendance Investigation Brief for the Principal; prepares personalized SMS templates for parents.
* **Escalation Rule**: If absence involves > 20% of a class, escalates immediately to Health Clinic and Campus Director.

### Playbook 2: Fee Recovery Assistant
* **Inputs**: Invoice due dates, historical parent payment dates, receipt logs.
* **Decision Logic**: Analyzes historical parent settlement patterns (e.g., identifies parents who reliably pay post-monthly salary on the 28th).
* **Outputs**: Schedules custom, non-aggressive reminder SMS on optimal days (e.g., 25th) rather than daily automated nagging.
* **Escalation Rule**: If fee default exceeds 45 days, drafts formal administrative review task for Accounts Head.

### Playbook 3: Procurement & Inventory Planner
* **Inputs**: Stock issue rates, historic lead times, active warehouse balances.
* **Decision Logic**: Calculates consumption velocity, predicts exact date of zero-stock depletion, and evaluates primary vendor lead times.
* **Outputs**: Drafts a pre-filled Purchase Requisition specifying item codes, quantities, and recommended supplier.
* **Escalation Rule**: Requires human Store Keeper or Purchase Manager approval to convert draft into active PO.

### Playbook 4: Teacher Substitution Assistant
* **Inputs**: Approved staff leave requests, master timetable, teacher subject specializations.
* **Decision Logic**: Scans timetable for free teachers in same department during affected periods; ranks substitutes by subject relevance and current workload.
* **Outputs**: Pre-fills proposed substitution schedule for HOD one-click approval.
* **Escalation Rule**: If zero free teachers exist in department, suggests combining sections or assigning study hall supervisor.
