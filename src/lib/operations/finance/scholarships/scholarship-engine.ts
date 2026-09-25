import { FeeDbStore } from '../../../../db/fee-store';
import {
  FeeScholarshipItem,
  FeeStructureItem,
  FeeConcessionItem,
  ScholarshipCategory,
  DiscountType,
} from '../types';

export interface ScholarshipApplicationParams {
  institutionId: string;
  studentId: string;
  scholarshipId: string;
  allocationId: string;
  appliedById: string;
  reason: string;
  supportingDocUrl?: string;
  studentGpa?: number;
  familyIncomeAnnual?: number;
  siblingCountInCampus?: number;
}

export class ScholarshipEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Evaluates eligibility and computes concession amount for a scholarship
   */
  public calculateConcessionAmount(
    scholarship: FeeScholarshipItem,
    structure: FeeStructureItem,
    targetComponentType?: string
  ): number {
    let applicableBase = structure.totalAmount;

    // If targetComponentType specified (e.g. 'tuition'), discount applies only to that component
    if (targetComponentType && structure.components) {
      const matchingComp = structure.components.find((c) => c.componentType === targetComponentType);
      if (matchingComp) {
        applicableBase = matchingComp.amount;
      }
    }

    let calculatedAmount = 0;
    if (scholarship.discountType === 'percentage') {
      calculatedAmount = (applicableBase * scholarship.discountValue) / 100;
    } else {
      calculatedAmount = Math.min(applicableBase, scholarship.discountValue);
    }

    return Math.round(calculatedAmount * 100) / 100;
  }

  /**
   * Checks if scholarship budget ceiling has capacity
   */
  public hasAvailableBudget(scholarship: FeeScholarshipItem, amountToDisburse: number): boolean {
    if (scholarship.totalBudget <= 0) return true; // Unlimited budget
    return scholarship.disbursedAmount + amountToDisburse <= scholarship.totalBudget;
  }

  /**
   * Submits a new scholarship concession application
   */
  public async submitConcessionApplication(
    params: ScholarshipApplicationParams
  ): Promise<FeeConcessionItem> {
    const scholarship = await this.store['memoryStore']?.scholarships.get(params.scholarshipId);
    if (!scholarship || !scholarship.isActive) {
      throw new Error(`Scholarship ${params.scholarshipId} is not active or found`);
    }

    const allocation = await this.store.getAllocationById(params.allocationId, params.institutionId);
    if (!allocation) {
      throw new Error(`Fee allocation ${params.allocationId} not found`);
    }

    const structure = await this.store.getFeeStructureById(allocation.feeStructureId, params.institutionId);
    if (!structure) {
      throw new Error(`Fee structure ${allocation.feeStructureId} not found`);
    }

    const calculatedAmount = this.calculateConcessionAmount(
      scholarship,
      structure,
      scholarship.targetComponentType
    );

    if (!this.hasAvailableBudget(scholarship, calculatedAmount)) {
      throw new Error(
        `Scholarship budget ceiling reached. Available: ₹${scholarship.totalBudget - scholarship.disbursedAmount}, Requested: ₹${calculatedAmount}`
      );
    }

    const concession: FeeConcessionItem = {
      id: `conc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      institutionId: params.institutionId,
      studentId: params.studentId,
      scholarshipId: params.scholarshipId,
      allocationId: params.allocationId,
      amount: calculatedAmount,
      reason: params.reason,
      supportingDocUrl: params.supportingDocUrl,
      status: 'pending',
      appliedById: params.appliedById,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.createConcession(concession);
    return concession;
  }
}
