import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { db } from '@/db';
import { staff } from '@thaiba/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const stepUpSchema = z.object({
  password: z.string().min(1),
  action: z.string().min(1),
});

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = stepUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { password } = parsed.data;
  const [staffRecord] = await db.select({ passwordHash: staff.passwordHash }).from(staff).where(eq(staff.id, session.staffId)).all();
  if (!staffRecord) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(password, staffRecord.passwordHash || '');
  if (!isValid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  return NextResponse.json({ verified: true, action: parsed.data.action });
}, 'profile:read');
