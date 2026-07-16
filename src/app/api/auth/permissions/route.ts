import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/auth";
import type { StaffRole } from "@/types";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = session.role as StaffRole;
  const permissions = getRolePermissions(role);

  return NextResponse.json({
    role,
    permissions,
  });
}