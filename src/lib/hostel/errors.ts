export class HostelError extends Error {
  constructor(message: string, public readonly code: string = "HOSTEL_ERROR") {
    super(message);
    this.name = "HostelError";
  }
}

export class BedCollisionError extends HostelError {
  constructor(message: string = "Bed is already allocated to another active student.") {
    super(message, "BED_COLLISION");
    this.name = "BedCollisionError";
  }
}

export class StudentCollisionError extends HostelError {
  constructor(message: string = "Student already has an active bed allocation.") {
    super(message, "STUDENT_COLLISION");
    this.name = "StudentCollisionError";
  }
}

export class RoomCapacityExceededError extends HostelError {
  constructor(message: string = "Room is at full capacity.") {
    super(message, "ROOM_CAPACITY_EXCEEDED");
    this.name = "RoomCapacityExceededError";
  }
}

export class GenderParityViolationError extends HostelError {
  constructor(message: string) {
    super(message, "GENDER_PARITY_VIOLATION");
    this.name = "GenderParityViolationError";
  }
}

export class WardenUnauthorizedError extends HostelError {
  constructor(message: string = "Staff member is not an active assigned warden for this block.") {
    super(message, "WARDEN_UNAUTHORIZED");
    this.name = "WardenUnauthorizedError";
  }
}

export class BedMaintenanceError extends HostelError {
  constructor(message: string = "Bed is currently under maintenance.") {
    super(message, "BED_MAINTENANCE");
    this.name = "BedMaintenanceError";
  }
}

export class CasConflictError extends HostelError {
  constructor(message: string = "CAS concurrency conflict: pass status changed concurrently.") {
    super(message, "CAS_CONFLICT");
    this.name = "CasConflictError";
  }
}

export class HostelSettingsMissingError extends HostelError {
  constructor(message: string = "Hostel settings not configured for institution") {
    super(message, "HOSTEL_SETTINGS_MISSING");
    this.name = "HostelSettingsMissingError";
  }
}

export interface AllocationViolationResult {
  isViolation: boolean;
  type?: "bed_collision" | "student_collision" | "other_unique";
  rawConstraint?: string;
  matchedColumns?: string[];
}

export function classifyAllocationViolation(err: unknown): AllocationViolationResult {
  let curr: any = err;
  let depth = 0;
  const maxDepth = 10;

  // Unpack cause chain to innermost driver error
  while (curr?.cause && depth < maxDepth) {
    curr = curr.cause;
    depth++;
  }

  const code = String(curr?.code || curr?.errno || "");
  const constraint = String(curr?.constraint || curr?.constraint_name || "");
  const rawMessage = String(curr?.message || "");

  // 1. PostgreSQL Check (Code 23505 = unique_violation)
  if (code === "23505") {
    if (constraint === "idx_active_bed_allocation") {
      return { isViolation: true, type: "bed_collision", rawConstraint: constraint };
    }
    if (constraint === "idx_active_student_allocation") {
      return { isViolation: true, type: "student_collision", rawConstraint: constraint };
    }
    return { isViolation: true, type: "other_unique", rawConstraint: constraint };
  }

  // 2. SQLite / LibSQL Check (Error text: "UNIQUE constraint failed: table.col1, table.col2")
  const sqlitePrefix = "UNIQUE constraint failed:";
  if (rawMessage.includes(sqlitePrefix)) {
    const rawTokens = rawMessage
      .substring(rawMessage.indexOf(sqlitePrefix) + sqlitePrefix.length)
      .split(",")
      .map((t) => t.trim().toLowerCase());

    // Normalize table.column to bare column
    const columns = new Set(
      rawTokens.map((t) => (t.includes(".") ? t.split(".").pop()! : t))
    );

    if (columns.has("institution_id") && columns.has("bed_id")) {
      return { isViolation: true, type: "bed_collision", matchedColumns: Array.from(columns) };
    }
    if (columns.has("institution_id") && columns.has("student_id")) {
      return { isViolation: true, type: "student_collision", matchedColumns: Array.from(columns) };
    }
    return { isViolation: true, type: "other_unique", matchedColumns: Array.from(columns) };
  }

  return { isViolation: false };
}
