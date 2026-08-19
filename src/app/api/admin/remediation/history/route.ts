import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { remediationHistory } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

async function handler(req: Request, session: any) {
  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const history = await db
      .select()
      .from(remediationHistory)
      .where(eq(remediationHistory.institutionId, institutionId))
      .orderBy(desc(remediationHistory.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[Remediation History API] Failed to fetch:", err);
    return NextResponse.json({ error: "Failed to fetch remediation history" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "observability:read");
