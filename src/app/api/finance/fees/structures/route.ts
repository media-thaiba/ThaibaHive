import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { FeeDbStore } from '@/db/fee-store';
import { createFeeStructureSchema } from '@/lib/validation/fee-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
  const academicYear = url.searchParams.get('academicYear') || undefined;

  const store = FeeDbStore.getInstance();
  const list = await store.listFeeStructures(institutionId, academicYear);
  return NextResponse.json({ success: true, structures: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createFeeStructureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);
  const store = FeeDbStore.getInstance();

  // Duplicate code collision guard within the same institution
  const existingStructures = await store.listFeeStructures(institutionId);
  const duplicate = existingStructures.find(
    (s) => s.code.toLowerCase() === parsed.data.code.trim().toLowerCase()
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `Fee structure with code '${parsed.data.code}' already exists in this institution` },
      { status: 409 }
    );
  }

  try {
    const id = `struct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const components = (parsed.data.components || []).map((c, idx) => ({
      id: `comp_${Date.now()}_${idx + 1}`,
      feeStructureId: id,
      name: c.name,
      componentType: c.componentType,
      amount: c.amount,
      isMandatory: c.isMandatory ?? true,
      isRefundable: c.isRefundable ?? false,
      taxRatePercent: c.taxRatePercent ?? 0,
      glAccountCode: c.glAccountCode,
      createdAt: now,
    }));

    const totalAmount = components.reduce((sum, c) => sum + c.amount, 0) || parsed.data.totalAmount;

    const created = await store.createFeeStructure({
      id,
      institutionId,
      name: parsed.data.name,
      code: parsed.data.code,
      academicYear: parsed.data.academicYear,
      programId: parsed.data.programId,
      gradeLevel: parsed.data.gradeLevel,
      term: parsed.data.term,
      quota: parsed.data.quota,
      residentialType: parsed.data.residentialType,
      currency: parsed.data.currency,
      totalAmount,
      isActive: parsed.data.isActive,
      createdById: session.staffId,
      createdAt: now,
      updatedAt: now,
      components,
    });

    return NextResponse.json({ success: true, structure: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("[Fees Structures Error]:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Failed to create fee structure" }, { status: 500 });
  }
}, 'finance:fees:manage');
