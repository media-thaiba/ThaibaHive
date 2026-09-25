import { AuditCourseRecord } from './audit-types';

export class RequirementEvaluator {
  private gradePointMap: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  };

  public getGradePoints(grade: string): number {
    return this.gradePointMap[grade.toUpperCase()] ?? 0.0;
  }

  public isPassingGrade(grade: string, minGrade: string = 'D'): boolean {
    const earnedPoints = this.getGradePoints(grade);
    const requiredPoints = this.getGradePoints(minGrade);
    return earnedPoints >= requiredPoints && grade.toUpperCase() !== 'F';
  }

  public calculateGpa(courses: AuditCourseRecord[]): { gpa: number; totalCredits: number; totalQualityPoints: number } {
    let totalCredits = 0;
    let totalQualityPoints = 0;

    for (const c of courses) {
      if (c.status === 'completed' || c.status === 'transferred') {
        const pts = this.getGradePoints(c.grade);
        totalCredits += c.credits;
        totalQualityPoints += pts * c.credits;
      }
    }

    const gpa = totalCredits > 0 ? Math.round((totalQualityPoints / totalCredits) * 100) / 100 : 0.0;
    return { gpa, totalCredits, totalQualityPoints };
  }
}
