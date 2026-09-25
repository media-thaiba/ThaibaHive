import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { CarbonOffsetManager } from '@/lib/operations/eco/carbon/carbon-offset-manager';
import { offsetRegisterSchema, offsetRetireSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';

  const manager = new CarbonOffsetManager();
  const balance = await manager.getOffsetBalance(tenantId);
  return NextResponse.json({ balance });
}, 'eco:carbon:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const action = body.action || 'register';
    const manager = new CarbonOffsetManager();

    if (action === 'retire') {
      const parsed = offsetRetireSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid retire payload' }, { status: 400 });
      }

      const tenantId = user?.institutionId || parsed.data.institutionId || 'global';
      const result = await manager.retireOffset(parsed.data.offsetId, parsed.data.reportingPeriod, tenantId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to retire offset' }, { status: 400 });
      }

      return NextResponse.json({ certificate: result.certificate }, { status: 200 });
    } else {
      const parsed = offsetRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid register payload' }, { status: 400 });
      }

      const tenantId = user?.institutionId || parsed.data.institutionId || 'global';
      const offset = await manager.registerOffset({
        ...parsed.data,
        institutionId: tenantId,
      });

      return NextResponse.json({ offset }, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:carbon:manage');
