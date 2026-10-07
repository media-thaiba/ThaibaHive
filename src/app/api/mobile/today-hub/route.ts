import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isTodayHubEnabled } from "@/lib/features";
import {
  buildTodayHubManifest,
  TODAY_HUB_VERSION,
} from "@/lib/mobile/mobile-serializer";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    if (!isTodayHubEnabled(session.institutionId ?? undefined)) {
      return NextResponse.json(
        { error: "Today Hub feature is disabled" },
        { status: 403 }
      );
    }

    const rawVersion = new URL(request.url).searchParams.get("v");
    const requestedVersion = rawVersion ? Number(rawVersion) : undefined;

    const manifest = buildTodayHubManifest({
      role: session.role,
      requestedVersion,
    });

    const response = NextResponse.json(manifest);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("ETag", `"today-hub-v${TODAY_HUB_VERSION}"`);
    return response;
  } catch (error) {
    console.error("Today hub API error:", error);
    return NextResponse.json(
      { error: "Failed to build today hub manifest" },
      { status: 500 }
    );
  }
}, "reports:read");
