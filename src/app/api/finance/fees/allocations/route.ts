import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { FeeDbStore } from '@/db/fee-store';
import { FeeStructureEngine } from '@/lib/operations/finance/fee-structure-engine';
import { InstallmentFineEngine } from '@/lib/operations/finance/installment-fine-engine';
import { allocateFeeSchema } from '@/lib/validation/fee-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
  const studentId = url.searchParams.get('studentId') || undefined;

  const store = FeeDbStore.getInstance();
  if (studentId) {
    const list = await store.listAllocationsByStudent(studentId, institutionId);
    return NextResponse.json({ success: true, allocations: list });
  }

  const list = await store.listAllocations(institutionId);
  return NextResponse.json({ success: true, allocations: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = allocateFeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);
  const store = FeeDbStore.getInstance();

  // Verify fee structure exists
  const structure = await store.getFeeStructureById(parsed.data.feeStructureId, institutionId);
  if (!structure) {
    return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
  }

  // Duplicate allocation collision check for same student + structure + academic year
  const existingAllocations = await store.listAllocationsByStudent(parsed.data.studentId, institutionId);
  const duplicate = existingAllocations.find(
    (a) => a.feeStructureId === parsed.data.feeStructureId && a.academicYear === parsed.data.academicYear
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `Fee structure '${structure.name}' is already allocated to this student for academic year ${parsed.data.academicYear}` },
      { status: 409 }
    );
  }

  try {
    const structEngine = new FeeStructureEngine(store);
    const instEngine = new InstallmentFineEngine(store);

    const alloc = await structEngine.allocateFeeStructureToStudent(
      {
        studentId: parsed.data.studentId,
        institutionId,
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
  } catch (err: unknown) {
    console.error("[Fees Allocations Error]:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Failed to allocate fee" }, { status: 500 });
  }
}, 'finance:fees:manage');
