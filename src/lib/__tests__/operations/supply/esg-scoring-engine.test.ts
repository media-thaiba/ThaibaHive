import { EsgScoringEngine } from '../../../operations/supply/esg/esg-scoring-engine';
import { CarbonSupplyChainTracker } from '../../../operations/supply/esg/carbon-supply-chain-tracker';

describe('EsgScoringEngine & Carbon Tracker (SUPPLY-006)', () => {
  let engine: EsgScoringEngine;

  beforeEach(() => {
    engine = EsgScoringEngine.getInstance();
  });

  it('should calculate Scope 3 carbon emissions and recycled content deductions', () => {
    const calculation = CarbonSupplyChainTracker.calculateScope3EmissionsKg('hardware', 10000, 50);
    // Gross: 10000 * 0.25 = 2500 kg
    // Recycled deduction: 2500 * 0.5 * 0.4 = 500 kg
    // Net: 2000 kg
    expect(calculation.grossEmissionsKg).toBe(2500);
    expect(calculation.recycledContentDeductionKg).toBe(500);
    expect(calculation.netEmissionsKg).toBe(2000);
  });

  it('should award top AAA ESG rating to fully certified sustainable suppliers', () => {
    const score = engine.evaluateEsgScore({
      vendorId: 'ven-eco',
      hasIso14001: true,
      hasRenewableEnergyCommitment: true,
      recycledPackagingPercent: 100,
      hasFairLaborCert: true,
      diversityOwnershipCertified: true,
      hasAntiBriberyPolicy: true,
      hasTransparentAuditedFinances: true,
      scope3CarbonIntensityKgPerUsd: 0.05,
    });

    expect(score.compositeEsgScore).toBeGreaterThanOrEqual(90.0);
    expect(score.ratingGrade).toBe('AAA');
    expect(score.fairLaborCertified).toBe(true);
  });

  it('should assign lower grades to vendors lacking environmental & governance safeguards', () => {
    const score = engine.evaluateEsgScore({
      vendorId: 'ven-low-esg',
      hasIso14001: false,
      hasRenewableEnergyCommitment: false,
      recycledPackagingPercent: 0,
      hasFairLaborCert: false,
      diversityOwnershipCertified: false,
      hasAntiBriberyPolicy: false,
      hasTransparentAuditedFinances: false,
      scope3CarbonIntensityKgPerUsd: 0.45,
    });

    expect(score.compositeEsgScore).toBeLessThan(40.0);
    expect(score.ratingGrade).toBe('CCC');
  });
});
