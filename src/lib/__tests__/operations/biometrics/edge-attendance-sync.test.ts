import { EdgeAttendanceSync } from '@/lib/operations/biometrics/edge-attendance-sync';
import { AttendanceOutbox } from '@/lib/operations/biometrics/attendance-outbox';
import { AttendanceRecord } from '@/lib/operations/biometrics/biometric-types';

describe('AIMS-012 — EdgeAttendanceSync', () => {
  it('should sync buffered records when device comes online', async () => {
    const outbox = new AttendanceOutbox();
    const sync = new EdgeAttendanceSync(outbox);

    const record: AttendanceRecord = {
      id: 'rec_sync_1',
      userId: 'user_std_88',
      sessionId: 'sesh_math',
      campusId: 'campus_main',
      locationName: 'Math Dept',
      timestamp: new Date().toISOString(),
      verificationMethod: 'EDGE_NEURAL_ZKP',
      syncStatus: 'LOCAL_BUFFERED',
      institutionId: 'inst_001',
    };
    outbox.enqueue(record);
    expect(outbox.size()).toBe(1);

    // Offline: Should not sync
    sync.setOnlineStatus(false);
    const offlineReport = await sync.syncBatch(async () => ({ acknowledgedIds: ['rec_sync_1'] }));
    expect(offlineReport.syncedCount).toBe(0);
    expect(outbox.size()).toBe(1);

    // Online: Should sync and acknowledge
    sync.setOnlineStatus(true);
    const onlineReport = await sync.syncBatch(async (records) => ({
      acknowledgedIds: records.map((r) => r.id),
    }));
    expect(onlineReport.syncedCount).toBe(1);
    expect(outbox.size()).toBe(0);
  });
});
