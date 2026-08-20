import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FederatedTrainingPanel } from '@/components/operations/federated-training-panel';
import { PrivacyBudgetPanel } from '@/components/operations/privacy-budget-panel';
import { SmpcMeshPanel } from '@/components/operations/smpc-mesh-panel';
import { DriftMonitorPanel } from '@/components/operations/drift-monitor-panel';
import { CrossCampusBenchmarkPanel } from '@/components/operations/cross-campus-benchmark-panel';

expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock('@/lib/hooks/use-federated-models', () => ({
  useFederatedModels: () => ({
    models: [{ modelId: 'm1', name: 'Retention Model', domain: 'retention', currentRound: 3, architecture: 'logistic_regression' }],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/lib/hooks/use-privacy-budget', () => ({
  usePrivacyBudget: () => ({
    budget: { totalBudgetEpsilon: 10.0, consumedEpsilon: 3.5, remainingEpsilon: 6.5, isExhausted: false },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/lib/hooks/use-federated-nodes', () => ({
  useFederatedNodes: () => ({
    nodes: [{ nodeId: 'node_1', campusName: 'North Campus', status: 'idle', sampleCount: 500, networkLatencyMs: 12 }],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/lib/hooks/use-model-drift', () => ({
  useModelDrift: () => ({
    driftReports: [{ id: 'dr_1', modelId: 'm1', overallPsi: 0.05, maxFeatureKs: 0.02 }],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/lib/hooks/use-campus-benchmarks', () => ({
  useCampusBenchmarks: () => ({
    benchmarks: [{
      campusId: 'c1',
      campusName: 'Delta Medical',
      rankPosition: 1,
      totalParticipatingCampuses: 4,
      metrics: { retentionRatePercent: 95.0, averageAcademicGpa: 3.8 },
      percentiles: {},
    }],
    isLoading: false,
    error: null,
  }),
}));

describe('A-FED Collaborative Intelligence UI Panels', () => {
  it('should render FederatedTrainingPanel with model registry', () => {
    render(<FederatedTrainingPanel />);
    expect(screen.getByText(/Retention Model/i)).toBeDefined();
    expect(screen.getByText(/Round: 3/i)).toBeDefined();
  });

  it('should render PrivacyBudgetPanel with budget metrics', () => {
    render(<PrivacyBudgetPanel />);
    expect(screen.getByText(/Differential Privacy Budget Radar/i)).toBeDefined();
    expect(screen.getByText('3.50')).toBeDefined();
  });

  it('should render SmpcMeshPanel with active campus nodes', () => {
    render(<SmpcMeshPanel />);
    expect(screen.getByText(/North Campus/i)).toBeDefined();
    expect(screen.getByText('IDLE')).toBeDefined();
  });

  it('should render DriftMonitorPanel with STABLE badge', () => {
    render(<DriftMonitorPanel />);
    expect(screen.getByText(/STABLE/i)).toBeDefined();
  });

  it('should render CrossCampusBenchmarkPanel with campus rankings', () => {
    render(<CrossCampusBenchmarkPanel />);
    expect(screen.getByText(/Delta Medical/i)).toBeDefined();
    expect(screen.getByText(/Rank #1/i)).toBeDefined();
  });

  it('FederatedTrainingPanel should have no WCAG accessibility violations (jest-axe)', async () => {
    const { container } = render(<FederatedTrainingPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PrivacyBudgetPanel should have no WCAG accessibility violations (jest-axe)', async () => {
    const { container } = render(<PrivacyBudgetPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('DriftMonitorPanel should have no WCAG accessibility violations (jest-axe)', async () => {
    const { container } = render(<DriftMonitorPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
