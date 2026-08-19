# inventory.events.md — Inventory & Asset Domain Event Catalog

> **Classification**: Event Specification Catalog  
> **Source of Truth**: `.ai/events/inventory.events.md`

---

## 1. InventoryLow Event

* **Purpose**: Emitted when consumable stock drops below the defined Reorder Point (ROP).
* **Producer**: Stock Issue / Consumption Service (`/api/erp/inventory/issue`).
* **Consumers**: Procurement Assistant, Store Keeper Workspace, AI Predictive Engine.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "InventoryLow",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "itemId": "UUID",
    "itemCode": "PAP-A4-01",
    "currentQuantity": 12,
    "reorderPoint": 20,
    "unit": "reams"
  }
  ```
* **Trigger**: Stock item issuance lowering total count past ROP limit.
* **Audit**: Logged in `activity_logs`.
* **Automation Opportunities**: Triggers automated purchase requisition drafting pre-filled with supplier details.

---

## 2. AssetAssigned Event

* **Purpose**: Emitted when a physical asset (laptop, vehicle, projector) is assigned to a staff member or room.
* **Producer**: Asset Manager (`/api/erp/assets/assign`).
* **Consumers**: Staff Onboarding Timeline, Department Asset Register.
* **Payload Structure**:
  ```json
  {
    "eventId": "UUID",
    "eventType": "AssetAssigned",
    "timestamp": "ISO-8601",
    "institutionId": "UUID",
    "assetId": "UUID",
    "tagId": "NFC-ASSET-8812",
    "assignedToType": "staff" | "room" | "vehicle",
    "assignedToId": "UUID"
  }
  ```
* **Trigger**: QR/NFC tag scan matching asset assignment to custodian.
* **Audit**: Written to `audit_log` and appended to Asset Universal Timeline.
