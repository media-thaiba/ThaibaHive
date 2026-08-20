import { EdgeVerificationEngine } from '@/lib/operations/biometrics/edge-verification-engine';
import { NeuralBiometricMatcher } from '@/lib/operations/biometrics/neural-biometric-matcher';
import { BiometricEmbedding } from '@/lib/operations/biometrics/biometric-types';

describe('AIMS-010 — EdgeVerificationEngine', () => {
  it('should verify local attendance and formulate valid attendance records in < 50ms', () => {
    const matcher = new NeuralBiometricMatcher();
    const template: BiometricEmbedding = {
      templateId: 'tmpl_staff_99',
      userId: 'staff_user_99',
      dimension: 128,
      vector: Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.2)),
      enrolledAt: new Date().toISOString(),
      institutionId: 'inst_001',
    };
    matcher.registerTemplate(template);

    const engine = new EdgeVerificationEngine(matcher);

    const res = engine.verifyAttendance({
      campusId: 'campus_main',
      locationName: 'Main Gate Kiosk 1',
      sessionId: 'morning_shift_0800',
      queryEmbedding: [...template.vector],
      institutionId: 'inst_001',
    });

    expect(res.success).toBe(true);
    expect(res.record?.userId).toBe('staff_user_99');
    expect(res.record?.verificationMethod).toBe('EDGE_NEURAL_ZKP');
    expect(res.latencyMs).toBeLessThan(50);
  });
});
