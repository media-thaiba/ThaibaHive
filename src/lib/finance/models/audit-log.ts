import { ApprovalStatus, RequestType, Role } from "./approval-state";

export interface AuditLogEntry {
  id: string;
  requestId: string;
  requestType: RequestType;
  action: "submit" | "approve" | "reject" | "return";
  previousStatus: ApprovalStatus | null;
  newStatus: ApprovalStatus;
  actorId: string;
  actorName: string;
  actorRole: Role;
  notes?: string | null;
  timestamp: string;
  institutionId: string;
}

export class AuditLogService {
  private static logs: AuditLogEntry[] = [];

  static recordLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const fullLog: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    // Append-only guarantee
    this.logs.push(fullLog);
    return fullLog;
  }

  static getLogsForRequest(requestId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.requestId === requestId);
  }

  static getLogsForInstitution(institutionId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.institutionId === institutionId);
  }

  static clearLogsForTesting(): void {
    this.logs = [];
  }
}
