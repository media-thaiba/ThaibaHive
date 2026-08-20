import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CloudCostOptimizer } from '@/lib/operations/cloud/cloud-cost-optimizer';
import { SpotInstanceOrchestrator } from '@/lib/operations/cloud/spot-instance-orchestrator';

export const GET = withDPoP(
  requireAuth(async () => {
    const optimizer = new CloudCostOptimizer();
    const mockNodes = [
      {
        resourceId: 'i-staging-1',
        provider: 'AWS' as const,
        region: 'ap-south-1',
        instanceType: 'm5.2xlarge',
        clusterName: 'k8s-staging',
        environment: 'staging' as const,
        cpuUtilizationPercent: 12.5,
        memoryUtilizationPercent: 24.0,
        currentMonthlyCostDollars: 280,
        isSpotInstance: false,
        timestamp: new Date().toISOString(),
        institutionId: 'inst_default',
      },
    ];

    const recommendations = mockNodes
      .map((n) => optimizer.analyzeResource(n))
      .filter(Boolean);

    return NextResponse.json({
      resources: mockNodes,
      recommendations,
      totalEstimatedSavingsDollars: recommendations.reduce((acc, r) => acc + (r?.monthlySavingsDollars || 0), 0),
    });
  }, 'system:operations:manage'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const orchestrator = new SpotInstanceOrchestrator();

    const plan = orchestrator.generateMigrationPlan(
      body.clusterName || 'k8s-batch-cluster',
      body.totalNodes || 10,
      body.targetSpotRatio || 0.6,
      body.averageNodeMonthlyCostDollars || 200,
      'inst_default'
    );

    return NextResponse.json({
      success: true,
      plan,
    });
  }, 'system:operations:manage'),
  { required: false }
);
