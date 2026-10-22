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

  if (record && record.status !== "available" && record.expiresAt) {
    const isExpired = new Date(record.expiresAt).getTime() <= Date.now();
    if (isExpired) {
      const now = new Date().toISOString();
      await db
        .update(staffAvailability)
        .set({ status: "available", expiresAt: null, updatedAt: now })
        .where(eq(staffAvailability.staffId, session.staffId))
        .run();
      return NextResponse.json({ status: "available", expiresAt: null });
    }
  }

  return NextResponse.json({
    status: record?.status ?? "available",
    expiresAt: record?.expiresAt ?? null,
  });
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

  const { status, durationMinutes, expiresAt: rawExpiresAt } = (body as {
    status?: unknown;
    durationMinutes?: unknown;
    expiresAt?: unknown;
  }) || {};

  const valid = ["available", "busy", "meeting", "leave", "off_campus", "travelling"];
  if (!valid.includes(status as string)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let computedExpiresAt: string | null = null;

  if (status !== "available") {
    if (durationMinutes === "eod") {
      const eod = new Date(now);
      eod.setHours(18, 0, 0, 0);
      if (eod.getTime() <= now.getTime()) {
        eod.setHours(23, 59, 59, 999);
      }
      computedExpiresAt = eod.toISOString();
    } else if (typeof durationMinutes === "number" && durationMinutes > 0 && durationMinutes <= 1440) {
      computedExpiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    } else if (typeof rawExpiresAt === "string" && !isNaN(Date.parse(rawExpiresAt))) {
      computedExpiresAt = new Date(rawExpiresAt).toISOString();
    }
  }

  const existing = await db
    .select()
    .from(staffAvailability)
    .where(eq(staffAvailability.staffId, session.staffId))
    .get();

  if (existing) {
    await db
      .update(staffAvailability)
      .set({
        status: status as string,
        expiresAt: computedExpiresAt,
        updatedAt: nowIso,
      })
      .where(eq(staffAvailability.staffId, session.staffId))
      .run();
  } else {
    await db.insert(staffAvailability).values({
      id: randomUUID(),
      staffId: session.staffId,
      status: status as string,
      expiresAt: computedExpiresAt,
      updatedAt: nowIso,
    }).run();
  }

  return NextResponse.json({ status, expiresAt: computedExpiresAt });
}, "availability:write");
