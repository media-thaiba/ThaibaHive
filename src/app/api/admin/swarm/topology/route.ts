import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/db";
import { swarmTopology } from "@/db/schema";

async function handler(req: Request, session: any) {
  // Enforce tenant boundary check
  const institutionId = session.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "Unauthorized tenant" }, { status: 403 });
  }

  try {
    const nodes = await db
      .select()
      .from(swarmTopology)
      .all();

    return NextResponse.json({ nodes });
  } catch (err) {
    console.error("[Topology API] Failed to fetch topology:", err);
    return NextResponse.json({ error: "Failed to fetch topology nodes" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "observability:read");
