import {
  recordDPoPValidation,
  incrementReplayRejected,
  recordRiskScore,
  incrementStepupTriggered,
  incrementStepupCompleted,
  incrementFingerprintDrift,
  getIdentityMetricsText,
} from "../../identity/identity-metrics";

import {
  recordRevocationPropagation,
  incrementFallback,
  updateBloomSize,
  updateActiveSessions,
  getRevocationMetricsText,
} from "../../identity/revocation-metrics";

describe("Identity Metrics & Revocation Metrics Exporters", () => {
  it("should record and format identity security metrics in Prometheus format", () => {
    recordDPoPValidation(12.5);
    recordDPoPValidation(15.2);
    incrementReplayRejected();
    recordRiskScore(35);
    recordRiskScore(75);
    incrementStepupTriggered();
    incrementStepupCompleted();
    incrementFingerprintDrift();

    const output = getIdentityMetricsText();
    expect(output).toContain("identity_dpop_validation_ms");
    expect(output).toContain("identity_dpop_replay_rejected_total");
    expect(output).toContain("identity_risk_score_distribution");
    expect(output).toContain("identity_stepup_triggered_total");
    expect(output).toContain("identity_stepup_completed_total");
    expect(output).toContain("identity_device_fingerprint_drift_total");
  });

  it("should record and format revocation mesh metrics in Prometheus format", () => {
    recordRevocationPropagation(25);
    incrementFallback();
    updateBloomSize(1250);
    updateActiveSessions(100);

    const output = getRevocationMetricsText();
    expect(output).toContain("identity_revocation_propagation_ms");
    expect(output).toContain("identity_revocation_bloom_size");
    expect(output).toContain("identity_revocation_fallback_total");
    expect(output).toContain("identity_active_sessions_total");
  });
});
