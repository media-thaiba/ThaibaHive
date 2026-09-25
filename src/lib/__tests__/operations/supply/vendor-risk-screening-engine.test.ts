import { VendorRiskScreeningEngine } from '../../../operations/supply/risk/vendor-risk-screening-engine';
import { SanctionsChecker } from '../../../operations/supply/risk/sanctions-checker';

describe('VendorRiskScreeningEngine & Sanctions (SUPPLY-005)', () => {
  let engine: VendorRiskScreeningEngine;
  let sanctionsChecker: SanctionsChecker;

  beforeEach(() => {
    engine = VendorRiskScreeningEngine.getInstance();
    sanctionsChecker = SanctionsChecker.getInstance();
  });

  it('should calculate string similarity using Jaro-Winkler with high accuracy', () => {
    const simExact = sanctionsChecker.calculateStringSimilarity('Apex Scientific', 'Apex Scientific');
    expect(simExact).toBe(1.0);

    const simFuzzy = sanctionsChecker.calculateStringSimilarity('Vanguard Shadow Shipping', 'Vanguard Shadow Maritime LLC');
    expect(simFuzzy).toBeGreaterThan(0.7);
  });

  it('should intercept sanctions listed entity and recommend rejection', () => {
    const assessment = engine.screenVendor({
      vendorId: 'ven-bad',
      vendorName: 'Vanguard Shadow Shipping',
      taxId: 'PAN-99901',
      country: 'Panama',
      yearsInBusiness: 3,
      creditScore: 500,
      priorDiscrepancyRate: 0.25,
      activeLawsuitsCount: 2,
      certificationsCount: 0,
    });

    expect(assessment.sanctionsMatched).toBe(true);
    expect(assessment.overallRiskScore).toBe(100.0);
    expect(assessment.recommendedAction).toBe('reject');
  });

  it('should approve legitimate low-risk compliant vendors', () => {
    const assessment = engine.screenVendor({
      vendorId: 'ven-good',
      vendorName: 'Boston Educational Supplies Corp',
      taxId: 'US-7788990',
      country: 'USA',
      yearsInBusiness: 15,
      creditScore: 810,
      priorDiscrepancyRate: 0.01,
      activeLawsuitsCount: 0,
      certificationsCount: 3,
    });

    expect(assessment.sanctionsMatched).toBe(false);
    expect(assessment.overallRiskScore).toBeLessThan(35.0);
    expect(assessment.recommendedAction).toBe('approve');
  });
});
