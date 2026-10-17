import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffAvailability } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const record = await db
    .select()
    .from(staffAvailability)
    .where(eq(staffAvailability.staffId, session.staffId))
    .get();
  return NextResponse.json({ status: record?.status ?? "available" });
}, "staff:read");

export const PUT = requireAuth(async (request: Request, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const status = (body as { status?: unknown })?.status;
  const valid = ["available", "busy", "meeting", "leave", "off_campus", "travelling"];
  if (!valid.includes(status as string)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(staffAvailability)
    .where(eq(staffAvailability.staffId, session.staffId))
    .get();
  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(staffAvailability)
      .set({ status: status as string, updatedAt: now })
      .where(eq(staffAvailability.staffId, session.staffId))
      .run();
  } else {
    await db.insert(staffAvailability).values({
      id: randomUUID(),
      staffId: session.staffId,
      status: status as string,
      updatedAt: now,
    }).run();
  }

  return NextResponse.json({ status });
}, "availability:write");
