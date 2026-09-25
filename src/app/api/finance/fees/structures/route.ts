import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { createFeeStructureSchema } from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const academicYear = url.searchParams.get('academicYear') || undefined;

  const store = FeeDbStore.getInstance();
  const list = await store.listFeeStructures(institutionId, academicYear);
  return NextResponse.json({ success: true, structures: list });
}, 'finance:fees:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createFeeStructureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
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
      institutionId: parsed.data.institutionId,
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create fee structure' }, { status: 500 });
  }
}, 'finance:fees:manage');
