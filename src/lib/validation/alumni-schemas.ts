import { z } from 'zod';

export const createAlumniProfileSchema = z.object({
  institutionId: z.string().min(1),
  studentId: z.string().optional().nullable(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  currentCompany: z.string().optional().nullable(),
  currentDesignation: z.string().optional().nullable(),
  currentIndustry: z.string().optional().nullable(),
  currentCity: z.string().optional().nullable(),
  currentCountry: z.string().optional().nullable(),
  graduationBatchYear: z.number().int().min(1950).max(2100),
  primaryDegree: z.string().min(2),
  primaryDepartment: z.string().min(2),
  isMentor: z.boolean().default(false),
  isHiring: z.boolean().default(false),
  privacyConsentLevel: z.enum(['public', 'alumni_only', 'hidden']).default('alumni_only'),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showLocation: z.boolean().default(true),
  showCompany: z.boolean().default(true),
});

export const updateAlumniProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  currentCompany: z.string().optional(),
  currentDesignation: z.string().optional(),
  currentIndustry: z.string().optional(),
  currentCity: z.string().optional(),
  currentCountry: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  isMentor: z.boolean().optional(),
  isHiring: z.boolean().optional(),
  privacyConsentLevel: z.enum(['public', 'alumni_only', 'hidden']).optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showCompany: z.boolean().optional(),
});

export const createMentorshipRequestSchema = z.object({
  institutionId: z.string().min(1),
  mentorshipProfileId: z.string().min(1),
  studentId: z.string().min(1),
  requestTopic: z.string().min(3),
  requestGoals: z.string().min(5),
  studentNotes: z.string().optional(),
});

export const createJobPostingSchema = z.object({
  institutionId: z.string().min(1),
  postedByAlumniId: z.string().optional().nullable(),
  company: z.string().min(2),
  title: z.string().min(2),
  roleType: z.enum(['full_time', 'internship', 'part_time', 'contract']).default('full_time'),
  workplaceType: z.enum(['remote', 'hybrid', 'onsite']).default('onsite'),
  location: z.string().min(2),
  departmentTarget: z.string().optional().nullable(),
  experienceLevel: z.enum(['entry_level', 'mid_level', 'senior', 'executive']).default('entry_level'),
  minSalary: z.number().nonnegative().optional().nullable(),
  maxSalary: z.number().nonnegative().optional().nullable(),
  salaryCurrency: z.string().default('INR'),
  description: z.string().min(10),
  requirements: z.string().min(5),
  skillsRequired: z.array(z.string()).optional(),
  applicationUrl: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  allowDirectApply: z.boolean().default(true),
  hasAlumniReferral: z.boolean().default(false),
});

export const submitJobApplicationSchema = z.object({
  jobPostingId: z.string().min(1),
  studentId: z.string().min(1),
  resumeUrl: z.string().min(1),
  coverLetter: z.string().optional().nullable(),
  portfolioLink: z.string().optional().nullable(),
  referralEndorsedById: z.string().optional().nullable(),
  referralNotes: z.string().optional().nullable(),
});

export const createCampaignSchema = z.object({
  institutionId: z.string().min(1),
  title: z.string().min(3),
  code: z.string().min(2),
  category: z.enum(['scholarship_fund', 'infrastructure', 'research_chair', 'student_welfare', 'general_endowment']).default('general_endowment'),
  description: z.string().min(10),
  targetAmount: z.number().positive(),
  bannerImageUrl: z.string().optional().nullable(),
  startDate: z.string().min(4),
  endDate: z.string().optional().nullable(),
  isTaxExempt80G: z.boolean().default(true),
  matchingDonorName: z.string().optional().nullable(),
  matchingRatio: z.number().positive().default(1.0),
});

export const donateCheckoutSchema = z.object({
  institutionId: z.string().min(1),
  campaignId: z.string().min(1),
  alumniProfileId: z.string().optional().nullable(),
  donorName: z.string().min(2),
  donorEmail: z.string().email(),
  donorPhone: z.string().optional().nullable(),
  donorPanTaxId: z.string().optional().nullable(),
  isAnonymous: z.boolean().default(false),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  paymentGateway: z.enum(['razorpay', 'stripe', 'upi', 'bank_wire', 'cash_cheque']).default('razorpay'),
  isCorporateMatching: z.boolean().default(false),
  corporateEmployerName: z.string().optional().nullable(),
});

export const createChapterSchema = z.object({
  institutionId: z.string().min(1),
  name: z.string().min(3),
  code: z.string().min(2),
  type: z.enum(['regional', 'international', 'industry', 'batch']).default('regional'),
  country: z.string().min(2),
  city: z.string().min(2),
  description: z.string().optional().nullable(),
  presidentAlumniId: z.string().optional().nullable(),
  secretaryAlumniId: z.string().optional().nullable(),
});

export const createEventSchema = z.object({
  institutionId: z.string().min(1),
  chapterId: z.string().optional().nullable(),
  title: z.string().min(3),
  eventType: z.enum(['reunion', 'networking', 'webinar', 'fundraiser', 'career_fair', 'annual_meet']).default('reunion'),
  format: z.enum(['in_person', 'virtual', 'hybrid']).default('in_person'),
  venue: z.string().optional().nullable(),
  virtualMeetingUrl: z.string().optional().nullable(),
  startDateTime: z.string().min(5),
  endDateTime: z.string().min(5),
  description: z.string().min(5),
  bannerUrl: z.string().optional().nullable(),
  ticketPrice: z.number().nonnegative().default(0),
  currency: z.string().default('INR'),
  capacity: z.number().int().positive().default(100),
  organizerAlumniId: z.string().optional().nullable(),
});

export const registerEventRsvpSchema = z.object({
  eventId: z.string().min(1),
  institutionId: z.string().min(1),
  alumniProfileId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  attendeeName: z.string().min(2),
  attendeeEmail: z.string().email(),
  paymentStatus: z.enum(['free', 'pending', 'paid', 'refunded']).optional(),
  amountPaid: z.number().nonnegative().optional(),
});

export const checkInAttendeeSchema = z.object({
  eventId: z.string().min(1),
  ticketPassHash: z.string().min(5),
});
