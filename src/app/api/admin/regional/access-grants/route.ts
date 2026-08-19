import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionalHierarchyService } from "@/lib/regional/regional-hierarchy-service";
import { regionalAccessGrantSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (request: Request, session) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = regionalAccessGrantSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const grant = await RegionalHierarchyService.grantAccess({
      ...parse.data,
      grantedBy: session.staffId,
    });
    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to grant access" }, { status: 500 });
  }
}, "regional:manage");
