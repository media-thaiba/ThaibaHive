import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { swarmNegotiations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

async function handler(req: Request, session: any) {
  // Enforce multi-tenant bounds
  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const sessions = await db
      .select()
      .from(swarmNegotiations)
      .where(eq(swarmNegotiations.institutionId, institutionId))
      .orderBy(desc(swarmNegotiations.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[Sessions API] Failed to fetch sessions:", err);
    return NextResponse.json({ error: "Failed to fetch negotiation sessions" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "observability:read");
