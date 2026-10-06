import { NextResponse } from "next/server";
import { db } from "@/db";
import { forensicSnapshots } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { forensicSnapshotEngine } from "@/lib/compliance/forensic-snapshot-engine";
import type { SessionPayload } from "@thaiba/auth";
import crypto from "crypto";
import { z } from "zod";

const createSnapshotSchema = z.object({
  tenantId: z.string().optional(),
  snapshotType: z.enum(["SCHEDULED", "MANUAL", "PRE_INCIDENT", "AUDIT"]).optional().default("MANUAL"),
  metadata: z.record(z.string(), z.any()).optional(),
});

async function getHandler(req: Request, session: SessionPayload) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInst = searchParams.get("tenantId") || searchParams.get("institutionId") || undefined;
    const resolvedTenant = await resolveRequestInstitution(session, rawInst);
    const tenantId = resolvedTenant === "global" ? undefined : resolvedTenant;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const snapshots = await db
      .select()
      .from(forensicSnapshots)
      .where(tenantId ? eq(forensicSnapshots.tenantId, tenantId) : undefined)
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
    if (error?.name === "TenantMismatchError") throw error;
    const requestId = crypto.randomUUID();
    console.error(`[@thaiba/compliance][requestId:${requestId}] Get snapshots error:`, error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

async function postHandler(req: Request, session: SessionPayload) {
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

    const rawInst = parsed.data.tenantId && parsed.data.tenantId !== "default" ? parsed.data.tenantId : undefined;
    const tenantId = await resolveRequestInstitution(session, rawInst);

    const manifest = await forensicSnapshotEngine.captureSnapshot({
      tenantId,
      snapshotType: parsed.data.snapshotType,
      metadata: {
        ...parsed.data.metadata,
        requestedBy: session?.staffId || "admin",
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: manifest,
      message: `Forensic snapshot ${manifest.id} successfully captured and signed`,
    }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "TenantMismatchError") throw error;
    const requestId = crypto.randomUUID();
    console.error(`[@thaiba/compliance][requestId:${requestId}] Create snapshot error:`, error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler, "compliance:forensics");
export const POST = requireAuth(postHandler, "compliance:forensics");
