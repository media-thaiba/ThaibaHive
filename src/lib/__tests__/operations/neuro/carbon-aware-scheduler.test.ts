import { CarbonAwareScheduler } from '../../../operations/neuro/synergy/carbon-aware-scheduler';
import { EcoComputeOptimizer } from '../../../operations/neuro/synergy/eco-compute-optimizer';
import { NeuroJobItem } from '../../../operations/neuro/neuro-types';

describe('CarbonAwareScheduler & EcoComputeOptimizer (NEURO-007)', () => {
  const mockJob: NeuroJobItem = {
    id: 'job-solar',
    jobId: 'JOB-SOLAR-01',
    jobName: 'SolarTrainingBatch',
    userId: 'staff_eco',
    departmentId: 'dept_env',
    clusterId: 'cluster-01',
    jobType: 'batch_training',
    priority: 'normal',
    status: 'queued',
    requestedGpus: 8,
    gpuModelRequirement: 'NVIDIA-H100',
    minVramBytes: 40000000000,
    containerImage: 'pytorch/pytorch:2.4',
    entrypointCommand: 'python train.py',
    runtimeSeconds: 0,
    tokensCostTotal: 0,
    carbonSavedKg: 0,
    merkleProofHash: '',
    institutionId: 'inst_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should grant Green Compute certification when running during net solar surplus', () => {
    const recommendation = CarbonAwareScheduler.evaluateJobCarbonFootprint(mockJob, 4.0, {
      timestamp: new Date().toISOString(),
      solarGenerationKw: 600,
      campusBaseLoadKw: 350,
      netRenewableSurplusKw: 250, // 8 GPUs * 0.4kW = 3.2kW << 250kW surplus
      gridCarbonIntensityGCO2PerKwh: 420,
    });

    expect(recommendation.shouldExecuteNow).toBe(true);
    expect(recommendation.greenComputeCertified).toBe(true);
    expect(recommendation.potentialCarbonSavingsKg).toBeGreaterThan(0);
  });

  it('should defer non-urgent batch jobs when grid carbon intensity is high and solar surplus is zero', () => {
    const recommendation = CarbonAwareScheduler.evaluateJobCarbonFootprint(mockJob, 4.0, {
      timestamp: new Date().toISOString(),
      solarGenerationKw: 0, // Nighttime / cloudy
      campusBaseLoadKw: 400,
      netRenewableSurplusKw: 0,
      gridCarbonIntensityGCO2PerKwh: 480,
    });

    expect(recommendation.shouldExecuteNow).toBe(false);
    expect(recommendation.recommendedStartWindow).toContain('SOLAR_PEAK');
  });

  it('should optimize a batch of jobs using EcoComputeOptimizer', () => {
    const summary = EcoComputeOptimizer.optimizeBatchSchedule([mockJob], {
      timestamp: new Date().toISOString(),
      solarGenerationKw: 500,
      campusBaseLoadKw: 300,
      netRenewableSurplusKw: 200,
      gridCarbonIntensityGCO2PerKwh: 350,
    });

    expect(summary.evaluatedJobsCount).toBe(1);
    expect(summary.immediateExecutionCount).toBe(1);
    expect(summary.greenComputeCertifiedCount).toBe(1);
  });
});
