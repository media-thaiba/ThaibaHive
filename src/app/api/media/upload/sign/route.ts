import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SIGN_SIZE = 100 * 1024 * 1024; // matches mediaUploadCompleteSchema cap

interface SignRequestBody {
  ext?: unknown;
  mime?: unknown;
  size?: unknown;
  // Legacy fields accepted for back-compat but NEVER trusted:
  // institutionId/departmentId are derived from the session (D15*).
  institutionId?: unknown;
  departmentId?: unknown;
}

export const POST = requireAuth(async (req, session) => {
  try {
    const body = (await req.json()) as SignRequestBody;
    const ext = typeof body.ext === "string" ? body.ext.replace(/[^a-zA-Z0-9]/g, "") : "";

    if (!ext) {
      return NextResponse.json({ error: "File extension is required" }, { status: 400 });
    }

    if (typeof body.size === "number" && (body.size <= 0 || body.size > MAX_SIGN_SIZE)) {
      return NextResponse.json(
        { error: "File size must be between 1 byte and 100 MB" },
        { status: 413 }
      );
    }

    // D15*: tenant segment derives from the session — client-supplied
    // institutionId/departmentId are ignored so a caller cannot mint paths
    // under another tenant's prefix.
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const instId =
      scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : "default";
    const deptId = "general";

    const uuid = randomUUID();
    // Scoped private temp path: uploads bucket, private_tmp prefix
    const filePath = `private_tmp/tenant_${instId}/dept_${deptId}/${uuid}.${ext}`;
    const fileUrl = `/api/upload/files/${filePath}`;

    if (isStorageConfigured) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      const signRes = await fetch(
        `${supabaseUrl}/storage/v1/object/upload/sign/uploads/${filePath}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          // Note: Supabase signed upload URLs have a fixed 2-hour expiry;
          // expiresIn is accepted but the maximum is capped at 7200 seconds.
          body: JSON.stringify({ expiresIn: 7200 }),
        }
      );

      if (!signRes.ok) {
        const errText = await signRes.text();
        return NextResponse.json(
          { error: `Failed to create signed upload URL: ${errText}` },
          { status: 502 }
        );
      }

      const { signedUrl } = (await signRes.json()) as { signedUrl: string };
      return NextResponse.json({
        mode: "presign",
        uploadUrl: signedUrl,
        fileUrl,
        path: filePath,
        expiresInSeconds: 7200,
      });
    }

    // Local-dev / no-Supabase fallback: plain multipart upload through the
    // existing single-shot endpoint (D3* — the old /api/upload/chunk/* path
    // never existed). Callers must check mode and POST FormData instead of PUT.
    return NextResponse.json({
      mode: "multipart",
      uploadUrl: "/api/upload",
      fileUrl: null,
      path: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate signed upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:create");
