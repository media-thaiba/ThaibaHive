import { FeeDbStore } from '../../../db/fee-store';
import { ScholarshipApprovalWorkflow } from '../../operations/finance/scholarships/scholarship-approval-workflow';
import { FeeConcessionItem, FeeStudentAllocationItem, FeeScholarshipItem } from '../../operations/finance/types';

describe('ScholarshipApprovalWorkflow (Sprint-057 - FEE-013)', () => {
  let store: FeeDbStore;
  let workflow: ScholarshipApprovalWorkflow;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    workflow = new ScholarshipApprovalWorkflow(store);
  });

  it('should approve concession, deduct allocation balance, and update scholarship disbursements', async () => {
    const allocation: FeeStudentAllocationItem = {
      id: 'alloc-stud-1',
      institutionId: 'inst-1',
      studentId: 'stud-1',
      feeStructureId: 'struct-1',
      academicYear: '2026-2027',
      baseAmount: 100000,
      concessionAmount: 0,
      netPayableAmount: 100000,
      paidAmount: 0,
      balanceAmount: 100000,
      status: 'unpaid',
      allocationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scholarship: FeeScholarshipItem = {
      id: 'sch-1',
      institutionId: 'inst-1',
      name: 'Excellence Grant',
      code: 'EXC-2026',
      category: 'merit',
      discountType: 'fixed_amount',
      discountValue: 30000,
      targetComponentType: 'tuition',
      totalBudget: 100000,
      disbursedAmount: 0,
      academicYear: '2026-2027',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const concession: FeeConcessionItem = {
      id: 'conc-100',
      institutionId: 'inst-1',
      studentId: 'stud-1',
      scholarshipId: 'sch-1',
      allocationId: 'alloc-stud-1',
      amount: 30000,
      reason: 'Top 1% Entrance Rank',
      status: 'pending',
      appliedById: 'staff-hod-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.createAllocation(allocation);
    await store.createScholarship(scholarship);
    await store.createConcession(concession);

    // Approve
    const approved = await workflow.approveConcession('conc-100', 'staff-principal-1', 'Approved based on merit transcripts');

    expect(approved.status).toBe('approved');

    const updatedAlloc = await store.getAllocationById('alloc-stud-1');
    expect(updatedAlloc?.concessionAmount).toBe(30000);
    expect(updatedAlloc?.netPayableAmount).toBe(70000);
    expect(updatedAlloc?.balanceAmount).toBe(70000);

    const updatedSch = store['memoryStore']?.scholarships.get('sch-1');
    expect(updatedSch?.disbursedAmount).toBe(30000);

    // Audit logs verification
    const auditLogs = await store.listAuditLogs('inst-1');
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe('scholarship_approved');
  });
});
