import { ParsedExternalCourse, TranscriptParseResult } from './articulation-types';

export class TransferCreditParser {
  /**
   * Parses raw OCR transcript text into structured course records
   */
  public parseTranscriptText(rawText: string): TranscriptParseResult {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    let sourceInstitution = 'External Accredited University';
    let studentName: string | undefined;
    const courses: ParsedExternalCourse[] = [];

    // Line regex to match: [CourseCode] [Title] [Credits] [Grade]
    // Example: "CS 110 Intro to Computer Science 4.0 A" or "MATH-151 Calculus I 4.0 B+"
    const courseLineRegex = /^([A-Z]{2,5}\s?[-]?\d{3,4}[A-Z]?)\s+(.+?)\s+(\d(?:\.\d)?)\s+([A-D][+-]?|F|PASS|CR)$/i;

    for (const line of lines) {
      if (/University|College|Institute|Academy/i.test(line) && !line.match(/\d\.\d/)) {
        sourceInstitution = line;
        continue;
      }
      if (/Student\s*Name\s*:\s*(.+)/i.test(line)) {
        const match = line.match(/Student\s*Name\s*:\s*(.+)/i);
        if (match) studentName = match[1].trim();
        continue;
      }

      const match = line.match(courseLineRegex);
      if (match) {
        const rawCode = match[1].replace(/\s+|-/g, '').toUpperCase();
        const title = match[2].trim();
        const credits = parseFloat(match[3]);
        const grade = match[4].toUpperCase();

        courses.push({
          sourceCourseCode: rawCode,
          sourceTitle: title,
          sourceCredits: credits,
          sourceGrade: grade,
        });
      }
    }

    const confidenceScore = courses.length > 0 ? 0.95 : 0.60;

    return {
      sourceInstitution,
      studentName,
      courses,
      confidenceScore,
      rawTextLength: rawText.length,
    };
  }
}
