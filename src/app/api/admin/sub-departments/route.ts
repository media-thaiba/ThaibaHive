import { NextResponse } from "next/server";
import { db } from "@/db";
import { subDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
export const GET = requireAuth(async () => {
  const all = await db.select().from(subDepartments).orderBy(subDepartments.name);
  return NextResponse.json({ subDepartments: all });
}, "org:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, code, departmentId, description } = body;

  if (!name || !departmentId) {
    return NextResponse.json({ error: "Name and department ID required" }, { status: 400 });
  }

  const sub = await db
    .insert(subDepartments)
    .values({ id: crypto.randomUUID(), name, code, departmentId, description })
    .returning()
    .get();

  return NextResponse.json({ subDepartment: sub }, { status: 201 });
}, "org:manage");
