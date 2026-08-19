import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionalHodRankingService } from "@/lib/regional/regional-hod-ranking-service";
import { regionalHodRankingQuerySchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const regionalGroupId = url.searchParams.get("regionalGroupId") || "rg_default";
  const discipline = url.searchParams.get("discipline") || undefined;
  const limitStr = url.searchParams.get("limit") || "50";

  const parse = regionalHodRankingQuerySchema.safeParse({ regionalGroupId, discipline, limit: limitStr });
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const rankings = await RegionalHodRankingService.calculateRankings(parse.data);
    return NextResponse.json({ rankings }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate HOD rankings" },
      { status: 500 }
    );
  }
}, "regional:view");
