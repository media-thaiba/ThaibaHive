import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { regulatoryExportEngine } from "@/lib/compliance/regulatory-export-engine";
import { z } from "zod";

const exportSchema = z.object({
  standard: z.enum(["SOC2", "ISO27001", "GDPR", "HIPAA"]).default("SOC2"),
  tenantId: z.string().optional().default("default"),
  format: z.enum(["json", "pdf"]).optional().default("json"),
});

async function handler(req: Request, _session: any) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { standard, tenantId, format } = parsed.data;

    const exportPack = await regulatoryExportEngine.generateExportPack({
      standard,
      tenantId,
    });

    if (format === "json") {
      return NextResponse.json(exportPack, {
        headers: {
          "Content-Disposition": `attachment; filename="compliance-${standard.toLowerCase()}-${exportPack.exportId}.json"`,
        },
      });
    }

    // Return structured report envelope
    return NextResponse.json({
      success: true,
      export: exportPack,
      downloadUrl: `/api/system/compliance/export?id=${exportPack.exportId}&format=json`,
    });
  } catch (error: any) {
    console.error("[@thaiba/compliance] Regulatory export error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export const POST = requireAuth(handler, "compliance:export");
