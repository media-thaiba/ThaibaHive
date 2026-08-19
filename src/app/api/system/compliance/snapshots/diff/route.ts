import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { snapshotReconstructor } from "@/lib/compliance/snapshot-reconstructor";
import { z } from "zod";

const diffSchema = z.object({
  baseSnapshotUri: z.string().min(1),
  targetSnapshotUri: z.string().min(1),
});

async function handler(req: Request, session: any) {
  try {
    const body = await req.json();
    const parsed = diffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { baseSnapshotUri, targetSnapshotUri } = parsed.data;

    const baseResult = await snapshotReconstructor.loadAndVerify(baseSnapshotUri);
    if (!baseResult.manifest) {
      return NextResponse.json({ error: `Failed to load base snapshot: ${baseResult.error}` }, { status: 400 });
    }

    const targetResult = await snapshotReconstructor.loadAndVerify(targetSnapshotUri);
    if (!targetResult.manifest) {
      return NextResponse.json({ error: `Failed to load target snapshot: ${targetResult.error}` }, { status: 400 });
    }

    const diff = snapshotReconstructor.diffSnapshots(baseResult.manifest, targetResult.manifest);

    return NextResponse.json({
      diff,
      baseVerified: baseResult.verified,
      targetVerified: targetResult.verified,
    });
  } catch (error: any) {
    console.error("[@thaiba/compliance] Snapshot diff error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export const POST = requireAuth(handler, "compliance:forensics");
