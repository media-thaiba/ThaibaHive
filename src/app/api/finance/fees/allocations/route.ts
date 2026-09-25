import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { FeeStructureEngine } from '@/lib/operations/finance/fee-structure-engine';
import { InstallmentFineEngine } from '@/lib/operations/finance/installment-fine-engine';
import { allocateFeeSchema } from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const studentId = url.searchParams.get('studentId') || undefined;

  const store = FeeDbStore.getInstance();
  if (studentId) {
    const list = await store.listAllocationsByStudent(studentId, institutionId);
    return NextResponse.json({ success: true, allocations: list });
  }

  const list = await store.listAllocations(institutionId);
  return NextResponse.json({ success: true, allocations: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = allocateFeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const structEngine = new FeeStructureEngine(store);
    const instEngine = new InstallmentFineEngine(store);

    const alloc = await structEngine.allocateFeeStructureToStudent(
      {
        studentId: parsed.data.studentId,
        institutionId: parsed.data.institutionId,
        academicYear: parsed.data.academicYear,
        quota: 'general',
        residentialType: 'day_scholar',
      },
      parsed.data.feeStructureId,
      parsed.data.customConcessionAmount
    );

    const installments = instEngine.generateInstallments(
      alloc.id,
      alloc.netPayableAmount,
      parsed.data.planType
    );

    alloc.installments = installments;
    for (const inst of installments) {
      store['memoryStore']?.installments.set(inst.id, inst);
    }

    return NextResponse.json({ success: true, allocation: alloc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to allocate fee' }, { status: 500 });
  }
}, 'finance:fees:manage');
