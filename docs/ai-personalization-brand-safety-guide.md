# ThaibaHive EngageOS — AI Personalization & Brand Safety Architecture Guide

## 1. Dynamic Personalization & Tone Synthesis

EngageOS dynamically synthesizes notification messages based on recipient archetype, relationship duration, and situational urgency:

- **Archetypes**: `student_undergraduate`, `student_postgraduate`, `parent_guardian`, `faculty_member`, `alumnus`, `prospective_applicant`.
- **Tone Matrix**:
  - `academic_formal`: Official institutional decrees, exam regulations.
  - `empathetic_supportive`: Attendance nudges, counseling outreach, academic recovery.
  - `urgent_actionable`: Safety alerts, critical fee deadlines, immediate campus closures.
  - `warm_welcoming`: Orientation updates, alumni reunions, admissions acceptances.

---

## 2. Brand Voice & Safety Compliance Scanning

Before any outbound message dispatch, the `BrandSafetyValidator` runs AST parsing and keyword matching:

1. **Prohibited Phrase Detection**: Scans for compliance risks, sensitive financial requests, or offensive language.
2. **Mandatory Disclaimers & Unsubscribe Footers**: Ensures educational institution identity and one-click unsubscribe links.
3. **Automated XSS & Injection Sanitization**: All HTML email templates and SMS bodies are cleansed of scripts and unsafe attributes.
