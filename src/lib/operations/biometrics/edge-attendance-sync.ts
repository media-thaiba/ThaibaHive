import { AttendanceOutbox } from './attendance-outbox';
import { AttendanceRecord } from './biometric-types';

export interface SyncReport {
  syncedCount: number;
  failedCount: number;
  remainingQueueSize: number;
  syncedRecordIds: string[];
  syncCompletedAt: string;
}

/**
 * Edge Attendance Synchronization Pipeline
 * Synchronizes buffered offline outbox records with the central database on reconnection.
 */
export class EdgeAttendanceSync {
  private outbox: AttendanceOutbox;
  private isOnline = false;

  constructor(outbox?: AttendanceOutbox) {
    this.outbox = outbox || new AttendanceOutbox();
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  public getOutbox(): AttendanceOutbox {
    return this.outbox;
  }

  /**
   * Dispatches pending batch to central receiver if online
   */
  public async syncBatch(
    remoteSink: (records: AttendanceRecord[]) => Promise<{ acknowledgedIds: string[] }>
  ): Promise<SyncReport> {
    if (!this.isOnline || this.outbox.size() === 0) {
      return {
        syncedCount: 0,
        failedCount: 0,
        remainingQueueSize: this.outbox.size(),
        syncedRecordIds: [],
        syncCompletedAt: new Date().toISOString(),
      };
    }

    const batch = this.outbox.peekBatch(100);
    const validRecords: AttendanceRecord[] = [];

    for (const item of batch) {
      if (this.outbox.verifyItemIntegrity(item)) {
        validRecords.push({
          ...item.record,
          syncStatus: 'SYNCED',
        });
      }
    }

    try {
      const response = await remoteSink(validRecords);
      this.outbox.acknowledgeSynced(response.acknowledgedIds);

      return {
        syncedCount: response.acknowledgedIds.length,
        failedCount: batch.length - response.acknowledgedIds.length,
        remainingQueueSize: this.outbox.size(),
        syncedRecordIds: response.acknowledgedIds,
        syncCompletedAt: new Date().toISOString(),
      };
    } catch {
      return {
        syncedCount: 0,
        failedCount: batch.length,
        remainingQueueSize: this.outbox.size(),
        syncedRecordIds: [],
        syncCompletedAt: new Date().toISOString(),
      };
    }
  }
}
