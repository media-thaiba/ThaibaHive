# ThaibaHive EngageOS — Workflow Automation & Subsystem Triggers Guide

## 1. Event-Driven Campus Trigger Architecture

EngageOS listens to domain events published across the ThaibaHive enterprise event bus to orchestrate multi-step automated engagement journeys:

| Trigger Event Name | Emitting Domain | Default Sequence Behavior |
|---|---|---|
| `student.attendance.deficit` | Attendance Engine | Send warning push/email, delay 48h, check if improved, notify parents. |
| `finance.fee.due` | Finance Subsystem | Send gentle invoice reminder 7 days prior, SMS 2 days prior, Voice call on due date. |
| `admissions.application.received` | Admissions Portal | Welcome pack email & verification document upload checklist. |
| `examinations.hall_ticket.generated` | Exam Registry | Dispatch PDF download link and seat location via Push & In-App. |
| `campus.emergency.broadcast` | Safety & Security | Emergency multi-channel broadcast across Voice, SMS, and Push simultaneously. |

---

## 2. Sequence Node Types & Execution Lifecycle

Workflows are structured as directed graphs composed of:
1. **Message Nodes**: Dispatches a template across primary/fallback channels.
2. **Delay Nodes**: Timer delays (e.g. `24h`, `3d`).
3. **Condition Nodes**: Evaluates recipient properties or interaction state (e.g. `hasOpenedEmail`, `hasPaidFee`).
4. **Exit/Goal Nodes**: Terminates sequence early upon successful goal realization.
