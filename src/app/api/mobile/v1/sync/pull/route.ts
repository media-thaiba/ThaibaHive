import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") || new Date(0).toISOString();

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
