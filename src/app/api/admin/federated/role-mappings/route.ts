import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { crossTenantRoleMappingSchema } from "@/lib/validation/schemas";
import { CrossTenantRoleMapper } from "@/lib/federated/cross-tenant-role-mapper";

const defaultRoleMapper = new CrossTenantRoleMapper();

export const GET = requireAuth(async () => {
  try {
    const mappings = defaultRoleMapper.getAllMappings();
    return NextResponse.json({ mappings }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch role mappings" },
      { status: 500 }
    );
  }
}, "federated:policies");

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const parse = crossTenantRoleMappingSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { sourceTenantId, targetTenantId, sourceRole, targetRole, permissions } = parse.data;

  try {
    const mapping = defaultRoleMapper.addMapping(
      sourceTenantId,
      targetTenantId,
      sourceRole,
      targetRole,
      permissions
    );
    return NextResponse.json({ message: "Role mapping created", mapping }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create role mapping" },
      { status: 500 }
    );
  }
}, "federated:policies");
