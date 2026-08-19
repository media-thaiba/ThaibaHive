# 11-hostel.md — Residential & Hostel Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/11-hostel.md`

---

## 1. Executive Summary & Purpose

Governs residential facilities, room allocations, mess food preferences, warden night roll call, digital outpass approvals, and curfew gate biometrics across hostels, orphanages, and moral academies.

## 2. Key Capabilities
* **Facility Layout Builder**: Blocks → Floors → Rooms → Bed Capacity & Asset Mapping.
* **Bed Allocation & Transfer Engine**: Verified bed assignment linked to student fee status.
* **Digital Outpass Workflow**: Outpass request → Parent OTP consent → Warden approval → Gate biometric validation.
* **Night Roll Call Register**: Curfew presence tracking with auto-escalation for missing boarders.

---

# 12-transport.md — Fleet & Transport Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/12-transport.md`

---

## 1. Executive Summary & Purpose

Coordinates institutional vehicles, driver assignments, passenger route allocations, fuel consumption logs, maintenance schedules, and live bus GPS transit updates for parents.

## 2. Key Capabilities
* **Route & Stop Manager**: Route mapping, stop definitions, and schedule management.
* **Passenger Assignment Matrix**: Student/staff seat allocation linked to route distance fees.
* **Fuel & Maintenance Logs**: Odometer tracking, fuel efficiency analytics, and repair scheduling.
* **Realtime Parent Bus Tracking**: Live transit location updates pushed to parent mobile app.

---

# 13-library.md — Library & Resource Management Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/13-library.md`

---

## 1. Executive Summary & Purpose

Indexes, catalogs, issues, tracks, and audits physical books, journals, media assets, and digital e-books across campus libraries.

## 2. Key Capabilities
* **MARC21 / Dewey Cataloging Engine**: Book barcode/ISBN indexing and author search.
* **Circulation Workstation**: Fast book issue, return, renewal, and hold reservations via NFC library card.
* **Automated Overdue Fine Engine**: Daily fine calculations auto-posted to student fee account.
* **Digital E-Book Reader**: DRM-protected digital media streaming via MediaHive.

---

# 14-inventory.md — Warehouse & Inventory Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/14-inventory.md`

---

## 1. Executive Summary & Purpose

Manages stock levels, consumable items, central store warehouses, stock issue vouchers, and automated reorder point alerts.

## 2. Key Capabilities
* **Multi-Warehouse Stock Management**: Central store → Departmental stores → Issue points.
* **Reorder Point (ROP) Alerts**: Auto-triggering draft purchase requisitions when stock is low.
* **Stock Issue & Return Tracking**: Issuing groceries to mess, stationery to departments, items to staff.

---

# 15-procurement.md — Procurement & Vendor Domain Specification

> **Specification Tier**: Enterprise ERP Specification (AIOS 4.0)  
> **Source of Truth**: `.ai/domains/15-procurement.md`

---

## 1. Executive Summary & Purpose

Coordinates purchase requisitions, approval chains, vendor price quotes, Purchase Orders (PO), Goods Received Notes (GRN), and Accounts Payable invoice posting.

## 2. Key Capabilities
* **Multi-Tier Requisition Approval**: Department Head → Accounts Head → Finance Director.
* **Purchase Order (PO) Dispatch**: Auto-generating PDF POs and emailing approved suppliers.
* **Goods Received Note (GRN) Inspection**: Verifying received physical stock before crediting warehouse inventory.
