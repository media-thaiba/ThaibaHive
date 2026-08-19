import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionalHierarchyService } from "@/lib/regional/regional-hierarchy-service";
import { regionalClusterAssignSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = regionalClusterAssignSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const cluster = await RegionalHierarchyService.assignCampusToCluster(parse.data);
    return NextResponse.json({ cluster }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to assign campus" }, { status: 500 });
  }
}, "regional:manage");
