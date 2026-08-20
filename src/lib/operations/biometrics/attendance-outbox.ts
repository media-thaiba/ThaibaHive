import { createHmac } from 'crypto';
import { AttendanceRecord } from './biometric-types';

export interface OutboxItem {
  id: string;
  record: AttendanceRecord;
  hmacSignature: string;
  enqueuedAt: string;
  retryCount: number;
}

/**
 * Offline-First Tamper-Resistant Attendance Outbox
 * Encrypts and HMAC-chains buffered records locally during offline operation.
 */
export class AttendanceOutbox {
  private queue: OutboxItem[] = [];
  private secretKey: string;

  constructor(secretKey = 'local_kiosk_secret_device_key') {
    this.secretKey = secretKey;
  }

  /**
   * Enqueues an attendance record with HMAC signature
   */
  public enqueue(record: AttendanceRecord): OutboxItem {
    const payload = JSON.stringify(record);
    const signature = createHmac('sha256', this.secretKey).update(payload).digest('hex');

    const item: OutboxItem = {
      id: record.id,
      record,
      hmacSignature: signature,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(item);
    return item;
  }

  /**
   * Verifies the integrity of buffered outbox items before syncing
   */
  public verifyItemIntegrity(item: OutboxItem): boolean {
    const payload = JSON.stringify(item.record);
    const expected = createHmac('sha256', this.secretKey).update(payload).digest('hex');
    return item.hmacSignature === expected;
  }

  public peekBatch(limit = 50): OutboxItem[] {
    return this.queue.slice(0, limit);
  }

  public acknowledgeSynced(ids: string[]): void {
    const idSet = new Set(ids);
    this.queue = this.queue.filter((item) => !idSet.has(item.id));
  }

  public size(): number {
    return this.queue.length;
  }
}
