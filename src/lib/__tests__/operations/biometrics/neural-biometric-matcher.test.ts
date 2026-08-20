import { NeuralBiometricMatcher } from '@/lib/operations/biometrics/neural-biometric-matcher';
import { BiometricEmbedding } from '@/lib/operations/biometrics/biometric-types';

describe('AIMS-010 — NeuralBiometricMatcher', () => {
  it('should match identical and close embeddings with cosine similarity > 0.9', () => {
    const matcher = new NeuralBiometricMatcher();

    const template: BiometricEmbedding = {
      templateId: 'tmpl_student_01',
      userId: 'user_std_01',
      dimension: 128,
      vector: Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1)),
      enrolledAt: new Date().toISOString(),
      institutionId: 'inst_001',
    };
    matcher.registerTemplate(template);

    // Query with slight noise (0.01 delta)
    const queryVector = template.vector.map((v) => v + (Math.random() - 0.5) * 0.02);
    const result = matcher.matchEmbedding(queryVector);

    expect(result.matched).toBe(true);
    expect(result.userId).toBe('user_std_01');
    expect(result.similarityScore).toBeGreaterThan(0.95);
    expect(result.matchingDurationMs).toBeLessThan(50);
  });
});
