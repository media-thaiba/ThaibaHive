import { AttendanceOutbox } from '@/lib/operations/biometrics/attendance-outbox';
import { AttendanceRecord } from '@/lib/operations/biometrics/biometric-types';

describe('AIMS-012 — AttendanceOutbox', () => {
  it('should buffer attendance records with tamper-proof HMAC verification', () => {
    const outbox = new AttendanceOutbox('secret_test_key_001');

    const record: AttendanceRecord = {
      id: 'rec_101',
      userId: 'user_std_45',
      sessionId: 'sesh_1',
      campusId: 'campus_main',
      locationName: 'North Gate',
      timestamp: new Date().toISOString(),
      verificationMethod: 'EDGE_NEURAL_ZKP',
      syncStatus: 'LOCAL_BUFFERED',
      institutionId: 'inst_001',
    };

    const item = outbox.enqueue(record);
    expect(outbox.size()).toBe(1);
    expect(outbox.verifyItemIntegrity(item)).toBe(true);

    // Tampered record
    item.record.userId = 'user_impostor_99';
    expect(outbox.verifyItemIntegrity(item)).toBe(false);
  });
});
