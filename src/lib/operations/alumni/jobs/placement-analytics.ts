import { AlumniJobApplicationItem, AlumniJobPostingItem } from '../types';

export interface PlacementAnalyticsSummary {
  totalApplications: number;
  totalHired: number;
  placementRatePercent: number;
  averageSalaryOffer: number;
  topHiringCompanies: Array<{ company: string; count: number }>;
  roleDistribution: Record<string, number>;
}

export function computePlacementAnalytics(
  applications: AlumniJobApplicationItem[],
  jobs: AlumniJobPostingItem[]
): PlacementAnalyticsSummary {
  const jobMap = new Map<string, AlumniJobPostingItem>(jobs.map((j) => [j.id, j]));
  const totalApplications = applications.length;

  const hiredApps = applications.filter((a) => a.status === 'hired');
  const totalHired = hiredApps.length;
  const placementRatePercent =
    totalApplications > 0 ? Math.round((totalHired / totalApplications) * 1000) / 10 : 0;

  const companyCounts: Record<string, number> = {};
  const roleDistribution: Record<string, number> = {};
  let totalSalary = 0;
  let salaryCount = 0;

  for (const app of hiredApps) {
    const job = jobMap.get(app.jobPostingId);
    if (job) {
      companyCounts[job.company] = (companyCounts[job.company] || 0) + 1;
      roleDistribution[job.roleType] = (roleDistribution[job.roleType] || 0) + 1;
      if (job.maxSalary || job.minSalary) {
        totalSalary += (job.maxSalary || job.minSalary || 0);
        salaryCount++;
      }
    }
  }

  const averageSalaryOffer = salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;

  const topHiringCompanies = Object.entries(companyCounts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalApplications,
    totalHired,
    placementRatePercent,
    averageSalaryOffer,
    topHiringCompanies,
    roleDistribution,
  };
}
