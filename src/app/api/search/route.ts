/* Global Search API Route - Main Entry Point with Rate Limiting & Strict RBAC */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { globalSearchSchema } from "@/lib/validation/schemas";
import { globalSearch } from "@/lib/api/global-search/service";

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
    const entityTypesParam = searchParams.get("entityTypes");
    const page = searchParams.get("page") ?? undefined;
    const limit = searchParams.get("limit") ?? undefined;

    const parsedData = globalSearchSchema.parse({
      q: query,
      entityTypes: entityTypesParam ? entityTypesParam.split(",") : undefined,
      page,
      limit,
    });

    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);

    const results = await globalSearch(
      parsedData.q,
      parsedData.entityTypes,
      parsedData.page,
      parsedData.limit,
      scopedInstitutionId
    );

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: parsedData.page,
        limit: parsedData.limit,
        totalResults: results.totalResults,
        hasMore: results.totalResults > parsedData.page * parsedData.limit,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === "TenantMismatchError") {
      return NextResponse.json(
        { success: false, error: "Unauthorized tenant access" },
        { status: 403 }
      );
    }

    console.error("Global search API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}, "search:global");

export const OPTIONS = requireAuth(async () => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}, "search:global");