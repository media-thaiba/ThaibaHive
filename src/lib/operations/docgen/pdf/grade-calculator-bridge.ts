export interface SubjectScoreInput {
  subjectName: string;
  subjectCode?: string;
  maxMarks: number;
  marksObtained: number;
  credits?: number;
  remarks?: string;
}

export interface ComputedSubjectScore extends SubjectScoreInput {
  percentage: number;
  gradeLetter: string;
  gradePoint: number;
}

export interface ComputedAcademicSummary {
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  gpa: number; // 4.0 scale
  cgpa: number; // 10.0 scale
  resultStatus: 'DISTINCTION' | 'FIRST_CLASS' | 'SECOND_CLASS' | 'PASS' | 'FAILED';
  hasFailedSubject: boolean;
  computedSubjects: ComputedSubjectScore[];
}

export class GradeCalculatorBridge {
  public static calculateGrade(marksObtained: number, maxMarks: number): { letter: string; point4: number; point10: number } {
    if (maxMarks <= 0) return { letter: 'F', point4: 0.0, point10: 0.0 };
    const pct = (marksObtained / maxMarks) * 100;

    if (pct >= 90) return { letter: 'A+', point4: 4.0, point10: 10.0 };
    if (pct >= 80) return { letter: 'A', point4: 3.7, point10: 9.0 };
    if (pct >= 70) return { letter: 'B+', point4: 3.3, point10: 8.0 };
    if (pct >= 60) return { letter: 'B', point4: 3.0, point10: 7.0 };
    if (pct >= 50) return { letter: 'C', point4: 2.0, point10: 6.0 };
    if (pct >= 40) return { letter: 'D', point4: 1.0, point10: 4.0 };
    return { letter: 'F', point4: 0.0, point10: 0.0 };
  }

  public static computeSummary(subjects: SubjectScoreInput[]): ComputedAcademicSummary {
    let totalMaxMarks = 0;
    let totalMarksObtained = 0;
    let weightedPoints4 = 0;
    let weightedPoints10 = 0;
    let totalCredits = 0;
    let hasFailedSubject = false;

    const computedSubjects: ComputedSubjectScore[] = subjects.map((sub) => {
      const { letter, point4, point10 } = this.calculateGrade(sub.marksObtained, sub.maxMarks);
      const pct = sub.maxMarks > 0 ? (sub.marksObtained / sub.maxMarks) * 100 : 0;
      const credits = sub.credits || 1;

      if (letter === 'F' || pct < 40) {
        hasFailedSubject = true;
      }

      totalMaxMarks += sub.maxMarks;
      totalMarksObtained += sub.marksObtained;
      weightedPoints4 += point4 * credits;
      weightedPoints10 += point10 * credits;
      totalCredits += credits;

      return {
        ...sub,
        percentage: Number(pct.toFixed(1)),
        gradeLetter: letter,
        gradePoint: point4,
        remarks: sub.remarks || (letter === 'F' ? 'Needs Improvement' : 'Satisfactory'),
      };
    });

    const overallPct = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    const gpa = totalCredits > 0 ? weightedPoints4 / totalCredits : 0;
    const cgpa = totalCredits > 0 ? weightedPoints10 / totalCredits : 0;

    let resultStatus: ComputedAcademicSummary['resultStatus'] = 'FAILED';
    if (!hasFailedSubject) {
      if (overallPct >= 85) resultStatus = 'DISTINCTION';
      else if (overallPct >= 65) resultStatus = 'FIRST_CLASS';
      else if (overallPct >= 50) resultStatus = 'SECOND_CLASS';
      else resultStatus = 'PASS';
    }

    return {
      totalMaxMarks,
      totalMarksObtained,
      percentage: Number(overallPct.toFixed(1)),
      gpa: Number(gpa.toFixed(2)),
      cgpa: Number(cgpa.toFixed(2)),
      resultStatus,
      hasFailedSubject,
      computedSubjects,
    };
  }
}
