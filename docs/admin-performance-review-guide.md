# Admin Module Performance Reviews & HR Development Guide

**Version:** 1.9.0 (100% MVP Milestone)  
**Classification:** Official Technical Documentation  

---

## Overview

The **Admin Module Performance Review & HR Development System** provides a complete end-to-end framework for managing staff evaluations, competency rubrics, goal setting, 360-degree feedback, and executive HR analytics across all institution typologies (schools, universities, hostels, NGOs).

---

## Key Features

1. **Competency Framework Builder:** Configure role and department-specific rating rubrics (`/admin/performance`).
2. **Review Cycle Management:** Schedule quarterly, semi-annual, or annual review campaigns with automated deadline tracking.
3. **Multi-Stage Review Workflow Engine:** Self-Assessment → Manager Evaluation → HR Approval → Staff Sign-off.
4. **Staff Self-Service Portal:** Goal progress tracking, self-evaluation submission, and historical appraisal records (`/staff/performance`).
5. **Manager & HOD Evaluation Workspace:** Side-by-side comparative scoring, 360 feedback collection, and development plan generation (`/admin/performance/evaluate`).
6. **Executive HR Performance Analytics:** Real-time heatmaps, grade distributions, and department ranking comparisons (`/admin/performance/analytics`).
7. **Export Engine & Notifications:** Multi-format exports (PDF/XLSX/CSV) and FCM/APNs push notification deadline reminders.

---

## API Reference

- `GET /api/admin/performance/frameworks` — List competency frameworks
- `POST /api/admin/performance/frameworks` — Create new framework rubric
- `GET /api/admin/performance/cycles` — List active review cycles
- `POST /api/admin/performance/cycles` — Launch new review cycle
- `POST /api/admin/performance/reviews/[id]/submit` — Submit review stage evaluation
- `GET /api/admin/performance/analytics` — Fetch HR analytics & heatmaps
- `POST /api/export/performance` — Generate PDF/XLSX/CSV appraisal reports
- `POST /api/notifications/performance/remind` — Trigger deadline reminder notifications
- `GET /api/mobile/v1/staff/performance` — Mobile staff performance summary API

---

## Mobile Companion Integration (Flutter)

The mobile companion app (`thaibahive_mobile_app`) includes native Flutter screens for staff self-service:
- `StaffPerformanceScreen`: View active appraisal status and latest ratings
- `EvaluationSummaryCard`: Render review scores and letter grades
- `GoalCard`: Interactive goal progress indicator bars
- `staffPerformanceProvider`: Riverpod state management

---

## Multi-Tenant Security & Compliance

All performance review endpoints enforce strict tenant isolation using `institutionId` filter checks and `@thaiba/auth` RBAC permissions (`performance:read`, `performance:manage`, `performance:evaluate`, `performance:self`).
