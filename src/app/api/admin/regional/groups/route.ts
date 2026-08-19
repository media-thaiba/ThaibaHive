import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionalHierarchyService } from "@/lib/regional/regional-hierarchy-service";
import { regionalGroupCreateSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async () => {
  try {
    const groups = await RegionalHierarchyService.listGroups();
    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list groups" }, { status: 500 });
  }
}, "regional:view");

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = regionalGroupCreateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const group = await RegionalHierarchyService.createGroup(parse.data);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create group" }, { status: 500 });
  }
}, "regional:manage");
