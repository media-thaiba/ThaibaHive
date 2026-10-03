import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { getFederatedSchemas } from "@/lib/federation/schema-manager";

export const GET = requireAuth(async () => {
  try {
    const services = await getFederatedSchemas();
    return NextResponse.json({ services });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "federation:manage");
