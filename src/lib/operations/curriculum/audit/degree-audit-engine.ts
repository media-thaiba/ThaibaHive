import { createHash } from 'crypto';
import { CurriculumCourseDto, CurriculumProgramDto } from '../curriculum-types';
import { AuditCourseRecord, DegreeAuditReport, RequirementCategoryStatus } from './audit-types';
import { RequirementEvaluator } from './requirement-evaluator';

export class DegreeAuditEngine {
  private evaluator: RequirementEvaluator = new RequirementEvaluator();

  /**
   * Executes a deterministic degree audit for a student
   */
  public executeAudit(
    studentId: string,
    program: CurriculumProgramDto,
    catalogCourses: CurriculumCourseDto[],
    studentTranscript: AuditCourseRecord[],
    inProgressCourseCodes: string[] = []
  ): DegreeAuditReport {
    const transcriptMap = new Map<string, AuditCourseRecord>();
    for (const rec of studentTranscript) {
      transcriptMap.set(rec.courseCode.toUpperCase(), rec);
    }

    const inProgressSet = new Set(inProgressCourseCodes.map((c) => c.toUpperCase()));

    // Categorize catalog courses
    const majorCoreCourses = catalogCourses.filter((c) => c.courseType === 'major_core');
    const majorElectiveCourses = catalogCourses.filter((c) => c.courseType === 'major_elective');
    const genEdCourses = catalogCourses.filter((c) => c.courseType === 'gen_ed');

    // 1. Evaluate Major Core
    const majorCoreRecord = this.evaluateCategory(
      'major_core',
      'Major Core Requirements',
      majorCoreCourses,
      transcriptMap,
      inProgressSet
    );

    // 2. Evaluate Major Electives (e.g. at least 12 credits)
    const requiredElectiveCredits = 12;
    const majorElectiveRecord = this.evaluateElectiveCategory(
      'major_elective',
      'Major Technical Electives',
      requiredElectiveCredits,
      majorElectiveCourses,
      transcriptMap,
      inProgressSet
    );

    // 3. Evaluate General Education (e.g. at least 30 credits)
    const requiredGenEdCredits = 30;
    const genEdRecord = this.evaluateElectiveCategory(
      'gen_ed',
      'General Education Breadth',
      requiredGenEdCredits,
      genEdCourses,
      transcriptMap,
      inProgressSet
    );

    // 4. Evaluate GPA and Residency
    const { gpa: cumulativeGpa } = this.evaluator.calculateGpa(studentTranscript);
    const majorCoursesTaken = studentTranscript.filter((c) =>
      majorCoreCourses.some((mc) => mc.courseCode.toUpperCase() === c.courseCode.toUpperCase())
    );
    const { gpa: majorGpa } = this.evaluator.calculateGpa(majorCoursesTaken);

    const isGpaSatisfied = cumulativeGpa >= program.minimumGpa;
    const totalEarnedCredits = studentTranscript
      .filter((c) => c.status === 'completed' || c.status === 'transferred')
      .reduce((sum, c) => sum + c.credits, 0);

    const totalInProgressCredits = studentTranscript
      .filter((c) => c.status === 'in_progress')
      .reduce((sum, c) => sum + c.credits, 0) + inProgressCourseCodes.length * 3;

    const residencyCredits = studentTranscript
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + c.credits, 0);
    const isResidencySatisfied = residencyCredits >= 30;

    const categories: RequirementCategoryStatus[] = [
      majorCoreRecord,
      majorElectiveRecord,
      genEdRecord,
      {
        categoryType: 'residency',
        categoryTitle: 'Institutional Residency Requirement (Min 30 credits)',
        requiredCredits: 30,
        earnedCredits: residencyCredits,
        inProgressCredits: 0,
        isSatisfied: isResidencySatisfied,
        courses: [],
        missingCourseCodes: [],
        deficits: isResidencySatisfied ? [] : [`Must complete ${30 - residencyCredits} more credits in residence.`],
      },
      {
        categoryType: 'gpa_minimum',
        categoryTitle: `Minimum Cumulative GPA (Min ${program.minimumGpa.toFixed(2)})`,
        requiredCredits: 0,
        earnedCredits: 0,
        inProgressCredits: 0,
        isSatisfied: isGpaSatisfied,
        courses: [],
        missingCourseCodes: [],
        deficits: isGpaSatisfied ? [] : [`Current GPA (${cumulativeGpa.toFixed(2)}) is below required ${program.minimumGpa.toFixed(2)}.`],
      },
    ];

    const outstandingRequirements: string[] = [];
    for (const cat of categories) {
      if (!cat.isSatisfied) {
        outstandingRequirements.push(...cat.deficits);
      }
    }

    const totalRequired = program.totalCreditsRequired || 120;
    const completionPercentage = Math.min(
      100,
      Math.round((totalEarnedCredits / totalRequired) * 1000) / 10
    );

    const isGraduationEligible =
      outstandingRequirements.length === 0 &&
      totalEarnedCredits >= totalRequired &&
      isGpaSatisfied &&
      isResidencySatisfied;

    const auditTimestamp = new Date().toISOString();
    const auditPayload = JSON.stringify({
      studentId,
      programCode: program.programCode,
      totalEarnedCredits,
      cumulativeGpa,
      isGraduationEligible,
      auditTimestamp,
    });
    const merkleAuditHash = createHash('sha256').update(auditPayload).digest('hex');

    return {
      studentId,
      programCode: program.programCode,
      programTitle: program.title,
      catalogYear: program.catalogYear,
      isGraduationEligible,
      totalRequiredCredits: totalRequired,
      totalEarnedCredits,
      totalInProgressCredits,
      completionPercentage,
      cumulativeGpa,
      majorGpa,
      isGpaSatisfied,
      isResidencySatisfied,
      categories,
      outstandingRequirements,
      auditTimestamp,
      merkleAuditHash,
    };
  }

  private evaluateCategory(
    categoryType: RequirementCategoryStatus['categoryType'],
    categoryTitle: string,
    requiredCourses: CurriculumCourseDto[],
    transcriptMap: Map<string, AuditCourseRecord>,
    inProgressSet: Set<string>
  ): RequirementCategoryStatus {
    const requiredCredits = requiredCourses.reduce((sum, c) => sum + c.credits, 0);
    let earnedCredits = 0;
    let inProgressCredits = 0;
    const courses: AuditCourseRecord[] = [];
    const missingCourseCodes: string[] = [];
    const deficits: string[] = [];

    for (const reqCourse of requiredCourses) {
      const code = reqCourse.courseCode.toUpperCase();
      const match = transcriptMap.get(code);

      if (match && this.evaluator.isPassingGrade(match.grade, reqCourse.minGrade)) {
        earnedCredits += match.credits;
        courses.push(match);
      } else if (inProgressSet.has(code)) {
        inProgressCredits += reqCourse.credits;
        courses.push({
          courseCode: reqCourse.courseCode,
          title: reqCourse.title,
          credits: reqCourse.credits,
          grade: 'IP',
          qualityPoints: 0,
          status: 'in_progress',
        });
      } else {
        missingCourseCodes.push(reqCourse.courseCode);
        deficits.push(`Missing required course: ${reqCourse.courseCode} (${reqCourse.title})`);
      }
    }

    return {
      categoryType,
      categoryTitle,
      requiredCredits,
      earnedCredits,
      inProgressCredits,
      isSatisfied: missingCourseCodes.length === 0,
      courses,
      missingCourseCodes,
      deficits,
    };
  }

  private evaluateElectiveCategory(
    categoryType: RequirementCategoryStatus['categoryType'],
    categoryTitle: string,
    requiredCredits: number,
    eligibleCourses: CurriculumCourseDto[],
    transcriptMap: Map<string, AuditCourseRecord>,
    inProgressSet: Set<string>
  ): RequirementCategoryStatus {
    let earnedCredits = 0;
    let inProgressCredits = 0;
    const courses: AuditCourseRecord[] = [];

    for (const c of eligibleCourses) {
      const code = c.courseCode.toUpperCase();
      const match = transcriptMap.get(code);

      if (match && this.evaluator.isPassingGrade(match.grade, c.minGrade)) {
        earnedCredits += match.credits;
        courses.push(match);
      } else if (inProgressSet.has(code)) {
        inProgressCredits += c.credits;
        courses.push({
          courseCode: c.courseCode,
          title: c.title,
          credits: c.credits,
          grade: 'IP',
          qualityPoints: 0,
          status: 'in_progress',
        });
      }
    }

    const isSatisfied = earnedCredits >= requiredCredits;
    const deficits: string[] = isSatisfied
      ? []
      : [`Need ${requiredCredits - earnedCredits} more credits in ${categoryTitle}.`];

    return {
      categoryType,
      categoryTitle,
      requiredCredits,
      earnedCredits,
      inProgressCredits,
      isSatisfied,
      courses,
      missingCourseCodes: [],
      deficits,
    };
  }
}
