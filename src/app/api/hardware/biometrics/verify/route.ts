import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { biometricVerifySchema } from "@/lib/validation/schemas";
import { BiometricMeshEngine } from "@/lib/hardware/biometric-mesh-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = biometricVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid biometric verify payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await BiometricMeshEngine.verify(
      institutionId,
      parsed.data
    );

    const status = result.match ? 200 : 403;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error("[BiometricMesh] Error verifying biometric probe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify biometric probe" },
      { status: 500 }
    );
  }
}, "hardware:biometrics:manage");
