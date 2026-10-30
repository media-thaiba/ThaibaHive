import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { biometricEnrollSchema } from "@/lib/validation/schemas";
import { BiometricMeshEngine } from "@/lib/hardware/biometric-mesh-engine";
import { SurveillanceConsentRegistry } from "@/lib/operations/vision/privacy/surveillance-consent-registry";

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

    // DPDP Act 2023 §9: a minor's biometrics may only be enrolled with
    // verifiable parental consent recorded by a guardian linked to the student.
    if (parsed.data.ownerType === "student") {
      const registry = new SurveillanceConsentRegistry();
      const permitted = await registry.isFacialEnrolmentPermitted(
        parsed.data.ownerId,
        institutionId
      );
      if (!permitted) {
        return NextResponse.json(
          {
            error:
              "Verifiable parental consent required: this student has no recorded guardian consent for biometric enrolment.",
          },
          { status: 403 }
        );
      }
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
