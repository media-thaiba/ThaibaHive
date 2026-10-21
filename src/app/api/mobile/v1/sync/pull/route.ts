import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  try {
    const { searchParams } = new URL(request.url);
    const rawSince = searchParams.get("since");
    if (rawSince && isNaN(Date.parse(rawSince))) {
      return NextResponse.json({ error: "Invalid 'since' timestamp format" }, { status: 400 });
    }
    const since = rawSince || new Date(0).toISOString();

    return NextResponse.json(
      {
        serverTimestamp: new Date().toISOString(),
        deltas: [],
        since,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pull delta sync" },
      { status: 500 }
    );
  }
}, "mobile:sync");
