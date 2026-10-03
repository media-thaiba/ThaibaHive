import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { resolveScopedInstitutionId } from '@thaiba/auth';
import { registerMobileTokenSchema } from '@/lib/validation/docgen-schemas';
import { DocDbStore } from '@/lib/db/docgen-store';

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = registerMobileTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = DocDbStore.getInstance();
    const id = `token_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const isManager = session.role === 'admin' || session.role === 'super_admin' || session.role === 'principal';
    const institutionId = await resolveScopedInstitutionId(parsed.data.institutionId);

    const registered = await store.registerDeviceToken({
      id,
      userId: isManager && parsed.data.userId ? parsed.data.userId : session.staffId,
      institutionId,
      deviceToken: parsed.data.deviceToken,
      platform: parsed.data.platform,
      deviceModel: parsed.data.deviceModel,
      appVersion: parsed.data.appVersion,
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
    });

    return NextResponse.json({ success: true, token: registered }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to register device token' }, { status: 500 });
  }
}, 'mobile:sync');
