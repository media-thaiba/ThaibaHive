import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { biometricEnrollSchema } from "@/lib/validation/schemas";
import { BiometricMeshEngine } from "@/lib/hardware/biometric-mesh-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = biometricEnrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid biometric enrollment payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const template = await BiometricMeshEngine.enroll(
      institutionId,
      parsed.data
    );

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("[BiometricMesh] Error enrolling template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enroll biometric template" },
      { status: 500 }
    );
  }
}, "hardware:biometrics:manage");
