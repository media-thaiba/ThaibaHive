import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AnalyticsService } from "@/lib/services/analytics";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";

export const GET = requireAuth(async (request, session) => {
  const { role, staffId } = session;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate = url.searchParams.get("endDate") || new Date().toISOString().split("T")[0];
  const classId = url.searchParams.get("classId") || undefined;
  
  const actorInstIds = await getActorInstitutionIds(staffId);
  const queryInstId = url.searchParams.get("institutionId");

  let institutionId = queryInstId;
  if (!institutionId) {
    institutionId = Array.from(actorInstIds)[0];
  }

  // Verify access unless super_admin or admin
  if (role !== "super_admin" && role !== "admin") {
    if (!institutionId || !actorInstIds.has(institutionId)) {
      return NextResponse.json({ error: "Forbidden: no access to institution" }, { status: 403 });
    }
  }

  if (!institutionId) {
    return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
  }

  // RBAC checks for analytics types
  if (type === "attendance") {
    if (!["super_admin", "admin", "principal", "hod"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: insufficient role for attendance analytics" }, { status: 403 });
    }
    const data = await AnalyticsService.getAttendance(institutionId, startDate, endDate);
    return NextResponse.json({ data });
  }

  if (type === "finance") {
    if (!["super_admin", "admin", "principal", "cashier"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: insufficient role for finance analytics" }, { status: 403 });
    }
    const data = await AnalyticsService.getFinance(institutionId, startDate, endDate);
    return NextResponse.json({ data });
  }

  if (type === "academics") {
    if (!["super_admin", "admin", "principal", "hod", "staff"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: insufficient role for academics analytics" }, { status: 403 });
    }
    const data = await AnalyticsService.getAcademics(institutionId, classId);
    return NextResponse.json({ data });
  }

  if (type === "usage") {
    if (!["super_admin", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: insufficient role for usage analytics" }, { status: 403 });
    }
    const data = await AnalyticsService.getPlatformUsage(institutionId);
    return NextResponse.json({ data });
  }

  if (type === "predictive") {
    if (!["super_admin", "admin", "principal"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: insufficient role for predictive analytics" }, { status: 403 });
    }
    const data = await AnalyticsService.getPredictive(institutionId);
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Invalid or missing analytics type query parameter" }, { status: 400 });
}, "reports:read");
