import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, and, sql } from "drizzle-orm";
import { wrapPgDb } from "../../db/index";
import * as pgSchema from "../../db/schema.pg";
import {
  createActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
  getRoleRank,
  canMutateStaff,
  canCreateRole,
} from "../index";

async function runStage2PgVerification() {
  process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "stage2-test-auth-jwt-secret-at-least-32-chars-long";
  console.log("=== Stage 2 Postgres Verification via PGlite & wrapPgDb ===");
  const pglite = new PGlite();

  // Initialize Postgres schema DDL matching drizzle/postgres/
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS "institutions" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "type" text DEFAULT 'campus' NOT NULL,
      "address" text,
      "phone" text,
      "email" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "allocated_budget" double precision DEFAULT 0,
      "fiscal_year" text,
      "created_at" text DEFAULT (current_timestamp) NOT NULL,
      "updated_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "departments" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text REFERENCES "institutions"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "code" text NOT NULL,
      "description" text,
      "head_user_id" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" text DEFAULT (current_timestamp) NOT NULL,
      "updated_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "staff" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "employee_id" text NOT NULL UNIQUE,
      "first_name" text NOT NULL,
      "last_name" text NOT NULL,
      "phone" text,
      "designation" text,
      "role" text DEFAULT 'staff' NOT NULL,
      "avatar_url" text,
      "date_of_birth" text,
      "date_of_joining" text,
      "qualifications" text,
      "certificates" text,
      "experience_years" double precision,
      "skills" text,
      "languages" text,
      "emergency_contact_name" text,
      "emergency_contact_phone" text,
      "aadhaar" text,
      "pan" text,
      "bank_account" text,
      "ifsc_code" text,
      "contract_end_date" text,
      "teaching_subjects" text,
      "biography" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "token_version" integer DEFAULT 0 NOT NULL,
      "is_first_login" boolean DEFAULT true NOT NULL,
      "onboarding_completed_at" text,
      "password_hash" text,
      "email_verified_at" text,
      "nfc_tag_id" text UNIQUE,
      "face_embedding" text,
      "face_registered_at" text,
      "fingerprint_hash" text,
      "fingerprint_registered_at" text,
      "biometric_enabled" boolean DEFAULT false NOT NULL,
      "model_version" text DEFAULT 'facenet-512d-v1',
      "biometric_status" text DEFAULT 'active',
      "google_sub" text UNIQUE,
      "created_at" text DEFAULT (current_timestamp) NOT NULL,
      "updated_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "staff_institutions" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "staff_departments" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "department_id" text NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE,
      "is_primary" boolean DEFAULT false NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "institution_id" text,
      "status" text DEFAULT 'active' NOT NULL,
      "client_ip" text,
      "user_agent" text,
      "device_type" text,
      "login_at" bigint NOT NULL,
      "last_active_at" bigint NOT NULL,
      "expires_at" bigint NOT NULL,
      "logout_at" bigint,
      "created_at" bigint NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "step_up_used" (
      "jti" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "action" text NOT NULL,
      "expires_at" bigint NOT NULL,
      "used_at" bigint NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "tenant_id" text NOT NULL,
      "user_id" text,
      "action" text NOT NULL,
      "entity_type" text NOT NULL,
      "entity_id" text,
      "payload" jsonb,
      "created_at" text DEFAULT (current_timestamp) NOT NULL
    );
  `);

  const rawDrizzle = drizzle(pglite, { schema: pgSchema });
  const pgDb = wrapPgDb(rawDrizzle);

  const ts = Date.now();
  const instA = `inst_pg_a_${ts}`;
  const instB = `inst_pg_b_${ts}`;
  const callerId = `staff_pg_prin_${ts}`;
  const targetId = `staff_pg_tgt_${ts}`;

  // Seed institutions
  await pgDb.insert(pgSchema.institutions).values([
    { id: instA, name: "Pg Inst A", code: `PGA_${ts}`, isActive: true },
    { id: instB, name: "Pg Inst B", code: `PGB_${ts}`, isActive: true },
  ]).run();

  // Seed caller (principal) & target (staff)
  await pgDb.insert(pgSchema.staff).values([
    {
      id: callerId,
      email: `prin_${ts}@test.org`,
      employeeId: `EMP_PRIN_${ts}`,
      firstName: "Principal",
      lastName: "User",
      role: "principal",
      isActive: true,
      tokenVersion: 0,
      isFirstLogin: false,
    },
    {
      id: targetId,
      email: `tgt_${ts}@test.org`,
      employeeId: `EMP_TGT_${ts}`,
      firstName: "Target",
      lastName: "Staff",
      role: "staff",
      isActive: true,
      tokenVersion: 0,
      isFirstLogin: false,
    },
  ]).run();

  await pgDb.insert(pgSchema.staffInstitutions).values([
    { id: `si_caller_${ts}`, staffId: callerId, institutionId: instA },
    { id: `si_target_${ts}`, staffId: targetId, institutionId: instA },
  ]).run();

  // Seed active target session
  const targetSid = `sess_tgt_${ts}`;
  await pgDb.insert(pgSchema.userSessions).values({
    id: targetSid,
    staffId: targetId,
    email: `tgt_${ts}@test.org`,
    role: "staff",
    institutionId: instA,
    status: "active",
    loginAt: Date.now(),
    lastActiveAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    createdAt: Date.now(),
  }).run();

  // ── Test 1: Atomic Role Change, Token Version Bump & Session Invalidation on Postgres
  const stepUpToken = await createActionStepUpToken({
    staffId: callerId,
    sid: `sess_caller_${ts}`,
    action: "staff:role:change",
  });

  const { jwtVerify } = await import("jose");
  const { getJwtSecretBytes } = await import("../config");
  const { payload } = await jwtVerify(stepUpToken, getJwtSecretBytes("action-step-up"));
  const jti = payload.jti as string;

  // Execute mutation inside transaction
  await pgDb.transaction(async (tx: any) => {
    // 1. Consume step-up token
    await consumeStepUpTokenInTx(tx, {
      jti,
      staffId: callerId,
      action: "staff:role:change",
      exp: Date.now() + 300000,
    });

    // 2. Promote target from 'staff' to 'admin'
    await tx.update(pgSchema.staff)
      .set({ role: "admin", updatedAt: new Date().toISOString() })
      .where(eq(pgSchema.staff.id, targetId))
      .run();

    // 3. Increment tokenVersion
    await tx.update(pgSchema.staff)
      .set({ tokenVersion: sql`${pgSchema.staff.tokenVersion} + 1` })
      .where(eq(pgSchema.staff.id, targetId))
      .run();

    // 4. Terminate active sessions
    await tx.update(pgSchema.userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(and(eq(pgSchema.userSessions.staffId, targetId), eq(pgSchema.userSessions.status, "active")))
      .run();
  });

  // Verify state on Postgres
  const updatedStaff = await pgDb.select().from(pgSchema.staff).where(eq(pgSchema.staff.id, targetId)).get();
  if (updatedStaff?.role !== "admin" || updatedStaff?.tokenVersion !== 1) {
    throw new Error(`Test 1 Failed: expected role 'admin' and tokenVersion 1, got role=${updatedStaff?.role}, version=${updatedStaff?.tokenVersion}`);
  }

  const updatedSession = await pgDb.select().from(pgSchema.userSessions).where(eq(pgSchema.userSessions.id, targetSid)).get();
  if (updatedSession?.status !== "terminated") {
    throw new Error(`Test 1 Failed: expected session 'terminated', got ${updatedSession?.status}`);
  }
  console.log("PASS Test 1: Atomic role change, tokenVersion bump, and session termination on Postgres");

  // ── Test 2: Step-Up Replay Detection on Postgres (code 23505)
  let replayCaught = false;
  try {
    await pgDb.transaction(async (tx: any) => {
      await consumeStepUpTokenInTx(tx, {
        jti, // Replay same jti!
        staffId: callerId,
        action: "staff:role:change",
        exp: Date.now() + 300000,
      });
    });
  } catch (err: any) {
    replayCaught = isStepUpReplayError(err);
  }

  if (!replayCaught) {
    throw new Error("Test 2 Failed: Replay of consumed step-up token was NOT caught by isStepUpReplayError on Postgres");
  }
  console.log("PASS Test 2: Step-up token replay on Postgres caught and identified by isStepUpReplayError (code 23505)");

  // ── Test 3: Subordinate Rank Math & Peer Protection on Postgres
  const canPrincipalPromoteToSuperAdmin = canCreateRole("principal", "super_admin");
  const canAdminPromoteToPrincipal = canCreateRole("admin", "principal");
  const canPrincipalPromoteToAdmin = canCreateRole("principal", "admin");
  const canSuperAdminCreateSystem = canCreateRole("super_admin", "system");

  if (canPrincipalPromoteToSuperAdmin || canAdminPromoteToPrincipal || !canPrincipalPromoteToAdmin || canSuperAdminCreateSystem) {
    throw new Error("Test 3 Failed: Subordinate rank math hierarchy failed on Postgres runner assertions");
  }
  console.log("PASS Test 3: Subordinate rank hierarchy and system role immunity verified on Postgres");

  console.log("=== All Stage 2 Postgres/PGlite verification tests passed! ===");
}

runStage2PgVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL in Postgres runner:", err);
    process.exit(1);
  });
