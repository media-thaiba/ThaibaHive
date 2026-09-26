import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniMentorshipRequestItem,
  AlumniMentorshipSessionItem,
} from '../types';

export interface ScheduleSessionInput {
  requestId: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetingUrl?: string;
}

export interface SubmitSessionFeedbackInput {
  sessionId: string;
  actorRole: 'mentor' | 'student';
  rating: number; // 1 - 5
  feedback: string;
  sessionNotes?: string;
}

export class MentorshipSessionEngine {
  private store: AlumniDbStore;

  constructor(store: AlumniDbStore = alumniStore) {
    this.store = store;
  }

  public async submitMentorshipRequest(input: {
    institutionId: string;
    mentorshipProfileId: string;
    studentId: string;
    requestTopic: string;
    requestGoals: string;
    studentNotes?: string;
    compatibilityScore?: number;
  }): Promise<AlumniMentorshipRequestItem> {
    const mentor = await this.store.getMentorshipProfileById(input.mentorshipProfileId);
    if (!mentor) {
      throw new Error('Mentor profile not found.');
    }
    if (!mentor.isAcceptingRequests || mentor.activeMenteeCount >= mentor.maxActiveMentees) {
      throw new Error('Mentor is currently not accepting new mentorship requests.');
    }

    const reqId = `mreq_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const request: AlumniMentorshipRequestItem = {
      id: reqId,
      institutionId: input.institutionId,
      mentorshipProfileId: input.mentorshipProfileId,
      studentId: input.studentId,
      requestTopic: input.requestTopic,
      requestGoals: input.requestGoals,
      studentNotes: input.studentNotes,
      compatibilityScore: input.compatibilityScore || 0.85,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createMentorshipRequest(request);
    return request;
  }

  public async respondToRequest(
    requestId: string,
    response: 'accepted' | 'declined',
    responseNotes?: string
  ): Promise<AlumniMentorshipRequestItem> {
    const req = await this.store.getMentorshipRequestById(requestId);
    if (!req) {
      throw new Error('Mentorship request not found.');
    }
    if (req.status !== 'pending') {
      throw new Error(`Cannot respond to request in ${req.status} status.`);
    }

    const now = new Date().toISOString();
    const updated = await this.store.updateMentorshipRequest(requestId, {
      status: response,
      responseNotes,
      respondedAt: now,
    });

    if (response === 'accepted') {
      const mentor = await this.store.getMentorshipProfileById(req.mentorshipProfileId);
      if (mentor) {
        mentor.activeMenteeCount += 1;
        await this.store.createMentorshipProfile(mentor);
      }
    }

    return updated!;
  }

  public async scheduleSession(input: ScheduleSessionInput): Promise<AlumniMentorshipSessionItem> {
    const req = await this.store.getMentorshipRequestById(input.requestId);
    if (!req) {
      throw new Error('Mentorship request not found.');
    }
    if (req.status !== 'accepted') {
      throw new Error('Mentorship request must be accepted before scheduling a session.');
    }

    const sessId = `msess_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const meetingUrl = input.meetingUrl || `https://meet.thaiba.edu/session/${sessId.substring(6, 14)}`;

    const session: AlumniMentorshipSessionItem = {
      id: sessId,
      requestId: req.id,
      mentorshipProfileId: req.mentorshipProfileId,
      studentId: req.studentId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      meetingUrl,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createMentorshipSession(session);
    return session;
  }

  public async submitSessionFeedback(input: SubmitSessionFeedbackInput): Promise<AlumniMentorshipSessionItem> {
    const session = await this.store.getMentorshipSessionById(input.sessionId);
    if (!session) {
      throw new Error('Mentorship session not found.');
    }

    const updates: Partial<AlumniMentorshipSessionItem> = {};
    if (input.actorRole === 'mentor') {
      updates.mentorRating = input.rating;
      updates.mentorFeedback = input.feedback;
      if (input.sessionNotes) {
        updates.sessionNotes = input.sessionNotes;
      }
    } else {
      updates.studentRating = input.rating;
      updates.studentFeedback = input.feedback;
    }

    // Mark completed if feedback given
    updates.status = 'completed';
    updates.completedAt = new Date().toISOString();

    const updatedSession = await this.store.updateMentorshipSession(input.sessionId, updates);

    // Update mentor stats if student rated
    if (input.actorRole === 'student') {
      const mentor = await this.store.getMentorshipProfileById(session.mentorshipProfileId);
      if (mentor) {
        const totalReviews = mentor.totalReviewsCount + 1;
        const currentSum = mentor.averageRating * mentor.totalReviewsCount;
        const newAverage = Math.round(((currentSum + input.rating) / totalReviews) * 10) / 10;

        // Calculate session duration in hours
        const start = new Date(session.scheduledStart).getTime();
        const end = new Date(session.scheduledEnd).getTime();
        const durationHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));

        mentor.averageRating = newAverage;
        mentor.totalReviewsCount = totalReviews;
        mentor.totalHoursDelivered = Math.round((mentor.totalHoursDelivered + durationHours) * 10) / 10;
        await this.store.createMentorshipProfile(mentor);
      }
    }

    return updatedSession!;
  }

  public generateICalCalendarPayload(session: AlumniMentorshipSessionItem, topic: string): string {
    const cleanDate = (iso: string) => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ThaibaHive//Alumni Mentorship Mesh//EN',
      'BEGIN:VEVENT',
      `UID:${session.id}@thaiba.edu`,
      `DTSTAMP:${cleanDate(session.createdAt)}`,
      `DTSTART:${cleanDate(session.scheduledStart)}`,
      `DTEND:${cleanDate(session.scheduledEnd)}`,
      `SUMMARY:ThaibaHive Mentorship: ${topic}`,
      `DESCRIPTION:Virtual Mentorship Meeting URL: ${session.meetingUrl || 'N/A'}`,
      `URL:${session.meetingUrl || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}

export const mentorshipSessionEngine = new MentorshipSessionEngine();
