# ThaibaHive EngageOS — Conversational NLP Bot & Multi-Modal Assistant Guide

## 1. Intent Recognition & Knowledge Retrieval Architecture

EngageOS features an NLP conversational bot capable of processing text and voice queries across 32 institutional intents:

```
                  ┌───────────────────────────────┐
                  │ Inbound Query (Text or Audio) │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │    Intent Classifier (NLP)    │
                  └──────────────┬────────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │ Confidence >= 0.40                      │ Confidence < 0.40 / Human Escalation
            ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│ Dialog Manager & Slot Filler  │         │     Human Counselor Queue     │
└──────────────┬────────────────┘         └───────────────────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Institutional KB Search / RAG │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Response Generation & Actions │
└───────────────────────────────┘
```

---

## 2. Supported Campus Intents

- **Academics**: `check_attendance`, `course_schedule`, `exam_timetable`, `exam_results`, `assignment_deadline`, `faculty_office_hours`, `syllabus_download`, `leave_application`.
- **Finance**: `fee_balance`, `fee_receipt`, `installment_plan`, `scholarship_inquiry`, `fine_penalty_check`, `refund_status`.
- **Campus Life**: `library_hours`, `transport_schedule`, `cafeteria_menu`, `hostel_room_issue`, `gym_sports_facility`, `campus_wifi_it_support`.
- **Admissions**: `admission_status`, `program_requirements`, `document_verification`, `hostel_admission`.
- **Career**: `placement_drive`, `internship_opportunities`, `resume_review_booking`, `alumni_mentorship`.
- **Admin & Support**: `transcript_request`, `bonafide_certificate`, `general_faq`, `human_agent_request`.
