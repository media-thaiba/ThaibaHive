/**
 * Unit tests for BayesianThreatModel (ARES-001)
 */

import { BayesianThreatModel, DEFAULT_PRIORS } from '@/lib/security/ares/bayesian-threat-model';
import { ThreatSignalEvidence } from '@/lib/security/ares/ares-types';

describe('ARES-001: BayesianThreatModel', () => {
  beforeEach(() => {
    BayesianThreatModel.resetInstance();
  });

  it('should initialize with standard default priors', () => {
    const model = BayesianThreatModel.getInstance();
    const priors = model.getPriors();

    expect(priors.size).toBe(8);
    expect(priors.get('CREDENTIAL_STUFFING')?.priorProbability).toBe(0.15);
    expect(priors.get('ZERO_DAY_EXPLOIT')?.priorProbability).toBe(0.05);
  });

  it('should return prior probability when no evidence signals are provided', () => {
    const model = BayesianThreatModel.getInstance();
    const result = model.evaluatePosterior('CREDENTIAL_STUFFING', []);

    expect(result.category).toBe('CREDENTIAL_STUFFING');
    expect(result.posteriorProbability).toBe(0.15);
    expect(result.evidenceCount).toBe(0);
    expect(result.likelihoodRatio).toBe(1.0);
  });

  it('should update posterior probability upward upon strong positive evidence signals', () => {
    const model = BayesianThreatModel.getInstance();
    const evidence: ThreatSignalEvidence[] = [
      {
        signalId: 'sig-1',
        source: 'auth_gateway',
        signalType: 'FAILED_AUTH_SPIKE',
        weight: 0.9,
        observedValue: 0.95,
        timestamp: new Date().toISOString(),
      },
      {
        signalId: 'sig-2',
        source: 'threat_intel',
        signalType: 'IMPOSSIBLE_TRAVEL',
        weight: 0.8,
        observedValue: 0.9,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = model.evaluatePosterior('CREDENTIAL_STUFFING', evidence);

    expect(result.posteriorProbability).toBeGreaterThan(0.50);
    expect(result.likelihoodRatio).toBeGreaterThan(1.0);
    expect(result.confidenceScore).toBeGreaterThan(50);
  });

  it('should calibrate priors dynamically using observed incident frequency', () => {
    const model = BayesianThreatModel.getInstance();
    const calibrated = model.calibratePrior('CREDENTIAL_STUFFING', 30, 100);

    expect(calibrated.alpha).toBe(DEFAULT_PRIORS.CREDENTIAL_STUFFING.alpha + 30);
    expect(calibrated.priorProbability).toBeGreaterThan(0.15);
  });
});
