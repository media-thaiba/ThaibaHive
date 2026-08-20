/**
 * Component and Page tests for ARES Radar UI (ARES-022)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PredictiveThreatRadar } from '@/components/security/ares/predictive-threat-radar';
import { ChaosExperimentRunner } from '@/components/security/ares/chaos-experiment-runner';
import { ResilienceScoreMatrix } from '@/components/security/ares/resilience-score-matrix';
import { RemediationAdvisorCard } from '@/components/security/ares/remediation-advisor-card';

describe('ARES-022: UI Component Suite', () => {
  it('renders PredictiveThreatRadar with empty and loaded state', () => {
    const { rerender } = render(<PredictiveThreatRadar threats={[]} />);
    expect(screen.getByText(/No emerging high-risk threats detected/i)).toBeInTheDocument();

    rerender(
      <PredictiveThreatRadar
        threats={[
          {
            forecastId: 'fc-1',
            threatCategory: 'ZERO_DAY_EXPLOIT',
            posteriorProbability: 0.88,
            confidenceScore: 92,
            severityTier: 'CRITICAL_FORECAST',
            projectedExploitWindowDays: 7,
            keyIndicators: ['sig-cve'],
            affectedAssetIds: ['prod-cluster'],
            recommendedMitigations: ['Elevate micro-segmentation'],
            calculatedAt: new Date().toISOString(),
          },
        ]}
      />
    );

    expect(screen.getByText(/ZERO DAY EXPLOIT/i)).toBeInTheDocument();
    expect(screen.getByText(/Elevate micro-segmentation/i)).toBeInTheDocument();
  });

  it('renders ChaosExperimentRunner and lists scenarios', () => {
    render(
      <ChaosExperimentRunner
        scenarios={[
          {
            scenarioId: 'chaos-1',
            name: 'Network Partition Simulation Scenario',
            description: 'Simulates network partition',
            faultType: 'NETWORK_PARTITION',
            target: { targetType: 'SUBNET', targetIdentifier: 'vlan-20', blastRadiusPercentage: 10 },
            durationSeconds: 10,
            parameters: {},
            safetyThresholds: { maxErrorRatePercent: 1, maxP99LatencyMs: 1000, maxConsecutiveFailures: 2 },
          },
        ]}
        executions={[]}
        isRunning={false}
        onRunScenario={jest.fn()}
        onOpenKillSwitch={jest.fn()}
      />
    );

    expect(screen.getByText(/Network Partition Simulation Scenario/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Kill-Switch/i)).toBeInTheDocument();
  });

  it('renders ResilienceScoreMatrix and RemediationAdvisorCard', () => {
    render(
      <ResilienceScoreMatrix
        snapshot={{
          snapshotId: 'snap-1',
          overallScore: 91.5,
          tier: 'RESILIENT',
          vectors: {
            faultToleranceAndChaos: { vectorName: 'Fault Tolerance', weight: 0.3, score: 95, factors: {}, status: 'OPTIMAL' },
            recoveryTimeAndMTTR: { vectorName: 'MTTR', weight: 0.25, score: 90, factors: {}, status: 'OPTIMAL' },
            zeroTrustMicroSegmentation: { vectorName: 'Zero Trust', weight: 0.2, score: 90, factors: {}, status: 'OPTIMAL' },
            predictiveHardeningReadiness: { vectorName: 'Predictive', weight: 0.15, score: 90, factors: {}, status: 'OPTIMAL' },
            auditCryptographicHealth: { vectorName: 'Audit', weight: 0.1, score: 95, factors: {}, status: 'OPTIMAL' },
          },
          mttrSeconds: 25,
          unresolvedGapsCount: 0,
          calculatedAt: new Date().toISOString(),
        }}
      />
    );

    expect(screen.getByText(/Tier: RESILIENT/i)).toBeInTheDocument();
    expect(screen.getByText(/91.5 \/ 100/i)).toBeInTheDocument();

    render(
      <RemediationAdvisorCard
        recommendations={[
          {
            recommendationId: 'rec-1',
            title: 'Deploy standby replica',
            description: 'Increases fault tolerance',
            targetVector: 'Fault Tolerance',
            estimatedScoreImpact: 5,
            effort: 'LOW',
            remediationSteps: ['Deploy replica'],
          },
        ]}
      />
    );

    expect(screen.getByText(/Deploy standby replica/i)).toBeInTheDocument();
  });
});
