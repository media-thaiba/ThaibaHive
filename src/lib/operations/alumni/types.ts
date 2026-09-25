// ─── ALUMNI-HUB / EndowmentOS Types (Sprint-058) ───

export type AlumniStatus = 'pending_claim' | 'active' | 'archived' | 'suspended';
export type PrivacyConsentLevel = 'public' | 'alumni_only' | 'hidden';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'founder'
  | 'self_employed';

export type MenteeTargetType = 'undergrads' | 'graduates' | 'all';
export type MeetingType = 'virtual' | 'in_person' | 'hybrid';

export type MentorshipRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type MentorshipSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type JobRoleType = 'full_time' | 'internship' | 'part_time' | 'contract';
export type WorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type ExperienceLevel = 'entry_level' | 'mid_level' | 'senior' | 'executive';
export type JobStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'expired'
  | 'closed';

export type JobApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type CampaignCategory =
  | 'scholarship_fund'
  | 'infrastructure'
  | 'research_chair'
  | 'student_welfare'
  | 'general_endowment';

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused' | 'archived';

export type DonationPaymentGateway =
  | 'razorpay'
  | 'stripe'
  | 'upi'
  | 'bank_wire'
  | 'cash_cheque';

export type DonationStatus = 'initiated' | 'confirmed' | 'failed' | 'refunded';

export type RecognitionTier =
  | 'supporter'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'trustee_circle';

export type ChapterType = 'regional' | 'international' | 'industry' | 'batch';
export type ChapterStatus = 'forming' | 'active' | 'inactive';
export type ChapterRole = 'president' | 'secretary' | 'treasurer' | 'coordinator' | 'member';
export type ChapterMemberStatus = 'pending' | 'approved' | 'rejected' | 'left';

export type AlumniEventType =
  | 'reunion'
  | 'networking'
  | 'webinar'
  | 'fundraiser'
  | 'career_fair'
  | 'annual_meet';

export type EventFormat = 'in_person' | 'virtual' | 'hybrid';
export type EventStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
export type EventPaymentStatus = 'free' | 'pending' | 'paid' | 'refunded';
export type RsvpStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export type AlumniAuditAction =
  | 'profile_created'
  | 'graduation_transitioned'
  | 'profile_verified'
  | 'mentorship_matched'
  | 'session_completed'
  | 'job_posted'
  | 'job_application_submitted'
  | 'donation_received'
  | '80g_receipt_issued'
  | 'chapter_created'
  | 'event_checkin';

// ─── Interfaces ───

export interface AlumniProfileItem {
  id: string;
  institutionId: string;
  studentId?: string | null;
  userId?: string | null;
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  currentIndustry?: string | null;
  currentCity?: string | null;
  currentCountry?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  graduationBatchYear: number;
  primaryDegree: string;
  primaryDepartment: string;
  credentialHash?: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  isMentor: boolean;
  isHiring: boolean;
  privacyConsentLevel: PrivacyConsentLevel;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showCompany: boolean;
  status: AlumniStatus;
  claimedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  educations?: AlumniEducationItem[];
  experiences?: AlumniExperienceItem[];
}

export interface AlumniEducationItem {
  id: string;
  alumniProfileId: string;
  institutionName: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number | null;
  gradeCgpa?: string | null;
  honors?: string | null;
  activities?: string | null;
  isInstitutional: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniExperienceItem {
  id: string;
  alumniProfileId: string;
  company: string;
  title: string;
  employmentType: EmploymentType;
  industry: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
  skills?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniMentorshipProfileItem {
  id: string;
  alumniProfileId: string;
  institutionId: string;
  expertiseAreas: string; // JSON array of skills/topics
  targetMenteeTypes: MenteeTargetType;
  maxActiveMentees: number;
  activeMenteeCount: number;
  preferredLanguages?: string | null;
  availabilityHoursPerMonth: number;
  meetingType: MeetingType;
  meetingLink?: string | null;
  bioMentor?: string | null;
  averageRating: number;
  totalReviewsCount: number;
  totalHoursDelivered: number;
  isAcceptingRequests: boolean;
  createdAt: string;
  updatedAt: string;
  alumniProfile?: AlumniProfileItem;
}

export interface AlumniMentorshipRequestItem {
  id: string;
  institutionId: string;
  mentorshipProfileId: string;
  studentId: string;
  requestTopic: string;
  requestGoals: string;
  studentNotes?: string | null;
  compatibilityScore: number;
  status: MentorshipRequestStatus;
  responseNotes?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  studentName?: string;
  mentorName?: string;
}

export interface AlumniMentorshipSessionItem {
  id: string;
  requestId: string;
  mentorshipProfileId: string;
  studentId: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingUrl?: string | null;
  status: MentorshipSessionStatus;
  sessionNotes?: string | null;
  mentorRating?: number | null;
  mentorFeedback?: string | null;
  studentRating?: number | null;
  studentFeedback?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniJobPostingItem {
  id: string;
  institutionId: string;
  postedByAlumniId?: string | null;
  company: string;
  title: string;
  roleType: JobRoleType;
  workplaceType: WorkplaceType;
  location: string;
  departmentTarget?: string | null;
  experienceLevel?: ExperienceLevel;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryCurrency: string;
  description: string;
  requirements: string;
  skillsRequired?: string | null;
  applicationUrl?: string | null;
  contactEmail?: string | null;
  allowDirectApply: boolean;
  hasAlumniReferral: boolean;
  status: JobStatus;
  moderatedById?: string | null;
  moderationNotes?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniJobApplicationItem {
  id: string;
  jobPostingId: string;
  studentId: string;
  resumeUrl: string;
  coverLetter?: string | null;
  portfolioLink?: string | null;
  status: JobApplicationStatus;
  referralEndorsedById?: string | null;
  referralNotes?: string | null;
  recruiterFeedback?: string | null;
  appliedAt: string;
  updatedAt: string;
  jobPosting?: AlumniJobPostingItem;
}

export interface AlumniDonationCampaignItem {
  id: string;
  institutionId: string;
  title: string;
  code: string;
  category: CampaignCategory;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  bannerImageUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  status: CampaignStatus;
  isTaxExempt80G: boolean;
  matchingDonorName?: string | null;
  matchingRatio?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniDonationItem {
  id: string;
  institutionId: string;
  campaignId: string;
  alumniProfileId?: string | null;
  donorName: string;
  donorEmail: string;
  donorPhone?: string | null;
  donorPanTaxId?: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  paymentGateway: DonationPaymentGateway;
  gatewayTransactionId?: string | null;
  status: DonationStatus;
  glJournalId?: string | null;
  receipt80GNumber?: string | null;
  receipt80GHash?: string | null;
  receipt80GPdfUrl?: string | null;
  recognitionTier: RecognitionTier;
  isCorporateMatching: boolean;
  corporateEmployerName?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
}

export interface AlumniChapterItem {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  type: ChapterType;
  country: string;
  city: string;
  description?: string | null;
  presidentAlumniId?: string | null;
  secretaryAlumniId?: string | null;
  treasurerAlumniId?: string | null;
  memberCount: number;
  status: ChapterStatus;
  bannerUrl?: string | null;
  foundedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniChapterMemberItem {
  id: string;
  chapterId: string;
  alumniProfileId: string;
  role: ChapterRole;
  status: ChapterMemberStatus;
  joinedAt: string;
  createdAt: string;
}

export interface AlumniEventItem {
  id: string;
  institutionId: string;
  chapterId?: string | null;
  title: string;
  eventType: AlumniEventType;
  format: EventFormat;
  venue?: string | null;
  virtualMeetingUrl?: string | null;
  startDateTime: string;
  endDateTime: string;
  description: string;
  bannerUrl?: string | null;
  ticketPrice: number;
  currency: string;
  capacity: number;
  registeredCount: number;
  attendedCount: number;
  status: EventStatus;
  organizerAlumniId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniEventRsvpItem {
  id: string;
  eventId: string;
  alumniProfileId?: string | null;
  studentId?: string | null;
  attendeeName: string;
  attendeeEmail: string;
  ticketNumber: string;
  ticketPassQr: string;
  ticketPassHash: string;
  paymentStatus: EventPaymentStatus;
  amountPaid: number;
  isCheckedIn: boolean;
  checkedInAt?: string | null;
  checkedInById?: string | null;
  rsvpStatus: RsvpStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniAuditLogItem {
  id: string;
  auditId: string;
  institutionId: string;
  actorId: string;
  actorRole: string;
  action: AlumniAuditAction;
  entityType: string;
  entityId: string;
  payloadHash: string;
  timestamp: string;
  createdAt: string;
}
