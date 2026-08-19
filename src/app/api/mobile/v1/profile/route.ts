import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { serializeMobileProfile } from "@/lib/mobile/mobile-serializer";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const profile = serializeMobileProfile({
      id: session.staffId,
      name: session.name || session.email,
      email: session.email,
      role: session.role,
      employeeId: session.employeeId,
      department: "Administration",
      institutionName: "Thaiba Main Campus",
      isActive: true,
    });

    const response = NextResponse.json({ success: true, profile });
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    console.error("Mobile profile API error:", error);
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 });
  }
});
