import crypto from 'crypto';

export interface GeneratedEventPass {
  ticketNumber: string;
  ticketPassHash: string;
  qrPayload: string;
}

export class TicketPassGenerator {
  private customSecretKey?: string;

  constructor(secretKey?: string) {
    this.customSecretKey = secretKey;
  }

  private getSecretKey(): string {
    const resolved = this.customSecretKey || process.env.EVENT_TICKET_KEY || process.env.AUTH_JWT_SECRET;
    if (!resolved) {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error('EVENT_TICKET_KEY must be configured in environment');
      }
      return process.env.NODE_ENV === 'test' ? 'test-event-ticket-secret-key-32' : 'dev-event-ticket-secret-key-32';
    }
    return resolved;
  }

  public generateTicketPass(eventId: string, attendeeEmail: string, timestamp: Date = new Date()): GeneratedEventPass {
    const year = timestamp.getFullYear();
    const shortEvent = eventId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticketNumber = `TKT-${year}-${shortEvent}-${randomSuffix}`;

    const raw = `${ticketNumber}|${eventId}|${attendeeEmail}|${this.getSecretKey()}`;
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
    const raw = `${ticketNumber}|${eventId}|${attendeeEmail}|${this.getSecretKey()}`;
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    return expected === ticketPassHash;
  }
}

export const ticketPassGenerator = new TicketPassGenerator();
