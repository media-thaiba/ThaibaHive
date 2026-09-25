import { SupplyVendorRiskAssessmentItem } from '../supply-types';
import { SanctionsChecker } from './sanctions-checker';
import { VendorRiskInput } from './risk-types';

export class VendorRiskScreeningEngine {
  private static instance: VendorRiskScreeningEngine;
  private sanctionsChecker: SanctionsChecker;

  private constructor() {
    this.sanctionsChecker = SanctionsChecker.getInstance();
  }

  public static getInstance(): VendorRiskScreeningEngine {
    if (!VendorRiskScreeningEngine.instance) {
      VendorRiskScreeningEngine.instance = new VendorRiskScreeningEngine();
    }
    return VendorRiskScreeningEngine.instance;
  }

  public screenVendor(input: VendorRiskInput, institutionId = 'global'): SupplyVendorRiskAssessmentItem {
    const sanctionsResult = this.sanctionsChecker.checkEntity(input.vendorName);

    // 1. Financial Risk Score (0 - 100): Lower credit score = Higher risk
    // Credit score 300 -> risk 100, 850 -> risk 0
    const normalizedCredit = Math.max(300, Math.min(850, input.creditScore));
    const financialRisk = Number((((850 - normalizedCredit) / 550) * 100).toFixed(1));

    // 2. Compliance Risk Score (0 - 100): Lawsuits + missing certs + sanctions
    let complianceRisk = input.activeLawsuitsCount * 25.0 + Math.max(0, 3 - input.certificationsCount) * 15.0;
    if (sanctionsResult.hasMatch) {
      complianceRisk = 100.0;
    }
    complianceRisk = Math.min(100.0, complianceRisk);

    // 3. Operational Risk Score (0 - 100): Discrepancy rate + business age
    const ageFactor = Math.max(0, 10 - input.yearsInBusiness) * 4.0;
    const discrepancyFactor = input.priorDiscrepancyRate * 100.0;
    const operationalRisk = Math.min(100.0, Number((ageFactor + discrepancyFactor).toFixed(1)));

    // Overall Weighted Composite: Financial (30%) + Compliance (35%) + Operational (35%)
    let overallRiskScore = financialRisk * 0.3 + complianceRisk * 0.35 + operationalRisk * 0.35;
    if (sanctionsResult.hasMatch) {
      overallRiskScore = 100.0;
    }
    overallRiskScore = Number(overallRiskScore.toFixed(1));

    let recommendedAction: 'approve' | 'flag_for_review' | 'reject' = 'approve';
    if (sanctionsResult.hasMatch || overallRiskScore >= 70.0) {
      recommendedAction = 'reject';
    } else if (overallRiskScore >= 35.0) {
      recommendedAction = 'flag_for_review';
    }

    const assessmentId = `risk-assmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: assessmentId,
      assessmentId,
      vendorId: input.vendorId,
      overallRiskScore,
      financialRiskScore: financialRisk,
      complianceRiskScore: complianceRisk,
      operationalRiskScore: operationalRisk,
      sanctionsRegistryChecked: sanctionsResult.registryChecked,
      sanctionsMatched: sanctionsResult.hasMatch,
      pepMatched: false,
      adverseMediaFindings: sanctionsResult.hasMatch
        ? `Entity matched against ${sanctionsResult.matchedEntity?.registry}: ${sanctionsResult.matchedEntity?.reason}`
        : null,
      recommendedAction,
      assessedByUserId: 'SYSTEM_AUTOMATED_RISK_INTERCEPTOR',
      institutionId,
      createdAt: new Date().toISOString(),
    };
  }
}
