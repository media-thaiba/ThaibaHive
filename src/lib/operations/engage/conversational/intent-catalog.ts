export interface IntentDefinition {
  intentId: string;
  category: 'academics' | 'finance' | 'campus_life' | 'support' | 'administrative' | 'admissions' | 'career';
  description: string;
  keywords: string[];
  requiredSlots: string[];
}

export const INSTITUTIONAL_INTENTS: IntentDefinition[] = [
  // ─── Academics (1-8) ───
  {
    intentId: 'check_attendance',
    category: 'academics',
    description: 'Check attendance percentage or absent days',
    keywords: ['attendance', 'absent', 'present', 'percentage', 'classes missed', 'attended'],
    requiredSlots: [],
  },
  {
    intentId: 'course_schedule',
    category: 'academics',
    description: 'View daily timetable and lecture schedule',
    keywords: ['class schedule', 'timetable', 'next class', 'lecture timing', 'period'],
    requiredSlots: [],
  },
  {
    intentId: 'exam_timetable',
    category: 'academics',
    description: 'View exam dates and exam hall locations',
    keywords: ['exam', 'timetable', 'test schedule', 'finals', 'midterm date', 'exam hall', 'exam date'],
    requiredSlots: [],
  },
  {
    intentId: 'exam_results',
    category: 'academics',
    description: 'Check GPA, semester marks and exam results',
    keywords: ['results', 'grades', 'gpa', 'marks', 'score card', 'cgpa', 'passed'],
    requiredSlots: [],
  },
  {
    intentId: 'assignment_deadline',
    category: 'academics',
    description: 'Check pending homework and assignment due dates',
    keywords: ['assignment', 'homework', 'submission', 'due date', 'project deadline'],
    requiredSlots: [],
  },
  {
    intentId: 'faculty_office_hours',
    category: 'academics',
    description: 'Find professor office hours and email address',
    keywords: ['professor', 'teacher', 'office hours', 'meet faculty', 'instructor contact'],
    requiredSlots: [],
  },
  {
    intentId: 'syllabus_download',
    category: 'academics',
    description: 'Download course syllabus or reading material',
    keywords: ['syllabus', 'curriculum', 'course outline', 'reading list', 'textbook'],
    requiredSlots: [],
  },
  {
    intentId: 'leave_application',
    category: 'academics',
    description: 'Apply for medical or personal leave',
    keywords: ['leave', 'sick leave', 'medical leave', 'apply leave', 'absent permission'],
    requiredSlots: ['startDate', 'reason'],
  },

  // ─── Finance (9-14) ───
  {
    intentId: 'fee_balance',
    category: 'finance',
    description: 'Check remaining fee dues and tuition balance',
    keywords: ['fee', 'tuition', 'balance', 'due', 'payment', 'how much do i owe', 'dues', 'cost'],
    requiredSlots: [],
  },
  {
    intentId: 'fee_receipt',
    category: 'finance',
    description: 'Download or view fee payment receipt',
    keywords: ['receipt', 'tax invoice', 'payment proof', 'download fee receipt', 'paid voucher'],
    requiredSlots: [],
  },
  {
    intentId: 'installment_plan',
    category: 'finance',
    description: 'Request split payment or installment breakdown',
    keywords: ['installment', 'emi', 'split fee', 'pay monthly', 'installment plan'],
    requiredSlots: [],
  },
  {
    intentId: 'scholarship_inquiry',
    category: 'finance',
    description: 'Check scholarship eligibility and financial aid',
    keywords: ['scholarship', 'financial aid', 'fee waiver', 'grant', 'bursary'],
    requiredSlots: [],
  },
  {
    intentId: 'fine_penalty_check',
    category: 'finance',
    description: 'Inquire about library or late registration fines',
    keywords: ['fine', 'penalty', 'late fee', 'overdue charge', 'library fine'],
    requiredSlots: [],
  },
  {
    intentId: 'refund_status',
    category: 'finance',
    description: 'Check fee refund or security deposit return status',
    keywords: ['refund', 'deposit return', 'caution money', 'refund status'],
    requiredSlots: [],
  },

  // ─── Campus Life & Facilities (15-20) ───
  {
    intentId: 'library_hours',
    category: 'campus_life',
    description: 'Check library opening times and book availability',
    keywords: ['library', 'library timings', 'study room', 'borrow book', 'reading hall'],
    requiredSlots: [],
  },
  {
    intentId: 'transport_schedule',
    category: 'campus_life',
    description: 'Campus bus route and shuttle timetable',
    keywords: ['bus', 'shuttle', 'transport', 'route', 'pickup time', 'bus stop', 'transit', 'shuttle timings'],
    requiredSlots: [],
  },
  {
    intentId: 'cafeteria_menu',
    category: 'campus_life',
    description: 'Daily dining hall and cafeteria food menu',
    keywords: ['canteen', 'cafeteria', 'food menu', 'lunch', 'dinner', 'mess meal'],
    requiredSlots: [],
  },
  {
    intentId: 'hostel_room_issue',
    category: 'campus_life',
    description: 'Report dorm maintenance or facility issue',
    keywords: ['hostel', 'dorm', 'plumbing', 'broken ac', 'room maintenance', 'mess issue'],
    requiredSlots: ['roomNumber', 'issueDescription'],
  },
  {
    intentId: 'gym_sports_facility',
    category: 'campus_life',
    description: 'Sports complex and gym hours and bookings',
    keywords: ['gym', 'fitness', 'badminton court', 'swimming pool', 'sports center'],
    requiredSlots: [],
  },
  {
    intentId: 'campus_wifi_it_support',
    category: 'campus_life',
    description: 'Campus WiFi setup and IT helpdesk support',
    keywords: ['wifi', 'internet connection', 'eduroam', 'portal login error', 'reset password'],
    requiredSlots: [],
  },

  // ─── Admissions & Enrollment (21-24) ───
  {
    intentId: 'admission_status',
    category: 'admissions',
    description: 'Check prospective application status',
    keywords: ['admission status', 'application progress', 'merit list', 'shortlisted'],
    requiredSlots: [],
  },
  {
    intentId: 'program_requirements',
    category: 'admissions',
    description: 'Degree prerequisites and eligibility criteria',
    keywords: ['eligibility', 'prerequisites', 'cut off marks', 'course duration', 'accreditation'],
    requiredSlots: [],
  },
  {
    intentId: 'document_verification',
    category: 'admissions',
    description: 'Submit or verify academic certificates',
    keywords: ['original certificates', 'document submission', 'verification counter', 'mark sheet'],
    requiredSlots: [],
  },
  {
    intentId: 'hostel_admission',
    category: 'admissions',
    description: 'Apply for residential hostel accommodation',
    keywords: ['hostel application', 'dorm room allotment', 'hostel fee', 'room mate'],
    requiredSlots: [],
  },

  // ─── Career & Placements (25-28) ───
  {
    intentId: 'placement_drive',
    category: 'career',
    description: 'Upcoming campus interview drives and recruiting companies',
    keywords: ['placement', 'campus drive', 'job interview', 'recruiters', 'salary package'],
    requiredSlots: [],
  },
  {
    intentId: 'internship_opportunities',
    category: 'career',
    description: 'Summer and semester internship listings',
    keywords: ['internship', 'summer project', 'industrial training', 'stipend'],
    requiredSlots: [],
  },
  {
    intentId: 'resume_review_booking',
    category: 'career',
    description: 'Book a resume critique or mock interview session',
    keywords: ['resume review', 'mock interview', 'cv check', 'career counselor'],
    requiredSlots: [],
  },
  {
    intentId: 'alumni_mentorship',
    category: 'career',
    description: 'Connect with alumni mentors in industry',
    keywords: ['alumni network', 'mentor', 'industry connect', 'alumni association'],
    requiredSlots: [],
  },

  // ─── Administrative & Records (29-30) ───
  {
    intentId: 'transcript_request',
    category: 'administrative',
    description: 'Request official academic transcript',
    keywords: ['official transcript', 'grade card', 'degree certificate', 'duplicate marksheet'],
    requiredSlots: [],
  },
  {
    intentId: 'bonafide_certificate',
    category: 'administrative',
    description: 'Request bonafide student status letter',
    keywords: ['bonafide', 'study certificate', 'student verification letter', 'passport letter'],
    requiredSlots: [],
  },

  // ─── Support & Escalations (31-32) ───
  {
    intentId: 'general_faq',
    category: 'support',
    description: 'General institutional inquiry',
    keywords: ['help', 'info', 'where is', 'how do i', 'contact office', 'phone number'],
    requiredSlots: [],
  },
  {
    intentId: 'human_agent_request',
    category: 'support',
    description: 'Escalate to human staff counselor or advisor',
    keywords: ['human', 'talk to person', 'speak to staff', 'advisor', 'counselor', 'agent', 'support rep'],
    requiredSlots: [],
  },
];
