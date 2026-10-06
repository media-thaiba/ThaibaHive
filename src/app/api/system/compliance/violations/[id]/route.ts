import { NextResponse } from "next/server";
import { db } from "@/db";
import { complianceViolations } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import type { SessionPayload } from "@thaiba/auth";
import crypto from "crypto";
import { z } from "zod";

const updateViolationSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"]),
  resolutionNotes: z.string().optional(),
});

async function patchHandler(req: Request, session: SessionPayload, context?: { params: Promise<Record<string, string>> }) {
  try {
    const rawParams = context?.params ? await context.params : undefined;
    const id = rawParams?.id || new URL(req.url).pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing violation ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateViolationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { status, resolutionNotes } = parsed.data;
    const resolvedBy = session?.staffId || "admin";
    const resolvedAt = new Date().toISOString();

    const existing = await db
      .select()
      .from(complianceViolations)
      .where(eq(complianceViolations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }

    await db
      .update(complianceViolations)
      .set({
        status,
        resolutionNotes: resolutionNotes || existing[0].resolutionNotes,
        resolvedBy: status === "RESOLVED" || status === "FALSE_POSITIVE" ? resolvedBy : null,
        resolvedAt: status === "RESOLVED" || status === "FALSE_POSITIVE" ? resolvedAt : null,
        updatedAt: resolvedAt,
      })
      .where(eq(complianceViolations.id, id));

    return NextResponse.json({
      success: true,
      message: `Violation ${id} updated to ${status}`,
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[@thaiba/compliance][requestId:${requestId}] Patch violation error:`, error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export const PATCH = requireAuth(patchHandler, "compliance:manage");
