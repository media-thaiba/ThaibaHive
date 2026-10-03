import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';

async function handler(_req: Request) {
  return NextResponse.json({ reports: [] });
}

export const GET = requireAuth(handler, 'compliance:manage');