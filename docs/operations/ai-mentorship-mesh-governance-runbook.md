# AI Mentorship Mesh & Career Matching Governance Runbook (ALUM-022)

## Overview
This runbook details the mathematical matching algorithm, capacity constraints, quality audits, and code-of-conduct enforcement for the ThaibaHive AI Mentorship Mesh.

---

## 1. Multi-Factor Compatibility Formula
The `MentorshipMatchingEngine` scores mentor-mentee compatibility $C \in [0.0, 1.0]$ using a multi-factor weighted combination:

$$C = 0.35 \times S_{\text{career}} + 0.25 \times S_{\text{industry}} + 0.20 \times S_{\text{skills}} + 0.10 \times S_{\text{capacity}} + 0.10 \times S_{\text{academic}}$$

- **Career Alignment ($35\%$)**: Substring and role title semantic similarity.
- **Industry Domain ($25\%$)**: Target industry alignment.
- **Skill Graph Overlap ($20\%$)**: Jaccard similarity across desired and mentor expertise tags.
- **Availability & Capacity ($10\%$):** Ratio of unallocated mentee slots.
- **Academic Background ($10\%$):** Shared alma mater department or degree faculty.

---

## 2. Session Lifecycle & Capacity Governance
1. **Request**: Student submits request with topic and explicit goals.
2. **Response**: Mentor accepts or declines within 7 business days. On accept, `activeMenteeCount` increments.
3. **Scheduling**: Dual-calendar iCal invitation generated with secure meeting URL.
4. **Completion & Review**: Student and mentor submit dual-sided ratings (1-5 stars) and qualitative feedback.
5. **Quality Thresholds**: Mentors whose rolling average rating drops below 4.0 are flagged for staff coordinator review.
