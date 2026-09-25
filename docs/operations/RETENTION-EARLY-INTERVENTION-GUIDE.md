# Student Retention & Early Intervention Operational Guide

## ML Risk Scoring Features
The retention risk classifier analyzes 8 predictive parameters:
1. **Cumulative GPA** (Weight: 35%)
2. **Prior Term GPA & Velocity** (Weight: 20%)
3. **Prerequisite Failures & Dropped Courses** (Weight: 25%)
4. **Attendance Rate & LMS Submission Delays** (Weight: 20%)

## Risk Tiers & Triage Rules
- **Critical Risk (Score $\ge 0.70$)**: Immediate multi-channel EngageOS outreach, advisor 1-on-1 booking link sent.
- **High Risk (Score $0.50 - 0.69$)**: Automated academic recovery triage and tutoring alert.
- **Medium Risk (Score $0.25 - 0.49$)**: Midterm progress monitoring notice.
- **Low Risk (Score $< 0.25$)**: Standard academic progression.

## Resolution Workflow
Advisors update alert statuses via `PATCH /api/curriculum/retention?alertId=<id>` with notes and counselor assignments.
