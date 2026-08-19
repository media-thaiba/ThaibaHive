import {
  attendanceLogs,
  markEntries,
  financialTransactions,
  preferenceAuditLog,
} from "@/db/schema";
import { getTableConfig } from "drizzle-orm/sqlite-core";

/**
 * DB-006: Sprint-030 Database Index Schema Unit Tests
 *
 * Verifies that each secondary performance index is properly declared
 * in the Drizzle SQLite schema metadata (not just column presence).
 * These tests confirm the index entries appear in the table's index config,
 * which means they will be generated into migration SQL.
 */
describe("Database Index Declarations (Sprint-030 DB-006)", () => {
  it("attendanceLogs: declares idx_attendance_status index", () => {
    const config = getTableConfig(attendanceLogs);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain("idx_attendance_status");
  });

  it("attendanceLogs: declares idx_attendance_method index", () => {
    const config = getTableConfig(attendanceLogs);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain("idx_attendance_method");
  });

  it("markEntries: declares idx_mark_entries_exam_schedule index", () => {
    const config = getTableConfig(markEntries);
    const allIndexNames = [
      ...config.indexes.map((i) => i.config.name),
      ...config.uniqueConstraints.map((u) => u.name),
    ];
    expect(allIndexNames).toContain("idx_mark_entries_exam_schedule");
  });

  it("markEntries: declares idx_mark_entries_student index", () => {
    const config = getTableConfig(markEntries);
    const allIndexNames = [
      ...config.indexes.map((i) => i.config.name),
      ...config.uniqueConstraints.map((u) => u.name),
    ];
    expect(allIndexNames).toContain("idx_mark_entries_student");
  });

  it("markEntries: declares idx_mark_entries_schedule_student_uniq unique index", () => {
    const config = getTableConfig(markEntries);
    const allIndexNames = [
      ...config.indexes.map((i) => i.config.name),
      ...config.uniqueConstraints.map((u) => u.name),
    ];
    expect(allIndexNames).toContain("idx_mark_entries_schedule_student_uniq");
  });

  it("financialTransactions: declares idx_financial_tx_category index", () => {
    const config = getTableConfig(financialTransactions);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain("idx_financial_tx_category");
  });

  it("preferenceAuditLog: declares idx_pref_audit_inst_id index", () => {
    const config = getTableConfig(preferenceAuditLog);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain("idx_pref_audit_inst_id");
  });

  it("preferenceAuditLog: declares idx_pref_audit_timestamp index", () => {
    const config = getTableConfig(preferenceAuditLog);
    const indexNames = config.indexes.map((i) => i.config.name);
    expect(indexNames).toContain("idx_pref_audit_timestamp");
  });
});
