import {
  db,
  payrollSalaryStructures,
  payrollRecords,
  payrollDeductions,
  eq,
} from "@/db";
import { createHash, randomUUID } from "crypto";

export interface ComputedPayBreakdown {
  baseSalary: number;
  hraAllowance: number;
  daAllowance: number;
  specialAllowance: number;
  grossEarnings: number;
  pfDeduction: number;
  professionalTax: number;
  incomeTax: number;
  totalDeductions: number;
  netPayable: number;
}

export class PayrollEngine {
  private static instance: PayrollEngine;

  private constructor() {}

  public static getInstance(): PayrollEngine {
    if (!PayrollEngine.instance) {
      PayrollEngine.instance = new PayrollEngine();
    }
    return PayrollEngine.instance;
  }

  /**
   * Calculate statutory deduction and net pay breakdown
   */
  computeBreakdown(structure: {
    baseSalary: number;
    hraAllowance: number;
    daAllowance: number;
    specialAllowance: number;
    pfDeductionRate: number;
    taxBracketCode?: string;
  }): ComputedPayBreakdown {
    const base = structure.baseSalary;
    const hra = structure.hraAllowance || 0;
    const da = structure.daAllowance || 0;
    const special = structure.specialAllowance || 0;
    const grossEarnings = Number((base + hra + da + special).toFixed(2));

    const pfRate = structure.pfDeductionRate ?? 0.12;
    const pfDeduction = Number((base * pfRate).toFixed(2));

    // Standard statutory PT and TDS estimate based on gross
    const professionalTax = grossEarnings > 15000 ? 200 : 0;
    const incomeTax = grossEarnings > 50000 ? Number((grossEarnings * 0.1).toFixed(2)) : 0;

    const totalDeductions = Number((pfDeduction + professionalTax + incomeTax).toFixed(2));
    const netPayable = Number((grossEarnings - totalDeductions).toFixed(2));

    return {
      baseSalary: base,
      hraAllowance: hra,
      daAllowance: da,
      specialAllowance: special,
      grossEarnings,
      pfDeduction,
      professionalTax,
      incomeTax,
      totalDeductions,
      netPayable,
    };
  }

  /**
   * Configure a salary structure for an employee
   */
  async createOrUpdateSalaryStructure(input: {
    institutionId: string;
    staffId: string;
    baseSalary: number;
    hraAllowance?: number;
    daAllowance?: number;
    specialAllowance?: number;
    pfDeductionRate?: number;
    taxBracketCode?: string;
    currency?: string;
    effectiveDate: string;
  }) {
    const id = `sal-struct-${randomUUID()}`;
    const [structure] = await db
      .insert(payrollSalaryStructures)
      .values({
        id,
        institutionId: input.institutionId,
        staffId: input.staffId,
        baseSalary: input.baseSalary,
        hraAllowance: input.hraAllowance ?? 0,
        daAllowance: input.daAllowance ?? 0,
        specialAllowance: input.specialAllowance ?? 0,
        pfDeductionRate: input.pfDeductionRate ?? 0.12,
        taxBracketCode: input.taxBracketCode ?? "STANDARD",
        currency: input.currency ?? "INR",
        effectiveDate: input.effectiveDate,
      })
      .onConflictDoUpdate({
        target: [payrollSalaryStructures.staffId, payrollSalaryStructures.effectiveDate],
        set: {
          baseSalary: input.baseSalary,
          hraAllowance: input.hraAllowance ?? 0,
          daAllowance: input.daAllowance ?? 0,
          specialAllowance: input.specialAllowance ?? 0,
          pfDeductionRate: input.pfDeductionRate ?? 0.12,
          taxBracketCode: input.taxBracketCode ?? "STANDARD",
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    return structure;
  }

  /**
   * Batch generate monthly payroll records for an institution
   */
  async generateMonthlyPayroll(
    institutionId: string,
    year: number,
    month: number,
    specificStaffIds?: string[]
  ) {
    // 1. Fetch relevant salary structures
    const query = db
      .select()
      .from(payrollSalaryStructures)
      .where(eq(payrollSalaryStructures.institutionId, institutionId));

    const structures = await query;
    const targetStructures = specificStaffIds?.length
      ? structures.filter((s) => specificStaffIds.includes(s.staffId))
      : structures;

    const generatedRecords = [];

    for (const struct of targetStructures) {
      const breakdown = this.computeBreakdown(struct);
      const recordId = `pay-rec-${randomUUID()}`;
      const now = new Date().toISOString();

      const auditData = `${institutionId}:${struct.staffId}:${year}:${month}:${breakdown.netPayable}:${now}`;
      const auditHash = createHash("sha256").update(auditData).digest("hex");

      const [record] = await db
        .insert(payrollRecords)
        .values({
          id: recordId,
          institutionId,
          staffId: struct.staffId,
          payPeriodMonth: month,
          payPeriodYear: year,
          grossEarnings: breakdown.grossEarnings,
          totalDeductions: breakdown.totalDeductions,
          taxDeduction: breakdown.incomeTax,
          netPayable: breakdown.netPayable,
          status: "draft",
          auditHash,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [payrollRecords.staffId, payrollRecords.payPeriodYear, payrollRecords.payPeriodMonth],
          set: {
            grossEarnings: breakdown.grossEarnings,
            totalDeductions: breakdown.totalDeductions,
            taxDeduction: breakdown.incomeTax,
            netPayable: breakdown.netPayable,
            auditHash,
            updatedAt: now,
          },
        })
        .returning();

      // Insert itemized deductions
      await db.insert(payrollDeductions).values([
        {
          id: `ded-${randomUUID()}`,
          payrollRecordId: record.id,
          deductionType: "provident_fund",
          amount: breakdown.pfDeduction,
          description: "Statutory Provident Fund Contribution",
          createdAt: now,
        },
        {
          id: `ded-${randomUUID()}`,
          payrollRecordId: record.id,
          deductionType: "professional_tax",
          amount: breakdown.professionalTax,
          description: "Professional Tax",
          createdAt: now,
        },
        {
          id: `ded-${randomUUID()}`,
          payrollRecordId: record.id,
          deductionType: "income_tax",
          amount: breakdown.incomeTax,
          description: "Tax Deducted at Source (TDS)",
          createdAt: now,
        },
      ]);

      generatedRecords.push(record);
    }

    return generatedRecords;
  }

  /**
   * Update payroll record status (disburse / approve)
   */
  async updateRecordStatus(
    recordId: string,
    status: "draft" | "approved" | "disbursed" | "voided",
    approvedById?: string,
    paymentReference?: string
  ) {
    const now = new Date().toISOString();
    const [updated] = await db
      .update(payrollRecords)
      .set({
        status,
        approvedById: status === "approved" ? approvedById : undefined,
        paymentReference: status === "disbursed" ? paymentReference : undefined,
        disbursedAt: status === "disbursed" ? now : undefined,
        updatedAt: now,
      })
      .where(eq(payrollRecords.id, recordId))
      .returning();

    return updated;
  }
}

export const payrollEngine = PayrollEngine.getInstance();
