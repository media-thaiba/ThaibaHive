# Campus Services & Operations Module Guide

**Version:** 1.0.0  
**Target Release:** v1.8.0  
**Classification:** Technical & Operational Manual  

---

## 1. Overview

The **Campus Services & Operations Module** digitizes daily campus operational touchpoints across 23+ campuses:
- **Fleet Management & Transportation:** Vehicle inventory, driver assignments, route dispatching, and maintenance logs.
- **Canteen Cashless Meal Passes:** Cafeteria menu publisher, meal pass wallets, atomic balance deductions, and parent portal dietary controls.
- **Visitor Security Management:** Pre-registration, host approval routing, HMAC-SHA256 signed QR passes, and offline gatekeeper verification.

---

## 2. Architecture & API Reference

### 2.1 Fleet Management
- `GET /api/vehicles`: List institution vehicles.
- `POST /api/vehicles/bookings`: Request vehicle requisition.
- `POST /api/vehicles/maintenance`: Record vehicle service & maintenance.
- `POST /api/mobile/v1/fleet/checkin`: Driver trip check-in/check-out.

### 2.2 Canteen & Meal Passes
- `GET /api/canteen/menu`: Daily cafeteria menu.
- `POST /api/canteen/passes`: Issue student/staff meal passes.
- `POST /api/canteen/redeem`: Atomic balance deduction (`db.transaction`) with idempotency check.
- `GET /api/mobile/v1/parent/canteen-balance`: Parent portal balance monitoring & dietary controls.

### 2.3 Visitor Security
- `POST /api/visitors/pre-register`: Create visitor pre-registration request.
- `POST /api/visitors/approvals`: Host employee approval/rejection.
- `POST /api/visitors/pass/issue`: Generate HMAC-SHA256 signed visitor QR pass.
- `GET /api/visitors/verify`: Validate visitor QR pass signature and visit window.
- `POST /api/mobile/v1/visitors/sync`: Asynchronous offline gate log reconciliation.

---

## 3. Mobile Companion App Integration

- **Driver Dashboard Screen:** `lib/features/fleet/screens/driver_dashboard_screen.dart`
- **Cashier QR Scanner Screen:** `lib/features/canteen/screens/meal_pass_scanner_screen.dart`
- **Gatekeeper Security Scanner:** `lib/features/visitors/screens/gate_verification_screen.dart`
- **Parent Portal Dietary Controls:** `lib/features/parent_portal/screens/dietary_settings_screen.dart`
