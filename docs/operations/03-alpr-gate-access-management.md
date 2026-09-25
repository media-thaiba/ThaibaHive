# SafeCampus OS: ALPR & Vehicle Gate Access Control Runbook (RUNBOOK-03)

## 1. Overview
Governs the automatic license plate recognition (ALPR), whitelist/blacklist validation, barrier actuation, and campus parking lot dwell tracking.

## 2. Ingress & Egress Decision Logic
```
       [Camera OCR Capture]
                 │
      [Plate Normalization & Regex]
                 │
       [Permit Whitelist Check]
        ├── Blacklisted?  ──> [Lock Barrier, Alert Security]
        ├── Authorized?   ──> [Open Barrier Gate, Update Parking Count]
        └── Unregistered? ──> [Issue Visitor Pass or Divert to Security Kiosk]
```

## 3. Whitelist Registration API
```http
POST /api/vision/alpr
Content-Type: application/json

{
  "action": "register_whitelist",
  "permitId": "prm_faculty_01",
  "plateNumber": "KA-01-AB-1234",
  "ownerName": "Dr. Alan Turing",
  "ownerType": "staff",
  "validFrom": "2026-01-01",
  "status": "active"
}
```

## 4. Blacklist Enforcement
- When a vehicle is flagged with `isBlacklisted: true`, any entry attempt halts gate opening, records an audit entry with `permitStatus: blacklisted`, and dispatches gate security personnel immediately.
