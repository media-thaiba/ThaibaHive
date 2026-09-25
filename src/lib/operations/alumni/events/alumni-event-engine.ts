import crypto from 'crypto';
import { AlumniDbStore, alumniStore } from '../../../../db/alumni-store';
import {
  AlumniEventItem,
  AlumniEventRsvpItem,
  AlumniEventType,
  EventFormat,
  EventPaymentStatus,
} from '../types';
import { TicketPassGenerator, ticketPassGenerator } from './ticket-pass-generator';

export interface CreateEventInput {
  institutionId: string;
  chapterId?: string | null;
  title: string;
  eventType?: AlumniEventType;
  format?: EventFormat;
  venue?: string | null;
  virtualMeetingUrl?: string | null;
  startDateTime: string;
  endDateTime: string;
  description: string;
  bannerUrl?: string | null;
  ticketPrice?: number;
  currency?: string;
  capacity?: number;
  organizerAlumniId?: string | null;
}

export interface RegisterEventRsvpInput {
  eventId: string;
  institutionId: string;
  alumniProfileId?: string | null;
  studentId?: string | null;
  attendeeName: string;
  attendeeEmail: string;
  paymentStatus?: EventPaymentStatus;
  amountPaid?: number;
}

export interface CheckInAttendeeInput {
  eventId: string;
  ticketPassHash: string;
  checkedInById?: string;
}

export class AlumniEventEngine {
  private store: AlumniDbStore;
  private passGenerator: TicketPassGenerator;

  constructor(
    store: AlumniDbStore = alumniStore,
    passGenerator: TicketPassGenerator = ticketPassGenerator
  ) {
    this.store = store;
    this.passGenerator = passGenerator;
  }

  public async createEvent(input: CreateEventInput): Promise<AlumniEventItem> {
    const eventId = `evt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const event: AlumniEventItem = {
      id: eventId,
      institutionId: input.institutionId,
      chapterId: input.chapterId,
      title: input.title,
      eventType: input.eventType || 'reunion',
      format: input.format || 'in_person',
      venue: input.venue,
      virtualMeetingUrl: input.virtualMeetingUrl,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      description: input.description,
      bannerUrl: input.bannerUrl,
      ticketPrice: input.ticketPrice || 0,
      currency: input.currency || 'INR',
      capacity: input.capacity || 100,
      registeredCount: 0,
      attendedCount: 0,
      status: 'published',
      organizerAlumniId: input.organizerAlumniId,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createEvent(event);
    return event;
  }

  public async registerRsvp(input: RegisterEventRsvpInput): Promise<AlumniEventRsvpItem> {
    const event = await this.store.getEventById(input.eventId, input.institutionId);
    if (!event) {
      throw new Error('Event not found.');
    }
    if (event.registeredCount >= event.capacity) {
      throw new Error('Event capacity has reached maximum limit.');
    }

    const rsvpId = `rsvp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const pass = this.passGenerator.generateTicketPass(input.eventId, input.attendeeEmail);

    const rsvp: AlumniEventRsvpItem = {
      id: rsvpId,
      eventId: input.eventId,
      alumniProfileId: input.alumniProfileId,
      studentId: input.studentId,
      attendeeName: input.attendeeName,
      attendeeEmail: input.attendeeEmail,
      ticketNumber: pass.ticketNumber,
      ticketPassQr: pass.qrPayload,
      ticketPassHash: pass.ticketPassHash,
      paymentStatus: input.paymentStatus || (event.ticketPrice > 0 ? 'paid' : 'free'),
      amountPaid: input.amountPaid || event.ticketPrice,
      isCheckedIn: false,
      rsvpStatus: 'confirmed',
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createEventRsvp(rsvp);
    return rsvp;
  }

  public async checkInAttendee(input: CheckInAttendeeInput): Promise<{
    success: boolean;
    rsvp: AlumniEventRsvpItem;
    message: string;
  }> {
    const rsvp = await this.store.getEventRsvpByTicketHash(input.ticketPassHash);
    if (!rsvp || rsvp.eventId !== input.eventId) {
      throw new Error('Invalid or unverified ticket pass.');
    }
    if (rsvp.isCheckedIn) {
      return {
        success: false,
        rsvp,
        message: `Attendee ${rsvp.attendeeName} already checked in at ${rsvp.checkedInAt}.`,
      };
    }

    const now = new Date().toISOString();
    const updated = await this.store.updateEventRsvp(rsvp.id, {
      isCheckedIn: true,
      checkedInAt: now,
      checkedInById: input.checkedInById,
    });

    return {
      success: true,
      rsvp: updated!,
      message: `Successfully checked in ${rsvp.attendeeName} for ticket ${rsvp.ticketNumber}.`,
    };
  }
}

export const alumniEventEngine = new AlumniEventEngine();
