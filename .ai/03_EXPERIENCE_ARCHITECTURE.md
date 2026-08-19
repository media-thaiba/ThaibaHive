# 03_EXPERIENCE_ARCHITECTURE.md — Experience Layer Architecture

> **Classification**: UX Architecture & Human-Computer Interaction Specification  
> **Source of Truth**: `.ai/03_EXPERIENCE_ARCHITECTURE.md`

---

## 1. User Experience Philosophy

ThaibaHive Institution OS fundamentally rejects the traditional ERP navigation paradigm. Users do NOT open modules, browse database tables, or fill out 30-field administrative forms.

Instead, the system is built on **Four Pillars of the Experience Layer**:
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE EXPERIENCE LAYER                                   │
├───────────────────────┬────────────────────────┬───────────────────────┬───────────────┤
│ 1. ROLE WORKSPACES    │ 2. TASK WIZARDS        │ 3. UNIVERSAL SEARCH   │ 4. ENTITY     │
│ Intent-focused        │ Step-by-step guided    │ Single query across   │ TIMELINES     │
│ operational dashboards│ administrative flows   │ all campus entities   │ Complete life │
│ (No 60-item menus)    │ (No 30-field forms)    │ (Cmd+K global lookup) │ history trail │
└───────────────────────┴────────────────────────┴───────────────────────┴───────────────┘
```

---

## 2. Workspace-First Navigation

Instead of presenting an intimidating list of 60 menu links, ThaibaHive OS presents personalized, role-based **Workspaces**. A Workspace aggregates all data, tasks, actions, and alerts required by a specific persona to execute their daily work.

### 2.1 Principal / Campus Director Workspace (`/workspace/principal`)
* **Focus**: Overall institutional health, safety, attendance trends, and financial recovery.
* **Widgets**:
  * *Today's Attendance*: Campus-wide student & staff presence percentage.
  * *Fee Recovery*: Collected vs. outstanding fee balances for the current month.
  * *Teacher Availability*: Unassigned classes requiring immediate substitution.
  * *Grievances & Incidents*: High-priority safety or parent feedback alerts.
  * *Pending Approvals*: Unified queue for leaves, expenses, and outpasses.

### 2.2 Teacher Workspace (`/workspace/teacher`)
* **Focus**: Class management, attendance marking, homework submission, and student alerts.
* **Widgets**:
  * *My Classes*: Today's schedule and period status.
  * *Quick Attendance*: One-tap student attendance register.
  * *Homework & Assignments*: Active assignments and submission stats.
  * *Student Alerts*: Attendance drops or behavioral notes for assigned students.

### 2.3 Cashier / Accounts Workspace (`/workspace/cashier`)
* **Focus**: Fee collections, receipt generation, daily counter closing, and refunds.
* **Widgets**:
  * *Today's Collections*: Real-time tally of cash, online, and card collections.
  * *Quick Receipt*: Rapid student fee collection search bar.
  * *Pending Defaults*: Overdue fee accounts requiring follow-up notices.
  * *Daily Counter Closing*: One-click reconciliation and balance sign-off.

### 2.4 Parent / Guardian Workspace (`/workspace/parent`)
* **Focus**: Child safety, academic progression, attendance, and fee clearance.
* **Widgets**:
  * *Child Switcher*: Seamless toggle between siblings across campuses.
  * *Today's Status*: Live gate check-in status and transit bus location.
  * *Fee Clearance*: Pending dues and instant online payment link.
  * *Digital Outpass*: One-tap weekend outpass request submission.

---

## 3. Application Grouping (Microsoft 365 Model)

To keep navigation intuitive, all 17 business domains are grouped into **7 Unified Application Hubs**:

| Application Hub | Contained Business Domains |
| :--- | :--- |
| **1. Academic Hub** | Academic Management, Examination & Assessment, Student Lifecycle |
| **2. Finance Hub** | Financial Operations, Fee & Revenue Management |
| **3. Campus Hub** | Residential & Hostel, Fleet & Transport, Library Management |
| **4. People Hub** | Human Resources & Payroll, Admissions & Enrollment |
| **5. Communication Hub**| Announcements, Circulars, Events, Polls, Chat |
| **6. Operations Hub** | Inventory & Procurement, Visitor Management, Helpdesk, Assets |
| **7. Insights & Governance**| Analytics & BI, Regulatory Compliance, Document & Media |

---

## 4. Task-Driven Wizard Workflows

All complex multi-step administrative processes MUST be implemented as **Step-by-Step Wizards** with auto-save and progress indicators.

### 4.1 Admission Wizard Flow Example
```
Step 1: Identity Info ──► Step 2: Guardian Mapping ──► Step 3: Documents Upload
                                                               │
Step 6: Class & Photo ◄── Step 5: Fee Assignment   ◄── Step 4: Medical & Consent
        │
        ▼
   FINISH & ENROLL (Generates ID & Receipt)
```

---

## 5. Universal Global Search (Cmd+K)

The Command Palette is accessible from any screen via `Cmd+K` (or Ctrl+K) and executes fuzzy queries across the entire ERP ecosystem simultaneously.

### Search Query Result Categorization Example
Query: `"Aisha"`
* **Students**: Aisha Sharma (Grade 10-A, Adm #2024-0892)
* **Guardians**: Aisha Parveen (Mother of Zaid Khan, Grade 6-B)
* **Fee Receipts**: Receipt #REC-98212 (Paid by Aisha Sharma)
* **Hostel Rooms**: Bed 204-B (Assigned to Aisha Sharma)
* **Certificates**: TC-2025-012 (Issued to Aisha Parveen)

---

## 6. Universal Entity Timelines

Every major entity in ThaibaHive OS possesses an immutable, chronological **Universal Timeline** summarizing every lifecycle event.

### 6.1 Student Timeline Example
`Admitted (2022)` ──► `NFC Assigned (2022)` ──► `Fee Paid (2023)` ──► `Grade 9 Promoted (2024)` ──► `Hostel Outpass Approved (2025)`

### 6.2 Asset Timeline Example
`Procured (2023)` ──► `Warehouse Stored` ──► `Assigned to IT Lab` ──► `Serviced (2024)` ──► `Decommissioned`

---

## 7. Ambient AI Layer Architecture

AI in ThaibaHive OS is an **ambient, background system service**—not an intrusive chatbot popup. It continuously evaluates event streams and acts proactively.

```
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│     EVENT MONITORS        │     │    AI INFERENCE ENGINE    │     │    AUTOMATED ACTION       │
│                           │     │                           │     │                           │
│ - Attendance drop > 15%   │────►│ - Identifies pattern      │────►│ - Generates Draft Report  │
│ - Low stock < ROP limit   │     │ - Predicts 5-day depletion│     │ - Drafts Purchase Order   │
│ - Overdue fee balance     │     │ - Detects payment cycle   │     │ - Schedules Reminder      │
└───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
```

### 7.1 Proactive AI Behaviors
1. **Attendance Anomaly AI**: Detects a 15% drop in class attendance, drafts an investigation report, and alerts the Principal.
2. **Predictive Inventory AI**: Detects stock depletion rates, calculates 5 days remaining, and automatically pre-fills a Purchase Requisition.
3. **Smart Fee Reminder AI**: Learns parent payment behaviors (e.g., parent always pays on the 28th), and schedules customized SMS reminders for the 25th instead of aggressive early nagging.
