# ThaibaHive Mobile Companion App Guide

**Version:** 1.7.0  
**Target OS:** Android 8.0+ / iOS 14.0+  
**Framework:** Flutter 3.x (Riverpod, GoRouter, Hive, FlutterSecureStorage)

---

## Overview

The ThaibaHive Mobile Companion App (`thaibahive_mobile_app`) extends the core web platform across 23+ campuses. It empowers staff, teachers, invigilators, and parents to access critical features on-the-go with instant single-tap financial approvals, invigilator QR hall ticket scanning, student attendance check-ins, push notifications, and DOB-encrypted PDF report card downloads.

---

## Key Feature Modules

### 1. Single-Sign-On (SSO) & WebView Nonce Handoff
- **Endpoint:** `POST /api/auth/mobile-handoff/nonce`
- **Security:** Issues a short-lived single-use nonce with 60-second TTL.
- **Client Component:** `WebViewHandoffScreen` exchanges nonces for secure HTTP-only cookies before opening web pages in Flutter WebViews without prompting for re-authentication.

### 2. Mobile Financial Approval Workflows
- **Screen:** `ApprovalListScreen`
- **Actions:** One-tap approval or rejection with mandatory reason note dialog.
- **Provider:** `approvalProvider` syncs status in real-time with Sprint-003 backend approval engine.

### 3. Examination Hall Ticket & Invigilator QR Scanner
- **Screens:** `HallTicketScreen`, `QrScannerScreen`
- **Invigilator Scanning:** Camera scanner uses `mobile_scanner` to verify hall ticket QR codes via `/api/examinations/hall-tickets/verify`.
- **Fee Clearance Lock:** Displays warning banners and locks hall tickets if student fee balance exceeds $0.

### 4. DOB-Encrypted PDF Report Card Viewer
- **Screen:** `ReportCardScreen`
- **PDF Download:** Fetches encrypted report card streaming payload from Sprint-004 backend (`/api/examinations/report-cards/download`).
- **Security:** Unlocks using DOB password (`DDMMYYYY`).

### 5. Staff Attendance & Student Roster
- **Screens:** `StaffCheckinScreen`, `StudentRosterScreen`
- **Capabilities:** Server timestamp check-in/out and student roster toggle (Present/Absent/Late).

### 6. Offline-First Sync Engine & Outbox Queue
- **Engine:** `OfflineSyncEngine` & `OutboxQueueManager`
- **Storage:** Local encrypted Hive box (`offline_outbox_box`).
- **Sync Route:** `POST /api/mobile/v1/sync` applies Last-Write-Wins (LWW) conflict reconciliation upon network restoration.

### 7. Push Notifications & Preferences
- **Backend:** `POST /api/mobile/v1/notifications/register`
- **Preferences:** `NotificationPreferencesScreen` allows users to toggle alert channels (Approvals, Attendance, Exams, Announcements).

### 8. Parent Portal Student 360 View
- **Screen:** `ParentDashboardScreen`
- **Features:** Consolidated student summary (Attendance %, Fee dues, Exam SGPA), multi-child switcher, and one-tap web fee payment.

---

## Security Audit & Verification

- **Token Storage:** JWT tokens encrypted using platform keychain via `FlutterSecureStorage`.
- **RBAC:** Backend endpoints enforce 6-tier RBAC (`super_admin`, `admin`, `principal`, `hod`, `staff`).
- **Tenant Isolation:** Enforces `institutionId` scoping across all mobile API queries.
