export interface CampusHistoricalEnrollment {
  campusId: string;
  campusName: string;
  capacityLimit: number;
  currentEnrollment: number;
  historicalEnrollments: Array<{ year: string; count: number }>;
}

export interface EnrollmentForecastResult {
  campusId: string;
  campusName: string;
  capacityLimit: number;
  currentEnrollment: number;
  projectedEnrollmentNextYear: number;
  projectedGrowthPercentage: number;
  utilizationPercentage: number;
  requiredStaffCount: number;
  isBottleneckRisk: boolean;
  generatedAt: string;
}

export class EnrollmentForecastingEngine {
  private targetStudentTeacherRatio = 20; // 1 teacher per 20 students

  forecastCampus(data: CampusHistoricalEnrollment): EnrollmentForecastResult {
    const historical = data.historicalEnrollments;
    let growthRate = 0.04; // 4% default baseline growth

    if (historical && historical.length >= 2) {
      const first = historical[0].count;
      const last = historical[historical.length - 1].count;
      if (first > 0) {
        growthRate = (last - first) / (first * (historical.length - 1));
      }
    }

    const projectedEnrollmentNextYear = Math.round(data.currentEnrollment * (1 + growthRate));
    const utilizationPercentage = Number(((projectedEnrollmentNextYear / data.capacityLimit) * 100).toFixed(1));
    const requiredStaffCount = Math.ceil(projectedEnrollmentNextYear / this.targetStudentTeacherRatio);
    const isBottleneckRisk = utilizationPercentage >= 90.0;
    const projectedGrowthPercentage = Number((growthRate * 100).toFixed(1));

    return {
      campusId: data.campusId,
      campusName: data.campusName,
      capacityLimit: data.capacityLimit,
      currentEnrollment: data.currentEnrollment,
      projectedEnrollmentNextYear,
      projectedGrowthPercentage,
      utilizationPercentage,
      requiredStaffCount,
      isBottleneckRisk,
      generatedAt: new Date().toISOString(),
    };
  }

  forecastNetwork(campuses: CampusHistoricalEnrollment[]): {
    totalProjectedEnrollment: number;
    bottleneckCampusCount: number;
    campusForecasts: EnrollmentForecastResult[];
  } {
    const campusForecasts = campuses.map((c) => this.forecastCampus(c));
    const totalProjectedEnrollment = campusForecasts.reduce((sum, f) => sum + f.projectedEnrollmentNextYear, 0);
    const bottleneckCampusCount = campusForecasts.filter((f) => f.isBottleneckRisk).length;

    return {
      totalProjectedEnrollment,
      bottleneckCampusCount,
      campusForecasts,
    };
  }
}

export const defaultEnrollmentForecaster = new EnrollmentForecastingEngine();
