import { FeeDbStore } from '../../../db/fee-store';
import { FeeStructureEngine, StudentProfileForFee } from '../../operations/finance/fee-structure-engine';
import { FeeStructureItem } from '../../operations/finance/types';

describe('FeeStructureEngine (Sprint-057 - FEE-003)', () => {
  let store: FeeDbStore;
  let engine: FeeStructureEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new FeeStructureEngine(store);
  });

  it('should resolve and calculate fee with mandatory and optional components and taxes', async () => {
    const structure: FeeStructureItem = {
      id: 'struct-btech-2026',
      institutionId: 'campus-al-ameer',
      name: 'B.Tech IT 2026-2027',
      code: 'BTECH-IT-2026',
      academicYear: '2026-2027',
      programId: 'prog-btech-it',
      gradeLevel: 'Year 1',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 150000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'comp-tui',
          feeStructureId: 'struct-btech-2026',
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 100000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'comp-trans',
          feeStructureId: 'struct-btech-2026',
          name: 'AC Bus Transport',
          componentType: 'transport',
          amount: 25000,
          isMandatory: false,
          isRefundable: true,
          taxRatePercent: 5,
          glAccountCode: 'GL:4300-TRANSPORT',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'comp-lab',
          feeStructureId: 'struct-btech-2026',
          name: 'Advanced AI & IoT Lab',
          componentType: 'lab',
          amount: 20000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 18,
          glAccountCode: 'GL:4200-LAB',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await store.createFeeStructure(structure);

    const profile: StudentProfileForFee = {
      studentId: 'stud-2026-001',
      institutionId: 'campus-al-ameer',
      academicYear: '2026-2027',
      programId: 'prog-btech-it',
      gradeLevel: 'Year 1',
      quota: 'general',
      residentialType: 'day_scholar',
      selectedOptionalComponentIds: ['comp-trans'],
    };

    const resolved = await engine.resolveStructureForStudent(profile);
    expect(resolved).not.toBeNull();
    expect(resolved?.code).toBe('BTECH-IT-2026');

    const result = engine.calculateFee(resolved!, profile);

    // Mandatory: Tuition (100k + 0 tax) + Lab (20k + 3.6k tax) = 123.6k
    // Optional: Transport (25k + 1.25k tax) = 26.25k
    // Total Gross = 149.85k
    expect(result.mandatoryTotalAmount).toBe(123600);
    expect(result.optionalTotalAmount).toBe(26250);
    expect(result.grossPayableAmount).toBe(149850);
    expect(result.totalTaxAmount).toBe(4850);
  });

  it('should accurately prorate fees for mid-session admissions', () => {
    const fullFee = 120000;
    const sessionStart = '2026-06-01';
    const sessionEnd = '2027-05-31'; // ~364 days
    const midJoin = '2026-12-01'; // ~181 days remaining (~50%)

    const prorated = engine.calculateProratedFee(fullFee, midJoin, sessionStart, sessionEnd);
    expect(prorated).toBeLessThan(fullFee);
    expect(prorated).toBeGreaterThan(50000);
    expect(prorated).toBeLessThan(65000);
  });

  it('should allocate fee structure with concession to student record', async () => {
    const structure: FeeStructureItem = {
      id: 'struct-btech-reg',
      institutionId: 'campus-al-ameer',
      name: 'Standard B.Tech 2026',
      code: 'BTECH-REG',
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
          feeStructureId: 'struct-btech-reg',
          name: 'Tuition',
          componentType: 'tuition',
          amount: 100000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await store.createFeeStructure(structure);

    const alloc = await engine.allocateFeeStructureToStudent(
      {
        studentId: 'stud-scholar-01',
        institutionId: 'campus-al-ameer',
        academicYear: '2026-2027',
        quota: 'general',
        residentialType: 'day_scholar',
      },
      'struct-btech-reg',
      25000 // 25,000 concession
    );

    expect(alloc.baseAmount).toBe(100000);
    expect(alloc.concessionAmount).toBe(25000);
    expect(alloc.netPayableAmount).toBe(75000);
    expect(alloc.balanceAmount).toBe(75000);
    expect(alloc.status).toBe('unpaid');
  });
});
