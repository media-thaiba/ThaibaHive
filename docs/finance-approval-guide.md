# Finance Approval Engine User Guide

## Overview

The ThaibaHive Finance Approval Engine manages automated, multi-stage approval workflows across 23+ campuses for Expense Claims and Purchase Requests.

## Approval Hierarchy & Threshold Routing

### Expense Claims
1. **Under $500:** Automatically approved upon submission.
2. **$500 – $5,000:** Requires Department Head (HOD) review and approval.
3. **Over $5,000:** Multi-stage sequence: Staff → HOD → Accounts Admin → Campus Principal.

### Purchase Requests
1. **Standard Route:** Requester → HOD → Accounts Admin.
2. **Emergency Route:** Flagged as Emergency; prioritized for immediate review.

## User Roles & Responsibilities
- **Staff:** Submit expense claims and purchase requests; track status timeline.
- **HOD:** Review initial departmental requests (`pending_hod`).
- **Accounts / Admin:** Review financial account allocations (`pending_accounts`).
- **Principal:** Final sign-off on high-value institutional requests (`pending_principal`).

## Audit Trails & Reports
All approval decisions, rejections, timestamped comments, and approver details are stored in append-only audit logs. Audit reports can be exported to CSV, Excel (`.xlsx`), and PDF (`.pdf`) via the `<ExportDialog>` in `/finance-audit`.
