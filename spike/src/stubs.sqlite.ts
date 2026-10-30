import { sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const institutions = sqliteTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "restrict" }),
  admissionNumber: text("admission_number").notNull(),
  fullName: text("full_name").notNull(),
  gender: text("gender", { enum: ["male", "female"] }).notNull(),
}, (table) => [
  unique("uq_student_inst_id").on(table.institutionId, table.id),
  unique("uq_student_inst_adm").on(table.institutionId, table.admissionNumber),
]);

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
});

export const staffInstitutions = sqliteTable("staff_institutions", {
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "restrict" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "restrict" }),
  role: text("role").notNull(),
}, (table) => [
  unique("uq_staff_inst").on(table.institutionId, table.staffId),
]);

export const academicYears = sqliteTable("academic_years", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  isCurrent: text("is_current").default("true").notNull(),
}, (table) => [
  unique("uq_ay_inst_id").on(table.institutionId, table.id),
]);
