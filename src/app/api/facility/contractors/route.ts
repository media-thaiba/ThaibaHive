import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { facilityStore } from '@/lib/db/facility-store';
import { contractorRegisterSchema } from '@/lib/validation/facility-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));

  const contractors = await facilityStore.listContractors(tenantId);
  return NextResponse.json({ contractors });
}, 'facility:contractors:manage');

export const POST = requireAuth(async (req: Request, session: any) => {
  try {
    const body = await req.json();
    const parsed = contractorRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid contractor payload' }, { status: 400 });
    }

    const tenantId = await resolveRequestInstitution(session, parsed.data.institutionId);
    const contractor = await facilityStore.registerContractor({
      ...parsed.data,
      specializationsJson: JSON.stringify(parsed.data.specializations),
      institutionId: tenantId,
    });

    return NextResponse.json({ contractor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'facility:contractors:manage');
