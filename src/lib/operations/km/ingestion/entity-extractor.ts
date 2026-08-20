import { KmNode, KmEdge } from '../km-types';

export class EntityExtractor {
  /**
   * Scans text content for campus named entities (Course Codes, Credit Hours, Majors, Policies)
   */
  public extractEntities(text: string, documentId: string): { nodes: KmNode[]; edges: KmEdge[] } {
    const nodes: KmNode[] = [];
    const edges: KmEdge[] = [];

    // Course code pattern: CS-101, ENG-202, BIO-300, MATH-104, etc.
    const courseRegex = /\b([A-Z]{2,5}-\d{3,4})\b/g;
    const matchedCourses = new Set<string>();

    let match;
    while ((match = courseRegex.exec(text)) !== null) {
      matchedCourses.add(match[1]);
    }

    for (const code of matchedCourses) {
      nodes.push({
        id: code,
        name: `Course ${code}`,
        type: 'course',
        code,
        metadata: { sourceDocId: documentId },
      });
    }

    // Prerequisite pattern: "Prerequisite: CS-101" or "Prerequisites: CS-101 and CS-102"
    const prereqRegex = /(?:Prerequisites?|Prereq):\s*([^\.\n]+)/gi;
    let prereqMatch;
    while ((prereqMatch = prereqRegex.exec(text)) !== null) {
      const prereqClause = prereqMatch[1];
      const targetMatches = prereqClause.match(/\b([A-Z]{2,5}-\d{3,4})\b/g);

      if (targetMatches) {
        // Find which course this is for in the surrounding text or section
        const courseArray = Array.from(matchedCourses);
        if (courseArray.length > 0) {
          const mainCourse = courseArray[0];
          for (const req of targetMatches) {
            if (req !== mainCourse) {
              edges.push({
                id: `rel_${req}_${mainCourse}`,
                source: req,
                target: mainCourse,
                relation: 'prerequisite_of',
                weight: 1.0,
              });
            }
          }
        }
      }
    }

    // Policy code pattern: REG-2026-B, POL-FERPA-01
    const policyRegex = /\b(POL-[A-Z0-9\-]+|REG-[A-Z0-9\-]+)\b/g;
    let polMatch;
    while ((polMatch = policyRegex.exec(text)) !== null) {
      const polCode = polMatch[1];
      nodes.push({
        id: polCode,
        name: `Policy ${polCode}`,
        type: 'policy',
        code: polCode,
        metadata: { sourceDocId: documentId },
      });
    }

    return { nodes, edges };
  }
}

export const entityExtractor = new EntityExtractor();
