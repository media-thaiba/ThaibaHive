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
