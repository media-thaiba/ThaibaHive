import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { biometricZeroizeSchema } from "@/lib/validation/schemas";
import { BiometricMeshEngine } from "@/lib/hardware/biometric-mesh-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = biometricZeroizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid zeroization payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await BiometricMeshEngine.zeroize(
      institutionId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      message: "Biometric template cryptographic zeroization completed",
      result,
    });
  } catch (error: any) {
    console.error("[BiometricMesh] Error zeroizing template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to zeroize biometric template" },
      { status: 500 }
    );
  }
}, "hardware:biometrics:manage");
