import { StudentFeatureExtractor } from "./feature-extractor";
import { StudentPredictionEngine } from "./prediction-engine";
import { LearningPathRecommender } from "./learning-path-recommender";
import { RawStudentActivityData, StudentRiskAssessment, RecommendedLearningPath } from "./types";

export class InferenceService {
  private extractor = new StudentFeatureExtractor();
  private predictor = new StudentPredictionEngine();
  private recommender = new LearningPathRecommender();
  private cache = new Map<string, { assessment: StudentRiskAssessment; path: RecommendedLearningPath; cachedAt: number }>();

  public async evaluateStudent(rawData: RawStudentActivityData): Promise<{
    assessment: StudentRiskAssessment;
    learningPath: RecommendedLearningPath;
    inferenceTimeMs: number;
  }> {
    const startTime = Date.now();
    const cacheKey = `${rawData.tenantId}:${rawData.studentId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < 300000) { // 5 min TTL
      return {
        assessment: cached.assessment,
        learningPath: cached.path,
        inferenceTimeMs: Date.now() - startTime,
      };
    }

    const featureVector = this.extractor.extractFeatures(rawData);
    const assessment = this.predictor.predictStudentRisk(featureVector);
    const learningPath = this.recommender.generatePath(assessment);

    this.cache.set(cacheKey, { assessment, path: learningPath, cachedAt: Date.now() });

    return {
      assessment,
      learningPath,
      inferenceTimeMs: Date.now() - startTime,
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
