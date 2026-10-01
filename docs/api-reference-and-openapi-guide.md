# ThaibaHive API Reference & OpenAPI 3.1 Specification Guide

**Version:** 3.31.0  
**OpenAPI Endpoint:** `/api/openapi.json`  
**Security Standards:** DPoP RFC 9449, RFC 7519 JWT, WebAuthn Level 3, 5-Tier RBAC

---

## 1. Authentication & Security Protocols

ThaibaHive APIs support four primary authentication schemes:

### 1.1. JWT Cookie Authentication (`CookieAuth`)
Standard session mechanism for web clients. The JWT token is securely transmitted via `httpOnly`, `SameSite=Lax`, and `Secure` cookie `auth_token`.

### 1.2. Bearer Authentication (`BearerAuth`)
Used by API integrations, automated background workers, and mobile clients.
```http
Authorization: Bearer <jwt_token>
```

### 1.3. Demonstrating Proof-of-Possession (DPoP)
Required for high-security endpoints (Finance, Vision Shield, Lockdown, Staff Payroll). Clients must generate an asymmetric key pair and send a DPoP proof header:
```http
DPoP: <signed_jwt_proof>
Authorization: DPoP <access_token>
```

### 1.4. Mobile Nonce Exchange (`/api/auth/mobile-handoff`)
Facilitates seamless, secure auth handoff from native Flutter apps to authenticated web views:
1. Native app requests a one-time cryptographic nonce (`/api/auth/mobile-handoff/nonce`).
2. Native app loads web view at `/api/auth/mobile-handoff?nonce=<nonce>&dest=<path>`.
3. Server verifies single-use nonce, sets the session cookie, and redirects to `dest`.

---

## 2. Core API Endpoints

### 2.1. Authentication & Identity
- `POST /api/auth/login`: Authenticate with email/password credentials or passkey challenge.
- `POST /api/auth/signup`: Register new staff member using institutional invite code.
- `GET /api/auth/me`: Retrieve current session user profile and granular permissions.
- `POST /api/auth/forgot-password`: Dispatch password reset token email.
- `POST /api/auth/webauthn/login-challenge`: Issue WebAuthn passkey assertion challenge.
- `POST /api/auth/webauthn/login-verify`: Verify passkey signature and issue session.

### 2.2. Staff Management
- `GET /api/staff`: List staff members with filtering (department, designation, status).
- `POST /api/staff`: Create new staff profile (`admin:write`).
- `GET /api/staff/[id]`: Retrieve detailed staff member profile.
- `PATCH /api/staff/[id]`: Update staff details, roles, or department junction bindings.
- `DELETE /api/staff/[id]`: Soft-delete or deactivate staff profile.

### 2.3. Attendance & Time Tracking
- `GET /api/attendance/today`: Retrieve today's check-in/out log for current user.
- `POST /api/attendance/check-in`: Register presence via geofencing or NFC beacon.
- `POST /api/attendance/check-out`: Record shift checkout and calculate worked hours.
- `GET /api/attendance/my`: Paginated historical attendance records for current user.
- `GET /api/attendance/team`: Team attendance overview for administrators, principals, and HODs.

### 2.4. Tasks & Project Management
- `GET /api/tasks`: Retrieve tasks by scope (`all`, `my`, `department`).
- `POST /api/tasks`: Create new task item with priority, due date, and assignee.
- `PATCH /api/tasks/[id]`: Update task details, status, or assignee.
- `POST /api/tasks/reorder`: Batch reorder Kanban sort orders across columns.
- `DELETE /api/tasks/[id]`: Delete task item.

### 2.5. Circulars & Bulletins
- `GET /api/circulars`: Retrieve published institutional circulars.
- `POST /api/circulars`: Author and broadcast new circular (`circulars:write`).
- `PATCH /api/circulars/[id]`: Edit circular text or update audience scope.
- `DELETE /api/circulars/[id]`: Revoke or archive circular.

### 2.6. Fleet & Logistics
- `GET /api/vehicles`: List vehicle fleet status, capacity, and current drivers.
- `POST /api/vehicles`: Register new fleet asset.
- `GET /api/vehicles/bookings`: List trip reservations and approval states.
- `POST /api/vehicles/bookings`: Submit vehicle booking request.
- `GET /api/vehicles/logs`: Mileage, maintenance, and fuel inspection records.

### 2.7. Accounts & Finance
- `GET /api/accounts/transactions`: Paginated ledger transactions with date and institution filters.
- `POST /api/accounts/transactions`: Record income or expense entry (`accounts:write`).
- `GET /api/accounts/summary`: Aggregate total income, expenses, and net balance.
- `GET /api/purchases`: Purchase orders and approval chains.
- `POST /api/purchases`: Submit purchase order requisition.
- `PATCH /api/purchases/[id]`: Multi-tier approval transitions (HOD → Accounts → Purchase Officer).

### 2.8. Grievance Redressal
- `GET /api/grievances`: Filterable grievance cases.
- `POST /api/grievances`: Submit confidential grievance.
- `PATCH /api/grievances/[id]`: Update grievance case status, assign investigator, and record notes.

---

## 3. OpenAPI 3.1 Export & SDK Generation

The complete OpenAPI 3.1 specification is available dynamically at `/api/openapi.json`.

### 3.1. Generating TypeScript Types (e.g. `openapi-typescript`)
```bash
npx openapi-typescript http://localhost:3000/api/openapi.json -o src/types/api.generated.ts
```

### 3.2. Generating Flutter / Dart API Client
```bash
flutter pub run openapi_generator generate -i http://localhost:3000/api/openapi.json
```

---

## 4. Error Handling & Standard Responses

All API responses follow a consistent JSON envelope:

### Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response (`400`, `401`, `403`, `404`, `500`)
```json
{
  "error": "Descriptive error message",
  "code": "VALIDATION_FAILED",
  "details": [ ... ]
}
```
