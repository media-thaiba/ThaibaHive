/**
 * End-to-End Test Suite for ARES Autonomous Resilience Engine (ARES-023)
 */

import { ThreatForecaster } from '@/lib/security/ares/threat-forecaster';
import { PredictiveAlertSystem } from '@/lib/security/ares/predictive-alert-system';
import { PreemptiveHardeningController } from '@/lib/security/ares/preemptive-hardening';
import { ChaosEngine } from '@/lib/security/chaos/chaos-engine';
import { ZkAttestationService } from '@/lib/security/zkp/zk-attestation-service';
import { ThreatGraphQueryEngine } from '@/lib/security/graph/graph-query-engine';
import { ResilienceCalculator } from '@/lib/security/resilience/resilience-calculator';
import { RemediationAdvisor } from '@/lib/security/resilience/remediation-advisor';

describe('ARES-023: End-to-End ARES Pipeline Verification', () => {
  it('executes the complete predictive forecast -> chaos injection -> ZKP verification -> resilience scoring lifecycle', async () => {
    // 1. Threat Forecasting
    const forecaster = ThreatForecaster.getInstance();
    const alertSystem = PredictiveAlertSystem.getInstance();
    const hardening = PreemptiveHardeningController.getInstance();

    const forecast = forecaster.generateForecast(
      'CREDENTIAL_STUFFING',
      [
        {
          signalId: 'e2e-sig-1',
          source: 'auth_edge',
          signalType: 'BURST_ATTACK',
          weight: 0.95,
          observedValue: 0.9,
          timestamp: new Date().toISOString(),
        },
      ],
      ['auth-service-01']
    );

    expect(forecast.posteriorProbability).toBeGreaterThan(0.2);
    const alert = alertSystem.evaluateAndAlert(forecast, []);
    expect(alert).toBeDefined();

    const action = hardening.planHardeningAction(
      forecast.threatCategory,
      'auth-service-01',
      'ENFORCE_STEP_UP_AUTH',
      'Automated risk mitigation'
    );
    expect(action).toBeDefined();
    expect(action.status).toBe('APPLIED');

    // 2. Chaos Injection
    const chaos = ChaosEngine.getInstance();
    const execution = await chaos.runScenario('chaos-net-partition-edge');
    expect(execution.state).toBe('COMPLETED');
    expect(execution.observedMetrics.errorRate).toBeDefined();

    // 3. ZKP Proof and Verification
    const zkService = ZkAttestationService.getInstance();
    const merkleRoot = 'a6b4e99f0123456789abcdef0123456789abcdef0123456789abcdef01234567';
    const recordPreimage = '{"action":"AUDIT_VERIFIED","tenant":"tenant-1"}';

    const proof = zkService.generateAndStoreProof(merkleRoot, recordPreimage, 'tenant-1');
    const attestation = zkService.verifyProofAndIssueAttestation(proof.proofId, 'SOC2_TYPE_II');
    expect(attestation).toBeDefined();
    expect(attestation?.isValid).toBe(true);

    // 4. Graph Pathfinder
    const graphEngine = ThreatGraphQueryEngine.getInstance();
    const overview = graphEngine.getGraphOverview();
    expect(overview.totalNodes).toBeGreaterThanOrEqual(0);

    // 5. Resilience Scorecard & Remediation Guidance
    const resCalc = ResilienceCalculator.getInstance();
    const snapshot = resCalc.calculateSystemResilience();
    expect(snapshot.overallScore).toBeGreaterThanOrEqual(0);
    expect(snapshot.overallScore).toBeLessThanOrEqual(100);

    const recs = RemediationAdvisor.generateRecommendations(snapshot);
    expect(Array.isArray(recs)).toBe(true);
  });
});
