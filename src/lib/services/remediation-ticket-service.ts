import { db, remediationTickets, staffInstitutions } from "@thaiba/db";
import { eq, and, desc } from "drizzle-orm";

export interface CreateTicketParams {
  institutionId: string;
  anomalyId?: string;
  ruleId?: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "attendance" | "finance" | "academics" | "operations";
  affectedStudentId?: string;
  assignedStaffId?: string;
  autoAssign?: boolean;
}

export class RemediationTicketService {
  /**
   * Create a new remediation ticket and optionally auto-assign to available staff
   */
  static async createTicket(params: CreateTicketParams) {
    const id = `rem_tk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let assignedStaffId = params.assignedStaffId;

    if (!assignedStaffId && params.autoAssign) {
      assignedStaffId = await this.findLowestLoadedStaff(params.institutionId);
    }

    const newTicket = {
      id,
      institutionId: params.institutionId,
      anomalyId: params.anomalyId ?? null,
      ruleId: params.ruleId ?? null,
      title: params.title,
      severity: params.severity,
      category: params.category,
      affectedStudentId: params.affectedStudentId ?? null,
      assignedStaffId: assignedStaffId ?? null,
      status: assignedStaffId ? "auto_assigned" : "open",
      autoCreated: true,
      resolutionSummary: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(remediationTickets).values(newTicket);
    return newTicket;
  }

  /**
   * Find staff member in institution with lowest active ticket load
   */
  static async findLowestLoadedStaff(institutionId: string): Promise<string | undefined> {
    const activeStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.institutionId, institutionId))
      .limit(10);

    if (activeStaff.length === 0) return undefined;

    return activeStaff[0].staffId;
  }

  /**
   * List remediation tickets for an institution with filters & pagination
   */
  static async listTickets(params: {
    institutionId?: string;
    status?: string;
    severity?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const conditions = [];
    if (params.institutionId) {
      conditions.push(eq(remediationTickets.institutionId, params.institutionId));
    }
    if (params.status) {
      conditions.push(eq(remediationTickets.status, params.status));
    }
    if (params.severity) {
      conditions.push(eq(remediationTickets.severity, params.severity));
    }
    if (params.category) {
      conditions.push(eq(remediationTickets.category, params.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(remediationTickets)
      .where(whereClause)
      .orderBy(desc(remediationTickets.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      tickets: items,
      limit,
      offset,
      totalCount: items.length,
    };
  }

  /**
   * Update ticket status / reassign staff
   */
  static async updateTicket(
    id: string,
    updates: {
      status?: "open" | "auto_assigned" | "in_progress" | "resolved" | "escalated";
      assignedStaffId?: string;
      resolutionSummary?: string;
    }
  ) {
    const ticket = await db
      .select()
      .from(remediationTickets)
      .where(eq(remediationTickets.id, id))
      .get();

    if (!ticket) {
      return null;
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.status) patch.status = updates.status;
    if (updates.assignedStaffId !== undefined) patch.assignedStaffId = updates.assignedStaffId;
    if (updates.resolutionSummary !== undefined) {
      patch.resolutionSummary = updates.resolutionSummary;
      if (updates.status === "resolved") {
        patch.resolvedAt = new Date().toISOString();
      }
    }

    await db
      .update(remediationTickets)
      .set(patch)
      .where(eq(remediationTickets.id, id));

    return { ...ticket, ...patch };
  }
}
