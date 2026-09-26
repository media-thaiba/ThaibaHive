import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (_request: Request, _session) => {
  return NextResponse.json({
    success: true,
    preferences: {
      approvals: true,
      attendance: true,
      examinations: true,
      announcements: true,
    },
  });
});

export const POST = requireAuth(async (request: Request, _session) => {
  try {
    let body: { preferences?: Record<string, boolean> } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      preferences: body.preferences || {},
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 });
  }
});
