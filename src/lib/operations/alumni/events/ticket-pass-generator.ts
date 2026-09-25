import crypto from 'crypto';

export interface GeneratedEventPass {
  ticketNumber: string;
  ticketPassHash: string;
  qrPayload: string;
}

export class TicketPassGenerator {
  private secretKey: string;

  constructor(secretKey: string = process.env.EVENT_TICKET_KEY || 'thaiba_event_pass_secret_2026') {
    this.secretKey = secretKey;
  }

  public generateTicketPass(eventId: string, attendeeEmail: string, timestamp: Date = new Date()): GeneratedEventPass {
    const year = timestamp.getFullYear();
    const shortEvent = eventId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticketNumber = `TKT-${year}-${shortEvent}-${randomSuffix}`;

    const raw = `${ticketNumber}|${eventId}|${attendeeEmail}|${this.secretKey}`;
    const ticketPassHash = crypto.createHash('sha256').update(raw).digest('hex');

    const qrPayload = JSON.stringify({
      ticketNumber,
      eventId,
      attendeeEmail,
      hash: ticketPassHash.substring(0, 16),
      verificationEndpoint: `/api/alumni/events/checkin`,
    });

    return {
      ticketNumber,
      ticketPassHash,
      qrPayload,
    };
  }

  public verifyTicketPass(ticketNumber: string, eventId: string, attendeeEmail: string, ticketPassHash: string): boolean {
    const raw = `${ticketNumber}|${eventId}|${attendeeEmail}|${this.secretKey}`;
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    return expected === ticketPassHash;
  }
}

export const ticketPassGenerator = new TicketPassGenerator();
