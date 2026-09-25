import { FeeDbStore } from '../../../db/fee-store';
import { ScholarshipEngine } from '../../operations/finance/scholarships/scholarship-engine';
import { FeeScholarshipItem, FeeStructureItem, FeeStudentAllocationItem } from '../../operations/finance/types';

describe('ScholarshipEngine (Sprint-057 - FEE-012)', () => {
  let store: FeeDbStore;
  let engine: ScholarshipEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new ScholarshipEngine(store);
  });

  it('should calculate 50% tuition scholarship and enforce budget ceilings', async () => {
    const structure: FeeStructureItem = {
      id: 'struct-1',
      institutionId: 'inst-1',
      name: 'B.Sc 2026',
      code: 'BSC-2026',
      academicYear: '2026-2027',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 100000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'c1',
          feeStructureId: 'struct-1',
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 80000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          feeStructureId: 'struct-1',
          name: 'Hostel Fee',
          componentType: 'hostel',
          amount: 20000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4200-HOSTEL',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const scholarship: FeeScholarshipItem = {
      id: 'sch-merit-50',
      institutionId: 'inst-1',
      name: 'Merit 50% Tuition Waiver',
      code: 'MERIT-50',
      category: 'merit',
      discountType: 'percentage',
      discountValue: 50,
      targetComponentType: 'tuition',
      totalBudget: 500000,
      disbursedAmount: 0,
      academicYear: '2026-2027',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createFeeStructure(structure);
    await store.createScholarship(scholarship);

    // Concession on tuition component (50% of 80,000 = 40,000)
    const concessionAmt = engine.calculateConcessionAmount(scholarship, structure, 'tuition');
    expect(concessionAmt).toBe(40000);

    // Budget check
    expect(engine.hasAvailableBudget(scholarship, 40000)).toBe(true);
    expect(engine.hasAvailableBudget(scholarship, 600000)).toBe(false);
  });
});
