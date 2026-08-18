import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { DLQRetryHandler, DLQJobStatus } from "@/lib/resilience/dlq-retry-handler";

const globalDLQHandler = new DLQRetryHandler();

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const status = (searchParams.get("status") as DLQJobStatus) || undefined;

    const jobs = globalDLQHandler.getJobs(tenantId, status);
    return NextResponse.json({ jobs, count: jobs.length }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch DLQ retry queue" },
      { status: 500 }
    );
  }
}, "resilience:manage");

export const POST = requireAuth(async (request: Request) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const { action, jobId } = body;

  if (action === "retry" && jobId) {
    const result = await globalDLQHandler.processRetryJob(jobId, async () => true);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  if (action === "quarantine" && jobId) {
    const success = globalDLQHandler.quarantineJob(jobId);
    return NextResponse.json({ success, jobId }, { status: success ? 200 : 400 });
  }

  return NextResponse.json({ error: "Invalid action or missing jobId" }, { status: 400 });
}, "resilience:manage");
