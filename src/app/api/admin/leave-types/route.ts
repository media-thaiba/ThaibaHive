import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveTypes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async () => {
  const all = await db.select().from(leaveTypes).orderBy(leaveTypes.name).all();
  return NextResponse.json({ leaveTypes: all });
}, "leave:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, code, description, daysAllowed, requiresApproval } = body;

  if (!name || !code || daysAllowed === undefined) {
    return NextResponse.json(
      { error: "name, code, and daysAllowed are required" },
      { status: 400 }
    );
  }

  try {
    const leaveType = await db
      .insert(leaveTypes)
      .values({
        id: crypto.randomUUID(),
        name,
        code,
        description: description || null,
        daysAllowed,
        requiresApproval: requiresApproval !== false,
      })
      .returning()
      .get();

    return NextResponse.json({ leaveType }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE") || err.message?.includes("unique")) {
      return NextResponse.json(
        { error: "A leave type with this code already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}, "leave:manage");
