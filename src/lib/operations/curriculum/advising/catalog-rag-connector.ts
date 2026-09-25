import { curriculumStore } from '../../../db/curriculum-store';
import { AdvisingCitation, StudentAcademicProfile } from './advising-types';
import { policyRetriever } from './policy-retriever';

export class CatalogRagConnector {
  private static instance: CatalogRagConnector;

  public static getInstance(): CatalogRagConnector {
    if (!CatalogRagConnector.instance) {
      CatalogRagConnector.instance = new CatalogRagConnector();
    }
    return CatalogRagConnector.instance;
  }

  /**
   * Retrieves unified citations across institutional policy bylaws and course catalogs
   */
  public async retrieveCatalogContext(
    query: string,
    profile: StudentAcademicProfile
  ): Promise<AdvisingCitation[]> {
    // 1. Policy citations
    const policyCitations = policyRetriever.retrievePolicies(
      query,
      profile.institutionId,
      profile.declaredCatalogYear
    );

    // 2. Course catalog citations
    const courses = await curriculumStore.listCourses(profile.institutionId);
    const courseCitations: AdvisingCitation[] = [];

    const lower = query.toLowerCase();
    for (const c of courses) {
      if (
        lower.includes(c.courseCode.toLowerCase()) ||
        lower.includes(c.title.toLowerCase())
      ) {
        courseCitations.push({
          documentTitle: `Course Catalog — ${c.courseCode}: ${c.title}`,
          section: `Credits: ${c.credits} | Level: ${c.level}`,
          excerpt: c.description || `Official catalog entry for ${c.title} (${c.courseCode}).`,
          catalogYear: profile.declaredCatalogYear,
        });
      }
    }

    return [...policyCitations, ...courseCitations].slice(0, 4);
  }
}

export const catalogRag = CatalogRagConnector.getInstance();
