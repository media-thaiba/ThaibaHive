# ThaibaHive EngageOS — Conversational AI & Human-in-the-Loop Playbook

## 1. Natural Language Intent Architecture

EngageOS features an NLP intent classification and slot-filling conversational agent covering 30+ institutional intents across 7 core functional domains:

1. **Academics & Attendance**: `check_attendance`, `course_schedule`, `exam_timetable`, `grade_inquiry`, `faculty_office_hours`, `assignment_deadline`.
2. **Finance & Tuition**: `fee_balance`, `payment_methods`, `scholarship_inquiry`, `fee_receipt`, `installment_plan`.
3. **Campus Facilities & Life**: `library_hours`, `study_room_booking`, `shuttle_schedule`, `cafeteria_menu`, `gym_hours`, `wifi_support`.
4. **Admissions & Enrollment**: `admission_status`, `document_verification`, `program_requirements`, `fee_structure`, `hostel_booking`.
5. **Career & Placement**: `internship_opportunities`, `placement_drive`, `resume_review_booking`, `alumni_mentorship`.
6. **Administrative & Records**: `transcript_request`, `bonafide_certificate`, `id_card_replacement`, `leave_application`.
7. **Support & Escalations**: `general_faq`, `counselor_booking`, `human_agent_request`, `complaint_filing`.

---

## 2. Multi-Turn Dialog Management & Slot Filling

- **Slot Extraction**: Regex and Named Entity Recognition (NER) capture `courseCode` (e.g. `CS402`), `studentId`, `amount`, `date`, `buildingName`.
- **State Preservation**: In-session slot data is maintained in the `engage_chat_sessions` context column.

---

## 3. Human-in-the-Loop Handoff (HITL) Protocol

```
User Query ──► Intent Confidence < 0.40 OR Intent == "human_agent_request"
                     │
                     ▼
             Queue Escalation Ticket (HumanHandoffManager)
                     │
                     ▼
             Staff Counselor Desktop Alert
                     │
                     ▼
             Agent Assignment & Live Real-time Chat Transition
```
