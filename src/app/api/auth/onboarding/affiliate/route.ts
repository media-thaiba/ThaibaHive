import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const POST = requireAuth(async (_request, session) => {
  console.warn(
    `[SECURITY] Blocked self-affiliation attempt by staffId: ${session.staffId} (role: ${session.role})`
  );
  return NextResponse.json(
    {
      error: "Self-affiliation is disabled in the roster model. Staff institutional assignments are managed exclusively by campus administrators.",
      code: "SELF_AFFILIATION_DISABLED",
    },
    { status: 403 }
  );
}, "affiliations:manage");

