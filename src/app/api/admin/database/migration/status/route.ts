import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    return NextResponse.json({
      success: true,
      activeMigrations: [
        {
          id: "mig-017-shadow",
          tenantId: (session as any).institutionId || "inst-001",
          migrationName: "add_multi_region_vector_clock_index",
          status: "COMPLETED",
          startedAt: "2026-08-03T10:00:00.000Z",
          completedAt: "2026-08-03T10:02:15.000Z",
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "database:admin");
