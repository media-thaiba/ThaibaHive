import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { workspacePreferences, staffInstitutions } from "@thaiba/db/schema";
import { and, eq } from "drizzle-orm";
import { workspacePreferenceUpdateSchema } from "@/lib/validation/schemas";
import { PreferenceAuditService } from "@/lib/services/preference-audit";

// ─── Simple in-memory rate limiter (10 PUT requests per minute per user) ─────
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((ts) => ts > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// ─── GET: Retrieve workspace preferences ─────────────────────────────────────

export const GET = requireAuth(async (request, session) => {
  try {
    const url = new URL(request.url);
    const workspaceType = url.searchParams.get("workspaceType");

    if (!workspaceType) {
      return NextResponse.json(
        { error: "Missing required query parameter: workspaceType" },
        { status: 400 }
      );
    }

    const preference = await db
      .select()
      .from(workspacePreferences)
      .where(
        and(
          eq(workspacePreferences.staffId, session.staffId),
          eq(workspacePreferences.workspaceType, workspaceType)
        )
      )
      .get();

    if (!preference) {
      return NextResponse.json({
        success: true,
        preferences: null,
        message: "No saved preferences — defaults will be used",
      });
    }

    let layoutConfig: unknown;
    try {
      layoutConfig = JSON.parse(preference.layoutConfig);
    } catch {
      layoutConfig = [];
    }

    return NextResponse.json({
      success: true,
      preferences: {
        workspaceType: preference.workspaceType,
        layoutConfig,
        updatedAt: preference.updatedAt,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}, "workspaces:read");

// ─── PUT: Update workspace preferences ───────────────────────────────────────

export const PUT = requireAuth(async (request, session) => {
  // Rate limiting check (Rule 46)
  if (!checkRateLimit(session.staffId)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before updating your layout again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = workspacePreferenceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { workspaceType, layoutConfig } = parsed.data;

    // Resolve institutionId
    const staffInstitution = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();

    const institutionId = staffInstitution?.institutionId;
    if (!institutionId) {
      return NextResponse.json(
        { error: "Institution not configured for this account" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Query old configuration before update
    const oldPreference = await db
      .select({ layoutConfig: workspacePreferences.layoutConfig })
      .from(workspacePreferences)
      .where(
        and(
          eq(workspacePreferences.staffId, session.staffId),
          eq(workspacePreferences.workspaceType, workspaceType)
        )
      )
      .get();
    const oldValue = oldPreference?.layoutConfig ?? null;

    await db
      .insert(workspacePreferences)
      .values({
        id,
        institutionId,
        staffId: session.staffId,
        guardianId: null,
        workspaceType,
        layoutConfig: JSON.stringify(layoutConfig),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [workspacePreferences.staffId, workspacePreferences.workspaceType],
        set: {
          layoutConfig: JSON.stringify(layoutConfig),
          updatedAt: now,
        },
      })
      .run();

    // Audit log via relational database service
    const callerIp = request.headers.get("x-forwarded-for") ?? "unknown";
    PreferenceAuditService.logPreferenceChange(
      session.staffId,
      workspaceType,
      oldValue,
      JSON.stringify(layoutConfig),
      institutionId,
      callerIp
    );

    return NextResponse.json({
      success: true,
      message: `Workspace preferences for '${workspaceType}' saved successfully.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: "workspace_preference_update_error",
        staffId: session.staffId,
        error: msg,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: "Failed to save workspace preferences" }, { status: 500 });
  }
}, "workspaces:write");
