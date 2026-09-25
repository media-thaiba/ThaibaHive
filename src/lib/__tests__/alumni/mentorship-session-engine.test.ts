import { AlumniDbStore } from '../../../db/alumni-store';
import { MentorshipSessionEngine } from '../../operations/alumni/mentorship/mentorship-session-engine';
import { AlumniProfileItem, AlumniMentorshipProfileItem } from '../../operations/alumni/types';

describe('Mentorship Session Engine & Feedback Mesh (Sprint-058 - ALUM-006)', () => {
  let store: AlumniDbStore;
  let engine: MentorshipSessionEngine;
  const instId = 'inst_campus_sess';

  beforeEach(async () => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new MentorshipSessionEngine(store);

    const alum: AlumniProfileItem = {
      id: 'alum_sess_mentor',
      institutionId: instId,
      firstName: 'Dr. Tariq',
      lastName: 'Aziz',
      email: 'tariq.aziz@cyber.com',
      graduationBatchYear: 2017,
      primaryDegree: 'B.Tech IT',
      primaryDepartment: 'Information Technology',
      isVerified: true,
      isMentor: true,
      isHiring: false,
      privacyConsentLevel: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCompany: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createAlumniProfile(alum);

    const mentor: AlumniMentorshipProfileItem = {
      id: 'mentor_prof_sess',
      alumniProfileId: 'alum_sess_mentor',
      institutionId: instId,
      expertiseAreas: JSON.stringify(['Cybersecurity', 'Cloud Security']),
      targetMenteeTypes: 'all',
      maxActiveMentees: 2,
      activeMenteeCount: 0,
      availabilityHoursPerMonth: 4,
      meetingType: 'virtual',
      averageRating: 4.8,
      totalReviewsCount: 5,
      totalHoursDelivered: 10,
      isAcceptingRequests: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.createMentorshipProfile(mentor);
  });

  it('should complete the full mentorship request, scheduling, and feedback rating flow', async () => {
    // 1. Submit Request
    const req = await engine.submitMentorshipRequest({
      institutionId: instId,
      mentorshipProfileId: 'mentor_prof_sess',
      studentId: 'std_sess_99',
      requestTopic: 'Penetration Testing Roadmap',
      requestGoals: 'Guidance on OSCP certification',
    });
    expect(req.status).toBe('pending');

    // 2. Mentor Responds
    const acceptedReq = await engine.respondToRequest(req.id, 'accepted', 'Glad to help!');
    expect(acceptedReq.status).toBe('accepted');

    const mentorAfterAccept = await store.getMentorshipProfileById('mentor_prof_sess');
    expect(mentorAfterAccept?.activeMenteeCount).toBe(1);

    // 3. Schedule Session
    const session = await engine.scheduleSession({
      requestId: req.id,
      scheduledStart: '2026-09-01T10:00:00.000Z',
      scheduledEnd: '2026-09-01T11:00:00.000Z',
    });
    expect(session.status).toBe('scheduled');
    expect(session.meetingUrl).toContain('https://meet.thaiba.edu/session/');

    // 4. Calendar iCal generation
    const ical = engine.generateICalCalendarPayload(session, req.requestTopic);
    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('SUMMARY:ThaibaHive Mentorship: Penetration Testing Roadmap');

    // 5. Submit Feedback & Rating
    const finishedSession = await engine.submitSessionFeedback({
      sessionId: session.id,
      actorRole: 'student',
      rating: 5,
      feedback: 'Incredible session with actionable advice!',
    });
    expect(finishedSession.status).toBe('completed');
    expect(finishedSession.studentRating).toBe(5);

    // Mentor average rating & delivered hours should update
    const mentorAfterSession = await store.getMentorshipProfileById('mentor_prof_sess');
    expect(mentorAfterSession?.totalReviewsCount).toBe(6);
    expect(mentorAfterSession?.totalHoursDelivered).toBe(11);
    expect(mentorAfterSession?.averageRating).toBeGreaterThanOrEqual(4.8);
  });
});
