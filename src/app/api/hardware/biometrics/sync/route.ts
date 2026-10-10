import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { biometricSyncSchema } from "@/lib/validation/schemas";
import { BiometricMeshEngine } from "@/lib/hardware/biometric-mesh-engine";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const { searchParams } = new URL(request.url);

    const parsed = biometricSyncSchema.safeParse({
      since: searchParams.get("since") || undefined,
      limit: searchParams.get("limit") || undefined,
      modality: searchParams.get("modality") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const delta = await BiometricMeshEngine.deltaSync(
      institutionId,
      parsed.data
    );

    return NextResponse.json(delta);
  } catch (error: any) {
    console.error("[BiometricMesh] Error performing delta sync:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync biometric templates" },
      { status: 500 }
    );
  }
}, "hardware:biometrics:read");
