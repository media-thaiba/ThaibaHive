import { db, taxJurisdictions, taxRateOverrides, eq, and, lte, or, isNull, gte } from "@/db";
import { randomUUID } from "crypto";

export interface TaxCalculationResult {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  jurisdictionCode?: string;
  isOverrideApplied: boolean;
  overrideReason?: string;
}

export class TaxRateEngine {
  private static instance: TaxRateEngine;

  private constructor() {}

  public static getInstance(): TaxRateEngine {
    if (!TaxRateEngine.instance) {
      TaxRateEngine.instance = new TaxRateEngine();
    }
    return TaxRateEngine.instance;
  }

  /**
   * Determine effective tax rate for a specific institution, category, and date.
   */
  async getEffectiveTaxRate(
    institutionId: string,
    category: "tuition" | "hostel" | "transport" | "supplies" | "services" | "general",
    jurisdictionId?: string,
    asOfDate: string = new Date().toISOString()
  ): Promise<{ rate: number; isOverride: boolean; jurisdictionCode?: string; reason?: string }> {
    // 1. Check for active institution-level override
    const overrides = await db
      .select()
      .from(taxRateOverrides)
      .where(
        and(
          eq(taxRateOverrides.institutionId, institutionId),
          eq(taxRateOverrides.category, category),
          eq(taxRateOverrides.isActive, true),
          lte(taxRateOverrides.effectiveFrom, asOfDate),
          or(
            isNull(taxRateOverrides.effectiveTo),
            gte(taxRateOverrides.effectiveTo, asOfDate)
          )
        )
      );

    if (overrides.length > 0) {
      const bestOverride = overrides[0];
      return {
        rate: bestOverride.overrideRate,
        isOverride: true,
        reason: bestOverride.exemptionReason || "Institution Category Override",
      };
    }

    // 2. Fall back to jurisdiction default rate
    if (jurisdictionId) {
      const jurList = await db
        .select()
        .from(taxJurisdictions)
        .where(and(eq(taxJurisdictions.id, jurisdictionId), eq(taxJurisdictions.isActive, true)));

      if (jurList.length > 0) {
        return {
          rate: jurList[0].defaultTaxRate,
          isOverride: false,
          jurisdictionCode: jurList[0].taxCode,
        };
      }
    }

    // 3. Fallback standard default rate (0.0)
    return {
      rate: 0.0,
      isOverride: false,
    };
  }

  /**
   * Compute tax breakdown for a financial amount.
   */
  async calculateTax(
    baseAmount: number,
    institutionId: string,
    category: "tuition" | "hostel" | "transport" | "supplies" | "services" | "general",
    jurisdictionId?: string,
    asOfDate: string = new Date().toISOString()
  ): Promise<TaxCalculationResult> {
    const { rate, isOverride, jurisdictionCode, reason } = await this.getEffectiveTaxRate(
      institutionId,
      category,
      jurisdictionId,
      asOfDate
    );

    const taxAmount = Number((baseAmount * rate).toFixed(2));
    const totalAmount = Number((baseAmount + taxAmount).toFixed(2));

    return {
      baseAmount,
      taxRate: rate,
      taxAmount,
      totalAmount,
      jurisdictionCode,
      isOverrideApplied: isOverride,
      overrideReason: reason,
    };
  }

  /**
   * Create a new tax jurisdiction
   */
  async createJurisdiction(input: {
    countryCode: string;
    regionCode: string;
    jurisdictionName: string;
    defaultTaxRate: number;
    taxCode: string;
    description?: string;
  }) {
    const id = `jur-${randomUUID()}`;
    const [created] = await db
      .insert(taxJurisdictions)
      .values({
        id,
        countryCode: input.countryCode.toUpperCase(),
        regionCode: input.regionCode.toUpperCase(),
        jurisdictionName: input.jurisdictionName,
        defaultTaxRate: input.defaultTaxRate,
        taxCode: input.taxCode.toUpperCase(),
        description: input.description,
        isActive: true,
      })
      .returning();
    return created;
  }

  /**
   * Create an institution tax override
   */
  async createOverride(input: {
    institutionId: string;
    jurisdictionId: string;
    category: "tuition" | "hostel" | "transport" | "supplies" | "services" | "general";
    overrideRate: number;
    exemptionReason?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    approvedById?: string;
  }) {
    const id = `tax-ovr-${randomUUID()}`;
    const [created] = await db
      .insert(taxRateOverrides)
      .values({
        id,
        institutionId: input.institutionId,
        jurisdictionId: input.jurisdictionId,
        category: input.category,
        overrideRate: input.overrideRate,
        exemptionReason: input.exemptionReason,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        approvedById: input.approvedById,
        isActive: true,
      })
      .returning();
    return created;
  }
}

export const taxRateEngine = TaxRateEngine.getInstance();
