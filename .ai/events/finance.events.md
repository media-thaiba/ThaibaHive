# finance.events.md — Finance & Fee Domain Event Catalog

> **Classification**: Event Specification Catalog  
> **Source of Truth**: `.ai/events/finance.events.md`

---

## 1. FeePaid Event

* **Purpose**: Emitted when a student fee payment is successfully collected and verified.
* **Producer**: Cashier Workspace / Payment Gateway Webhook (`/api/erp/fees/collect`).
* **Consumers**: General Ledger Posting Engine, Parent App Realtime Engine, Audit Log.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "FeePaid",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "studentId": "UUID",
    "receiptNumber": "REC-2026-9012",
    "amountPaid": 4500.00,
    "paymentMode": "online_gateway" | "cash" | "bank_transfer",
    "collectedById": "UUID"
  }
  ```
* **Trigger**: Fee payment transaction completion.
* **Validation**: Nonce check passed; receipt total matches invoice balance.
* **Audit**: Written to `audit_log`.
* **Notifications**: Digital receipt PDF delivered via WhatsApp / Push / Email.
* **Automation Opportunities**: Automatically clears exam admit card blocks if fee default is resolved.

---

## 2. FeeOverdue Event

* **Purpose**: Emitted when a student fee invoice passes its due date without full settlement.
* **Producer**: Scheduled Daily Batch Processor.
* **Consumers**: AI Fee Recovery Assistant, Parent Experience Engine.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "FeeOverdue",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "studentId": "UUID",
    "invoiceId": "UUID",
    "outstandingBalance": 1200.00,
    "daysOverdue": 5
  }
  ```
* **Trigger**: Midnight cron evaluation against due date rules.
* **Audit**: Written to `activity_logs`.
* **Automation Opportunities**: Triggers smart payment reminder workflow tailored to parent historical payment behavior.
