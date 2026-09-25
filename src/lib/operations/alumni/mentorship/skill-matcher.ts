/**
 * Calculates Jaccard similarity and semantic overlap between two sets of skill tags.
 */
export function calculateSkillOverlap(studentSkills: string[], mentorSkills: string[]): number {
  if (!studentSkills.length || !mentorSkills.length) return 0.2; // base prior

  const normalize = (s: string) => s.toLowerCase().trim().replace(/[-_]/g, ' ');
  const setA = new Set(studentSkills.map(normalize));
  const setB = new Set(mentorSkills.map(normalize));

  let intersection = 0;
  for (const itemA of setA) {
    for (const itemB of setB) {
      if (itemA === itemB || itemA.includes(itemB) || itemB.includes(itemA)) {
        intersection++;
        break;
      }
    }
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? Math.min(1.0, intersection / (setA.size || 1)) : 0;
}
