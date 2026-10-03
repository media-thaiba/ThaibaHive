import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { reloadFederatedSchemaRegistry } from "@/lib/federation/schema-manager";

export const POST = requireAuth(async () => {
  try {
    await reloadFederatedSchemaRegistry();
    return NextResponse.json({ success: true, message: "Federated GraphQL schemas reloaded successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "federation:manage");
