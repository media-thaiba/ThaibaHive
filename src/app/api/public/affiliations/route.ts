import { NextResponse } from "next/server";
import { db } from "@/db";
import { campusAffiliations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { desc, eq } from "drizzle-orm";

// Public affiliation proposal submission
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      campusName,
      contactPerson,
      email,
      phone,
      locationAddress,
      campusType,
      totalCapacity,
      facilitiesDescription,
    } = body;

    if (!campusName || !contactPerson || !email || !phone || !locationAddress) {
      return NextResponse.json(
        { error: "campusName, contactPerson, email, phone, and locationAddress are required" },
        { status: 400 }
      );
    }

    const created = await db
      .insert(campusAffiliations)
      .values({
        id: `aff_${crypto.randomUUID().slice(0, 10)}`,
        campusName,
        contactPerson,
        email,
        phone,
        locationAddress,
        campusType: campusType || "affiliated",
        totalCapacity: Number(totalCapacity) || 0,
        facilitiesDescription: facilitiesDescription || null,
        status: "pending",
      })
      .returning()
      .get();

    return NextResponse.json({
      success: true,
      message: "Campus affiliation application submitted. The central coordinator will review your proposal.",
      affiliationId: created.id,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Protected coordinator view
export const GET = requireAuth(async () => {
  const rows = await db
    .select()
    .from(campusAffiliations)
    .orderBy(desc(campusAffiliations.createdAt))
    .all();

  return NextResponse.json({ affiliations: rows });
}, "affiliations:manage");

// Protected approval / review handler
export const PATCH = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { id, status, approvedById } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const updated = await db
    .update(campusAffiliations)
    .set({
      status,
      approvedById: approvedById || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(campusAffiliations.id, id))
    .returning()
    .get();

  return NextResponse.json({ affiliation: updated });
}, "affiliations:manage");
