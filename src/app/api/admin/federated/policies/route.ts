import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { federatedPolicySchema } from "@/lib/validation/schemas";
import { PolicySyncEngine } from "@/lib/federated/policy-sync-engine";

const defaultPolicySyncEngine = new PolicySyncEngine();

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;

    const policies = defaultPolicySyncEngine.getAllPolicies(tenantId);
    return NextResponse.json({ policies }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch policies" },
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

  const parse = federatedPolicySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { title, category, content } = parse.data;

  try {
    const policy = defaultPolicySyncEngine.createPolicy("tenant-main", title, category, content, "admin-user");
    return NextResponse.json({ message: "Policy created", policy }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create policy" },
      { status: 500 }
    );
  }
}, "federated:policies");
