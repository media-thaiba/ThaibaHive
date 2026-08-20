export interface ExperimentVariant {
  variantId: string;
  name: string;
  subject?: string;
  bodyTemplateId?: string;
  channel?: string;
  trafficWeight: number; // e.g. 0.5 for 50%
}

export interface ExperimentStats {
  variantId: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentEvaluation {
  experimentId: string;
  variants: ExperimentStats[];
  winningVariantId: string | null;
  statisticalSignificance: number; // 0.0 to 1.0 (1 - p-value)
  pValue: number;
  isSignificant: boolean;
  zScore: number;
}

export class AbTestingEngine {
  private static instance: AbTestingEngine;
  private experiments: Map<string, { variants: ExperimentVariant[]; stats: Map<string, { impressions: number; conversions: number }> }> = new Map();

  public static getInstance(): AbTestingEngine {
    if (!AbTestingEngine.instance) {
      AbTestingEngine.instance = new AbTestingEngine();
    }
    return AbTestingEngine.instance;
  }

  public registerExperiment(experimentId: string, variants: ExperimentVariant[]): void {
    const statsMap = new Map();
    for (const v of variants) {
      statsMap.set(v.variantId, { impressions: 0, conversions: 0 });
    }
    this.experiments.set(experimentId, { variants, stats: statsMap });
  }

  public assignVariant(experimentId: string, recipientId: string): ExperimentVariant | null {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.variants.length === 0) return null;

    // Deterministic hash assignment
    let hash = 0;
    const combined = `${experimentId}:${recipientId}`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const normalized = (Math.abs(hash) % 1000) / 1000;

    let cumulative = 0;
    for (const variant of exp.variants) {
      cumulative += variant.trafficWeight;
      if (normalized <= cumulative) {
        const s = exp.stats.get(variant.variantId);
        if (s) s.impressions++;
        return variant;
      }
    }

    const fallback = exp.variants[0];
    const s = exp.stats.get(fallback.variantId);
    if (s) s.impressions++;
    return fallback;
  }

  public recordImpression(experimentId: string, variantId: string, count = 1): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) return;
    const s = exp.stats.get(variantId);
    if (s) s.impressions += count;
  }

  public recordConversion(experimentId: string, variantId: string, count = 1): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) return;
    const s = exp.stats.get(variantId);
    if (s) s.conversions += count;
  }

  /**
   * Two-Proportion Z-Test evaluating difference between variant A and variant B
   */
  public calculateTwoProportionZTest(
    n1: number,
    x1: number,
    n2: number,
    x2: number
  ): { zScore: number; pValue: number } {
    if (n1 === 0 || n2 === 0) return { zScore: 0, pValue: 1.0 };

    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pPooled = (x1 + x2) / (n1 + n2);

    if (pPooled === 0 || pPooled === 1) return { zScore: 0, pValue: 1.0 };

    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
    if (se === 0) return { zScore: 0, pValue: 1.0 };

    const z = (p1 - p2) / se;
    const absZ = Math.abs(z);

    // Standard normal CDF approximation (Abramowitz & Stegun formula 7.1.26)
    const t = 1.0 / (1.0 + 0.2316419 * absZ);
    const d = 0.3989422804014327 * Math.exp((-absZ * absZ) / 2.0);
    const prob = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const pValue = Math.min(1.0, Math.max(0.0, 2.0 * prob));

    return { zScore: parseFloat(z.toFixed(4)), pValue: parseFloat(pValue.toFixed(4)) };
  }

  public evaluateExperiment(experimentId: string): ExperimentEvaluation | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;

    const variantStats: ExperimentStats[] = exp.variants.map((v) => {
      const s = exp.stats.get(v.variantId) || { impressions: 0, conversions: 0 };
      const cr = s.impressions > 0 ? s.conversions / s.impressions : 0;
      return {
        variantId: v.variantId,
        impressions: s.impressions,
        conversions: s.conversions,
        conversionRate: parseFloat(cr.toFixed(4)),
      };
    });

    let totalImpressions = 0;
    for (const stat of variantStats) {
      totalImpressions += stat.impressions;
    }

    let winningVariantId: string | null = null;
    let zScore = 0;
    let pValue = 1.0;
    let isSignificant = false;

    if (variantStats.length >= 2) {
      const [v1, v2] = variantStats;
      const testRes = this.calculateTwoProportionZTest(
        v1.impressions,
        v1.conversions,
        v2.impressions,
        v2.conversions
      );

      zScore = testRes.zScore;
      pValue = testRes.pValue;

      // Contract rule: N >= 100 and p-value < 0.05
      isSignificant = totalImpressions >= 100 && pValue < 0.05;

      if (v1.conversionRate > v2.conversionRate) {
        winningVariantId = v1.variantId;
      } else if (v2.conversionRate > v1.conversionRate) {
        winningVariantId = v2.variantId;
      }
    }

    return {
      experimentId,
      variants: variantStats,
      winningVariantId,
      statisticalSignificance: parseFloat((1.0 - pValue).toFixed(4)),
      pValue,
      isSignificant,
      zScore,
    };
  }
}
