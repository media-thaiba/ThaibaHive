import { SpotPriceAggregator } from '../../../operations/neuro/cloud/spot-price-aggregator';
import { CloudArbitrageEngine } from '../../../operations/neuro/cloud/cloud-arbitrage-engine';
import { NeuroJobItem } from '../../../operations/neuro/neuro-types';

describe('SpotPriceAggregator & CloudArbitrageEngine (NEURO-005)', () => {
  it('should fetch and normalize spot quotes across AWS, GCP, RunPod, and On-Premise', () => {
    const quotes = SpotPriceAggregator.getQuotes('NVIDIA-H100');

    expect(quotes.length).toBeGreaterThanOrEqual(4);
    const providers = quotes.map((q) => q.provider);
    expect(providers).toContain('aws');
    expect(providers).toContain('gcp');
    expect(providers).toContain('runpod');
    expect(providers).toContain('on_prem');

    const awsQuote = quotes.find((q) => q.provider === 'aws');
    expect(awsQuote?.savingsPercent).toBeGreaterThan(50);
  });

  it('should recommend on-premise execution when local cluster has available capacity', () => {
    const job: NeuroJobItem = {
      id: 'job-local',
      jobId: 'JOB-LOCAL-01',
      jobName: 'LocalBERT',
      userId: 'staff_1',
      departmentId: 'dept_cs',
      clusterId: 'cluster-01',
      jobType: 'batch_training',
      priority: 'normal',
      status: 'queued',
      requestedGpus: 4,
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

    // On-premise 20/64 GPUs used (31% utilization)
    const decision = CloudArbitrageEngine.evaluateArbitrage(job, 2.0, 20, 64);

    expect(decision.recommendedTarget).toBe('on_prem');
    expect(decision.rationale).toContain('Local datacenter capacity available');
  });

  it('should recommend hybrid cloud spot burst when on-premise cluster is fully occupied', () => {
    const job: NeuroJobItem = {
      id: 'job-burst',
      jobId: 'JOB-BURST-01',
      jobName: 'LargeLlamaTrain',
      userId: 'staff_1',
      departmentId: 'dept_cs',
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

    // On-premise 60/64 GPUs used (93% utilization)
    const decision = CloudArbitrageEngine.evaluateArbitrage(job, 4.0, 60, 64);

    expect(decision.recommendedTarget).not.toBe('on_prem');
    expect(decision.savingsPercent).toBeGreaterThan(30);
  });
});
