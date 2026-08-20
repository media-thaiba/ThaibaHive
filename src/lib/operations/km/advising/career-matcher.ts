import { CareerPathProfile, StudentTranscriptEntry } from './advising-types';

export interface CareerMatchResult {
  career: CareerPathProfile;
  matchScorePercent: number;
  matchingCourses: string[];
  recommendedNextElectives: string[];
}

export class CareerMatcher {
  private careerDatabase: CareerPathProfile[] = [
    {
      careerId: 'car_ai_eng',
      title: 'AI & Machine Learning Engineer',
      industry: 'Software & Technology',
      recommendedElectives: ['CS-401', 'CS-402', 'MATH-205', 'CS-480'],
      keySkillAreas: ['Deep Learning', 'Python', 'Vector DBs', 'Distributed Training'],
      marketDemandScore: 9.5,
    },
    {
      careerId: 'car_cloud_arch',
      title: 'Cloud Solutions Architect',
      industry: 'Enterprise Infrastructure',
      recommendedElectives: ['CS-301', 'CS-350', 'NET-301', 'SEC-305'],
      keySkillAreas: ['Kubernetes', 'AWS/GCP', 'DevOps', 'Distributed Systems'],
      marketDemandScore: 9.0,
    },
    {
      careerId: 'car_data_eng',
      title: 'Database & Data Platform Engineer',
      industry: 'Data & Analytics',
      recommendedElectives: ['CS-302', 'CS-350', 'DATA-301', 'CS-402'],
      keySkillAreas: ['SQL', 'Data Warehousing', 'ETL Pipelines', 'Query Optimization'],
      marketDemandScore: 8.8,
    },
  ];

  /**
   * Calculates similarity between student completed courses and career track requirements.
   */
  public matchStudentToCareers(transcript: StudentTranscriptEntry[]): CareerMatchResult[] {
    const studentCourses = new Set(
      transcript.filter((t) => t.grade !== 'F' && t.grade !== 'W').map((t) => t.courseCode)
    );

    const matches: CareerMatchResult[] = [];

    for (const career of this.careerDatabase) {
      const matching: string[] = [];
      const recommendedNext: string[] = [];

      for (const elec of career.recommendedElectives) {
        if (studentCourses.has(elec)) {
          matching.push(elec);
        } else {
          recommendedNext.push(elec);
        }
      }

      const matchRatio = career.recommendedElectives.length > 0
        ? matching.length / career.recommendedElectives.length
        : 0;

      const matchScorePercent = Math.round(matchRatio * 70 + (career.marketDemandScore / 10) * 30);

      matches.push({
        career,
        matchScorePercent,
        matchingCourses: matching,
        recommendedNextElectives: recommendedNext,
      });
    }

    matches.sort((a, b) => b.matchScorePercent - a.matchScorePercent);
    return matches;
  }
}

export const careerMatcher = new CareerMatcher();
