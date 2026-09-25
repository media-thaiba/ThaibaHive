import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { alumniStore } from '@/db/alumni-store';
import { createAlumniProfileSchema, updateAlumniProfileSchema } from '@/lib/validation/alumni-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const profileId = url.searchParams.get('id');

  if (profileId) {
    const profile = await alumniStore.getAlumniProfileById(profileId, institutionId);
    if (!profile) {
      return NextResponse.json({ error: 'Alumni profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile });
  }

  const list = await alumniStore.listAlumniProfiles({ institutionId });
  return NextResponse.json({ success: true, ...list });
}, 'alumni:profile:view');

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = createAlumniProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const id = `alum_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const created = await alumniStore.createAlumniProfile({
      id,
      ...parsed.data,
      isVerified: session.role === 'super_admin' || session.role === 'admin',
      verifiedAt: session.role === 'super_admin' || session.role === 'admin' ? now : undefined,
      verifiedById: session.role === 'super_admin' || session.role === 'admin' ? session.staffId : undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, profile: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create profile' }, { status: 500 });
  }
}, 'alumni:profile:manage');

export const PATCH = requireAuth(async (request) => {
  try {
    const url = new URL(request.url);
    const profileId = url.searchParams.get('id');
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateAlumniProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const updated = await alumniStore.updateAlumniProfile(profileId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}, 'alumni:profile:manage');
