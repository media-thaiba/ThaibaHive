import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isStorageConfigured } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export const POST = requireAuth(async (req, _session) => {
  try {
    const { ext, departmentId, institutionId } = await req.json();

    if (!ext) {
      return NextResponse.json({ error: "File extension is required" }, { status: 400 });
    }

    const uuid = uuidv4();
    const instId = institutionId || "default";
    const deptId = departmentId || "general";

    // Scoped private temp path: uploads bucket, private_tmp prefix
    const filePath = `private_tmp/tenant_${instId}/dept_${deptId}/${uuid}.${ext}`;

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

      const { signedUrl } = await signRes.json() as { signedUrl: string };
      return NextResponse.json({
        uploadUrl: signedUrl,
        fileUrl: `/api/upload/files/${filePath}`,
      });
    }

    // Local dev fallback: use the chunked-upload endpoint
    return NextResponse.json({
      uploadUrl: `/api/upload/chunk/${filePath}`,
      fileUrl: `/api/upload/files/${filePath}`,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate signed upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "media:create");
