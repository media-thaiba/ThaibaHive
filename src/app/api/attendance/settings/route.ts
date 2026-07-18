import { NextResponse } from "next/server";
import { db } from "@/db";
import { presenceVerificationSettings, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { verificationSettingsSchema } from "@/lib/validation/schemas";
import { eq, and, isNull } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";

const DEFAULT_SETTINGS = {
  isEnabled: true,
  shadowMode: true,
  checkIntervalMinutes: 10,
  gracePeriodMinutes: 5,
  autoCheckoutOnViolation: false,
  geofenceRadiusMeters: 150,
  lowBatteryIntervalMinutes: 15,
  criticalBatterySuspend: true,
};

function isGlobalAdmin(session: SessionPayload): boolean {
  return session.role === "super_admin" || session.role === "admin";
}

async function isInstitutionPrincipal(session: SessionPayload, institutionId: string): Promise<boolean> {
  if (session.role !== "principal") return false;
  
  const assignment = await db
    .select()
    .from(staffInstitutions)
    .where(
      and(
        eq(staffInstitutions.staffId, session.staffId),
        eq(staffInstitutions.institutionId, institutionId)
      )
    )
    .limit(1)
    .get();
  
  return !!assignment;
}

function calculateDiff(oldSettings: Record<string, unknown>, newSettings: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys = Object.keys(newSettings).filter(k => k !== "id" && k !== "institutionId" && k !== "createdAt" && k !== "updatedAt");
  
  for (const key of keys) {
    if (oldSettings[key] !== newSettings[key]) {
      diff[key] = { from: oldSettings[key], to: newSettings[key] };
    }
  }
  
  return diff;
}

export const GET = requireAuth(async (request, session) => {
  try {
    const url = new URL(request.url);
    const institutionId = url.searchParams.get("institutionId");

    // Authorization check
    if (institutionId) {
      // Accessing campus-specific settings
      if (!isGlobalAdmin(session) && !(await isInstitutionPrincipal(session, institutionId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Accessing global settings
      if (!isGlobalAdmin(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Try to get institution-specific settings
    if (institutionId) {
      const settings = await db
        .select()
        .from(presenceVerificationSettings)
        .where(eq(presenceVerificationSettings.institutionId, institutionId))
        .limit(1)
        .get();

      if (settings) {
        return NextResponse.json({ settings });
      }
    }

    // Fall back to global settings
    const globalSettings = await db
      .select()
      .from(presenceVerificationSettings)
      .where(isNull(presenceVerificationSettings.institutionId))
      .limit(1)
      .get();

    if (globalSettings) {
      return NextResponse.json({ settings: globalSettings });
    }

    // Fall back to hardcoded defaults
    return NextResponse.json({
      settings: {
        id: null,
        institutionId: institutionId,
        ...DEFAULT_SETTINGS,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PUT = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    const institutionId = body.institutionId ?? null;

    // Authorization check
    if (institutionId) {
      // Modifying campus-specific settings
      if (!isGlobalAdmin(session) && !(await isInstitutionPrincipal(session, institutionId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Modifying global settings
      if (!isGlobalAdmin(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Validate input
    const validation = verificationSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Check for existing settings
    const existing = institutionId
      ? await db
          .select()
          .from(presenceVerificationSettings)
          .where(eq(presenceVerificationSettings.institutionId, institutionId))
          .limit(1)
          .get()
      : await db
          .select()
          .from(presenceVerificationSettings)
          .where(isNull(presenceVerificationSettings.institutionId))
          .limit(1)
          .get();

    if (existing) {
      // Update existing settings
      const updated = await db
        .update(presenceVerificationSettings)
        .set({
          ...validatedData,
          institutionId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(presenceVerificationSettings.id, existing.id))
        .returning()
        .get();

      // Log the update
      const diff = calculateDiff(existing, updated);
      if (Object.keys(diff).length > 0) {
        await logActivity({
          request,
          staffId: session.staffId,
          action: "UPDATE_VERIFICATION_SETTINGS",
          resourceType: "presence_verification_settings",
          resourceId: updated.id,
          details: {
            institutionId,
            changes: diff,
          },
        });
      }

      return NextResponse.json({ settings: updated });
    } else {
      // Create new settings
      const id = crypto.randomUUID();
      try {
        const created = await db
          .insert(presenceVerificationSettings)
          .values({
            id,
            institutionId,
            ...DEFAULT_SETTINGS,
            ...validatedData,
          })
          .returning()
          .get();

        // Log the creation
        const diff = calculateDiff(DEFAULT_SETTINGS, created);
        await logActivity({
          request,
          staffId: session.staffId,
          action: "CREATE_VERIFICATION_SETTINGS",
          resourceType: "presence_verification_settings",
          resourceId: created.id,
          details: {
            institutionId,
            changes: diff,
          },
        });

        return NextResponse.json({ settings: created }, { status: 201 });
      } catch (error: unknown) {
        // Handle unique constraint violation for concurrent writes
        const errorMessage = error instanceof Error ? error.message : "";
        const isUniqueViolation =
          errorMessage.includes("SQLITE_CONSTRAINT_UNIQUE") ||
          (error as { code?: string })?.code === "23505";

        if (isUniqueViolation) {
          // Re-query the settings (created by concurrent write)
          const concurrentExisting = institutionId
            ? await db
                .select()
                .from(presenceVerificationSettings)
                .where(eq(presenceVerificationSettings.institutionId, institutionId))
                .limit(1)
                .get()
            : await db
                .select()
                .from(presenceVerificationSettings)
                .where(isNull(presenceVerificationSettings.institutionId))
                .limit(1)
                .get();

          if (concurrentExisting) {
            const updated = await db
              .update(presenceVerificationSettings)
              .set({
                ...validatedData,
                institutionId,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(presenceVerificationSettings.id, concurrentExisting.id))
              .returning()
              .get();

            // Log the update
            const diff = calculateDiff(concurrentExisting, updated);
            if (Object.keys(diff).length > 0) {
              await logActivity({
                request,
                staffId: session.staffId,
                action: "UPDATE_VERIFICATION_SETTINGS",
                resourceType: "presence_verification_settings",
                resourceId: updated.id,
                details: {
                  institutionId,
                  changes: diff,
                },
              });
            }

            return NextResponse.json({ settings: updated });
          }
        }

        // Re-throw other errors
        throw error;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
