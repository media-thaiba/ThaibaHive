export interface GradeScaleRule {
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  gpa: number;
  description?: string;
}

export interface SubjectMarksInput {
  marksObtained: number | null;
  maxMarks: number;
  passMarks: number;
  isAbsent?: boolean;
  creditWeight?: number;
}

export interface SubjectResultOutput {
  percentage: number;
  letterGrade: string;
  gpa: number;
  isPass: boolean;
  isAbsent: boolean;
  description: string;
}

export interface TabulationSummaryOutput {
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  gpa: number;
  letterGrade: string;
  resultStatus: "pass" | "fail" | "compartment" | "pending";
  failedSubjectsCount: number;
}

export const DEFAULT_GRADE_SCALE_RULES: GradeScaleRule[] = [
  { minPercentage: 90, maxPercentage: 100, grade: "O", gpa: 10.0, description: "Outstanding" },
  { minPercentage: 80, maxPercentage: 89.999, grade: "A+", gpa: 9.0, description: "Excellent" },
  { minPercentage: 70, maxPercentage: 79.999, grade: "A", gpa: 8.0, description: "Very Good" },
  { minPercentage: 60, maxPercentage: 69.999, grade: "B+", gpa: 7.0, description: "Good" },
  { minPercentage: 50, maxPercentage: 59.999, grade: "B", gpa: 6.0, description: "Above Average" },
  { minPercentage: 40, maxPercentage: 49.999, grade: "C", gpa: 5.0, description: "Average / Pass" },
  { minPercentage: 0, maxPercentage: 39.999, grade: "F", gpa: 0.0, description: "Fail" },
];

/**
 * Calculates letter grade, GPA point, and description for a given percentage score.
 */
export function calculateGrade(
  percentage: number,
  rules: GradeScaleRule[] = DEFAULT_GRADE_SCALE_RULES
): { letterGrade: string; gpa: number; description: string } {
  const roundedPercentage = Math.round(percentage * 100) / 100;
  
  const matchedRule = rules.find(
    (r) => roundedPercentage >= r.minPercentage && roundedPercentage <= r.maxPercentage
  );

  if (matchedRule) {
    return {
      letterGrade: matchedRule.grade,
      gpa: matchedRule.gpa,
      description: matchedRule.description || matchedRule.grade,
    };
  }

  // Fallback for scores below lowest bound
  if (roundedPercentage < (rules[rules.length - 1]?.minPercentage ?? 40)) {
    return { letterGrade: "F", gpa: 0.0, description: "Fail" };
  }

  return { letterGrade: "O", gpa: 10.0, description: "Outstanding" };
}

/**
 * Calculates detailed result metrics for an individual subject mark entry.
 */
export function calculateSubjectResult(
  marksInput: SubjectMarksInput,
  rules: GradeScaleRule[] = DEFAULT_GRADE_SCALE_RULES
): SubjectResultOutput {
  if (marksInput.isAbsent || marksInput.marksObtained === null || marksInput.marksObtained === undefined) {
    return {
      percentage: 0,
      letterGrade: "F",
      gpa: 0.0,
      isPass: false,
      isAbsent: true,
      description: "Absent",
    };
  }

  const marks = Math.max(0, Math.min(marksInput.marksObtained, marksInput.maxMarks));
  const percentage = marksInput.maxMarks > 0 ? (marks / marksInput.maxMarks) * 100 : 0;
  const gradeInfo = calculateGrade(percentage, rules);
  const isPass = marks >= marksInput.passMarks && percentage >= 40;

  return {
    percentage: Math.round(percentage * 100) / 100,
    letterGrade: isPass ? gradeInfo.letterGrade : "F",
    gpa: isPass ? gradeInfo.gpa : 0.0,
    isPass,
    isAbsent: false,
    description: isPass ? gradeInfo.description : "Fail",
  };
}

/**
 * Calculates overall tabulation summary (Total Marks, Percentage, SGPA/GPA, Result Status).
 */
export function calculateStudentTabulation(
  subjects: SubjectMarksInput[],
  rules: GradeScaleRule[] = DEFAULT_GRADE_SCALE_RULES
): TabulationSummaryOutput {
  if (!subjects || subjects.length === 0) {
    return {
      totalMarks: 0,
      totalMaxMarks: 0,
      percentage: 0,
      gpa: 0,
      letterGrade: "F",
      resultStatus: "pending",
      failedSubjectsCount: 0,
    };
  }

  let totalObtained = 0;
  let totalMax = 0;
  let weightedGpaSum = 0;
  let totalCredits = 0;
  let failedCount = 0;
  let hasPending = false;

  for (const sub of subjects) {
    if (sub.marksObtained === null || sub.marksObtained === undefined) {
      if (!sub.isAbsent) {
        hasPending = true;
      }
    }

    const subResult = calculateSubjectResult(sub, rules);
    const weight = sub.creditWeight || 1;

    totalObtained += sub.isAbsent ? 0 : (sub.marksObtained || 0);
    totalMax += sub.maxMarks;
    weightedGpaSum += subResult.gpa * weight;
    totalCredits += weight;

    if (!subResult.isPass) {
      failedCount++;
    }
  }

  if (hasPending) {
    return {
      totalMarks: totalObtained,
      totalMaxMarks: totalMax,
      percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
      gpa: 0,
      letterGrade: "F",
      resultStatus: "pending",
      failedSubjectsCount: failedCount,
    };
  }

  const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
  const overallGpa = totalCredits > 0 ? Math.round((weightedGpaSum / totalCredits) * 100) / 100 : 0;
  const overallGradeInfo = calculateGrade(overallPercentage, rules);

  let resultStatus: "pass" | "fail" | "compartment" = "pass";
  if (failedCount === 1) {
    resultStatus = "compartment";
  } else if (failedCount > 1) {
    resultStatus = "fail";
  }

  return {
    totalMarks: Math.round(totalObtained * 100) / 100,
    totalMaxMarks: totalMax,
    percentage: overallPercentage,
    gpa: overallGpa,
    letterGrade: resultStatus === "pass" ? overallGradeInfo.letterGrade : "F",
    resultStatus,
    failedSubjectsCount: failedCount,
  };
}
