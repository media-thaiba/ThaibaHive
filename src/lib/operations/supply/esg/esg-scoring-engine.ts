import { SupplyVendorEsgScoreItem, EsgRatingGrade } from '../supply-types';

export interface VendorEsgAuditInput {
  vendorId: string;
  hasIso14001: boolean; // Environmental Management
  hasRenewableEnergyCommitment: boolean;
  recycledPackagingPercent: number;
  hasFairLaborCert: boolean; // Fair labor / anti-sweatshop
  diversityOwnershipCertified: boolean;
  hasAntiBriberyPolicy: boolean; // Governance
  hasTransparentAuditedFinances: boolean;
  scope3CarbonIntensityKgPerUsd: number;
}

export class EsgScoringEngine {
  private static instance: EsgScoringEngine;

  public static getInstance(): EsgScoringEngine {
    if (!EsgScoringEngine.instance) {
      EsgScoringEngine.instance = new EsgScoringEngine();
    }
    return EsgScoringEngine.instance;
  }

  public evaluateEsgScore(input: VendorEsgAuditInput, institutionId = 'global'): SupplyVendorEsgScoreItem {
    // 1. Environmental Score (0 - 100)
    let envScore = 30.0;
    if (input.hasIso14001) envScore += 30.0;
    if (input.hasRenewableEnergyCommitment) envScore += 20.0;
    envScore += Math.min(20.0, (input.recycledPackagingPercent / 100) * 20.0);
    envScore = Math.min(100.0, envScore);

    // 2. Social Score (0 - 100)
    let socScore = 30.0;
    if (input.hasFairLaborCert) socScore += 45.0;
    if (input.diversityOwnershipCertified) socScore += 25.0;
    socScore = Math.min(100.0, socScore);

    // 3. Governance Score (0 - 100)
    let govScore = 30.0;
    if (input.hasAntiBriberyPolicy) govScore += 35.0;
    if (input.hasTransparentAuditedFinances) govScore += 35.0;
    govScore = Math.min(100.0, govScore);

    // Weighted Composite: Environmental (40%) + Social (30%) + Governance (30%)
    const compositeEsgScore = Number((envScore * 0.4 + socScore * 0.3 + govScore * 0.3).toFixed(1));

    let ratingGrade: EsgRatingGrade = 'CCC';
    if (compositeEsgScore >= 90.0) ratingGrade = 'AAA';
    else if (compositeEsgScore >= 80.0) ratingGrade = 'AA';
    else if (compositeEsgScore >= 70.0) ratingGrade = 'A';
    else if (compositeEsgScore >= 60.0) ratingGrade = 'BBB';
    else if (compositeEsgScore >= 50.0) ratingGrade = 'BB';
    else if (compositeEsgScore >= 40.0) ratingGrade = 'B';

    const scoreId = `esg-score-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: scoreId,
      scoreId,
      vendorId: input.vendorId,
      compositeEsgScore,
      environmentalScore: envScore,
      socialScore: socScore,
      governanceScore: govScore,
      scope3CarbonIntensityKgPerUsd: input.scope3CarbonIntensityKgPerUsd,
      recycledMaterialPercentage: input.recycledPackagingPercent,
      fairLaborCertified: input.hasFairLaborCert,
      ratingGrade,
      auditYear: new Date().getFullYear(),
      institutionId,
      createdAt: new Date().toISOString(),
    };
  }
}
