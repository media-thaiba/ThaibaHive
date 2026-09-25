import { CarbonAwareScheduler, GridCarbonTelemetry } from './carbon-aware-scheduler';
import { NeuroJobItem } from '../neuro-types';

export class EcoComputeOptimizer {
  /**
   * Evaluates a batch of flexible jobs and returns carbon optimization summary.
   */
  public static optimizeBatchSchedule(
    jobs: NeuroJobItem[],
    telemetry: GridCarbonTelemetry
  ) {
    const results = jobs.map((j) => CarbonAwareScheduler.evaluateJobCarbonFootprint(j, 3.0, telemetry));

    const totalPowerDemandKw = jobs.reduce((sum, j) => sum + j.requestedGpus * 0.4, 0);
    const totalPotentialSavingsKg = results.reduce((sum, r) => sum + r.potentialCarbonSavingsKg, 0);
    const certifiedCount = results.filter((r) => r.greenComputeCertified).length;

    return {
      evaluatedJobsCount: jobs.length,
      immediateExecutionCount: results.filter((r) => r.shouldExecuteNow).length,
      deferredForSolarCount: results.filter((r) => !r.shouldExecuteNow).length,
      greenComputeCertifiedCount: certifiedCount,
      totalPowerDemandKw: Number(totalPowerDemandKw.toFixed(2)),
      totalPotentialSavingsKg: Number(totalPotentialSavingsKg.toFixed(2)),
      recommendations: results,
    };
  }
}
