/**
 * Institutional Analytics & Cross-Campus Benchmarking Types (A-FED / EdgeMesh)
 */

export interface CampusRawIndicatorData {
  campusId: string;
  campusName: string;
  totalStudents: number;
  retainedStudents: number;
  graduatedStudents: number;
  facultyCount: number;
  totalExpenditureDollars: number;
  energyKwhPerSqMeter: number;
  averageGpa: number;
  timestamp: string;
}

export interface IPEDSBenchmarkMetrics {
  retentionRatePercent: number;        // (retained / total) * 100
  graduationRatePercent: number;       // (graduated / total) * 100
  studentFacultyRatio: number;          // total / faculty
  expenditurePerStudent: number;       // totalExpenditure / total
  energyEfficiencyKwhPerM2: number;
  averageAcademicGpa: number;
}

export interface ConfidentialCampusPercentileRank {
  campusId: string;
  campusName: string;
  metrics: IPEDSBenchmarkMetrics;
  percentiles: Record<keyof IPEDSBenchmarkMetrics, number>; // 0.0 - 100.0%
  rankPosition: number;
  totalParticipatingCampuses: number;
}

export interface StudentRiskAssessment {
  studentId: string;
  campusId: string;
  riskProbability: number; // 0.0 - 1.0
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  topRiskFactors: string[];
  recommendedInterventions: string[];
  assessedAt: string;
}

export interface InstitutionalFinancialForecast {
  campusId: string;
  forecastQuarter: string;
  projectedTuitionRevenue: number;
  projectedOpexExpenditure: number;
  projectedNetMargin: number;
  confidenceInterval: [number, number];
  resourceBottlenecks: string[];
}
