/* Search Suggestions API Route */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { getSearchSuggestions } from "@/lib/api/global-search/service";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`${session.staffId}:${ip}`, "search");

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
    const suggestions = await getSearchSuggestions(query, scopedInstitutionId);

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TenantMismatchError") {
      return NextResponse.json(
        { success: false, error: "Unauthorized tenant access" },
        { status: 403 }
      );
    }

    console.error("Search suggestions API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}, "search:global");
