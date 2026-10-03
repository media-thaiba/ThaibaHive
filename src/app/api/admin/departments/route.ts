import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
export const GET = requireAuth(async () => {
  const all = await db.select().from(departments).orderBy(departments.name);
  return NextResponse.json({ departments: all });
}, "org:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { name, code, description, institutionId: reqInst } = body;
  const institutionId = await resolveRequestInstitution(session, reqInst);
  if (institutionId === "global") return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code required" }, { status: 400 });
  }

  const dept = await db
    .insert(departments)
    .values({ id: crypto.randomUUID(), name, code, institutionId, description })
    .returning()
    .get();

  return NextResponse.json({ department: dept }, { status: 201 });
}, "org:manage");
