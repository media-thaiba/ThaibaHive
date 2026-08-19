import { IndexAnalyzer } from '../database/index-analyzer';
import { IndexAutoTuner } from '../database/index-auto-tuner';
import { IndexRecommendation } from '../database/types';

describe('Database Index Auto-Tuning Safety Guards', () => {
  const analyzer = new IndexAnalyzer();
  const tuner = new IndexAutoTuner();

  it('should analyze scan stats and generate non-blocking CONCURRENTLY recommendations', () => {
    const stats = [
      { tableName: 'student_attendance', seqScans: 2500, idxScans: 10, totalRows: 120000 },
    ];

    const recommendations = analyzer.analyzeTableStats(stats);
    expect(recommendations).toHaveLength(1);

    const rec = recommendations[0];
    expect(rec.tableName).toBe('student_attendance');
    expect(rec.indexDdl).toContain('CONCURRENTLY');
    expect(rec.riskLevel).toBe('MEDIUM');
  });

  it('should enforce CONCURRENTLY safety guard check before execution', async () => {
    const unsafeRec: IndexRecommendation = {
      id: 'rec-unsafe-1',
      tableName: 'staff',
      recommendedIndexName: 'idx_unsafe',
      indexDdl: 'CREATE INDEX idx_unsafe ON staff (email)', // Missing CONCURRENTLY
      seqScans: 500,
      estTimeSavingsMs: 100,
      riskLevel: 'LOW',
      status: 'RECOMMENDED',
      createdAt: new Date().toISOString(),
    };

    await expect(tuner.executeIndexRecommendation(unsafeRec)).rejects.toThrow('Safety Guard Rejected DDL: Index DDL must explicitly specify CONCURRENTLY');
  });
});
