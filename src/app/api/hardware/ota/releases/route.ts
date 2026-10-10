import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { FirmwareOTAEngine } from "@/lib/hardware/firmware-ota-engine";
import { firmwareReleaseSchema } from "@/lib/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardware/ota/releases
 * List firmware OTA releases for the current tenant.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  try {
    const releases = FirmwareOTAEngine.listReleases(institutionId);
    return NextResponse.json({ releases, total: releases.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list OTA releases" },
      { status: 500 }
    );
  }
}, "hardware:devices:read");

const promoteStageSchema = z.object({
  releaseId: z.string().min(1),
  nextStage: z.enum(["canary_1", "staging_10", "fleet_100", "aborted", "completed"]),
});

/**
 * POST /api/hardware/ota/releases
 * Create a new firmware release OR advance rollout stage.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 1. Check if promoting existing release stage
  if (body.releaseId && body.nextStage) {
    const promoteParsed = promoteStageSchema.safeParse(body);
    if (!promoteParsed.success) {
      return NextResponse.json(
        { error: "Invalid stage transition", details: promoteParsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await FirmwareOTAEngine.promoteRolloutStage(
      promoteParsed.data.releaseId,
      promoteParsed.data.nextStage
    );

    if (!updated) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    return NextResponse.json({ release: updated });
  }

  // 2. Otherwise create a new firmware release
  const parsed = firmwareReleaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const release = await FirmwareOTAEngine.createRelease(
      institutionId,
      parsed.data
    );

    return NextResponse.json({ release }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create firmware release" },
      { status: 500 }
    );
  }
}, "hardware:devices:manage");
