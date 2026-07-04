import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db.select().from(institutions).orderBy(institutions.name);
  return NextResponse.json({ institutions: all });
}, "org:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, code, type, address, phone, email } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code required" }, { status: 400 });
  }

  const existing = await db.select().from(institutions).where(eq(institutions.code, code)).get();
  if (existing) {
    return NextResponse.json({ error: "Institution code already exists" }, { status: 409 });
  }

  const inst = await db
    .insert(institutions)
    .values({ id: crypto.randomUUID(), name, code, type, address, phone, email })
    .returning()
    .get();

  return NextResponse.json({ institution: inst }, { status: 201 });
}, "org:manage");
