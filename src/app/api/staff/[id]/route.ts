import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, userAppAssignments, auditLog } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { hasPermission, type StaffRole } from "@thaiba/auth";
import { pick } from "@/lib/api/pick";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { autoAssignOffboardingChecklists } from "@/lib/onboarding/auto-assign";
import { encryptPiiField, decryptPiiField } from "@/lib/crypto/tenant-encryption";
import { staffUpdateSchema } from "@/lib/validation/schemas";
import { eq, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await db
    .select({
      id: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      employeeId: staff.employeeId,
      phone: staff.phone,
      designation: staff.designation,
      avatarUrl: staff.avatarUrl,
      isActive: staff.isActive,
      dateOfBirth: staff.dateOfBirth,
      dateOfJoining: staff.dateOfJoining,
      qualifications: staff.qualifications,
      certificates: staff.certificates,
      experienceYears: staff.experienceYears,
      skills: staff.skills,
      languages: staff.languages,
      emergencyContactName: staff.emergencyContactName,
      emergencyContactPhone: staff.emergencyContactPhone,
      aadhaar: staff.aadhaar,
      pan: staff.pan,
      bankAccount: staff.bankAccount,
      ifscCode: staff.ifscCode,
      contractEndDate: staff.contractEndDate,
      teachingSubjects: staff.teachingSubjects,
      biography: staff.biography,
      nfcTagId: staff.nfcTagId,
    })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const departments = await db.select().from(staffDepartments).where(eq(staffDepartments.staffId, id)).all();
  const institutions = await db.select().from(staffInstitutions).where(eq(staffInstitutions.staffId, id)).all();

  // Decrypt sensitive PII fields before sending to authorized client
  const decryptedMember = {
    ...member,
    aadhaar: decryptPiiField(member.aadhaar),
    pan: decryptPiiField(member.pan),
    bankAccount: decryptPiiField(member.bankAccount),
    ifscCode: decryptPiiField(member.ifscCode),
  };

  return NextResponse.json({ staff: decryptedMember, departments, institutions });
}, "staff:read");

const UPDATABLE_FIELDS = [
  "firstName", "lastName", "phone", "designation", "avatarUrl",
  "dateOfBirth", "dateOfJoining", "qualifications", "certificates",
  "experienceYears", "skills", "languages",
  "emergencyContactName", "emergencyContactPhone",
  "aadhaar", "pan", "bankAccount", "ifscCode",
  "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
] as const;

const PII_FIELDS = new Set(["aadhaar", "pan", "bankAccount", "ifscCode"]);
const SELF_UPDATABLE_FIELDS = new Set([
  "phone", "avatarUrl", "biography", "skills", "languages",
  "emergencyContactName", "emergencyContactPhone", "dateOfBirth"
]);

export const PUT = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = staffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existingStaff = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!existingStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const { departmentIds, institutionIds, ...fields } = parsed.data;
  const safeFields: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in fields) {
      const val = (fields as Record<string, unknown>)[key];
      if (PII_FIELDS.has(key)) {
        safeFields[key] = typeof val === "string" ? encryptPiiField(val) : (val ?? null);
      } else {
        safeFields[key] = val;
      }
    }
  }

  const result = await db
    .update(staff)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(eq(staff.id, id))
    .returning()
    .get();

  if (departmentIds) {
    await db.delete(staffDepartments).where(eq(staffDepartments.staffId, id)).run();
    if (departmentIds.length) {
      await db.insert(staffDepartments).values(
        departmentIds.map((deptId: string) => ({
          id: crypto.randomUUID(),
          staffId: id,
          departmentId: deptId,
        }))
      ).run();
    }
  }

  if (institutionIds) {
    if (session.role !== "super_admin") {
      for (const instId of institutionIds) {
        await resolveRequestInstitution(session, instId);
      }
    }
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, id)).run();
    if (institutionIds.length) {
      await db.insert(staffInstitutions).values(
        institutionIds.map((instId: string) => ({
          id: crypto.randomUUID(),
          staffId: id,
          institutionId: instId,
        }))
      ).run();
    }
  }

  const safeStaff = {
    ...pick(result, [
      "id", "email", "firstName", "lastName", "role", "employeeId",
      "phone", "designation", "avatarUrl", "isActive", "dateOfJoining",
      "dateOfBirth", "qualifications", "certificates", "experienceYears",
      "skills", "languages", "emergencyContactName", "emergencyContactPhone",
      "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
    ]),
    aadhaar: decryptPiiField(result.aadhaar),
    pan: decryptPiiField(result.pan),
    bankAccount: decryptPiiField(result.bankAccount),
    ifscCode: decryptPiiField(result.ifscCode),
  };

  return NextResponse.json({ staff: safeStaff });
}, "staff:update");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const isSelf = session.staffId === id;

  if (isSelf) {
    if (!hasPermission(session.role as StaffRole, "profile:write")) {
      return NextResponse.json({ error: "Forbidden: profile:write required" }, { status: 403 });
    }
  } else {
    if (!hasPermission(session.role as StaffRole, "staff:update")) {
      return NextResponse.json({ error: "Forbidden: staff:update required" }, { status: 403 });
    }
    const authorized = await canAccessStaff(session.staffId, session.role, id);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = staffUpdateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existingStaff = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!existingStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const safeFields: Record<string, unknown> = {};
  const allowedFieldKeys = isSelf ? SELF_UPDATABLE_FIELDS : new Set(UPDATABLE_FIELDS);
  for (const key of UPDATABLE_FIELDS) {
    if (key in parsed.data && allowedFieldKeys.has(key)) {
      const val = (parsed.data as Record<string, unknown>)[key];
      if (PII_FIELDS.has(key)) {
        safeFields[key] = typeof val === "string" ? encryptPiiField(val) : (val ?? null);
      } else {
        safeFields[key] = val;
      }
    }
  }

  const result = await db
    .update(staff)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(eq(staff.id, id))
    .returning()
    .get();

  if (!result) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  const safeStaff = {
    ...pick(result, [
      "id", "email", "firstName", "lastName", "role", "employeeId",
      "phone", "designation", "avatarUrl", "isActive", "dateOfJoining",
      "dateOfBirth", "qualifications", "certificates", "experienceYears",
      "skills", "languages", "emergencyContactName", "emergencyContactPhone",
      "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
    ]),
    aadhaar: decryptPiiField(result.aadhaar),
    pan: decryptPiiField(result.pan),
    bankAccount: decryptPiiField(result.bankAccount),
    ifscCode: decryptPiiField(result.ifscCode),
  };

  return NextResponse.json({ staff: safeStaff });
});

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  if (session.staffId === id) {
    return NextResponse.json({ error: "Cannot revoke your own account" }, { status: 400 });
  }

  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, id)).get();
  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  let body: { reason?: string } = {};
  try {
    body = (await request.json()) as { reason?: string };
  } catch {
    body = {};
  }
  const { reason } = body;

  // 1. Deactivate staff account & release physical NFC tag and biometric avatar reference photo (PDPA retention cleanup)
  await db
    .update(staff)
    .set({ isActive: false, nfcTagId: null, avatarUrl: null, updatedAt: new Date().toISOString() })
    .where(eq(staff.id, id))
    .run();

  // 2. Increment tokenVersion to invalidate all active JWTs
  await db
    .update(staff)
    .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
    .where(eq(staff.id, id))
    .run();

  // 3. Revoke all active app assignments
  await db
    .update(userAppAssignments)
    .set({
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokedById: session.staffId,
      revokedReason: reason || "Account revoked by admin",
    })
    .where(
      eq(userAppAssignments.staffId, id)
    )
    .run();

  // 4. Audit log
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    action: "account_revoked",
    entityType: "staff",
    entityId: id,
    details: { reason: reason || "Account revoked by admin", revokedBy: session.staffId },
  }).run();

  autoAssignOffboardingChecklists(id, session.staffId);

  return NextResponse.json({ success: true, message: "Account revoked" });
}, "staff:delete");
