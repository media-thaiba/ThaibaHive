export interface ExtractedEntities {
  dates: string[];
  courseCodes: string[];
  amounts: number[];
  studentIds: string[];
  roomNumbers: string[];
}

export class EntityExtractor {
  private static instance: EntityExtractor;

  public static getInstance(): EntityExtractor {
    if (!EntityExtractor.instance) {
      EntityExtractor.instance = new EntityExtractor();
    }
    return EntityExtractor.instance;
  }

  public extract(text: string): ExtractedEntities {
    const dates: string[] = [];
    const courseCodes: string[] = [];
    const amounts: number[] = [];
    const studentIds: string[] = [];
    const roomNumbers: string[] = [];

    // 1. Course codes: e.g. CS101, MATH-201, PHY302
    const courseRegex = /\b[A-Z]{2,4}[-\s]?\d{3,4}\b/g;
    const courseMatches = text.match(courseRegex);
    if (courseMatches) {
      for (const m of courseMatches) {
        courseCodes.push(m.replace(/\s+/g, ''));
      }
    }

    // 2. Student IDs: e.g. STU-12345, STU999
    const stuRegex = /\b(STU[-_]?\d{3,6})\b/gi;
    const stuMatches = text.match(stuRegex);
    if (stuMatches) {
      for (const s of stuMatches) {
        studentIds.push(s.toUpperCase());
      }
    }

    // 3. Monetary amounts: e.g. $450, 450 USD, $1,200.50
    const amtRegex = /(?:\$|USD\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi;
    let amtMatch;
    while ((amtMatch = amtRegex.exec(text)) !== null) {
      const numStr = amtMatch[1].replace(/,/g, '');
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed)) amounts.push(parsed);
    }

    // 4. Room numbers: e.g. Room 304, Dorm 12B, Block A
    const roomRegex = /\b(?:Room|Dorm|Block)\s+([A-Z0-9-]+)\b/gi;
    let roomMatch;
    while ((roomMatch = roomRegex.exec(text)) !== null) {
      roomNumbers.push(roomMatch[1]);
    }

    // 5. Date tokens
    if (/\btoday\b/i.test(text)) dates.push('today');
    if (/\btomorrow\b/i.test(text)) dates.push('tomorrow');
    const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/g;
    const isoMatches = text.match(isoDateRegex);
    if (isoMatches) {
      dates.push(...isoMatches);
    }

    return {
      dates,
      courseCodes,
      amounts,
      studentIds,
      roomNumbers,
    };
  }
}
