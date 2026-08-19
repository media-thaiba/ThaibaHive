# Workspace Integration Guide — Sprint-025

## Overview

Sprint-025 introduces **Role-Based Intent-Driven Workspaces** (v3.9.0), transitioning ThaibaHive from 60+ module navigation menus to personalized, intent-focused workspace dashboards tailored to each user role.

## Architecture

```
User Login → JWT Role Detection → Middleware Redirect → /workspace/{role}
                                                            ↓
                                                  WorkspaceShell
                                                    /    |    \
                                                Widget  Widget  Widget
                                                  ↑      ↑      ↑
                                              /api/workspaces/data
                                              /api/workspaces/sse (live updates)
```

## Supported Workspace Types

| Role | Workspace URL | Default Widgets |
|------|--------------|----------------|
| principal | /workspace/principal | Attendance Trends, Fee Recovery |
| staff/hod | /workspace/teacher | Class Attendance, Homework Tracker |
| accounts/purchase | /workspace/cashier | Transaction Tally, Pending Fees |
| guardian | /workspace/parent | Child Attendance, Fee Card |

## API Reference

### GET /api/workspaces/data

Returns aggregated workspace data for the authenticated user's role.

**Authentication:** Required (any authenticated role)

**Response:**
```json
{
  "success": true,
  "role": "principal",
  "data": {
    "staffTotal": 45,
    "presentToday": 40,
    "absentToday": 3,
    "lateToday": 2,
    "pendingApprovals": 5,
    "feeCollectedToday": 125000
  },
  "timestamp": "2026-08-05T09:00:00.000Z"
}
```

**Cache-Control:** `public, max-age=60, stale-while-revalidate=30`

### GET /api/workspaces/preferences

Retrieves saved workspace layout configuration for the authenticated user.

**Query Parameters:**
- `workspaceType` (required): `principal | teacher | cashier | parent`

**Response:**
```json
{
  "success": true,
  "preferences": {
    "workspaceType": "principal",
    "layoutConfig": [
      { "widgetId": "principal-attendance-trends", "enabled": true, "order": 0 },
      { "widgetId": "principal-fee-recovery", "enabled": true, "order": 1 }
    ]
  }
}
```

### PUT /api/workspaces/preferences

Updates workspace layout configuration.

**Rate Limit:** 10 requests per minute per user

**Request Body:**
```json
{
  "workspaceType": "principal",
  "layoutConfig": [
    { "widgetId": "principal-attendance-trends", "enabled": true, "order": 0 },
    { "widgetId": "principal-fee-recovery", "enabled": false, "order": 1 }
  ]
}
```

### GET /api/workspaces/sse

Server-Sent Events stream for real-time workspace updates.

**Events:**
- `connected` — Initial connection confirmation
- `workspace:refresh` — General workspace data refresh trigger
- `workspace:{role}:refresh` — Role-specific refresh trigger
- `attendance_marked` — Triggered when attendance is submitted
- `payment_receipt` — Triggered when a fee payment is recorded
- `task_assigned` — Triggered when a new task is assigned

**Heartbeat:** Server sends `: ping` every 5 seconds to maintain connection.

## Widget Library

### Principal Widgets

| Widget ID | Component | Data Key |
|-----------|-----------|----------|
| principal-attendance-trends | PrincipalAttendanceTrends | staffTotal, presentToday, absentToday |
| principal-fee-recovery | PrincipalFeeRecovery | feeCollectedToday, pendingApprovals |

### Teacher Widgets

| Widget ID | Component | Data Key |
|-----------|-----------|----------|
| teacher-class-attendance | TeacherClassAttendance | classCount, attendancePending |
| teacher-homework-tracker | TeacherHomeworkTracker | pendingTasks, homeworkPendingApprovals |

### Cashier Widgets

| Widget ID | Component | Data Key |
|-----------|-----------|----------|
| cashier-transaction-tally | CashierTransactionTally | collectionTotal, dailyCheckouts |
| cashier-pending-fees | CashierPendingFees | pendingInvoices, pendingTotal |

### Parent Widgets

| Widget ID | Component | Data Key |
|-----------|-----------|----------|
| parent-child-attendance | ParentChildAttendance | children, presentCount |
| parent-fee-card | ParentFeeCard | pendingFeeTotal, invoiceCount |

## Database Schema

```sql
CREATE TABLE workspace_preferences (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
  guardian_id TEXT REFERENCES guardians(id) ON DELETE CASCADE,
  workspace_type TEXT NOT NULL,
  layout_config TEXT NOT NULL,  -- JSON array of WidgetConfig[]
  updated_at TEXT NOT NULL
);
```

## Mobile Integration (Flutter)

Flutter workspace screens are available at:
- `features/dashboard/presentation/screens/principal_workspace_screen.dart`
- `features/dashboard/presentation/screens/teacher_workspace_screen.dart`
- `features/dashboard/presentation/screens/cashier_workspace_screen.dart`
- `features/dashboard/presentation/screens/parent_workspace_screen.dart`

All screens use the shared `workspaceStateProvider` (Riverpod) with Hive caching (`mobile_workspaces_cache` box) for offline support.

For embedded web workspace views within the Flutter app, use `EmbeddedWorkspaceWebView`:

```dart
EmbeddedWorkspaceWebView(role: 'principal')
```

This uses the `WebViewHandoffScreen` nonce-exchange mechanism (Rule 53) to securely authenticate the WebView session.

## Rollback

To disable workspace redirection and restore legacy navigation:
1. Remove the workspace redirect block from `src/middleware.ts`
2. The legacy navigation menus remain untouched and functional
