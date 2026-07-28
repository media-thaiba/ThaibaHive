import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { eq } from "drizzle-orm";

/**
 * BIOMETRIC ARCHITECTURE SCOPE & CONSENT RECORD:
 * Stores compressed facial reference photos for visual verification.
 * Does NOT perform automated vector embedding extraction or persistent face biometric indexing.
 * Persists an immutable timestamped consent record in activityLogs linking staffId, timestamp, and policyVersion.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  // Staff can enroll themselves, or admins can enroll any staff member
  if (session.staffId !== id && session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Cannot enroll face for another staff member" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { photoDataUrl, policyVersion = "1.0" } = body as { photoDataUrl?: string; policyVersion?: string };

  if (!photoDataUrl || typeof photoDataUrl !== "string") {
    return NextResponse.json({ error: "photoDataUrl is required" }, { status: 400 });
  }

  // Basic size check (max ~5MB base64 data url string length ~7MB)
  if (photoDataUrl.length > 7 * 1024 * 1024) {
    return NextResponse.json({ error: "Enrollment photo payload exceeds size limit" }, { status: 400 });
  }

  const targetStaff = await db.select().from(staff).where(eq(staff.id, id)).get();
  if (!targetStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updated = await db
    .update(staff)
    .set({
      avatarUrl: photoDataUrl,
      updatedAt: now,
    })
    .where(eq(staff.id, id))
    .returning()
    .get();

  await logActivity({
    staffId: session.staffId,
    action: "BIOMETRIC_ENROLL",
    resourceType: "staff",
    resourceId: id,
    details: {
      enrolledBy: session.staffId,
      staffName: `${targetStaff.firstName} ${targetStaff.lastName}`,
      consentedAt: now,
      policyVersion,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Biometric face enrollment successful",
    staffId: updated.id,
  });
}, "staff:update");
