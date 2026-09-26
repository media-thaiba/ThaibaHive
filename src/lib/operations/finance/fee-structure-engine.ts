import { FeeDbStore } from '../../../db/fee-store';
import {
  FeeStructureItem,
  FeeStudentAllocationItem,
  FeeQuota,
  ResidentialType,
  ComponentType,
} from './types';

export interface StudentProfileForFee {
  studentId: string;
  institutionId: string;
  academicYear: string;
  programId?: string | null;
  gradeLevel?: string | null;
  quota: FeeQuota;
  residentialType: ResidentialType;
  selectedOptionalComponentIds?: string[];
  joiningDate?: string;
  academicYearStartDate?: string;
  academicYearEndDate?: string;
}

export interface FeeCalculationResult {
  baseTotalAmount: number;
  mandatoryTotalAmount: number;
  optionalTotalAmount: number;
  totalTaxAmount: number;
  grossPayableAmount: number;
  componentBreakdown: Array<{
    componentId: string;
    name: string;
    componentType: ComponentType;
    baseAmount: number;
    taxRatePercent: number;
    taxAmount: number;
    totalAmount: number;
    isMandatory: boolean;
    glAccountCode: string;
  }>;
}

export class FeeStructureEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Resolves the best matching fee structure for a student profile
   */
  public async resolveStructureForStudent(
    profile: StudentProfileForFee
  ): Promise<FeeStructureItem | null> {
    const structures = await this.store.listFeeStructures(
      profile.institutionId,
      profile.academicYear
    );

    // Filter by match score
    const matching = structures.filter((s) => {
      if (!s.isActive) return false;
      if (s.quota !== profile.quota && s.quota !== 'general') return false;
      if (s.residentialType !== profile.residentialType && s.residentialType !== 'day_scholar') return false;
      if (profile.gradeLevel && s.gradeLevel && s.gradeLevel !== profile.gradeLevel) return false;
      if (profile.programId && s.programId && s.programId !== profile.programId) return false;
      return true;
    });

    if (matching.length === 0) return null;

    // Prefer exact match on quota and residentialType
    matching.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.quota === profile.quota) scoreA += 2;
      if (a.residentialType === profile.residentialType) scoreA += 2;
      if (a.programId === profile.programId) scoreA += 1;
      if (a.gradeLevel === profile.gradeLevel) scoreA += 1;

      if (b.quota === profile.quota) scoreB += 2;
      if (b.residentialType === profile.residentialType) scoreB += 2;
      if (b.programId === profile.programId) scoreB += 1;
      if (b.gradeLevel === profile.gradeLevel) scoreB += 1;

      return scoreB - scoreA;
    });

    return matching[0];
  }

  /**
   * Calculates component-wise and total fee for a student
   */
  public calculateFee(
    structure: FeeStructureItem,
    profile: StudentProfileForFee
  ): FeeCalculationResult {
    const components = structure.components || [];
    let baseTotal = 0;
    let mandatoryTotal = 0;
    let optionalTotal = 0;
    let totalTax = 0;

    const breakdown = components.map((comp) => {
      const isSelected = comp.isMandatory || (profile.selectedOptionalComponentIds?.includes(comp.id) ?? false);
      const effectiveBase = isSelected ? comp.amount : 0;
      const tax = (effectiveBase * (comp.taxRatePercent || 0)) / 100;
      const total = effectiveBase + tax;

      if (isSelected) {
        baseTotal += effectiveBase;
        if (comp.isMandatory) {
          mandatoryTotal += total;
        } else {
          optionalTotal += total;
        }
        totalTax += tax;
      }

      return {
        componentId: comp.id,
        name: comp.name,
        componentType: comp.componentType,
        baseAmount: effectiveBase,
        taxRatePercent: comp.taxRatePercent || 0,
        taxAmount: tax,
        totalAmount: total,
        isMandatory: comp.isMandatory,
        glAccountCode: comp.glAccountCode,
      };
    });

    return {
      baseTotalAmount: baseTotal,
      mandatoryTotalAmount: mandatoryTotal,
      optionalTotalAmount: optionalTotal,
      totalTaxAmount: totalTax,
      grossPayableAmount: baseTotal + totalTax,
      componentBreakdown: breakdown,
    };
  }

  /**
   * Calculates prorated fee if student joined mid-session
   */
  public calculateProratedFee(
    fullFee: number,
    joiningDate: string,
    sessionStartDate: string,
    sessionEndDate: string
  ): number {
    const start = new Date(sessionStartDate).getTime();
    const end = new Date(sessionEndDate).getTime();
    const join = new Date(joiningDate).getTime();

    if (join <= start) return fullFee;
    if (join >= end) return 0;

    const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, (end - join) / (1000 * 60 * 60 * 24));

    const factor = remainingDays / totalDays;
    return Math.round(fullFee * factor * 100) / 100;
  }

  /**
   * Allocates fee structure to student and persists record
   */
  public async allocateFeeStructureToStudent(
    profile: StudentProfileForFee,
    structureId?: string,
    customConcessionAmount: number = 0
  ): Promise<FeeStudentAllocationItem> {
    let structure: FeeStructureItem | null = null;
    if (structureId) {
      structure = await this.store.getFeeStructureById(structureId, profile.institutionId);
    } else {
      structure = await this.resolveStructureForStudent(profile);
    }

    if (!structure) {
      throw new Error(`No applicable fee structure found for student ${profile.studentId}`);
    }

    const calc = this.calculateFee(structure, profile);
    let baseAmount = calc.grossPayableAmount;

    // Proration check
    if (profile.joiningDate && profile.academicYearStartDate && profile.academicYearEndDate) {
      baseAmount = this.calculateProratedFee(
        baseAmount,
        profile.joiningDate,
        profile.academicYearStartDate,
        profile.academicYearEndDate
      );
    }

    const netPayable = Math.max(0, baseAmount - customConcessionAmount);

    const allocation: FeeStudentAllocationItem = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      institutionId: profile.institutionId,
      studentId: profile.studentId,
      feeStructureId: structure.id,
      academicYear: profile.academicYear,
      baseAmount,
      concessionAmount: customConcessionAmount,
      netPayableAmount: netPayable,
      paidAmount: 0,
      balanceAmount: netPayable,
      status: netPayable === 0 ? 'paid' : 'unpaid',
      allocationDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.createAllocation(allocation);
    return allocation;
  }
}
