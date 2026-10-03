import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { RemediationTicketService } from "@/lib/services/remediation-ticket-service";
import { remediationTicketSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const rawInst = searchParams.get("institutionId") || searchParams.get("tenantId") || undefined;
  const resolvedInst = await resolveRequestInstitution(session, rawInst);
  const institutionId = resolvedInst === "global" ? undefined : resolvedInst;
  const status = searchParams.get("status") ?? undefined;
  const severity = searchParams.get("severity") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

  try {
    const data = await RemediationTicketService.listTickets({
      institutionId,
      status,
      severity,
      category,
      limit,
      offset,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}, "autonomy:view");

export const POST = requireAuth(async (request: Request, session) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = remediationTicketSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const rawBodyInst = (body as { institutionId?: string })?.institutionId;
  const institutionId = await resolveRequestInstitution(session, rawBodyInst);
  if (institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required for ticket creation" }, { status: 400 });
  }

  try {
    const ticket = await RemediationTicketService.createTicket({
      institutionId,
      anomalyId: parse.data.anomalyId,
      ruleId: parse.data.ruleId,
      title: parse.data.title,
      severity: parse.data.severity,
      category: parse.data.category,
      affectedStudentId: parse.data.affectedStudentId,
      assignedStaffId: parse.data.assignedStaffId,
      autoAssign: parse.data.autoAssign,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create remediation ticket" },
      { status: 500 }
    );
  }
}, "autonomy:manage");
