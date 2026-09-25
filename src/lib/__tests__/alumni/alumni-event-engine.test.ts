import { AlumniDbStore } from '../../../db/alumni-store';
import { AlumniEventEngine } from '../../operations/alumni/events/alumni-event-engine';

describe('Alumni Event Management & QR Check-In Engine (Sprint-058 - ALUM-012)', () => {
  let store: AlumniDbStore;
  let engine: AlumniEventEngine;
  const instId = 'inst_campus_evt';

  beforeEach(() => {
    store = AlumniDbStore.getInstance();
    store.clearMemoryStore();
    engine = new AlumniEventEngine(store);
  });

  it('should create an event, register RSVP with ticket pass, and successfully check in attendee with duplicate prevention', async () => {
    const event = await engine.createEvent({
      institutionId: instId,
      title: 'Thaiba Global Alumni Reunion 2026',
      eventType: 'reunion',
      format: 'in_person',
      venue: 'Main Campus Grand Auditorium',
      startDateTime: '2026-12-20T09:00:00.000Z',
      endDateTime: '2026-12-20T18:00:00.000Z',
      description: 'Annual homecoming and networking summit',
      capacity: 500,
    });

    expect(event.status).toBe('published');
    expect(event.registeredCount).toBe(0);

    // Register RSVP
    const rsvp = await engine.registerRsvp({
      eventId: event.id,
      institutionId: instId,
      attendeeName: 'Yusuf Pathan',
      attendeeEmail: 'yusuf.pathan@example.com',
    });

    expect(rsvp.ticketNumber).toBeDefined();
    expect(rsvp.ticketPassQr).toContain('TKT-');
    expect(rsvp.isCheckedIn).toBe(false);

    // Verify event registeredCount updated
    const eventAfterRsvp = await store.getEventById(event.id, instId);
    expect(eventAfterRsvp?.registeredCount).toBe(1);

    // Check In Attendee via ticketPassHash
    const checkInResult = await engine.checkInAttendee({
      eventId: event.id,
      ticketPassHash: rsvp.ticketPassHash,
      checkedInById: 'staff_gate_officer',
    });

    expect(checkInResult.success).toBe(true);
    expect(checkInResult.rsvp.isCheckedIn).toBe(true);

    const eventAfterCheckIn = await store.getEventById(event.id, instId);
    expect(eventAfterCheckIn?.attendedCount).toBe(1);

    // Repeat check-in attempt must be prevented
    const duplicateCheckIn = await engine.checkInAttendee({
      eventId: event.id,
      ticketPassHash: rsvp.ticketPassHash,
    });
    expect(duplicateCheckIn.success).toBe(false);
    expect(duplicateCheckIn.message).toContain('already checked in');
  });
});
