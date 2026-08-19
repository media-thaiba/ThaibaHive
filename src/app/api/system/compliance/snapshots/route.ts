import { NextResponse } from "next/server";
import { db } from "@/db";
import { forensicSnapshots } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { forensicSnapshotEngine } from "@/lib/compliance/forensic-snapshot-engine";
import { z } from "zod";

const createSnapshotSchema = z.object({
  tenantId: z.string().optional().default("default"),
  snapshotType: z.enum(["SCHEDULED", "MANUAL", "PRE_INCIDENT", "AUDIT"]).optional().default("MANUAL"),
  metadata: z.record(z.string(), z.any()).optional(),
});

async function getHandler(req: Request, session: any) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const snapshots = await db
      .select()
      .from(forensicSnapshots)
      .where(tenantId && tenantId !== "all" ? eq(forensicSnapshots.tenantId, tenantId) : undefined)
      .orderBy(desc(forensicSnapshots.createdAt))
      .limit(limit);

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        ...s,
        entityCounts: s.entityCounts ? JSON.parse(s.entityCounts) : {},
        metadata: s.metadata ? JSON.parse(s.metadata) : {},
      })),
      total: snapshots.length,
    });
  } catch (error: any) {
    console.error("[@thaiba/compliance] Get snapshots error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

async function postHandler(req: Request, session: any) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = createSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { tenantId, snapshotType, metadata } = parsed.data;

    const manifest = await forensicSnapshotEngine.captureSnapshot({
      tenantId,
      snapshotType,
      metadata: {
        ...metadata,
        requestedBy: session?.userId || session?.sub || "admin",
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: manifest,
      message: `Forensic snapshot ${manifest.id} successfully captured and signed`,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[@thaiba/compliance] Create snapshot error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler, "compliance:forensics");
export const POST = requireAuth(postHandler, "compliance:forensics");
