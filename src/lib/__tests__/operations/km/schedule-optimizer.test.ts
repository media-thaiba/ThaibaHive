import { scheduleOptimizer } from '@/lib/operations/km/advising/schedule-optimizer';

describe('Course Schedule Optimizer (KM-009)', () => {
  it('should generate topologically valid multi-semester schedules', () => {
    // Missing CS-102, CS-301, CS-401; completed CS-101
    const missing = ['CS-102', 'CS-301', 'CS-401'];
    const completed = ['CS-101'];

    const schedule = scheduleOptimizer.generateOptimalSchedule(missing, completed, {
      maxCreditsPerTerm: 8,
    });

    expect(schedule.length).toBeGreaterThan(0);
    // Term 1 should take CS-102 first
    expect(schedule[0].courses.some((c) => c.courseCode === 'CS-102')).toBe(true);
    // Term 2 should take CS-301 after CS-102 is completed
    expect(schedule[1].courses.some((c) => c.courseCode === 'CS-301')).toBe(true);
  });
});
