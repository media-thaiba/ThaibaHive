import { CloudCostOptimizer } from '@/lib/operations/cloud/cloud-cost-optimizer';
import { CloudResourceMetrics } from '@/lib/operations/cloud/cloud-types';

describe('AIMS-013 — CloudCostOptimizer', () => {
  it('should recommend downscaling or spot migration for low-utilization staging nodes', () => {
    const optimizer = new CloudCostOptimizer();

    const stagingMetrics: CloudResourceMetrics = {
      resourceId: 'i-0987654321',
      provider: 'AWS',
      region: 'ap-south-1',
      instanceType: 'm5.2xlarge',
      clusterName: 'staging-k8s-cluster',
      environment: 'staging',
      cpuUtilizationPercent: 12.0,
      memoryUtilizationPercent: 28.0,
      currentMonthlyCostDollars: 280.0,
      isSpotInstance: false,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const rec = optimizer.analyzeResource(stagingMetrics);

    expect(rec).not.toBeNull();
    expect(rec?.actionRequired).toBe('DOWNSCALE');
    expect(rec?.recommendedInstanceType).toBe('m5.xlarge');
    expect(rec?.monthlySavingsDollars).toBeGreaterThan(100);
  });
});
