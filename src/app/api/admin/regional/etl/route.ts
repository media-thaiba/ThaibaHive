import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { DwEtlService } from "@/lib/regional/dw-etl-service";
import { dwEtlTriggerSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = dwEtlTriggerSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  try {
    const result = await DwEtlService.runEtlPipeline({
      regionalGroupId: parse.data.regionalGroupId,
      runType: parse.data.runType,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ETL Pipeline execution failed" },
      { status: 500 }
    );
  }
}, "regional:manage");
